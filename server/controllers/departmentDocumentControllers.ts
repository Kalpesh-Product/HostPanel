// @ts-nocheck
import { getCurrentWorkspace } from "../services/core/hr.service.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Department from "../models/Department.js";
import DepartmentDocument from "../models/DepartmentDocument.js";
import { uploadFileToS3 } from "../config/s3config.js";

const normalizeFileName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

const getRoleName = (role: any) => {
  if (!role) return "";
  if (typeof role === "string") return role;
  return role?.name || "";
};

const normalizeRoleForStorage = (role = "") =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

// Mirrors the role-band derivation already used in organizationControllers.ts
// (kept as a small local duplicate — no shared exported version exists yet).
const getRoleBand = (role: any) => {
  const name = getRoleName(role);
  const normalized = normalizeRoleForStorage(name);
  if (normalized === "owner") return "owner";
  if (normalized === "super_admin") return "super_admin";
  if (normalized === "admin" || normalized === "admin_manager") return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

const resolveWorkspaceOrThrow = async (req, res) => {
  const { workspace } = await getCurrentWorkspace(req.user);
  if (!workspace) {
    res.status(404).json({ success: false, message: "Workspace not found for this user." });
    return null;
  }
  return workspace;
};

// Only owner/super_admin (unrestricted) or a manager acting on their own
// department may read/write that department's SOP/Policy documents — mirrors
// the exact scoping already proven in updateOrganizationMemberAccess
// (organizationControllers.ts).
const assertDepartmentAccess = async (req, res, workspace, departmentId) => {
  const actorRoleBand = getRoleBand(req.workspaceMembership?.role || "");
  if (actorRoleBand === "owner" || actorRoleBand === "super_admin") {
    return true;
  }
  if (actorRoleBand !== "manager") {
    res.status(403).json({
      success: false,
      message: "Only founder, super admin, or a department manager can access this.",
    });
    return false;
  }

  const actorMembership = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: req.user,
    isActive: true,
  })
    .select("departments")
    .lean();
  const actorDepartmentIds = new Set(
    (Array.isArray(actorMembership?.departments) ? actorMembership.departments : []).map((d) => String(d)),
  );
  if (!departmentId || !actorDepartmentIds.has(String(departmentId))) {
    res.status(403).json({
      success: false,
      message: "You can only manage documents for your own department.",
    });
    return false;
  }
  return true;
};

export const getDepartmentDocuments = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const departmentId = String(req.query?.departmentId || "").trim();
    const docType = String(req.query?.docType || "").trim();
    if (!departmentId || !["sop", "policy"].includes(docType)) {
      return res.status(400).json({ success: false, message: "departmentId and a valid docType are required." });
    }
    if (!(await assertDepartmentAccess(req, res, workspace, departmentId))) return;

    const documents = await DepartmentDocument.find({
      workspaceId: workspace._id,
      departmentId,
      docType,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: { documents } });
  } catch (error) {
    next(error);
  }
};

export const uploadDepartmentDocument = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const departmentId = String(req.body?.departmentId || "").trim();
    const docType = String(req.body?.docType || "").trim();
    const name = String(req.body?.name || "").trim();
    if (!departmentId || !["sop", "policy"].includes(docType)) {
      return res.status(400).json({ success: false, message: "departmentId and a valid docType are required." });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: "Document name is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided." });
    }
    if (!(await assertDepartmentAccess(req, res, workspace, departmentId))) return;

    const department = await Department.findOne({ _id: departmentId, workspaceId: workspace._id }).lean();
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }

    const safeName = normalizeFileName(req.file.originalname || name);
    const route = `department-documents/${workspace._id}/${departmentId}/${docType}/${Date.now()}-${safeName}`;
    const uploaded = await uploadFileToS3(route, req.file);

    const document = await DepartmentDocument.create({
      workspaceId: workspace._id,
      departmentId,
      docType,
      name,
      fileUrl: uploaded.url,
      filePublicId: uploaded.id,
      uploadedBy: req.user,
    });

    return res.status(201).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

export const updateDepartmentDocument = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const document = await DepartmentDocument.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
    });
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });
    if (!(await assertDepartmentAccess(req, res, workspace, document.departmentId))) return;

    const nextName = String(req.body?.name || "").trim();
    if (!nextName) {
      return res.status(400).json({ success: false, message: "Document name is required." });
    }
    document.name = nextName;
    await document.save();

    return res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

export const toggleDepartmentDocumentStatus = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const document = await DepartmentDocument.findOne({
      _id: req.params.documentId,
      workspaceId: workspace._id,
    });
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });
    if (!(await assertDepartmentAccess(req, res, workspace, document.departmentId))) return;

    document.isActive = Boolean(req.body?.isActive);
    await document.save();

    return res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};
