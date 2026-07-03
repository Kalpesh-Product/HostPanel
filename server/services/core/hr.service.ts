// @ts-nocheck
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import HostUser from "../../models/HostUser.js";
import Workspace from "../../models/Workspace.js";
import WorkspaceMember from "../../models/WorkspaceMember.js";
import Department from "../../models/Department.js";
import EmployeeProfile from "../../models/EmployeeProfile.js";
import { Role } from "../../models/Role.js";
import { formatEmployeeId } from "../../utils/employee-id.js";

const SYSTEM_ROLE_NAMES = new Set(["founder", "owner", "super_admin", "admin", "manager", "employee"]);
const EMPLOYEE_COUNTER_COLLECTION = "counters";
const EMPLOYEE_COUNTER_KEY = (workspaceId: any) => `employeeProfileSr:${String(workspaceId || "")}`;

const employeeCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    collection: EMPLOYEE_COUNTER_COLLECTION,
    versionKey: false,
  },
);

const EmployeeProfileCounter =
  mongoose.models.EmployeeProfileCounter ||
  mongoose.model("EmployeeProfileCounter", employeeCounterSchema);

const normalizeText = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const isFormattedEmployeeId = (value = "") => /^EMP-\d{5}$/.test(String(value || "").trim().toUpperCase());

const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();

const normalizeRoleForStorage = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "owner") return "founder";
  return normalized || "employee";
};

const normalizeRoleForDisplay = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "founder") return "owner";
  return normalized || "employee";
};

const isWorkspaceLeaderRole = (value = "") => {
  const normalized = normalizeRoleForStorage(value);
  return normalized === "founder" || normalized === "super_admin" || normalized === "owner";
};

