// @ts-nocheck
import mongoose from "mongoose";
import ResignationDocumentTemplate from "../../models/ResignationDocumentTemplate.js";
import ResignationManagementSettings from "../../models/ResignationManagementSettings.js";
import ResignationRequest from "../../models/ResignationRequest.js";
import EmployeeProfile from "../../models/EmployeeProfile.js";
import HostUser from "../../models/HostUser.js";
import Workspace from "../../models/Workspace.js";
import WorkspaceMember from "../../models/WorkspaceMember.js";
import { createNotification } from "../../utils/notify.js";

export class ResignationManagementError extends Error {
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ResignationManagementError";
    this.statusCode = statusCode;
  }
}

const DEFAULT_CHECKLIST = [
  ["knowledge-handover", "Knowledge handover completed", "Transfer tasks, documentation, and open context."],
  ["company-assets-returned", "Company assets returned", "Collect all issued assets and access cards."],
  ["access-revoked", "System access revoked", "Disable email, VPN, software, and shared-drive access."],
  ["dues-cleared", "Pending dues cleared", "Confirm finance, payroll, and administration clearances."],
  ["documents-issued", "Resignation documents prepared", "Prepare requested employment and settlement documents."],
  ["exit-interview", "Resignation interview completed", "Capture final feedback and offboarding notes."],
];

const DEFAULT_DOCUMENTS = [
  ["Experience Letter", "Formal proof of employment and role history."],
  ["Relieving Letter", "Confirmation that the employee completed the resignation process."],
  ["Full & Final Settlement", "Final payroll and dues settlement summary."],
  ["Last Three Salary Slips", "Recent salary records for personal documentation."],
  ["Service Certificate", "Certificate of service issued by HR."],
  ["No Dues Certificate", "Clearance confirmation from all departments."],
];
const DEFAULT_RETURN_REQUIREMENTS = [
  ["laptop", "Company laptop", "Return the laptop, charger, and issued peripherals."],
  ["access-card", "Access card or badge", "Return physical office and building access cards."],
  ["id-card", "Employee ID card", "Return the company identity card."],
  ["keys", "Company keys", "Return office, locker, cabinet, or vehicle keys."],
];

const DEFAULT_INSTRUCTIONS = [
  "Complete the agreed knowledge handover before the last working day.",
  "Return all company property in working condition.",
  "Leave during the notice period is subject to company policy and HR approval.",
  "Continue attendance and assigned responsibilities until the confirmed last working day.",
];

const DEFAULT_CONFIRMATION_WARNING =
  "I have reviewed my notice period, return requirements, and company resignation instructions. I understand that the notice period starts only after HR approves this request.";


const clean = (value: unknown, max = 2500) =>
  String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
const keyOf = (value: unknown) => clean(value, 100).toLowerCase().replace(/[\s-]+/g, "_");
const roleOf = (member: any) => keyOf(member?.role?.name || member?.role || "");
const departmentNamesOf = (member: any) =>
  (Array.isArray(member?.departments) ? member.departments : [])
    .map((item: any) => clean(item?.name || item, 120))
    .filter(Boolean);
const hasHrDepartment = (names: string[]) =>
  names.some((name) =>
    ["hr", "human_resources", "human_resource"].includes(keyOf(name)) ||
    keyOf(name).startsWith("hr_"),
  );
const hasResignationGrant = (member: any) =>
  [...(member?.grantedModules || []), ...(member?.addOnGrantedModules || [])]
    .some((id) => keyOf(id) === "exit_management");

const memberCanManage = (member: any, ownerId: unknown, userId: unknown) => {
  const role = roleOf(member);
  return (
    String(ownerId || "") === String(userId || "") ||
    ["founder", "owner", "super_admin", "hr", "hr_manager"].includes(role) ||
    hasResignationGrant(member) ||
    (["admin", "manager"].includes(role) && hasHrDepartment(departmentNamesOf(member)))
  );
};

const stringArray = (value: unknown, maxItems = 8) => {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(values.map((item) => clean(item, 120)).filter(Boolean))).slice(0, maxItems);
};
const activeKey = (workspaceId: unknown, userId: unknown) =>
  String(workspaceId) + ":" + String(userId);
const actorName = (access: any) => clean(access.actor?.name || access.actor?.email || "User", 140);
const dateOnly = (value: unknown) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const plusDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + Math.max(0, days));
  return result;
};
const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
};
const parseNoticeStartDate = (value: unknown, fieldLabel = "Effective date") => {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new ResignationManagementError(`${fieldLabel} is required.`, 400);
  }
  const date = new Date(raw.length <= 10 ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(date.getTime())) {
    throw new ResignationManagementError(`${fieldLabel} is invalid.`, 400);
  }
  if (startOfDay(date).getTime() < startOfDay(new Date()).getTime()) {
    throw new ResignationManagementError(`${fieldLabel} cannot be in the past.`, 400);
  }
  return date;
};
const checklistTemplate = () =>
  DEFAULT_CHECKLIST.map(([key, label, description]) => ({
    key,
    label,
    description,
    required: true,
    completed: false,
    completedAt: null,
    completedBy: "",
    completedByUserId: null,
    notes: "",
  }));

