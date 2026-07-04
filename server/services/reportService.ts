// @ts-nocheck
import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import { buildReportFileBuffer, safeMakeReportBaseName } from "../utils/reportGenerator.js";
import { uploadFileToS3 } from "../config/s3config.js";

const normalizeText = (v, fallback = "") => String(v ?? fallback).trim();

const getCurrentWorkspaceId = (req) => {
  return (
    req.workspaceMembership?.workspace ||
    req.user?.activeWorkspaceId ||
    req.user?.activeWorkspace ||
    req.user?.primaryWorkspace ||
    req.user?.workspaceId ||
    req.body?.workspaceId ||
    req.query?.workspaceId
  );
};

const getCurrentUserId = (req) => {
  return req.user?._id || req.user?.id || req.user || null;
};

function formatReportForResponse(reportDoc) {
  const r = reportDoc?.toObject ? reportDoc.toObject() : reportDoc;

  return {
    recordId: r._id,
    reportNumber: r.reportNumber,
    reportCode: r.reportCode,
    title: r.title,
    department: r.department || "General",
    departmentId: r.departmentId || null,
    category: r.category,
    dataWindow: r.dataWindow,
    reportMonth: r.reportMonth,
    sourceType: r.sourceType,
    sourceRef: r.sourceRef || "",
    generatedBy: r.generatedBy,
    generatedByUserId: r.generatedByUserId,
    generatedByEmployeeId: r.generatedByEmployeeId,
    generatedAt: r.generatedAt,
    period: r.period,
    size: r.size,
    format: r.format,
    status: r.status,
    description: r.description || "",
    monthlyData: Array.isArray(r.monthlyData) ? r.monthlyData : [],
    reportRows: Array.isArray(r.reportRows) ? r.reportRows : [],
    fileUrl: r.fileUrl || "",
    filePublicId: r.filePublicId || "",
    fileResourceType: r.fileResourceType || "raw",
    fileMimeType: r.fileMimeType || "application/pdf",
    fileName: r.fileName || "",
    downloadCount: r.downloadCount || 0,
    lastDownloadedAt: r.lastDownloadedAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function contentSizeLabel(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer.length : Buffer.byteLength(String(buffer || ""), "utf8");
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
}

async function ensureNextReportNumber(ownerId) {
  const latest = await Report.findOne({ ownerId }).sort({ reportNumber: -1 }).select("reportNumber").lean().exec();
  return (latest?.reportNumber || 7000) + 1;
}

function validateCategory(input) {
  const allowed = ["Attendance", "Employee", "Financial", "Task", "Ticket", "Other"];
  if (input && allowed.includes(input)) return input;
  return "Other";
}

function validateDataWindow(input) {
  const allowed = ["Monthly", "Quarterly", "Annual", "Custom"];
  if (input && allowed.includes(input)) return input;
  return "Monthly";
}

export async function listReportsForCurrentUser(req, query = {}) {
  const workspaceId = getCurrentWorkspaceId(req);
  const userId = getCurrentUserId(req);

  if (!workspaceId) throw Object.assign(new Error("Workspace is required"), { statusCode: 400 });
  if (!userId) throw Object.assign(new Error("User is required"), { statusCode: 401 });

  const {
    department,
    category,
    month,
    dataWindow,
    status,
    page = 1,
    limit = 50,
  } = query;

  const filter = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
  };

  if (department) filter.department = department;
  if (category) filter.category = category;
  if (dataWindow) filter.dataWindow = dataWindow;
  if (status) filter.status = status;

  if (month) {
    // Prefer reportMonth match; fallback to generatedAt range is more complex, so keep it simple.
    filter.$or = [{ reportMonth: month }, { generatedAt: { $gte: new Date(month), $lte: new Date(month) } }];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Number(limit) || 50, 1);
  const skip = (pageNumber - 1) * limitNumber;

  const [total, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter).sort({ generatedAt: -1, createdAt: -1 }).skip(skip).limit(limitNumber).lean().exec(),
  ]);

  return {
    reports: reports.map(formatReportForResponse),
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
  };
}

