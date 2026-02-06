import Event from "../../models/eventModel.js";
import EventAttendanceFile from "../../models/eventModel/eventAttendanceFileModel.js";
import cloudinary from "../../config/cloudinary.js";

function resolveResourceType(mimeType) {
  const mt = String(mimeType || "").toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  return "raw";
}

async function getScopedEvent(req) {
  const { eventId } = req.params;
  const query = { _id: eventId };

  if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
    query.church = req.activeChurch?._id || req.user.church;
  }

  const event = await Event.findOne(query).lean();
  return event;
}

const uploadEventAttendanceFile = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    if (!file.buffer) {
      return res.status(400).json({ message: "File buffer is missing" });
    }

    const fallbackResourceType = resolveResourceType(file.mimetype);
    const folder = `church-clerk/events/${event._id}/attendance-files`;

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: fallbackResourceType,
          use_filename: true,
          unique_filename: true
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      stream.end(file.buffer);
    });

    if (!uploadResult?.secure_url || !uploadResult?.public_id) {
      return res.status(502).json({
        message: "Failed to upload file",
        error: "Cloudinary did not return expected upload fields",
        secure_url: uploadResult?.secure_url,
        public_id: uploadResult?.public_id,
        resource_type: uploadResult?.resource_type
      });
    }

    const doc = await EventAttendanceFile.create({
      church: churchId,
      createdBy: req.user._id,
      event: event._id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadResult?.secure_url,
      publicId: uploadResult?.public_id,
      resourceType: uploadResult?.resource_type || fallbackResourceType,
      format: uploadResult?.format
    });

    return res.status(201).json({
      message: "File uploaded successfully",
      file: doc
    });
  } catch (error) {
    console.error("Upload event attendance file error:", error);
    const status = Number(error?.http_code) || 500;
    return res.status(status).json({
      message: "Failed to upload file",
      error: error?.error?.message || error?.message,
      code: error?.code,
      http_code: error?.http_code,
      name: error?.name,
      details: error?.error
    });
  }
};

const downloadEventAttendanceFile = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const { fileId } = req.params;
    const query = { _id: fileId, event: event._id, church: churchId };
    const doc = await EventAttendanceFile.findOne(query).lean();

    if (!doc) {
      return res.status(404).json({ message: "File not found" });
    }

    const downloadUrl = cloudinary.url(doc.publicId, {
      resource_type: doc.resourceType || "raw",
      flags: "attachment",
      secure: true
    });

    return res.redirect(downloadUrl);
  } catch (error) {
    console.error("Download event attendance file error:", error);
    return res.status(500).json({ message: "Failed to download file", error: error.message });
  }
};

const updateEventAttendanceFile = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const { fileId } = req.params;
    const query = { _id: fileId, event: event._id, church: churchId };
    const doc = await EventAttendanceFile.findOne(query);

    if (!doc) {
      return res.status(404).json({ message: "File not found" });
    }

    const { originalName } = req.body || {};
    if (typeof originalName !== "string" || !originalName.trim()) {
      return res.status(400).json({ message: "originalName is required" });
    }

    doc.originalName = originalName.trim();
    await doc.save();

    return res.status(200).json({ message: "File updated successfully", file: doc });
  } catch (error) {
    console.error("Update event attendance file error:", error);
    return res.status(500).json({ message: "Failed to update file", error: error.message });
  }
};

const listEventAttendanceFiles = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const files = await EventAttendanceFile.find({ church: churchId, event: event._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Files fetched successfully",
      count: files.length,
      files
    });
  } catch (error) {
    console.error("List event attendance files error:", error);
    return res.status(500).json({ message: "Failed to fetch files", error: error.message });
  }
};

const deleteEventAttendanceFile = async (req, res) => {
  try {
    const event = await getScopedEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const churchId = event?.church?._id || event?.church;

    const { fileId } = req.params;

    const query = { _id: fileId, event: event._id, church: churchId };
    const doc = await EventAttendanceFile.findOne(query);

    if (!doc) {
      return res.status(404).json({ message: "File not found" });
    }

    try {
      await cloudinary.uploader.destroy(doc.publicId, { resource_type: doc.resourceType || "raw" });
    } catch (cloudErr) {
      console.error("Cloudinary delete error:", cloudErr);
    }

    await EventAttendanceFile.deleteOne({ _id: doc._id });

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete event attendance file error:", error);
    return res.status(500).json({ message: "Failed to delete file", error: error.message });
  }
};

export {
  uploadEventAttendanceFile,
  listEventAttendanceFiles,
  updateEventAttendanceFile,
  downloadEventAttendanceFile,
  deleteEventAttendanceFile
};
