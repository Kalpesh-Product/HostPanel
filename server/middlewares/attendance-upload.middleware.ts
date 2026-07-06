// @ts-nocheck
import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function fileFilter(_request, file, callback) {
  if (allowedMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  const error = new Error("Unsupported selfie type. Upload JPG, PNG, or WEBP only.");
  error.statusCode = 400;
  callback(error);
}

export const attendanceSelfieUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
});