const formatRequest = (document: any, now = new Date()) => {
  const request = document?.toObject ? document.toObject() : document;
  const checklist = (Array.isArray(request?.checklist) ? request.checklist : []).map((item: any) => ({
    key: item.key,
    label: item.label,
    description: item.description || "",
    required: item.required !== false,
    completed: Boolean(item.completed),
    completedAt: item.completedAt || null,
    completedBy: item.completedBy || "",
    completedByUserId: item.completedByUserId ? String(item.completedByUserId) : null,
    notes: item.notes || "",
  }));
  const requiredChecklist = checklist.filter((item: any) => item.required !== false);
  const completedChecklistCount = requiredChecklist.filter(
    (item: any) => item.completed,
  ).length;
  const totalChecklistCount = requiredChecklist.length;
  const checklistProgress = totalChecklistCount
    ? Math.round((completedChecklistCount / totalChecklistCount) * 100)
    : 100;
  const noticeEndAt = request?.noticeEndAt ? new Date(request.noticeEndAt) : null;
  const daysRemaining =
    request?.status === "approved" && noticeEndAt && !Number.isNaN(noticeEndAt.getTime())
      ? Math.max(0, Math.ceil((noticeEndAt.getTime() - now.getTime()) / 86400000))
      : 0;
  const departments = (Array.isArray(request?.departments) ? request.departments : [])
    .map((item: any) => clean(item?.name || item, 120))
    .filter(Boolean);

  return {
    _id: String(request?._id || ""),
    id: String(request?._id || ""),
    recordId: String(request?._id || ""),
    returnRequirements: (Array.isArray(request?.returnRequirements)
      ? request.returnRequirements
      : []).map((item: any) => ({
        key: item.key,
        label: item.label,
        description: item.description || "",
        required: item.required !== false,
        completed: Boolean(item.completed),
      })),
    exitInstructions: Array.isArray(request?.exitInstructions)
      ? request.exitInstructions.filter(Boolean)
      : [],
    confirmationWarning: request?.confirmationWarning || "",
    policyAcknowledgedAt: request?.policyAcknowledgedAt || null,
    policyVersion: Number(request?.policyVersion || 1),
    exitCode: request?.exitCode || "",
    employeeName: request?.employeeName || "",
    employeeId: request?.employeeId || "",
    requesterUserId: request?.requesterUserId ? String(request.requesterUserId) : null,
    email: request?.email || "",
    jobTitle: request?.jobTitle || "",
    department: request?.department || departments[0] || "",
    departments: departments.length ? departments : [request?.department].filter(Boolean),
    requesterRole: request?.requesterRole || "Employee",
    managerName: request?.managerName || "",
    managerUserId: request?.managerUserId ? String(request.managerUserId) : null,
    joiningDate: dateOnly(request?.joiningDate),
    noticePeriodDays: Number(request?.noticePeriodDays || 0),
    requestedNoticeStartDate: dateOnly(request?.requestedNoticeStartDate),
    expectedLastWorkingDate: request?.requestedNoticeStartDate
      ? dateOnly(plusDays(new Date(request.requestedNoticeStartDate), Number(request?.noticePeriodDays || 0)))
      : "",
    reason: request?.reason || "",
    requestedDocuments: Array.isArray(request?.requestedDocuments)
      ? request.requestedDocuments.filter(Boolean)
      : [],
    requestedDocumentNotes: request?.requestedDocumentNotes || "",
    status: request?.status || "pending",
    statusLabel: clean(request?.status || "pending", 20).replace(/^./, (char) => char.toUpperCase()),
    noticeStartAt: request?.noticeStartAt || null,
    noticeEndAt: noticeEndAt || null,
    noticeStartDate: dateOnly(request?.noticeStartAt),
    noticeEndDate: dateOnly(request?.noticeEndAt),
    noticeExtensions: (Array.isArray(request?.noticeExtensions)
      ? request.noticeExtensions
      : []).map((extension: any) => ({
        previousNoticeEndAt: extension?.previousNoticeEndAt || null,
        newNoticeEndAt: extension?.newNoticeEndAt || null,
        extendedBy: extension?.extendedBy || "",
        extendedByUserId: extension?.extendedByUserId
          ? String(extension.extendedByUserId)
          : null,
        extendedAt: extension?.extendedAt || null,
      })),
    daysRemaining,
    approvedAt: request?.approvedAt || null,
    approvedBy: request?.approvedBy || "",
    rejectedAt: request?.rejectedAt || null,
    rejectedBy: request?.rejectedBy || "",
    rejectionReason: request?.rejectionReason || "",
    checklist,
    checklistProgress,
    completedChecklistCount,
    totalChecklistCount,
    canComplete:
      request?.status === "approved" &&
      checklistProgress === 100 &&
      daysRemaining === 0,
    completedAt: request?.completedAt || null,
    completedBy: request?.completedBy || "",
    completionNotes: request?.completionNotes || "",
    createdAt: request?.createdAt || null,
    updatedAt: request?.updatedAt || null,
  };
};

