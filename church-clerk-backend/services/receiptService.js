import cloudinary from "../config/cloudinary.js";

// Shared receipt-image helpers backed by Cloudinary.
// Receipts are stored as a subdoc: { url, publicId, resourceType, originalName }.

const uploadReceiptImage = async (file, folder) => {
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
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
    throw new Error("Failed to upload receipt");
  }

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    resourceType: uploadResult.resource_type || "image",
    originalName: file.originalname
  };
};

const destroyReceiptImage = async (receipt) => {
  if (!receipt?.publicId) return;
  try {
    await cloudinary.uploader.destroy(receipt.publicId, { resource_type: receipt.resourceType || "image" });
  } catch (error) {
    console.error("Cloudinary receipt delete error:", error);
  }
};

const receiptImageDownloadUrl = (receipt) => {
  return cloudinary.url(receipt.publicId, {
    resource_type: receipt.resourceType || "image",
    flags: "attachment",
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
};

// Returns null when the file is a valid image upload, otherwise an error message.
const validateReceiptImage = (file) => {
  if (!file) return null;
  if (!file.buffer) return "Receipt file is missing";
  const mt = String(file.mimetype || "").toLowerCase();
  if (!mt.startsWith("image/")) return "Receipt must be an image file";
  return null;
};

const RECEIPT_SUBDOC = {
  url: { type: String },
  publicId: { type: String },
  resourceType: { type: String },
  originalName: { type: String }
};

export { uploadReceiptImage, destroyReceiptImage, receiptImageDownloadUrl, validateReceiptImage, RECEIPT_SUBDOC };
