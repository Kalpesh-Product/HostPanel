import express from "express";
import cors from "cors";
import multer from "multer";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import { corsConfig } from "./config/corsConfig.js";
import verifyJwt from "./middlewares/verifyJwt.js";
import websiteTemplateRoutes from "./routes/websiteTemplateRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import leadsRoutes from "./routes/leadsRoutes.js";
import listingRoutes from "./routes/listingRoutes.js";
import hostUserRoutes from "./routes/hostUserRoutes.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5006;

mongoose.connect(process.env.DB_URL);

app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/editor", verifyJwt, websiteTemplateRoutes);
app.use("/api/services", verifyJwt, serviceRoutes);
app.use("/api/leads", verifyJwt, leadsRoutes);
app.use("/api/listings", verifyJwt, listingRoutes);
app.use("/api/profile", verifyJwt, hostUserRoutes);

app.use((err, req, res, next) => {
  // Multer: file too large
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message:
        "Some files are too large. Please keep images under the allowed size and try again.",
    });
  }

  // express.json() or express.urlencoded(): body too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message:
        "The data you’re sending is too large. Please reduce the size and try again.",
    });
  }

  next(err);
});

mongoose.connection.once("open", () => {
  console.log("connected to mongoDB");
  app.listen(PORT, () => {
    console.log(`server is running on PORT ${PORT}`);
  });
});