const resolveAccess = async (userId: string, workspaceId: string) => {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(workspaceId)) {
    throw new ResignationManagementError("An active workspace is required.", 401);
  }
  const [actor, workspace, member] = await Promise.all([
    HostUser.findById(userId).select("_id name email isActive").lean().exec(),
    Workspace.findOne({
      _id: workspaceId,
      isActive: true,
      isDeleted: { $ne: true },
    }).lean().exec(),
    WorkspaceMember.findOne({
      workspace: workspaceId,
      user: userId,
      isActive: true,
    })
      .populate("role", "name")
      .populate("departments", "name")
      .lean().exec(),
  ]);
  if (!actor || actor.isActive === false) {
    throw new ResignationManagementError("Your account is inactive.", 403);
  }
  if (!workspace) throw new ResignationManagementError("Workspace not found.", 404);
  const isOwner = String(workspace.owner || "") === String(actor._id);
  if (!member && !isOwner) {
    throw new ResignationManagementError("Workspace access denied.", 403);
  }
  return {
    actor,
    workspace,
    member,
    roleName: isOwner ? "founder" : roleOf(member),
    canManage: memberCanManage(member, workspace.owner, actor._id),
  };
};

const loadTemplates = async (workspaceId: unknown) => {
  let records = await ResignationDocumentTemplate.find({
    workspaceId,
    isActive: true,
  }).sort({ sortOrder: 1, label: 1 }).lean().exec();

  if (!records.length) {
    try {
      await ResignationDocumentTemplate.insertMany(
        DEFAULT_DOCUMENTS.map(([label, description], sortOrder) => ({
          workspaceId,
          label,
          normalizedLabel: label.toLowerCase(),
          description,
          sortOrder,
          isActive: true,
        })),
        { ordered: false },
      );
    } catch (error: any) {
      if (Number(error?.code) !== 11000) throw error;
    }
    records = await ResignationDocumentTemplate.find({
      workspaceId,
      isActive: true,
    }).sort({ sortOrder: 1, label: 1 }).lean().exec();
  }

  return records.map((record: any) => ({
    id: String(record._id),
    label: record.label,
    description: record.description || "",
  }));
};

const syncTemplates = async (
  workspaceId: unknown,
  labels: string[],
  actorId: unknown,
) => {
  await Promise.all(
    labels.map((label, sortOrder) =>
      ResignationDocumentTemplate.updateOne(
        { workspaceId, normalizedLabel: label.toLowerCase() },
        {
          $setOnInsert: {
            workspaceId,
            label,
            normalizedLabel: label.toLowerCase(),
            description: "",
            sortOrder: 1000 + sortOrder,
            isActive: true,
            createdByUserId: actorId,
          },
          $set: { updatedByUserId: actorId },
        },
        { upsert: true },
      ).exec(),
    ),
  );
};

const normalizeRequirements = (value: unknown) => {
  const source = Array.isArray(value) ? value : [];
  const usedKeys = new Set<string>();
  return source.slice(0, 20).map((item: any, index) => {
    const label = clean(item?.label || item, 180);
    if (!label) {
      throw new ResignationManagementError("Every return requirement needs a label.", 400);
    }
    let key = keyOf(item?.key || label).slice(0, 70) || "requirement-" + (index + 1);
    while (usedKeys.has(key)) key = key + "-" + (index + 1);
    usedKeys.add(key);
    return {
      key,
      label,
      description: clean(item?.description, 500),
      required: item?.required !== false,
      isActive: item?.isActive !== false,
    };
  });
};

