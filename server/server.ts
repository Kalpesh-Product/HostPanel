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
import meetingRoomRoutes from "./routes/meetingRoomRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import plansPricingRoutes from "./routes/plansPricing.routes.js";
import tenantCompanyRoutes from "./routes/tenant-company.routes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import { seedSystemRoles } from "./config/seedRoles.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5006;

// Start the HTTP server immediately and connect to the DB in parallel. This keeps
// `tsx watch` auto-restart working and avoids any startup delay. Mongoose buffers
// queries until the connection is ready, so the brief connect window is invisible.
const server = app.listen(PORT, () => {
  console.log(`server is running on PORT ${PORT}`);
});

mongoose
  .connect(process.env.DB_URL)
  .then(async () => {
    console.log("connected to mongoDB");
    // Run idempotent seeds/migrations in the BACKGROUND so they never delay
    // request serving. No-ops once the data is already clean.
    seedSystemRoles().catch((error) => {
      console.error("seed/migration error:", error?.message || error);
    });
  })
  .catch((error) => {
    // Do NOT exit the process — exiting breaks `tsx watch` auto-restart and takes
    // the server down on transient DB blips. Log and let mongoose keep retrying.
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
app.use("/api/meeting-rooms", verifyJwt, meetingRoomRoutes);
app.use("/api/calendar", verifyJwt, calendarRoutes);
app.use("/api/tickets", verifyJwt, ticketRoutes);
app.use("/api/v1/resources", verifyJwt, resourceRoutes);
app.use("/api/v1/pricing-packages", verifyJwt, plansPricingRoutes);
app.use("/api/v1/tenant-companies", verifyJwt, tenantCompanyRoutes);

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
  const statusCode = err?.statusCode || err?.status || 500;
  return res.status(statusCode).json({
    message: err?.message || "Internal server error",
  });
});
