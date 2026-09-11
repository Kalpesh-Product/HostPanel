// @ts-nocheck
import multer from "multer";

const storage = multer.memoryStorage();
// const upload = multer({ storage });

//Multer config for most type of files
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/webp" ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpeg, .png, and .webp files are allowed"), false);
    }
  },
});

//Multer config for website file uploads
const uploadImages = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/webp"
    ) {
      return cb(null, true);
    }
    cb(new Error("Only .jpeg, .png, and .webp images are allowed"), false);
  },
});

// Multer config for printout requests — office documents in addition to the
// image/pdf/csv types `upload` already allows, since people print Word/Excel/
// PowerPoint files as often as PDFs.
const uploadDocuments = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/csv",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload a PDF, Word, Excel, PowerPoint, CSV, or image file."), false);
    }
  },
});

export { uploadImages, uploadDocuments };
export default upload;

