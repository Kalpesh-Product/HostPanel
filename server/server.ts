// @ts-nocheck
import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
if (process.env.FORCE_GOOGLE_DNS === 'true') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('[dns-fix] Applied Google DNS servers for local dev');
}
import express from "express";
import cors from "cors";
import multer from "multer";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import { corsConfig } from "./config/corsConfig.js";
import verifyJwt from "./middlewares/verifyJwt.js";
import blockWriteIfImpersonating from "./middlewares/blockWriteIfImpersonating.js";
import activityLogger from "./middlewares/activityLogger.js";
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
import hrRoutes from "./routes/hrRoutes.js";
import { publicRouter as recruitmentPublicRoutes } from "./routes/recruitmentRoutes.js";
import { getPublicRecruitmentJobOpenings } from "./controllers/recruitmentController.js";
import { seedSystemRoles } from "./config/seedRoles.js";
import { startBookingReminderScheduler } from "./services/bookingReminderService.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import housekeepingRoutes from "./routes/housekeepingRoutes.js";
import itRoutes from "./routes/itRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 5006;

// mongoose.set("bufferCommands", false);

const startServer = async () => {
  const databaseUrl = process.env.DB_URL;

  if (!databaseUrl) {
    console.error("DB_URL environment variable is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(databaseUrl, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log("Connected to MongoDB");

    // Run seeds without blocking the API after MongoDB is connected.
    seedSystemRoles().catch((error) => {
      console.error(
        "Seed/migration error:",
        error?.message || error
      );
    });

    // Emails external clients ~30 minutes before their booking starts.
    startBookingReminderScheduler();

    app.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`);
    });
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error?.message || error
    );

    // Let the production hosting platform restart the server.
    process.exit(1);
  }
};

mongoose.connection.on("error", (error) => {
  console.error(
    "MongoDB runtime error:",
    error?.message || error
  );
});

mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected");
});


app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Records every authenticated mutating request into the shared DB so the
// master panel can show host activity. Skips public/auth/impersonated traffic.
app.use(activityLogger);

app.use("/api/auth", authRoutes);
app.post("/api/leads/create-lead", createWebsiteLead);
app.post("/api/company/create-lead", createWebsiteLead);
app.post("/api/company/createLead", createWebsiteLead);
app.post("/api/review/create-website-review", createWebsiteReview);
app.get("/api/review/public", getApprovedWebsiteReviews);
app.get("/api/editor/get-jobs/:workspaceId", getPublicRecruitmentJobOpenings);
app.use("/api/recruitment", recruitmentPublicRoutes);
app.use("/api/editor", verifyJwt, blockWriteIfImpersonating, websiteTemplateRoutes);
app.use("/api/services", verifyJwt, blockWriteIfImpersonating, serviceRoutes);
app.use("/api/leads", verifyJwt, blockWriteIfImpersonating, leadsRoutes);
app.use("/api/listings", verifyJwt, blockWriteIfImpersonating, listingRoutes);
app.use("/api/profile", verifyJwt, blockWriteIfImpersonating, hostUserRoutes);
app.use("/api/review", verifyJwt, blockWriteIfImpersonating, reviewRoutes);
app.use("/api/workspaces", verifyJwt, blockWriteIfImpersonating, workspaceRoutes);
app.use("/api/organization", verifyJwt, blockWriteIfImpersonating, organizationRoutes);
app.use("/api/subscription", verifyJwt, blockWriteIfImpersonating, subscriptionRoutes);
app.use("/api/website-credits", verifyJwt, blockWriteIfImpersonating, websiteCreditsRoutes);
app.use("/api/tickets/support-tickets", verifyJwt, blockWriteIfImpersonating, supportTicketRoutes);
app.use("/api/v1/visitors", verifyJwt, blockWriteIfImpersonating, visitorRoutes);
app.use("/api/assets", verifyJwt, blockWriteIfImpersonating, assetRoutes);
app.use("/api/inventory", verifyJwt, blockWriteIfImpersonating, inventoryRoutes);
app.use("/api/housekeeping", verifyJwt, blockWriteIfImpersonating, housekeepingRoutes);
app.use("/api/maintenance", verifyJwt, blockWriteIfImpersonating, maintenanceRoutes);
app.use("/api/tasks", verifyJwt, blockWriteIfImpersonating, taskRoutes);
app.use("/api/finance", verifyJwt, blockWriteIfImpersonating, financeRoutes);
app.use("/api/hr", verifyJwt, blockWriteIfImpersonating, hrRoutes);
app.use("/api/attendance", verifyJwt, blockWriteIfImpersonating, attendanceRoutes);
app.use("/api/it", verifyJwt, blockWriteIfImpersonating, itRoutes);
app.use("/api/meeting-rooms", verifyJwt, blockWriteIfImpersonating, meetingRoomRoutes);
app.use("/api/calendar", verifyJwt, blockWriteIfImpersonating, calendarRoutes);
app.use("/api/notifications", verifyJwt, blockWriteIfImpersonating, notificationRoutes);
app.use("/api/tickets", verifyJwt, blockWriteIfImpersonating, ticketRoutes);
app.use("/api/v1/resources", verifyJwt, blockWriteIfImpersonating, resourceRoutes);
app.use("/api/v1/pricing-packages", verifyJwt, blockWriteIfImpersonating, plansPricingRoutes);
app.use("/api/v1/tenant-companies", verifyJwt, blockWriteIfImpersonating, tenantCompanyRoutes);
app.use("/api/reports", verifyJwt, blockWriteIfImpersonating, reportRoutes);

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


app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err?.stack || err?.message || err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err?.statusCode || err?.status || 500;

  return res.status(statusCode).json({
    message: err?.message || "Internal server error",
  });
});

startServer();