const toId = (value: any) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const getCurrentWorkspace = async (userId: string) => {
  const user = await HostUser.findById(userId).lean().exec();
  if (!user) return { user: null, workspace: null, membership: null };

  let workspace = null;
  if (user.primaryWorkspace) {
    workspace = await Workspace.findById(user.primaryWorkspace).lean().exec();
  }

  if (!workspace) {
    workspace = await Workspace.findOne({ owner: user._id, isActive: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  if (!workspace) {
    const membershipWorkspace = await WorkspaceMember.findOne({
      user: user._id,
      isActive: true,
    })
      .sort({ isPrimary: -1, createdAt: 1 })
      .populate("workspace")
      .lean()
      .exec();
    workspace = membershipWorkspace?.workspace || null;
  }

  const membership = workspace?._id
    ? await WorkspaceMember.findOne({
      user: user._id,
      workspace: workspace._id,
      isActive: true,
    })
      .populate("role")
      .populate("departments")
      .lean()
      .exec()
    : null;

  return { user, workspace, membership };
};

const getRoleDocument = async (workspaceId: any, roleValue = "") => {
  const normalizedForStorage = normalizeRoleForStorage(roleValue);
  const lookupNames = normalizedForStorage === "founder"
    ? ["founder", "owner"]
    : [normalizedForStorage];

  const workspaceObjectId = workspaceId && mongoose.isValidObjectId(workspaceId)
    ? new mongoose.Types.ObjectId(workspaceId)
    : null;

  let roleDoc = await Role.findOne({
    workspaceId: workspaceObjectId,
    name: { $in: lookupNames },
  }).exec();

  if (!roleDoc) {
    roleDoc = await Role.findOne({
      workspaceId: null,
      name: { $in: lookupNames },
    }).exec();
  }

  if (!roleDoc) {
    roleDoc = await Role.create({
      name: normalizedForStorage,
      workspaceId: workspaceObjectId,
      permissions: [],
      isSystemRole: SYSTEM_ROLE_NAMES.has(normalizedForStorage),
    });
  }

  return roleDoc;
};

const getDepartmentIdsAndNames = async (workspaceId: any, departments: any[] = []) => {
  const departmentDocs = [];

  for (const department of departments) {
    const rawValue = department?._id || department?.id || department;
    const asText = normalizeText(rawValue);
    if (!asText) continue;

    if (mongoose.isValidObjectId(asText)) {
      const existingById = await Department.findOne({ _id: asText, workspaceId }).select("_id name").lean().exec();
      if (existingById) {
        departmentDocs.push(existingById);
        continue;
      }
    }

    const existingByName = await Department.findOne({
      workspaceId,
      name: new RegExp(`^${asText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    })
      .select("_id name")
      .lean()
      .exec();

    if (existingByName) {
      departmentDocs.push(existingByName);
      continue;
    }

    const created = await Department.create({
      workspaceId,
      name: asText,
      description: "",
      isActive: true,
    });
    departmentDocs.push({ _id: created._id, name: created.name });
  }

  return {
    ids: departmentDocs.map((dept) => dept._id),
    names: departmentDocs.map((dept) => dept.name).filter(Boolean),
  };
};

const getWorkspaceDepartmentIdsAndNames = async (workspaceId: any) => {
  const departments = await Department.find({ workspaceId, isActive: true })
    .select("_id name")
    .sort({ name: 1 })
    .lean()
    .exec();

  return {
    ids: departments.map((dept) => dept._id),
    names: departments.map((dept) => dept.name).filter(Boolean),
  };
};

const getNextEmployeeSequence = async (workspaceId: any) => {
  const counterKey = EMPLOYEE_COUNTER_KEY(workspaceId);
  const counter = await EmployeeProfileCounter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
    .lean()
    .exec();

  const sequence = Number(counter?.seq || 1);
  return sequence > 0 ? sequence : 1;
};

const resolveRoleValueFromMember = async (member: any) => {
  if (member?.role && typeof member.role === "object" && member.role.name) {
    return member.role.name;
  }

  const roleId = String(member?.role || "");
  if (roleId && mongoose.isValidObjectId(roleId)) {
    const roleDoc = await Role.findById(roleId).lean().exec();
    if (roleDoc?.name) return roleDoc.name;
    return "employee";
  }

  return String(member?.role || "");
};

const resolveProfileStatus = ({
  profile,
  member,
  user,
}: {
  profile?: any;
  member?: any;
  user?: any;
}) => {
  const memberStatus = String(member?.status || "").toLowerCase();
  const inviteStatus = String(user?.inviteStatus || "").toLowerCase();
  const currentStatus = String(profile?.status || "").toLowerCase();

  if (member?.isActive === false || memberStatus === "disabled") return "inactive";
  if (inviteStatus === "registered") return "registered";
  if (inviteStatus === "joined") return "joined";
  if (memberStatus === "invited" || inviteStatus === "invite_sent") return "invite_sent";
  if (currentStatus && !["pending", "invite_sent"].includes(currentStatus)) return currentStatus;
  return "active";
};

const mapEmployeeProfileToResponse = async (profileDoc: any) => {
  const profile = profileDoc?.toObject ? profileDoc.toObject() : profileDoc;
  const populatedRole = profile?.workspaceRole;
  const departments = Array.isArray(profile?.departments)
    ? profile.departments
    : [];

  const departmentNames = departments
    .map((dept: any) => {
      if (!dept) return "";
      if (typeof dept === "string") return dept;
      return dept.name || "";
    })
    .filter(Boolean);

  const rawRoleName = typeof populatedRole === "object"
    ? String(populatedRole?.name || "")
    : String(populatedRole || "");
  const displayRole = normalizeRoleForDisplay(rawRoleName || profile?.role || "employee");

  return {
    _id: String(profile._id || ""),
    id: String(profile._id || profile.employeeId || ""),
    employeeId: String(profile.employeeId || ""),
    employeeCode: String(profile.employeeId || ""),
    fullName: String(profile.fullName || ""),
    name: String(profile.fullName || ""),
    email: String(profile.email || ""),
    phone: String(profile.phone || ""),
    currentAddress: String(profile.currentAddress || ""),
    country: String(profile.country || ""),
    state: String(profile.state || ""),
    city: String(profile.city || ""),
    emergencyContactName: String(profile.emergencyContactName || ""),
    emergencyContactPhone: String(profile.emergencyContactPhone || ""),
    jobTitle: String(profile.jobTitle || displayRole || "employee"),
    jobCode: String(profile.jobCode || ""),
    departments: departmentNames,
    departmentNames,
    department: departmentNames[0] || "",
    workLocation: String(profile.workLocation || ""),
    workMode: String(profile.workMode || "hybrid"),
    managerName: String(profile.managerName || ""),
    managerUserId: toId(profile.managerUserId || ""),
    workspaceRole: displayRole,
    rawRole: rawRoleName || displayRole,
    isHousekeepingStaff: Boolean(profile.isHousekeepingStaff),
    employmentType: String(profile.employmentType || "full_time").replace(/_/g, "-"),
    internshipIsUnpaid: Boolean(profile.internshipIsUnpaid),
    status: resolveProfileStatus({ profile }),
    joiningDate: profile.joiningDate || null,
    joiningDateValue: profile.joiningDate || "",
    internshipDurationMonths: String(profile.internshipDurationMonths || ""),
    internshipEndDate: profile.internshipEndDate || null,
    noticePeriodDays: Number(profile.noticePeriodDays || 0),
    probationDays: Number(profile.probationDays || 0),
    salaryPackage: {
      amount: Number(profile?.salaryPackage?.amount || 0),
      grossAnnual: Number(profile?.salaryPackage?.grossAnnual || profile?.salaryPackage?.amount || 0),
      currency: String(profile?.salaryPackage?.currency || "INR"),
      payFrequency: String(profile?.salaryPackage?.payFrequency || "annual"),
    },
    bankName: String(profile.bankName || ""),
    accountHolderName: String(profile.accountHolderName || ""),
    accountNumber: String(profile.accountNumber || ""),
    ifscCode: String(profile.ifscCode || ""),
    nationalIdType: String(profile.nationalIdType || ""),
    nationalIdNumber: String(profile.nationalIdNumber || ""),
    taxId: String(profile.taxId || ""),
    providentFundNumber: String(profile.providentFundNumber || ""),
    permissions: {
      modules: Array.isArray(profile.accessModules) ? profile.accessModules : [],
      features: Array.isArray(profile.accessFeatures) ? profile.accessFeatures : [],
    },
    documents: Array.isArray(profile.documents)
      ? profile.documents.map((doc: any) => ({
        name: String(doc?.name || ""),
        type: String(doc?.type || "document"),
        uploadedAt: doc?.uploadedAt || null,
        url: String(doc?.url || ""),
        publicId: String(doc?.publicId || ""),
      }))
      : [],
    notes: String(profile.notes || ""),
    lastLogin: profile.lastLoginAt || null,
    userId: toId(profile.linkedUserId || ""),
    linkedUserId: toId(profile.linkedUserId || ""),
    linkedWorkspaceMemberId: toId(profile.linkedWorkspaceMemberId || ""),
    source: profile.linkedWorkspaceMemberId ? "workspace-member" : "hr",
    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,
  };
};

const maybeSendEmployeeInviteEmail = async ({
  workspace,
  payload,
  employee,
}: {
  workspace: any;
  payload: any;
  employee: any;
}) => {
  const shouldInvite = Boolean(payload?.sendInvite) || String(payload?.status || employee?.status || "").toLowerCase() === "invite_sent";
  if (!shouldInvite) return;

  const inviteEmail = normalizeEmail(employee?.email || payload?.email || "");
  const inviteName = normalizeText(employee?.fullName || payload?.fullName || "");
  if (!inviteEmail || !inviteName) return;

  const inviteSecret =
    process.env.HOST_INVITE_TOKEN_SECRET ||
    process.env.REGISTER_INVITE_SECRET ||
    process.env.ACCESS_TOKEN_SECRET;
  const frontendBase =
    String(process.env.FRONTEND_PROD_LINK || process.env.FRONTEND_DEV_LINK || "http://localhost:5173")
      .trim()
      .replace(/\/$/, "");

  if (!inviteSecret || !frontendBase) return;

  const inviteToken = jwt.sign(
    {
      inviteEmail,
      inviteName,
      inviteType: "workspace-employee",
      workspaceId: String(workspace?._id || ""),
      workspaceName: String(workspace?.workspaceName || workspace?.businessName || ""),
    },
    inviteSecret,
    { expiresIn: "7d" },
  );

  const inviteLink = `${frontendBase}/register/${inviteToken}`;

  try {
    const { sendMail } = await import("../../config/mailer.js");
    await sendMail({
      to: inviteEmail,
      subject: `You're invited to join ${workspace?.businessName || workspace?.workspaceName || "our workspace"}`,
      html: `
        <p>Hi ${inviteName},</p>
        <p>Your employee profile has been created.</p>
        <p>Use the link below to complete your registration and set your password:</p>
        <p><a href="${inviteLink}" target="_blank" rel="noreferrer">Complete Registration</a></p>
        <p>This invite link expires in 7 days.</p>
      `,
    });
  } catch (error) {
    console.error("[hr] Failed to send employee invite email", {
      workspaceId: String(workspace?._id || ""),
      email: inviteEmail,
      message: error?.message || error,
    });
  }
};

const ensureEmployeeProfileForMember = async ({
  workspace,
  member,
  user,
}: {
  workspace: any;
  member: any;
  user?: any;
}) => {
  if (!workspace?._id || !member?._id || !member?.user) return null;

  const resolvedUser = user || (await HostUser.findById(member.user).lean().exec());
  const roleValue = await resolveRoleValueFromMember(member);
  const roleDoc = await getRoleDocument(workspace._id, roleValue || resolvedUser?.role || "employee");
  const departmentData = isWorkspaceLeaderRole(roleValue || resolvedUser?.role || "")
    ? await getWorkspaceDepartmentIdsAndNames(workspace._id)
    : await getDepartmentIdsAndNames(workspace._id, Array.isArray(member.departments)
      ? member.departments
        .map((dept: any) => dept?._id || dept)
        .filter(Boolean)
      : []);
  const email = normalizeEmail(resolvedUser?.email || "");

  let profile = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [
      { linkedUserId: resolvedUser?._id || member.user },
      { linkedWorkspaceMemberId: member._id },
      ...(email ? [{ email }] : []),
    ],
  }).exec();

  const status = resolveProfileStatus({
    profile,
    member,
    user: resolvedUser,
  });
  const employeeSequence = Number(profile?.employeeSequence || 0) || await getNextEmployeeSequence(workspace._id);
  const employeeId = profile?.employeeId && isFormattedEmployeeId(profile.employeeId)
    ? String(profile.employeeId).trim().toUpperCase()
    : formatEmployeeId(employeeSequence);

  const nextValues = {
    workspaceId: workspace._id,
    linkedUserId: resolvedUser?._id || member.user,
    linkedWorkspaceMemberId: member._id,
    employeeSequence,
    employeeId,
    fullName: normalizeText(resolvedUser?.name || profile?.fullName || ""),
    email,
    phone: normalizeText(resolvedUser?.phone || profile?.phone || ""),
    jobTitle: normalizeText(profile?.jobTitle || roleDoc?.name || resolvedUser?.designation || "Employee") || "Employee",
    jobCode: normalizeText(profile?.jobCode || ""),
    departments: departmentData.ids,
    workLocation: normalizeText(profile?.workLocation || ""),
    country: normalizeText(profile?.country || resolvedUser?.country || ""),
    state: normalizeText(profile?.state || resolvedUser?.state || ""),
    city: normalizeText(profile?.city || resolvedUser?.city || ""),
    workMode: profile?.workMode || "hybrid",
    managerName: normalizeText(profile?.managerName || ""),
    managerUserId: profile?.managerUserId || null,
    workspaceRole: roleDoc._id,
    isHousekeepingStaff: Boolean(profile?.isHousekeepingStaff),
    employmentType: profile?.employmentType || "full_time",
    internshipIsUnpaid: Boolean(profile?.internshipIsUnpaid),
    status,
    joiningDate: profile?.joiningDate || resolvedUser?.registeredAt || resolvedUser?.joinedAt || null,
    internshipDurationMonths: Number(profile?.internshipDurationMonths || 0),
    internshipEndDate: profile?.internshipEndDate || null,
    noticePeriodDays: Number(profile?.noticePeriodDays || 0),
    probationDays: Number(profile?.probationDays || 0),
    salaryPackage: {
      amount: Number(profile?.salaryPackage?.amount || 0),
      grossAnnual: Number(profile?.salaryPackage?.grossAnnual || 0),
      currency: String(profile?.salaryPackage?.currency || "INR"),
      payFrequency: String(profile?.salaryPackage?.payFrequency || "annual"),
      allowances: Number(profile?.salaryPackage?.allowances || 0),
      deductions: Number(profile?.salaryPackage?.deductions || 0),
    },
    bankName: String(profile?.bankName || ""),
    accountHolderName: String(profile?.accountHolderName || ""),
    accountNumber: String(profile?.accountNumber || ""),
    ifscCode: String(profile?.ifscCode || ""),
    nationalIdType: String(profile?.nationalIdType || ""),
    nationalIdNumber: String(profile?.nationalIdNumber || ""),
    taxId: String(profile?.taxId || ""),
    providentFundNumber: String(profile?.providentFundNumber || ""),
    accessModules: Array.isArray(profile?.accessModules) ? profile.accessModules : [],
    accessFeatures: Array.isArray(profile?.accessFeatures) ? profile.accessFeatures : [],
    documents: Array.isArray(profile?.documents) ? profile.documents : [],
    notes: String(profile?.notes || ""),
    lastLoginAt: profile?.lastLoginAt || null,
    isActive: member?.isActive !== false,
    archivedAt: profile?.archivedAt || null,
    createdBy: profile?.createdBy || resolvedUser?._id || null,
    updatedBy: resolvedUser?._id || profile?.updatedBy || null,
  };

  if (!profile) {
    profile = await EmployeeProfile.create(nextValues);
    return profile;
  }

  Object.assign(profile, nextValues);
  await profile.save();
  return profile;
};

const ensureEmployeeProfilesForWorkspace = async (workspace: any) => {
  if (!workspace?._id) return [];
  const members = await WorkspaceMember.find({ workspace: workspace._id })
    .populate("role")
    .populate("departments")
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .exec();

  const syncedProfiles = [];
  for (const member of members) {
    try {
      const profile = await ensureEmployeeProfileForMember({
        workspace,
        member,
      });
      if (profile) syncedProfiles.push(profile);
    } catch (error) {
      console.error("[hr] Failed to sync employee profile for member", {
        workspaceId: String(workspace?._id || ""),
        memberId: String(member?._id || ""),
        message: error?.message || error,
      });
    }
  }
  return syncedProfiles;
};

const buildEmployeeSummary = (employees: any[] = []) => ({
  totalEmployees: employees.length,
  activeEmployees: employees.filter((employee) => employee.status === "active").length,
  inactiveEmployees: employees.filter((employee) => ["inactive", "terminated"].includes(employee.status)).length,
  totalDocuments: employees.reduce((sum, employee) => sum + (Array.isArray(employee.documents) ? employee.documents.length : 0), 0),
});

const buildOverviewPayload = async (workspace: any) => {
  try {
    await ensureEmployeeProfilesForWorkspace(workspace);
  } catch (error) {
    console.error("[hr] Failed to warm employee profiles before overview", {
      workspaceId: String(workspace?._id || ""),
      message: error?.message || error,
    });
  }
  const profiles = await EmployeeProfile.find({ workspaceId: workspace._id })
    .populate("workspaceRole")
    .populate("departments")
    .populate("linkedUserId", "name email inviteStatus isActive")
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  for (const profile of profiles) {
    const currentSequence = Number(profile?.employeeSequence || 0);
    const hasValidEmployeeId = Boolean(profile?.employeeId && isFormattedEmployeeId(profile.employeeId));
    if (hasValidEmployeeId) continue;

    const nextSequence = currentSequence > 0 ? currentSequence : await getNextEmployeeSequence(workspace._id);
    const nextEmployeeId = formatEmployeeId(nextSequence);

    if (String(profile?.employeeId || "").trim().toUpperCase() !== nextEmployeeId || currentSequence !== nextSequence) {
      await EmployeeProfile.updateOne(
        { _id: profile._id },
        {
          $set: {
            employeeSequence: nextSequence,
            employeeId: nextEmployeeId,
          },
        },
        ).exec();
    }
  }

  const refreshedProfiles = await EmployeeProfile.find({ workspaceId: workspace._id })
    .populate("workspaceRole")
    .populate("departments")
    .populate("linkedUserId", "name email inviteStatus isActive")
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const employees = [];
  for (const profile of refreshedProfiles) {
    employees.push(await mapEmployeeProfileToResponse(profile));
  }

  const departments = await Department.find({ workspaceId: workspace._id, isActive: true })
    .select("_id name description")
    .sort({ name: 1 })
    .lean()
    .exec();

  const jobTitles = Array.from(
    new Map(
      employees
        .map((employee) => [normalizeText(employee.jobTitle || employee.workspaceRole || ""), employee])
        .filter(([key]) => Boolean(key)),
    ).values(),
  ).slice(0, 100);

  const bankNames = Array.from(
    new Set(employees.map((employee) => normalizeText(employee.bankName || "")).filter(Boolean)),
  ).sort();

  const bankBranchOptions = Array.from(
    new Set(
      employees
        .map((employee) => normalizeText(employee.ifscCode || ""))
        .filter(Boolean),
    ),
  ).map((ifscCode) => ({ bankName: "", branchName: "", ifscCode }));

  return {
    employees,
    transferredEmployees: [],
    departments: departments.map((dept) => ({ _id: dept._id, id: dept._id, name: dept.name, description: dept.description || "" })),
    jobTitleOptions: jobTitles.map((employee) => ({
      jobCode: employee.jobCode || "",
      title: employee.jobTitle || employee.workspaceRole || "",
      department: employee.department || "",
      employmentType: employee.employmentType || "full-time",
      remainingVacancies: 0,
      internshipDurationMonths: Number(employee.internshipDurationMonths || 0) || undefined,
      isPaid: !employee.internshipIsUnpaid,
    })),
    bankNameOptions: bankNames,
    bankBranchOptions,
    summary: buildEmployeeSummary(employees),
  };
};

const buildDocumentsVaultPayload = async (workspace: any) => {
  const overview = await buildOverviewPayload(workspace);
  const documents = overview.employees.flatMap((employee: any) =>
    Array.isArray(employee.documents)
      ? employee.documents.map((document: any) => ({
        ...document,
        employeeId: employee.employeeId || employee.id || "",
        employeeName: employee.fullName || employee.name || "",
        employeeRole: employee.workspaceRole || employee.rawRole || employee.role || "",
        employeeDepartment: employee.department || "",
        employeeStatus: employee.status || "",
        employeeStatusKey: employee.status || "",
      }))
      : [],
  );

  return {
    employees: overview.employees,
    documents,
    departments: overview.departments,
    summary: overview.summary,
  };
};

const createOrUpdateEmployeeProfile = async (workspace: any, payload: any) => {
  const fullName = normalizeText(payload?.fullName || payload?.name || "");
  const email = normalizeEmail(payload?.email || "");
  if (!workspace?._id) {
    throw Object.assign(new Error("Workspace not found."), { statusCode: 404 });
  }
  if (!fullName || !email) {
    throw Object.assign(new Error("Full name and email are required."), { statusCode: 400 });
  }

  const roleDoc = await getRoleDocument(workspace._id, payload?.workspaceRole || payload?.role || "employee");
  const departmentData = isWorkspaceLeaderRole(payload?.workspaceRole || payload?.role || roleDoc?.name || "")
    ? await getWorkspaceDepartmentIdsAndNames(workspace._id)
    : await getDepartmentIdsAndNames(workspace._id, Array.isArray(payload?.departmentNames)
      ? payload.departmentNames
      : Array.isArray(payload?.departments)
        ? payload.departments
        : []);

  let profile = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [
      { email },
      { linkedUserId: payload?.linkedUserId || null },
      { linkedWorkspaceMemberId: payload?.linkedWorkspaceMemberId || null },
    ],
  }).exec();

  const currentDocuments = Array.isArray(profile?.documents) ? profile.documents : [];
  const nextDocuments = Array.isArray(payload?.documents) ? payload.documents : currentDocuments;
  const employeeSequence = Number(profile?.employeeSequence || 0) || await getNextEmployeeSequence(workspace._id);
  const employeeId = profile?.employeeId && isFormattedEmployeeId(profile.employeeId)
    ? String(profile.employeeId).trim().toUpperCase()
    : formatEmployeeId(employeeSequence);

  const nextValues = {
    workspaceId: workspace._id,
    linkedUserId: payload?.linkedUserId || profile?.linkedUserId || null,
    linkedWorkspaceMemberId: payload?.linkedWorkspaceMemberId || profile?.linkedWorkspaceMemberId || null,
    employeeSequence,
    employeeId,
    fullName,
    email,
    phone: normalizeText(payload?.phone || profile?.phone || ""),
    dateOfBirth: payload?.dateOfBirth || profile?.dateOfBirth || null,
    currentAddress: normalizeText(payload?.currentAddress || profile?.currentAddress || ""),
    country: normalizeText(payload?.country || profile?.country || ""),
    state: normalizeText(payload?.state || profile?.state || ""),
    city: normalizeText(payload?.city || profile?.city || ""),
    emergencyContactName: normalizeText(payload?.emergencyContactName || profile?.emergencyContactName || ""),
    emergencyContactPhone: normalizeText(payload?.emergencyContactPhone || profile?.emergencyContactPhone || ""),
    jobTitle: normalizeText(payload?.jobTitle || profile?.jobTitle || roleDoc?.name || "Employee"),
    jobCode: normalizeText(payload?.jobCode || profile?.jobCode || ""),
    departments: departmentData.ids,
    workLocation: normalizeText(payload?.workLocation || profile?.workLocation || ""),
    workMode: String(payload?.workMode || profile?.workMode || "hybrid"),
    managerName: normalizeText(payload?.managerName || profile?.managerName || ""),
    managerUserId: payload?.managerUserId || profile?.managerUserId || null,
    workspaceRole: roleDoc._id,
    isHousekeepingStaff: Boolean(payload?.isHousekeepingStaff || profile?.isHousekeepingStaff),
    employmentType: String(payload?.employmentType || profile?.employmentType || "full_time"),
    internshipIsUnpaid: Boolean(payload?.internshipIsUnpaid ?? profile?.internshipIsUnpaid),
    status: normalizeText(payload?.status || profile?.status || "pending").toLowerCase().replace(/\s+/g, "_"),
    joiningDate: payload?.joiningDate || profile?.joiningDate || null,
    internshipDurationMonths: Number(payload?.internshipDurationMonths || profile?.internshipDurationMonths || 0),
    internshipEndDate: payload?.internshipEndDate || profile?.internshipEndDate || null,
    noticePeriodDays: Number(payload?.noticePeriodDays || profile?.noticePeriodDays || 0),
    probationDays: Number(payload?.probationDays || profile?.probationDays || 0),
    salaryPackage: {
      amount: Number(payload?.salaryPackage?.amount || profile?.salaryPackage?.amount || 0),
      grossAnnual: Number(payload?.salaryPackage?.grossAnnual || profile?.salaryPackage?.grossAnnual || 0),
      currency: String(payload?.salaryPackage?.currency || profile?.salaryPackage?.currency || "INR"),
      payFrequency: String(payload?.salaryPackage?.payFrequency || profile?.salaryPackage?.payFrequency || "annual"),
      allowances: Number(payload?.salaryPackage?.allowances || profile?.salaryPackage?.allowances || 0),
      deductions: Number(payload?.salaryPackage?.deductions || profile?.salaryPackage?.deductions || 0),
    },
    bankName: normalizeText(payload?.bankName || profile?.bankName || ""),
    accountHolderName: normalizeText(payload?.accountHolderName || profile?.accountHolderName || ""),
    accountNumber: normalizeText(payload?.accountNumber || profile?.accountNumber || ""),
    ifscCode: normalizeText(payload?.ifscCode || profile?.ifscCode || ""),
    nationalIdType: normalizeText(payload?.nationalIdType || profile?.nationalIdType || ""),
    nationalIdNumber: normalizeText(payload?.nationalIdNumber || profile?.nationalIdNumber || ""),
    taxId: normalizeText(payload?.taxId || profile?.taxId || ""),
    providentFundNumber: normalizeText(payload?.providentFundNumber || profile?.providentFundNumber || ""),
    accessModules: Array.isArray(payload?.accessModules) ? payload.accessModules : Array.isArray(profile?.accessModules) ? profile.accessModules : [],
    accessFeatures: Array.isArray(payload?.accessFeatures) ? payload.accessFeatures : Array.isArray(profile?.accessFeatures) ? profile.accessFeatures : [],
    documents: nextDocuments,
    notes: normalizeText(payload?.notes || profile?.notes || ""),
    lastLoginAt: profile?.lastLoginAt || null,
    isActive: payload?.isActive !== undefined ? Boolean(payload.isActive) : profile?.isActive !== false,
    archivedAt: payload?.archivedAt || profile?.archivedAt || null,
    createdBy: profile?.createdBy || payload?.createdBy || null,
    updatedBy: payload?.updatedBy || profile?.updatedBy || null,
  };

  if (!profile) {
    profile = await EmployeeProfile.create(nextValues);
  } else {
    Object.assign(profile, nextValues);
    await profile.save();
  }

  const savedEmployee = await EmployeeProfile.findById(profile._id)
    .populate("workspaceRole")
    .populate("departments")
    .populate("linkedUserId", "name email inviteStatus isActive")
    .lean()
    .exec();

  await maybeSendEmployeeInviteEmail({
    workspace,
    payload,
    employee: savedEmployee,
  });

  return mapEmployeeProfileToResponse(savedEmployee);
};

