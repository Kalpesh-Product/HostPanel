// @ts-nocheck
import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import { buildReportFileBuffer, safeMakeReportBaseName } from "../utils/reportGenerator.js";
import { uploadFileToS3, getFileFromS3ByUrl } from "../config/s3config.js";

const normalizeText = (v, fallback = "") => String(v ?? fallback).trim();

const getCurrentWorkspaceId = (req) => {
  return (
    req.workspaceMembership?.workspace ||
    req.user?.activeWorkspaceId ||
    req.user?.activeWorkspace ||
    req.user?.primaryWorkspace ||
    req.user?.workspaceId
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

async function ensureNextReportNumber(workspaceId) {
  const latest = await Report.findOne({ workspaceId }).sort({ reportNumber: -1 }).select("reportNumber").lean().exec();
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

function normalizeRole(value) {
  return normalizeText(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function getAccessibleReportDepartments(req) {
  const membership = req.workspaceMembership || {};
  const departments = Array.isArray(membership.departments) ? membership.departments : [];
  return [...new Set(departments
    .map((department) => normalizeText(department?.name || department))
    .filter(Boolean))];
}

function canViewAllReports(req) {
  const role = normalizeRole(req.workspaceMembership?.role?.name || req.workspaceMembership?.role || req.user?.role);
  return role === "owner" || role === "founder" || role === "super_admin";
}

async function canCreateFinanceReport(req) {
  const role = normalizeRole(req.workspaceMembership?.role?.name || req.workspaceMembership?.role || req.user?.role);
  if (["finance", "finance_manager", "finance_manager_role"].includes(role)) return true;
  if (getAccessibleReportDepartments(req).some((department) => normalizeRole(department) === "finance")) return true;

  const workspaceId = getCurrentWorkspaceId(req);
  const userId = getCurrentUserId(req);
  if (!workspaceId || !userId) return false;
  const profile = await EmployeeProfile.findOne({ workspaceId, linkedUserId: userId })
    .populate("departments", "name")
    .select("departments")
    .lean();
  return Array.isArray(profile?.departments) && profile.departments.some((department: any) => normalizeRole(department?.name) === "finance");
}

function isFinanceReportUser(req) {
  const role = normalizeRole(req.workspaceMembership?.role?.name || req.workspaceMembership?.role || req.user?.role);
  if (["finance", "finance_manager", "finance_manager_role"].includes(role)) return true;
  const department = req.workspaceMembership?.department || req.user?.department;
  return normalizeRole(department?.name || department) === "finance";
}

function buildReportVisibilityFilter(req, userId) {
  if (canViewAllReports(req)) return null;

  const visibility = [
    { generatedByUserId: new mongoose.Types.ObjectId(userId) },
  ];
  const employeeId = normalizeText(req.workspaceMembership?.employeeId || req.user?.employeeId);
  const generatedBy = normalizeText(req.workspaceMembership?.fullName || req.user?.fullName || req.user?.name);
  const departments = getAccessibleReportDepartments(req);

  if (employeeId) visibility.push({ generatedByEmployeeId: employeeId });
  if (generatedBy) visibility.push({ generatedBy });
  if (departments.length > 0) visibility.push({ department: { $in: departments } });
  if (isFinanceReportUser(req)) visibility.push({ department: "Finance" });

  return { $or: visibility };
}

function ensureReportVisibility(report, req, userId) {
  const visibility = buildReportVisibilityFilter(req, userId);
  if (!visibility) return;

  const matches = visibility.$or.some((condition) => {
    const [field, expected] = Object.entries(condition)[0] || [];
    const actual = report?.[field];
    if (field === "generatedByUserId") return actual && String(actual) === String(expected);
    if (condition.department?.$in) return condition.department.$in.includes(String(actual || ""));
    return normalizeText(actual) === normalizeText(expected);
  });
  if (!matches) throw Object.assign(new Error("Report not found"), { statusCode: 404 });
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

  const visibilityFilter = buildReportVisibilityFilter(req, userId);
  if (visibilityFilter) filter.$and = [visibilityFilter];

  if (department) (filter.$and || (filter.$and = [])).push({ department });
  if (category) filter.category = category;
  if (dataWindow) filter.dataWindow = dataWindow;
  if (status) filter.status = status;

  if (month) {
    const [year, monthNumber] = String(month).split("-").map(Number);
    const monthStart = new Date(year, monthNumber - 1, 1);
    const monthEnd = new Date(year, monthNumber, 1);
    const monthFilter = Number.isFinite(monthStart.getTime())
      ? { $or: [{ reportMonth: month }, { reportMonth: { $in: ["", null] }, generatedAt: { $gte: monthStart, $lt: monthEnd } }] }
      : { reportMonth: month };
    (filter.$and || (filter.$and = [])).push(monthFilter);
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

  if (!canViewAllReports(req)) {
    const departments = getAccessibleReportDepartments(req);
    if (department !== "General" && !(department === "Finance" && await canCreateFinanceReport(req)) && !departments.includes(department)) {
      throw Object.assign(new Error("You do not have permission to create reports for this department."), { statusCode: 403 });
    }
  }

  const generatedAt = new Date();
  const reportMonth = normalizeText(body.reportMonth || "", "");

  const reportNumber = await ensureNextReportNumber(workspaceId);
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
      // Same-origin streaming URL — the browser downloads it as an attachment
      // (see /file/:reportId below) instead of opening S3 cross-origin.
      url: `/api/reports/file/${saved._id}`,
      fileName,
      mimeType,
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
  ensureReportVisibility(report, req, userId);

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
      url: `/api/reports/file/${report._id}`,
      fileName: report.fileName,
      mimeType: report.fileMimeType,
      publicId: report.filePublicId,
      resourceType: report.fileResourceType,
    },
  };
}

// Streams the stored S3 file back through the API as a same-origin attachment
// download. Avoids the bucket's CORS config entirely, so client-side blob
// fetches always succeed and files save to disk instead of opening a new tab.
export async function getReportFileForCurrentUser(req, res) {
  const workspaceId = getCurrentWorkspaceId(req);
  const userId = getCurrentUserId(req);

  if (!workspaceId) throw Object.assign(new Error("Workspace is required"), { statusCode: 400 });
  if (!userId) throw Object.assign(new Error("User is required"), { statusCode: 401 });

  const { reportId } = req.params;
  if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
    throw Object.assign(new Error("Invalid reportId"), { statusCode: 400 });
  }

  const report = await Report.findOne({ _id: reportId, workspaceId }).exec();
  if (!report) throw Object.assign(new Error("Report not found"), { statusCode: 404 });
  ensureReportVisibility(report, req, userId);
  if (!report.fileUrl) throw Object.assign(new Error("Report file is not available"), { statusCode: 404 });

  const { data, contentType } = await getFileFromS3ByUrl(report.fileUrl);

  const safeName = String(report.fileName || `report-${report.reportCode}.pdf`).replace(/["\\\r\n]/g, "");
  res.setHeader("Content-Type", contentType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
  );
  res.setHeader("Content-Length", String(data.length));
  res.status(200).send(data);
}

