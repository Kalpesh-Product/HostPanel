// @ts-nocheck
import {
  buildDocumentsVaultPayload,
  buildOverviewPayload,
  createOrUpdateEmployeeProfile,
  getCurrentWorkspace,
  toggleEmployeeProfileStatus,
  updateEmployeeProfile,
  updateOwnEmployeeProfile,
  updateOwnProfilePicture,
} from "../services/core/hr.service.js";
import { uploadFileToS3 } from "../config/s3config.js";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import TenantEmployee from "../models/TenantEmployee.js";
import Workspace from "../models/Workspace.js";
import {
  addHrPayrollAdjustment,
  getHrPayrollSnapshot,
  prepareHrPayrollCycle,
  updateHrPayrollCycleStatus,
} from "../services/payrollService.js";
import { listBanksByCountry, verifyBankDetails } from "../services/bankVerificationService.js";

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

export const getEmployeeBankDirectory = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await listBanksByCountry({
      countryCode: String(req.query.countryCode || ""),
      state: String(req.query.state || ""),
      city: String(req.query.city || ""),
    });
    return res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

export const verifyEmployeeBankAccount = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await verifyBankDetails(req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
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

export const updateMyEmployeeProfile = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const phone = String(payload.phone || "").trim();
    const phoneCountryIso = String(payload.phoneCountryIso || "").trim().toUpperCase();
    if (phone) {
      const parsedPhone = parsePhoneNumberFromString(phone);
      const isCountryMatch = !phoneCountryIso || parsedPhone?.country === phoneCountryIso;
      if (!parsedPhone?.isValid() || !isCountryMatch) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid phone number for the selected country.",
        });
      }
    }
    const { phoneCountryIso: _phoneCountryIso, ...profilePayload } = payload;

    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const employee = await updateOwnEmployeeProfile(workspace, req.user, profilePayload);
    return res.status(200).json({
      success: true,
      data: employee,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfilePicture = async (req, res, next) => {
  try {
    let { workspace } = await getCurrentWorkspace(req.user);
    if (!workspace) {
      const tenantEmployee = await TenantEmployee.findOne({
        userId: req.user,
        status: "Active",
      }).select("workspaceId").lean().exec();
      workspace = tenantEmployee?.workspaceId
        ? await Workspace.findById(tenantEmployee.workspaceId).lean().exec()
        : null;
    }
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found for this user." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }
    const employee = await updateOwnProfilePicture(workspace, req.user, req.file);
    return res.status(200).json({
      success: true,
      data: employee,
      message: "Profile picture updated successfully.",
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

export const getPayrollSnapshot = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await getHrPayrollSnapshot({ workspace, userId: req.user, query: req.query });
    return res.status(200).json({ success: true, message: "Payroll snapshot loaded successfully.", data });
  } catch (error) { next(error); }
};

export const preparePayroll = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await prepareHrPayrollCycle({ workspace, userId: req.user, body: req.body });
    return res.status(200).json({ success: true, message: "Payroll cycle prepared successfully.", data });
  } catch (error) { next(error); }
};

export const updatePayrollStatus = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await updateHrPayrollCycleStatus({ workspace, userId: req.user, cycleId: req.params.cycleId, body: req.body });
    return res.status(200).json({ success: true, message: "Payroll cycle status updated successfully.", data });
  } catch (error) { next(error); }
};

export const createPayrollAdjustment = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const data = await addHrPayrollAdjustment({ workspace, userId: req.user, cycleId: req.params.cycleId, profileId: req.params.profileId, body: req.body });
    return res.status(200).json({ success: true, message: "Payroll adjustment applied successfully.", data });
  } catch (error) { next(error); }
};
