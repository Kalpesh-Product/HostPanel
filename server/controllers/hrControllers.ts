// @ts-nocheck
import {
  buildDocumentsVaultPayload,
  buildOverviewPayload,
  createOrUpdateEmployeeProfile,
  getCurrentWorkspace,
  toggleEmployeeProfileStatus,
  updateEmployeeProfile,
} from "../services/core/hr.service.js";
import { uploadFileToS3 } from "../config/s3config.js";

const normalizeFileName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

const resolveWorkspaceOrThrow = async (req, res) => {
  const { workspace } = await getCurrentWorkspace(req.user);
  if (!workspace) {
    res.status(404).json({ success: false, message: "Workspace not found for this user." });
    return null;
  }
  return workspace;
};

export const getEmployeeManagementOverview = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await buildOverviewPayload(workspace);
    return res.status(200).json({ success: true, ...data, data });
  } catch (error) {
    next(error);
  }
};

export const createEmployeeRecord = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const employee = await createOrUpdateEmployeeProfile(workspace, req.body || {});
    return res.status(201).json({
      success: true,
      data: employee,
      message: "Employee record created successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeRecord = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const employee = await updateEmployeeProfile(workspace, req.params.employeeId, req.body || {});
    return res.status(200).json({
      success: true,
      data: employee,
      message: "Employee record updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const toggleEmployeeStatus = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const employee = await toggleEmployeeProfileStatus(workspace, req.params.employeeId);
    return res.status(200).json({
      success: true,
      data: employee,
      message: "Employee status updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeDocumentsVault = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await buildDocumentsVaultPayload(workspace);
    return res.status(200).json({ success: true, ...data, data });
  } catch (error) {
    next(error);
  }
};

export const uploadEmployeeDocuments = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;

    const filesByField = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const documentFields = [
      { field: "identityProof", type: "identity-proof" },
      { field: "addressProof", type: "address-proof" },
      { field: "bankProof", type: "bank-proof" },
      { field: "otherDocuments", type: "other-document" },
    ];

    const uploadedDocuments = [];
    for (const { field, type } of documentFields) {
      const files = Array.isArray(filesByField[field]) ? filesByField[field] : [];
      for (const file of files) {
        const safeName = normalizeFileName(file.originalname || field);
        const route = `employee-documents/${workspace._id}/${field}/${Date.now()}-${safeName}`;
        const uploaded = await uploadFileToS3(route, file);
        uploadedDocuments.push({
          name: file.originalname || field,
          type,
          url: uploaded.url,
          publicId: uploaded.id,
          uploadedAt: new Date(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Employee documents uploaded successfully.",
      data: { documents: uploadedDocuments },
    });
  } catch (error) {
    next(error);
  }
};
