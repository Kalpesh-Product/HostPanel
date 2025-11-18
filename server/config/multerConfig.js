import multer from "multer";

const storage = multer.memoryStorage();
// const upload = multer({ storage });

const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB
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

export default upload;
