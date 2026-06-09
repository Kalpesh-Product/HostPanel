// @ts-nocheck
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
import { createWebsiteLead } from "./controllers/leadsControllers.js";
import listingRoutes from "./routes/listingRoutes.js";
import hostUserRoutes from "./routes/hostUserRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import {
  createWebsiteReview,
  getApprovedWebsiteReviews,
} from "./controllers/reviewControllers.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import supportTicketRoutes from "./routes/supportTicketRoutes.js";
import websiteCreditsRoutes from "./routes/websiteCreditsRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5006;

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log("connected to mongoDB");
  })
  .catch((error) => {
    console.error("mongoDB connection error:", error?.message || error);
  });

mongoose.connection.on("error", (error) => {
  console.error("mongoDB runtime error:", error?.message || error);
});

app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.post("/api/leads/create-lead", createWebsiteLead);
app.post("/api/company/create-lead", createWebsiteLead);
app.post("/api/company/createLead", createWebsiteLead);
app.post("/api/review/create-website-review", createWebsiteReview);
app.get("/api/review/public", getApprovedWebsiteReviews);
app.use("/api/editor", verifyJwt, websiteTemplateRoutes);
app.use("/api/services", verifyJwt, serviceRoutes);
app.use("/api/leads", verifyJwt, leadsRoutes);
app.use("/api/listings", verifyJwt, listingRoutes);
app.use("/api/profile", verifyJwt, hostUserRoutes);
app.use("/api/review", verifyJwt, reviewRoutes);
app.use("/api/workspaces", verifyJwt, workspaceRoutes);
app.use("/api/organization", verifyJwt, organizationRoutes);
app.use("/api/subscription", verifyJwt, subscriptionRoutes);
app.use("/api/website-credits", verifyJwt, websiteCreditsRoutes);
app.use("/api/tickets/support-tickets", verifyJwt, supportTicketRoutes);
app.use("/api/v1/visitors", verifyJwt, visitorRoutes);
app.use("/api/assets", verifyJwt, assetRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message:
        "Some files are too large. Please keep images under the allowed size and try again.",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message:
        "The data you're sending is too large. Please reduce the size and try again.",
    });
  }

  next(err);
});

app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err?.stack || err?.message || err);
  if (res.headersSent) return next(err);
  return res.status(err?.status || 500).json({
    message: err?.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`server is running on PORT ${PORT}`);
});