export async function createReportForCurrentUser(req, body = {}) {
  const workspaceId = getCurrentWorkspaceId(req);
  const userId = getCurrentUserId(req);

  if (!workspaceId) throw Object.assign(new Error("Workspace is required"), { statusCode: 400 });
  if (!userId) throw Object.assign(new Error("User is required"), { statusCode: 401 });

  const title = normalizeText(body.title, "");
  if (!title) throw Object.assign(new Error("title is required"), { statusCode: 400 });

  const category = validateCategory(body.category);
  const dataWindow = validateDataWindow(body.dataWindow);

  const department = normalizeText(body.department, "General");

  const generatedAt = new Date();
  const reportMonth = normalizeText(body.reportMonth || "", "");

  const reportNumber = await ensureNextReportNumber(userId);
  const reportCode = body.reportCode || `RPT-${reportNumber}`;

  const draftReport = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    ownerId: new mongoose.Types.ObjectId(userId),
    reportNumber,
    reportCode,
    title,
    department,
    departmentId: body.departmentId || null,
    category,
    dataWindow,
    reportMonth,
    sourceType: body.sourceType || "custom",
    sourceRef: body.sourceRef || "",
    generatedBy: body.generatedBy || "User",
    generatedByUserId: new mongoose.Types.ObjectId(userId),
    generatedByEmployeeId: body.generatedByEmployeeId || "",
    generatedAt,
    period: body.period || "",
    size: "0 KB",
    format: body.format || "PDF",
    status: body.status || "completed",
    description: body.description || "",
    monthlyData: Array.isArray(body.monthlyData) ? body.monthlyData : [],
    reportRows: Array.isArray(body.reportRows) ? body.reportRows : [],
    fileUrl: "",
    filePublicId: "",
    fileResourceType: "raw",
    fileMimeType: "application/pdf",
    fileName: "",
    downloadCount: 0,
    lastDownloadedAt: null,
  };

  // Generate buffer & upload to S3
  const { buffer, fileName, mimeType, format } = await buildReportFileBuffer(
    draftReport,
    body.format || draftReport.format
  );

  const route = `host-panel/reports/${new mongoose.Types.ObjectId().toString()}-${safeMakeReportBaseName(fileName)}-${format === "Excel" ? "xlsx" : "pdf"}`;

  const uploaded = await uploadFileToS3(route, { buffer, mimetype: mimeType });

  const sizeLabel = contentSizeLabel(buffer);

  const saved = await Report.create({
    ...draftReport,
    size: sizeLabel,
    format,
    fileUrl: uploaded.url || "",
    filePublicId: uploaded.id || "",
    fileResourceType: "raw",
    fileMimeType: mimeType,
    fileName,
  });

  return {
    report: formatReportForResponse(saved),
    download: {
      url: saved.fileUrl,
      fileName: saved.fileName,
      mimeType: saved.fileMimeType,
      publicId: saved.filePublicId,
      resourceType: saved.fileResourceType,
    },
  };
}

export async function downloadReportForCurrentUser(req, reportId, body = {}) {
  const workspaceId = getCurrentWorkspaceId(req);
  const userId = getCurrentUserId(req);

  if (!workspaceId) throw Object.assign(new Error("Workspace is required"), { statusCode: 400 });
  if (!userId) throw Object.assign(new Error("User is required"), { statusCode: 401 });
  if (!reportId) throw Object.assign(new Error("reportId is required"), { statusCode: 400 });

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw Object.assign(new Error("Invalid reportId"), { statusCode: 400 });
  }

  const report = await Report.findOne({ _id: reportId, workspaceId }).exec();
  if (!report) throw Object.assign(new Error("Report not found"), { statusCode: 404 });

  const requestedFormat = body.format || report.format || "PDF";

  const { buffer, fileName, mimeType, format } = await buildReportFileBuffer(report.toObject(), requestedFormat);

  // Always refresh file to match requested format
  const route = `host-panel/reports/${report.reportCode}/${new mongoose.Types.ObjectId().toString()}-${safeMakeReportBaseName(fileName)}`;

  const uploaded = await uploadFileToS3(route, { buffer, mimetype: mimeType });

  report.fileUrl = uploaded.url || "";
  report.filePublicId = uploaded.id || "";
  report.fileMimeType = mimeType;
  report.fileName = fileName;
  report.fileResourceType = "raw";
  report.format = format;
  report.size = contentSizeLabel(buffer);

  report.downloadCount = (report.downloadCount || 0) + 1;
  report.lastDownloadedAt = new Date();
  await report.save();

  return {
    report: formatReportForResponse(report),
    download: {
      url: report.fileUrl,
      fileName: report.fileName,
      mimeType: report.fileMimeType,
      publicId: report.filePublicId,
      resourceType: report.fileResourceType,
    },
  };
}

