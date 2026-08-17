// @ts-nocheck
import {
  buildDocumentsVaultPayload,
  buildOverviewPayload,
  createOrUpdateEmployeeProfile,
  getCurrentWorkspace,
  toggleEmployeeProfileStatus,
  resendEmployeeInvite,
  updateEmployeeProfile,
  updateOwnEmployeeProfile,
  updateOwnProfilePicture,
} from "../services/core/hr.service.js";
import { uploadFileToS3 } from "../config/s3config.js";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import TenantEmployee from "../models/TenantEmployee.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Department from "../models/Department.js";
import {
  addHrPayrollAdjustment,
  buildWorkspacePayslipTemplatePreview,
  getHrPayrollSnapshot,
  lockWorkspacePayslipTemplate,
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

const isHrDepartmentName = (name = "") => {
  const normalized = String(name || "").trim().toLowerCase();
  return normalized === "hr"
    || normalized.startsWith("hr-")
    || normalized.startsWith("hr ")
    || normalized.includes("human resources")
    || normalized.includes("human-resources");
};

const canConfigurePayrollTemplate = async (req, workspace) => {
  const rawRole = req.workspaceMembership?.role?.name || req.workspaceMembership?.role || "";
  const role = String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["owner", "founder", "super_admin", "superadmin", "hr_manager", "hr", "human_resources"].includes(role)) {
    return true;
  }
  if (role !== "manager") return false;

  const actorMembership = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: req.user,
    isActive: true,
  })
    .select("departments")
    .lean();
  const departmentIds = Array.isArray(actorMembership?.departments) ? actorMembership.departments : [];
  if (departmentIds.length === 0) return false;

  const departments = await Department.find({
    _id: { $in: departmentIds },
    workspaceId: workspace._id,
  })
    .select("name")
    .lean();
  return departments.some((department) => isHrDepartmentName(department?.name));
};

const assertPayrollTemplateAccess = async (req, res, workspace) => {
  if (await canConfigurePayrollTemplate(req, workspace)) return true;
  res.status(403).json({
    success: false,
    message: "Only the HR manager, founder, or super admin can configure the payroll template.",
  });
  return false;
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

export const resendInviteToEmployee = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace) return;
    const employee = await resendEmployeeInvite(workspace, req.params.employeeId);
    return res.status(200).json({
      success: true,
      data: employee,
      message: "Invite sent successfully.",
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
    data.settings = {
      ...(data.settings || {}),
      canConfigurePayslipTemplate: await canConfigurePayrollTemplate(req, workspace),
    };
    return res.status(200).json({ success: true, message: "Payroll snapshot loaded successfully.", data });
  } catch (error) { next(error); }
};

export const previewPayrollPayslipTemplate = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace || !(await assertPayrollTemplateAccess(req, res, workspace))) return;
    const pdfBuffer = await buildWorkspacePayslipTemplatePreview({
      workspace,
      templateId: req.params.templateId,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=payroll-template-preview.pdf");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(pdfBuffer);
  } catch (error) { next(error); }
};

export const selectPayrollPayslipTemplate = async (req, res, next) => {
  try {
    const workspace = await resolveWorkspaceOrThrow(req, res);
    if (!workspace || !(await assertPayrollTemplateAccess(req, res, workspace))) return;
    const data = await lockWorkspacePayslipTemplate({
      workspaceId: workspace._id,
      userId: req.user,
      templateId: req.body?.templateId,
    });
    return res.status(200).json({
      success: true,
      message: "Payroll template selected and locked successfully.",
      data,
    });
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
