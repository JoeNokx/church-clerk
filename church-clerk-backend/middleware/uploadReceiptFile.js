import { uploadMemoryFile } from "./uploadMemoryFile.js";

export const uploadReceiptFile = (req, res, next) => {
  uploadMemoryFile.single("receipt")(req, res, (err) => {
    if (!err) return next();

    const code = err?.code;
    const message =
      code === "LIMIT_FILE_SIZE"
        ? "Receipt is too large. Maximum size is 50MB."
        : err?.message || "Receipt upload failed";

    return res.status(400).json({ message, code });
  });
};