const loadResignationSettingsDocument = async (workspaceId: unknown) =>
  ResignationManagementSettings.findOneAndUpdate(
    { workspaceId },
    {
      $setOnInsert: {
        workspaceId,
        returnRequirements: DEFAULT_RETURN_REQUIREMENTS.map(
          ([key, label, description]) => ({
            key,
            label,
            description,
            required: true,
            isActive: true,
          }),
        ),
        instructions: DEFAULT_INSTRUCTIONS,
        confirmationWarning: DEFAULT_CONFIRMATION_WARNING,
        version: 1,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean().exec();

const formatResignationSettings = async (workspaceId: unknown, settings?: any) => {
  const record = settings || await loadResignationSettingsDocument(workspaceId);
  return {
    returnRequirements: (record?.returnRequirements || [])
      .filter((item: any) => item.isActive !== false)
      .map((item: any) => ({
        key: item.key,
        label: item.label,
        description: item.description || "",
        required: item.required !== false,
      })),
    instructions: Array.isArray(record?.instructions)
      ? record.instructions.filter(Boolean)
      : [],
    confirmationWarning:
      record?.confirmationWarning || DEFAULT_CONFIRMATION_WARNING,
    version: Number(record?.version || 1),
    requestedDocumentTemplates: await loadTemplates(workspaceId),
    updatedAt: record?.updatedAt || null,
  };
};

const checklistFromSettings = (settings: any) =>
  (settings?.returnRequirements || [])
    .filter((item: any) => item.isActive !== false)
    .map((item: any) => ({
      key: item.key,
      label: item.label,
      description: item.description || "",
      required: item.required !== false,
      completed: false,
      completedAt: null,
      completedBy: "",
      completedByUserId: null,
      notes: "",
    }));
const queryRequests = async (access: any, personalOnly: boolean) => {
  const filter: any = { workspaceId: access.workspace._id };
  if (personalOnly) filter.requesterUserId = access.actor._id;
  const records = await ResignationRequest.find(filter)
    .populate("departments", "name")
    .sort({ createdAt: -1, _id: -1 })
    .lean().exec();
  return records.map((record: any) => formatRequest(record));
};

const buildOverview = (requests: any[], access: any) => {
  const pendingRequests = requests.filter((request) => request.status === "pending");
  const activeNoticeRequests = requests.filter((request) => request.status === "approved");
  const rejectedRequests = requests.filter((request) => request.status === "rejected");
  const completedRequests = requests.filter((request) => request.status === "completed");

  return {
    requests,
    exitRequests: requests,
    pendingRequests,
    activeNoticeRequests,
    rejectedRequests,
    completedRequests,
    historyRequests: [...completedRequests, ...rejectedRequests].sort(
      (left, right) =>
        new Date(right.updatedAt || 0).getTime() -
        new Date(left.updatedAt || 0).getTime(),
    ),
    summary: {
      pendingCount: pendingRequests.length,
      activeNoticeCount: activeNoticeRequests.length,
      rejectedCount: rejectedRequests.length,
      completedCount: completedRequests.length,
      totalCount: requests.length,
    },
    departments: Array.from(
      new Set(
        requests
          .flatMap((request) => request.departments || [])
          .filter(Boolean),
      ),
    ).sort(),
    canManage: access.canManage,
    canSubmitRequest: !requests.some((request) =>
      ["pending", "approved"].includes(request.status),
    ),
    currentUserId: String(access.actor._id),
  };
};

const findRequest = async (requestId: string, access: any) => {
  if (!mongoose.isValidObjectId(requestId)) {
    throw new ResignationManagementError("Resignation request not found.", 404);
  }
  const request = await ResignationRequest.findOne({
    _id: requestId,
    workspaceId: access.workspace._id,
  }).populate("departments", "name").lean().exec();
  if (!request) throw new ResignationManagementError("Resignation request not found.", 404);
  if (
    !access.canManage &&
    String(request.requesterUserId) !== String(access.actor._id)
  ) {
    throw new ResignationManagementError("Resignation request not found.", 404);
  }
  return request;
};

const notify = (access: any, recipientUserId: unknown, values: any) =>
  createNotification({
    workspaceId: String(access.workspace._id),
    recipientUserId: String(recipientUserId || ""),
    actorUserId: String(access.actor._id),
    category: "system",
    entityType: "exit-request",
    ...values,
  });

const managerRecipients = async (access: any) => {
  const members = await WorkspaceMember.find({
    workspace: access.workspace._id,
    isActive: true,
  })
    .select("user role departments grantedModules addOnGrantedModules")
    .populate("role", "name")
    .populate("departments", "name")
    .lean().exec();
  const ids = new Set<string>();
  members.forEach((member: any) => {
    if (memberCanManage(member, access.workspace.owner, member.user)) {
      ids.add(String(member.user));
    }
  });
  ids.add(String(access.workspace.owner));
  ids.delete(String(access.actor._id));
  return [...ids].filter(Boolean);
};

const employeeSnapshot = async (access: any) => {
  const profile = await EmployeeProfile.findOne({
    workspaceId: access.workspace._id,
    $or: [
      { linkedUserId: access.actor._id },
      ...(access.member?._id
        ? [{ linkedWorkspaceMemberId: access.member._id }]
        : []),
      { email: access.actor.email },
    ],
  })
    .populate("departments", "name")
    .populate("workspaceRole", "name")
    .lean().exec();

  const departmentDocs = Array.isArray(profile?.departments)
    ? profile.departments
    : access.member?.departments || [];
  const departmentNames = departmentDocs
    .map((item: any) => item?.name || "")
    .filter(Boolean);
  const departmentIds = departmentDocs
    .map((item: any) => item?._id || item)
    .filter(Boolean);
  const noticeDays = Number(profile?.noticePeriodDays);

  return {
    employeeName: clean(
      profile?.fullName || access.actor.name || access.actor.email,
      140,
    ),
    employeeId: clean(
      profile?.employeeId ||
        "USR-" + String(access.actor._id).slice(-6).toUpperCase(),
      40,
    ),
    email: clean(profile?.email || access.actor.email, 160).toLowerCase(),
    jobTitle: clean(profile?.jobTitle, 140),
    department: clean(departmentNames[0], 120),
    departmentId: departmentIds[0] || null,
    departments: departmentIds,
    requesterRole: clean(
      profile?.workspaceRole?.name || access.roleName || "employee",
      80,
    ).replace(/_/g, " "),
    roleId:
      profile?.workspaceRole?._id ||
      access.member?.role?._id ||
      access.member?.role ||
      null,
    managerName: clean(profile?.managerName, 140),
    managerUserId: profile?.managerUserId || null,
    joiningDate: profile?.joiningDate || null,
    noticePeriodDays:
      Number.isFinite(noticeDays) && noticeDays >= 0 ? noticeDays : 30,
  };
};

export const getResignationSettingsForCurrentUser = async (
  userId: string,
  workspaceId: string,
) => {
  const access = await resolveAccess(userId, workspaceId);
  return {
    settings: await formatResignationSettings(access.workspace._id),
    canManage: access.canManage,
  };
};

export const updateResignationSettingsForCurrentUser = async (
  userId: string,
  workspaceId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  if (!access.canManage) {
    throw new ResignationManagementError(
      "You do not have permission to change resignation settings.",
      403,
    );
  }

  const returnRequirements = normalizeRequirements(input?.returnRequirements);
  const instructions = (Array.isArray(input?.instructions) ? input.instructions : [])
    .slice(0, 20)
    .map((instruction: unknown) => clean(instruction, 500))
    .filter(Boolean);
  const confirmationWarning =
    clean(input?.confirmationWarning, 1200) || DEFAULT_CONFIRMATION_WARNING;
  const documentTemplates = (Array.isArray(input?.requestedDocumentTemplates)
    ? input.requestedDocumentTemplates
    : [])
    .slice(0, 20)
    .map((item: any) => ({
      label: clean(item?.label || item, 180),
      description: clean(item?.description, 500),
    }))
    .filter((item: any) => item.label);

  const current = await loadResignationSettingsDocument(access.workspace._id);
  const updated = await ResignationManagementSettings.findOneAndUpdate(
    { workspaceId: access.workspace._id },
    {
      $set: {
        returnRequirements,
        instructions,
        confirmationWarning,
        version: Number(current?.version || 1) + 1,
        updatedByUserId: access.actor._id,
      },
    },
    { new: true, runValidators: true },
  ).lean().exec();

  await ResignationDocumentTemplate.updateMany(
    { workspaceId: access.workspace._id },
    { $set: { isActive: false, updatedByUserId: access.actor._id } },
  ).exec();
  await Promise.all(
    documentTemplates.map((template: any, sortOrder: number) =>
      ResignationDocumentTemplate.updateOne(
        {
          workspaceId: access.workspace._id,
          normalizedLabel: template.label.toLowerCase(),
        },
        {
          $set: {
            label: template.label,
            description: template.description,
            sortOrder,
            isActive: true,
            updatedByUserId: access.actor._id,
          },
          $setOnInsert: {
            workspaceId: access.workspace._id,
            normalizedLabel: template.label.toLowerCase(),
            createdByUserId: access.actor._id,
          },
        },
        { upsert: true, runValidators: true },
      ).exec(),
    ),
  );

  return { settings: await formatResignationSettings(access.workspace._id, updated) };
};

const buildListResponse = async (access: any, personalOnly: boolean) => {
  const [requests, settings, employee] = await Promise.all([
    queryRequests(access, personalOnly),
    formatResignationSettings(access.workspace._id),
    employeeSnapshot(access),
  ]);
  return {
    ...buildOverview(requests, access),
    settings,
    requestedDocumentTemplates: settings.requestedDocumentTemplates,
    submissionContext: {
      noticePeriodDays: employee.noticePeriodDays,
      noticeStartsAfterApproval: true,
    },
  };
};


export const listResignationRequestsForCurrentUser = async (
  userId: string,
  workspaceId: string,
) => {
  const access = await resolveAccess(userId, workspaceId);
  return buildListResponse(access, !access.canManage);
};

export const getMyResignationRequestsForCurrentUser = async (
  userId: string,
  workspaceId: string,
) => {
  const access = await resolveAccess(userId, workspaceId);
  return buildListResponse(access, true);
};

export const getResignationRequestForCurrentUser = async (
  userId: string,
  workspaceId: string,
  requestId: string,
) => {
  const access = await resolveAccess(userId, workspaceId);
  return { exitRequest: formatRequest(await findRequest(requestId, access)) };
};

export const createResignationRequestForCurrentUser = async (
  userId: string,
  workspaceId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  if (["founder", "owner"].includes(access.roleName)) {
    throw new ResignationManagementError(
      "Founder accounts must transfer ownership before requesting resignation.",
      403,
    );
  }

  const reason = clean(input?.reason, 2500);
  if (reason.length < 10) {
    throw new ResignationManagementError(
      "Reason must contain at least 10 characters.",
      400,
    );
  }
  if (input?.policyAcknowledged !== true) {
    throw new ResignationManagementError(
      "Confirm that you reviewed the notice period and resignation instructions.",
      400,
    );
  }
  const requestedNoticeStartDate = parseNoticeStartDate(input?.noticeStartDate);
  const settingsRecord = await loadResignationSettingsDocument(access.workspace._id);
  const policyChecklist = checklistFromSettings(settingsRecord);
  const requestedDocuments = stringArray(input?.requestedDocuments);
  const requestedDocumentNotes = clean(input?.requestedDocumentNotes, 2000);
  const requestKey = activeKey(access.workspace._id, access.actor._id);
  const existing = await ResignationRequest.exists({
    workspaceId: access.workspace._id,
    requesterUserId: access.actor._id,
    status: { $in: ["pending", "approved"] },
  });
  if (existing) {
    throw new ResignationManagementError(
      "You already have an active resignation request.",
      409,
    );
  }

  const snapshot = await employeeSnapshot(access);
  let created: any = null;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    const latest = await ResignationRequest.findOne({
      workspaceId: access.workspace._id,
    }).sort({ exitNumber: -1 }).select("exitNumber").lean().exec();
    const exitNumber = Number(latest?.exitNumber || 100) + 1;
    try {
      created = await ResignationRequest.create({
        workspaceId: access.workspace._id,
        ownerId: access.workspace.owner,
        exitNumber,
        exitCode: "EXT-" + exitNumber,
        requesterUserId: access.actor._id,
        activeRequestKey: requestKey,
        ...snapshot,
        requestedNoticeStartDate,
        reason,
        requestedDocuments,
        requestedDocumentNotes,
        returnRequirements: policyChecklist,
        exitInstructions: settingsRecord.instructions || [],
        confirmationWarning: settingsRecord.confirmationWarning || DEFAULT_CONFIRMATION_WARNING,
        policyAcknowledgedAt: new Date(),
        policyVersion: Number(settingsRecord.version || 1),
        checklist: policyChecklist,
      });
    } catch (error: any) {
      if (Number(error?.code) !== 11000) throw error;
      if (await ResignationRequest.exists({ activeRequestKey: requestKey })) {
        throw new ResignationManagementError(
          "You already have an active resignation request.",
          409,
        );
      }
    }
  }
  if (!created) {
    throw new ResignationManagementError(
      "Resignation request could not be created. Please try again.",
      409,
    );
  }

  const recipients = await managerRecipients(access);
  await Promise.all(
    recipients.map((recipientId) =>
      notify(access, recipientId, {
        type: "exit_requested",
        title: "Resignation request submitted: " + created.exitCode,
        description: snapshot.employeeName + " submitted an resignation request.",
        entityId: String(created._id),
        entityCode: created.exitCode,
        targetUrl: "/hr/resignation-management",
        priority: "high",
        isActionRequired: true,
        data: {
          status: "pending",
          employeeName: snapshot.employeeName,
          reason,
        },
      }),
    ),
  );

  return { exitRequest: formatRequest(created) };
};

export const updateResignationRequestForCurrentUser = async (
  userId: string,
  workspaceId: string,
  requestId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  const request = await findRequest(requestId, access);
  if (String(request.requesterUserId) !== String(access.actor._id)) {
    throw new ResignationManagementError(
      "You can only edit your own resignation request.",
      403,
    );
  }
  if (request.status !== "pending") {
    throw new ResignationManagementError(
      "Only pending resignation requests can be edited.",
      409,
    );
  }

  const reason = clean(input?.reason, 2500);
  if (reason.length < 10) {
    throw new ResignationManagementError(
      "Reason must contain at least 10 characters.",
      400,
    );
  }
  const requestedNoticeStartDate = parseNoticeStartDate(input?.noticeStartDate);
  const requestedDocuments = stringArray(input?.requestedDocuments);
  const requestedDocumentNotes = clean(input?.requestedDocumentNotes, 2000);

  const updated = await ResignationRequest.findOneAndUpdate(
    {
      _id: requestId,
      workspaceId: access.workspace._id,
      status: "pending",
      requesterUserId: access.actor._id,
    },
    {
      $set: {
        reason,
        requestedNoticeStartDate,
        requestedDocuments,
        requestedDocumentNotes,
        updatedByUserId: access.actor._id,
      },
    },
    { new: true, runValidators: true },
  ).populate("departments", "name").lean().exec();
  if (!updated) {
    throw new ResignationManagementError(
      "This resignation request is no longer editable.",
      409,
    );
  }

  const recipients = await managerRecipients(access);
  await Promise.all(
    recipients.map((recipientId) =>
      notify(access, recipientId, {
        type: "exit_requested",
        title: "Resignation request updated: " + updated.exitCode,
        description:
          request.employeeName +
          " updated their resignation request and it is awaiting review.",
        entityId: String(updated._id),
        entityCode: updated.exitCode,
        targetUrl: "/hr/resignation-management",
        priority: "high",
        isActionRequired: true,
        data: { status: "pending", reason },
      }),
    ),
  );

  return { exitRequest: formatRequest(updated) };
};

export const reviewResignationRequestForCurrentUser = async (
  userId: string,
  workspaceId: string,
  requestId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  if (!access.canManage) {
    throw new ResignationManagementError(
      "You do not have permission to review resignation requests.",
      403,
    );
  }
  const request = await findRequest(requestId, access);
  if (String(request.requesterUserId) === String(access.actor._id)) {
    throw new ResignationManagementError(
      "You cannot review your own resignation request.",
      403,
    );
  }

  const status = keyOf(input?.status);
  if (!["approved", "rejected"].includes(status)) {
    throw new ResignationManagementError(
      "Status must be approved or rejected.",
      400,
    );
  }
  const rejectionReason = clean(input?.rejectionReason, 1200);
  if (status === "rejected" && !rejectionReason) {
    throw new ResignationManagementError(
      "Rejection reason is required when rejecting an resignation request.",
      400,
    );
  }

  const now = new Date();
  const reviewer = actorName(access);
  const noticeStartAt = request.requestedNoticeStartDate
    ? new Date(request.requestedNoticeStartDate)
    : now;
  const values =
    status === "approved"
      ? {
          status,
          approvedAt: now,
          approvedByUserId: access.actor._id,
          approvedBy: reviewer,
          noticeStartAt,
          noticeEndAt: plusDays(
            noticeStartAt,
            Number(request.noticePeriodDays || 0),
          ),
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedBy: "",
          rejectionReason: "",
        }
      : {
          status,
          rejectedAt: now,
          rejectedByUserId: access.actor._id,
          rejectedBy: reviewer,
          rejectionReason,
          approvedAt: null,
          approvedByUserId: null,
          approvedBy: "",
          noticeStartAt: null,
          noticeEndAt: null,
        };
  const update: any = { $set: values };
  if (status === "rejected") {
    update.$unset = { activeRequestKey: 1 };
  }

  const updated = await ResignationRequest.findOneAndUpdate(
    {
      _id: requestId,
      workspaceId: access.workspace._id,
      status: "pending",
    },
    update,
    { new: true, runValidators: true },
  ).populate("departments", "name").lean().exec();
  if (!updated) {
    throw new ResignationManagementError(
      "Only pending resignation requests can be reviewed.",
      409,
    );
  }

  await notify(access, request.requesterUserId, {
    type: status === "approved" ? "exit_approved" : "exit_rejected",
    title: "Resignation request " + status + ": " + request.exitCode,
    description: reviewer + " " + status + " your resignation request.",
    entityId: String(request._id),
    entityCode: request.exitCode,
    targetUrl: "/profile/resignation-request",
    priority: status === "approved" ? "high" : "normal",
    isActionRequired: status === "approved",
    data: { status, rejectionReason },
  });

  return { exitRequest: formatRequest(updated) };
};

export const updateResignationChecklistForCurrentUser = async (
  userId: string,
  workspaceId: string,
  requestId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  if (!access.canManage) {
    throw new ResignationManagementError(
      "You do not have permission to update resignation checklists.",
      403,
    );
  }
  const request = await findRequest(requestId, access);
  if (request.status !== "approved") {
    throw new ResignationManagementError(
      "Checklist items can only be updated after approval.",
      409,
    );
  }

  const changes = (Array.isArray(input?.checklist) ? input.checklist : [])
    .map((change: any) => {
      if (typeof change?.completed !== "boolean") {
        throw new ResignationManagementError(
          "Checklist completion must be true or false.",
          400,
        );
      }
      const itemKey = clean(change?.itemKey, 80);
      if (!itemKey) {
        throw new ResignationManagementError("Checklist item is required.", 400);
      }
      return {
        itemKey,
        completed: change.completed,
        notes: clean(change?.notes, 1000),
      };
    })
    .filter((change: any) => Boolean(change.itemKey));

  if (!changes.length) {
    if (typeof input?.completed !== "boolean") {
      throw new ResignationManagementError(
        "Checklist completion must be true or false.",
        400,
      );
    }
    const itemKey = clean(input?.itemKey, 80);
    if (!itemKey) {
      throw new ResignationManagementError("Checklist item is required.", 400);
    }
    changes.push({
      itemKey,
      completed: input.completed,
      notes: clean(input?.notes, 1000),
    });
  }

  const currentItems = Array.isArray(request.checklist) ? request.checklist : [];
  const unknownKeys = changes.filter(
    (change: any) => !currentItems.some((item: any) => item.key === change.itemKey),
  );
  if (unknownKeys.length) {
    throw new ResignationManagementError("Checklist item not found.", 404);
  }

  const now = new Date();
  const reviewer = actorName(access);
  const checklist = currentItems.map((item: any) => {
    const change = changes.find((candidate: any) => candidate.itemKey === item.key);
    if (!change) return item;
    return {
      ...item,
      completed: change.completed,
      completedAt: change.completed ? now : null,
      completedBy: change.completed ? reviewer : "",
      completedByUserId: change.completed ? access.actor._id : null,
      notes: change.notes,
    };
  });

  const updated = await ResignationRequest.findOneAndUpdate(
    {
      _id: requestId,
      workspaceId: access.workspace._id,
      status: "approved",
    },
    { $set: { checklist } },
    { new: true, runValidators: true },
  ).populate("departments", "name").lean().exec();

  if (!updated) {
    throw new ResignationManagementError(
      "Resignation request changed before saving. Refresh and try again.",
      409,
    );
  }

  return { exitRequest: formatRequest(updated) };
};

export const completeResignationRequestForCurrentUser = async (
  userId: string,
  workspaceId: string,
  requestId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  if (!access.canManage) {
    throw new ResignationManagementError(
      "You do not have permission to complete resignation requests.",
      403,
    );
  }
  const request = await findRequest(requestId, access);
  if (request.status !== "approved") {
    throw new ResignationManagementError(
      "Only approved resignation requests can be completed.",
      409,
    );
  }
  if (
    !Array.isArray(request.checklist) ||
    request.checklist.some((item: any) => item.required !== false && !item.completed)
  ) {
    throw new ResignationManagementError(
      "Complete the clearance checklist before finalizing the resignation.",
      409,
    );
  }
  if (
    request.noticeEndAt &&
    new Date(request.noticeEndAt).getTime() > Date.now()
  ) {
    throw new ResignationManagementError(
      "The notice period is still active.",
      409,
    );
  }

  const now = new Date();
  const completionNotes = clean(input?.completionNotes, 2000);
  const updated = await ResignationRequest.findOneAndUpdate(
    {
      _id: requestId,
      workspaceId: access.workspace._id,
      status: "approved",
      checklist: { $not: { $elemMatch: { completed: false, required: { $ne: false } } } },
    },
    {
      $set: {
        status: "completed",
        completedAt: now,
        completedByUserId: access.actor._id,
        completedBy: actorName(access),
        completionNotes,
      },
      $unset: { activeRequestKey: 1 },
    },
    { new: true, runValidators: true },
  ).populate("departments", "name").lean().exec();
  if (!updated) {
    throw new ResignationManagementError(
      "Resignation request changed before completion. Refresh and try again.",
      409,
    );
  }

  await Promise.all([
    EmployeeProfile.updateOne(
      {
        workspaceId: access.workspace._id,
        $or: [
          { linkedUserId: request.requesterUserId },
          { email: request.email },
        ],
      },
      {
        $set: {
          status: "terminated",
          isActive: false,
          archivedAt: now,
          updatedBy: access.actor._id,
        },
        $push: {
          lifecycleHistory: {
            effectiveAt: now,
            note: "Resignation request " + request.exitCode + " completed",
            changedBy: access.actor._id,
          },
        },
      },
    ).exec(),
    WorkspaceMember.updateOne(
      {
        workspace: access.workspace._id,
        user: request.requesterUserId,
      },
      { $set: { isActive: false, status: "disabled" } },
    ).exec(),
  ]);

  const hasOtherMembership = await WorkspaceMember.exists({
    user: request.requesterUserId,
    workspace: { $ne: access.workspace._id },
    isActive: true,
  });
  if (!hasOtherMembership) {
    await HostUser.updateOne(
      { _id: request.requesterUserId },
      { $set: { isActive: false } },
    ).exec();
  }

  await notify(access, request.requesterUserId, {
    type: "exit_completed",
    title: "Resignation completed: " + request.exitCode,
    description: actorName(access) + " completed your offboarding.",
    entityId: String(request._id),
    entityCode: request.exitCode,
    targetUrl: "/profile/resignation-request",
    priority: "high",
    isActionRequired: false,
    data: {
      status: "completed",
      completedAt: dateOnly(now),
      completionNotes,
    },
  });

  return { exitRequest: formatRequest(updated, now) };
};

export const extendResignationNoticePeriodForCurrentUser = async (
  userId: string,
  workspaceId: string,
  requestId: string,
  input: any,
) => {
  const access = await resolveAccess(userId, workspaceId);
  if (!access.canManage) {
    throw new ResignationManagementError(
      "You do not have permission to extend notice periods.",
      403,
    );
  }
  const request = await findRequest(requestId, access);
  if (request.status !== "approved") {
    throw new ResignationManagementError(
      "Notice period can only be extended while the resignation is active.",
      409,
    );
  }
  const currentNoticeEndAt = request.noticeEndAt
    ? new Date(request.noticeEndAt)
    : null;
  if (!currentNoticeEndAt || Number.isNaN(currentNoticeEndAt.getTime())) {
    throw new ResignationManagementError(
      "The notice period has not started yet.",
      409,
    );
  }

  const raw = String(input?.newNoticeEndDate || "").trim();
  if (!raw) {
    throw new ResignationManagementError(
      "Extended notice end date is required.",
      400,
    );
  }
  const newNoticeEndAt = new Date(raw.length <= 10 ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(newNoticeEndAt.getTime())) {
    throw new ResignationManagementError(
      "Extended notice end date is invalid.",
      400,
    );
  }
  if (
    startOfDay(newNoticeEndAt).getTime() <=
    startOfDay(currentNoticeEndAt).getTime()
  ) {
    throw new ResignationManagementError(
      "The extended notice end date must be after the current last working date.",
      400,
    );
  }

  const reviewer = actorName(access);
  const now = new Date();
  const updated = await ResignationRequest.findOneAndUpdate(
    {
      _id: requestId,
      workspaceId: access.workspace._id,
      status: "approved",
    },
    {
      $set: {
        noticeEndAt: newNoticeEndAt,
        updatedByUserId: access.actor._id,
      },
      $push: {
        noticeExtensions: {
          previousNoticeEndAt: currentNoticeEndAt,
          newNoticeEndAt,
          extendedByUserId: access.actor._id,
          extendedBy: reviewer,
          extendedAt: now,
        },
      },
    },
    { new: true, runValidators: true },
  ).populate("departments", "name").lean().exec();
  if (!updated) {
    throw new ResignationManagementError(
      "Resignation request changed before saving. Refresh and try again.",
      409,
    );
  }

  await notify(access, request.requesterUserId, {
    type: "exit_notice_extended",
    title: "Notice period extended: " + request.exitCode,
    description:
      reviewer +
      " extended your notice period. Your new last working date is " +
      dateOnly(newNoticeEndAt) +
      ".",
    entityId: String(request._id),
    entityCode: request.exitCode,
    targetUrl: "/profile/resignation-request",
    priority: "high",
    isActionRequired: false,
    data: {
      status: "approved",
      previousNoticeEndAt: dateOnly(currentNoticeEndAt),
      newNoticeEndAt: dateOnly(newNoticeEndAt),
    },
  });

  return { exitRequest: formatRequest(updated) };
};
