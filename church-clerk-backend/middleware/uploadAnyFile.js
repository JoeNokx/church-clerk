import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/attendees/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `attendee_${Date.now()}${ext}`);
  }
});

export const uploadAnyFile = multer({ storage });