const updateEmployeeProfile = async (workspace: any, employeeId: string, payload: any) => {
  if (!workspace?._id) {
    throw Object.assign(new Error("Workspace not found."), { statusCode: 404 });
  }

  const profile = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [
      { _id: employeeId },
      { employeeId },
      { email: normalizeEmail(employeeId) },
    ],
  }).exec();

  if (!profile) {
    throw Object.assign(new Error("Employee record not found."), { statusCode: 404 });
  }

  return createOrUpdateEmployeeProfile(workspace, {
    ...profile.toObject(),
    ...payload,
    linkedUserId: payload?.linkedUserId || profile.linkedUserId || null,
    linkedWorkspaceMemberId: payload?.linkedWorkspaceMemberId || profile.linkedWorkspaceMemberId || null,
    employeeId: profile.employeeId,
  });
};

const toggleEmployeeProfileStatus = async (workspace: any, employeeId: string) => {
  const profile = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [
      { _id: employeeId },
      { employeeId },
    ],
  }).exec();

  if (!profile) {
    throw Object.assign(new Error("Employee record not found."), { statusCode: 404 });
  }

  profile.isActive = !profile.isActive;
  profile.status = profile.isActive ? "active" : "inactive";
  await profile.save();

  return mapEmployeeProfileToResponse(
    await EmployeeProfile.findById(profile._id)
      .populate("workspaceRole")
      .populate("departments")
      .populate("linkedUserId", "name email inviteStatus isActive")
      .lean()
      .exec(),
  );
};

export {
  getCurrentWorkspace,
  ensureEmployeeProfileForMember,
  ensureEmployeeProfilesForWorkspace,
  buildOverviewPayload,
  buildDocumentsVaultPayload,
  createOrUpdateEmployeeProfile,
  updateEmployeeProfile,
  toggleEmployeeProfileStatus,
  mapEmployeeProfileToResponse,
  normalizeRoleForDisplay,
  normalizeRoleForStorage,
  normalizeEmail,
};
