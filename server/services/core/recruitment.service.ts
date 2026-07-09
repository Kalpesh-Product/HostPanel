// @ts-nocheck
import mongoose from "mongoose";
import RecruitmentCandidate from "../../models/RecruitmentCandidate.js";
import Department from "../../models/Department.js";
import { getCurrentWorkspace } from "./hr.service.js";
import { uploadFileToS3 } from "../../config/s3config.js";
import { sendMail } from "../../config/mailer.js";
import {
  applyRecruitmentOpeningFillForWorkspace,
  createRecruitmentJobOpeningForWorkspace,
  ensureRecruitmentJobOpenings,
  findRecruitmentJobOpening,
  getActiveRecruitmentJobTitleOptions,
  getRecruitmentJobOpeningsForWorkspace,
  updateRecruitmentJobOpeningForWorkspace,
} from "./recruitment-openings.service.js";

const RECRUITMENT_STATUSES = [
  "Applied",
  "Screening",
  "Interview Scheduled",
  "Interviewed",
  "Selected",
  "Rejected",
  "Converted to Employee",
];

const RECRUITMENT_SOURCE_TYPES = ["Walk-in", "LinkedIn", "Email", "Phone Call", "Referral", "Other"];

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeJsonText(value = "") {
  if (typeof value === "string") return value.trim();
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeEmail(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeStatus(value = "Applied") {
  const normalized = normalizeText(value);
  return RECRUITMENT_STATUSES.includes(normalized) ? normalized : "Applied";
}

function normalizeSourceType(value = "") {
  const normalized = normalizeText(value);
  return RECRUITMENT_SOURCE_TYPES.includes(normalized) ? normalized : "Walk-in";
}

function parseDate(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelativeTime(value) {
  if (!value) return "Just now";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function buildCandidateCode(index: number) {
  return `RC-${String(index).padStart(4, "0")}`;
}

function buildFullName(candidate: Record<string, any> = {}) {
  return [candidate.firstName, candidate.middleName, candidate.lastName].map(normalizeText).filter(Boolean).join(" ");
}

function splitFullName(value = "") {
  const parts = normalizeText(value).split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

async function uploadResumeAttachment(file: Express.Multer.File | null) {
  if (!file?.buffer?.length) return null;
  const route = `hr/recruitment/resumes/${Date.now()}-${normalizeText(file.originalname || "resume").replace(/\s+/g, "-")}`;
  const uploaded = await uploadFileToS3(route, file);
  return {
    name: file.originalname || "Resume",
    url: uploaded.url,
    publicId: uploaded.id,
    mimeType: file.mimetype || "",
    uploadedAt: new Date(),
  };
}

function buildCandidateView(candidate: any) {
  const fullName = candidate.fullName || buildFullName(candidate);
  const position = candidate.positionApplied || "";
  return {
    id: candidate._id ? String(candidate._id) : "",
    code: candidate.candidateCode || "",
    name: fullName,
    fullName,
    email: candidate.email || "",
    phone: candidate.phone || "",
    department: candidate.department || "",
    jobCode: candidate.jobCode || "",
    position,
    designation: position,
    source: candidate.sourceType || "Walk-in",
    sourceType: candidate.sourceType || "Walk-in",
    status: candidate.status || "Applied",
    resume: candidate.resume?.name || `${fullName || "Candidate"}_Resume.pdf`,
    resumeUrl: candidate.resume?.url || "",
    resumeMeta: candidate.resume || null,
    exp: candidate.experience || "",
    appliedAt: formatRelativeTime(candidate.appliedAt || candidate.createdAt),
    formData: {
      firstName: candidate.firstName || "",
      middleName: candidate.middleName || "",
      lastName: candidate.lastName || "",
      dob: formatDisplayDate(candidate.dateOfBirth),
      country: candidate.country || "",
      state: candidate.state || "",
      city: candidate.city || "",
      address: candidate.currentAddress || "",
      department: candidate.department || "",
      earliestStartDate: candidate.earliestStartDate ? formatDisplayDate(candidate.earliestStartDate) : "Immediate",
      availability: candidate.availability || "Full-time",
      expectedSalary: candidate.expectedSalary || "",
      education: candidate.education || "",
      employmentHistory: candidate.employmentHistory || "",
      skills: candidate.skills || "",
      certifications: candidate.certifications || "",
      coverLetter: candidate.coverLetter || "",
      currentCompany: candidate.currentCompany || "",
      sourceReference: candidate.sourceReference || "",
      sourceNotes: candidate.sourceNotes || "",
      contactMethod: candidate.contactMethod || "",
      notes: candidate.notes || "",
      customFields: candidate.customFields || "",
    },
    resumeMeta: candidate.resume || null,
    sourceReference: candidate.sourceReference || "",
    sourceNotes: candidate.sourceNotes || "",
    currentCompany: candidate.currentCompany || "",
    notes: candidate.notes || "",
    customFields: candidate.customFields || "",
    timeline: Array.isArray(candidate.statusHistory) ? candidate.statusHistory : [],
    emailHistory: Array.isArray(candidate.emailHistory) ? candidate.emailHistory : [],
    createdAt: candidate.createdAt || null,
    updatedAt: candidate.updatedAt || null,
  };
}

function buildOverviewSummary(candidateViews: any[], jobOpenings: any[] = []) {
  const totalCandidates = candidateViews.length;
  const selectedCount = candidateViews.filter((candidate) => candidate.status === "Selected").length;
  const onboardedCount = candidateViews.filter((candidate) => candidate.status === "Converted to Employee").length;
  const activeJobs = Array.isArray(jobOpenings)
    ? jobOpenings.filter((opening) => opening?.isActive !== false && Number(opening?.remainingVacancies ?? 0) > 0).length
    : 0;

  const sourceCounts = candidateViews.reduce((counts, candidate) => {
    const key = candidate.source || "Walk-in";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return { totalCandidates, selectedCount, onboardedCount, activeJobs, sourceCounts };
}

async function loadRecruitmentCandidates(workspaceId: any) {
  const documents = await RecruitmentCandidate.find({ workspaceId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean()
    .exec();

  return documents.map(buildCandidateView);
}

async function getDepartmentOptions(workspaceId: any, fallbackOpenings: any[] = []) {
  const departments = await Department.find({ workspaceId, isActive: true })
    .select("_id name")
    .sort({ name: 1 })
    .lean()
    .exec();

  if (departments.length > 0) {
    return departments.map((dept) => dept.name).filter(Boolean);
  }

  return Array.from(new Set(fallbackOpenings.map((opening) => normalizeText(opening.department)).filter(Boolean)));
}

function buildCandidateMutationPayload(input: Record<string, any> = {}) {
  const position = normalizeText(input.position || input.designation || input.jobTitle);
  const name = normalizeText(input.fullName || input.name || [input.firstName, input.middleName, input.lastName].map(normalizeText).filter(Boolean).join(" "));
  const splitName = splitFullName(name);
  return {
    firstName: normalizeText(input.firstName) || splitName.firstName,
    middleName: normalizeText(input.middleName) || splitName.middleName,
    lastName: normalizeText(input.lastName) || splitName.lastName,
    fullName: name,
    email: normalizeEmail(input.email),
    phone: normalizeText(input.phone),
    department: normalizeText(input.department),
    jobCode: normalizeText(input.jobCode).toUpperCase(),
    positionApplied: position,
    sourceType: normalizeSourceType(input.sourceType),
    sourceReference: normalizeText(input.sourceReference),
    sourceNotes: normalizeText(input.sourceNotes),
    contactMethod: normalizeText(input.contactMethod),
    currentCompany: normalizeText(input.currentCompany),
    dateOfBirth: parseDate(input.dateOfBirth),
    country: normalizeText(input.country),
    state: normalizeText(input.state),
    city: normalizeText(input.city),
    currentAddress:
      normalizeText(input.currentAddress || input.address) ||
      [input.country, input.state, input.city].map(normalizeText).filter(Boolean).join(", "),
    earliestStartDate: parseDate(input.earliestStartDate),
    availability: normalizeText(input.availability) || "Full-time",
    experience: normalizeText(input.experience),
    expectedSalary: normalizeText(input.expectedSalary),
    education: normalizeText(input.education),
    employmentHistory: normalizeText(input.employmentHistory),
    skills: normalizeText(input.skills),
    certifications: normalizeText(input.certifications),
    coverLetter: normalizeText(input.coverLetter),
    notes: normalizeText(input.notes),
    customFields: normalizeJsonText(input.customFields),
    status: normalizeStatus(input.status),
  };
}

function parseCsvText(csvText: string) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => String(cell || "").trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => String(cell || "").trim() !== "")) {
    rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows.shift().map((header) => String(header || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, ""));
  const aliases = {
    jobcode: "jobCode",
    code: "jobCode",
    title: "title",
    designation: "designation",
    role: "designation",
    department: "department",
    dept: "department",
    employmenttype: "employmentType",
    type: "employmentType",
    vacancytotal: "vacancyTotal",
    vacancies: "vacancyTotal",
    vacancyfilled: "vacancyFilled",
    ispaid: "isPaid",
    paid: "isPaid",
    internshipdurationmonths: "internshipDurationMonths",
    description: "description",
    aboutthejob: "aboutTheJob",
    keyresponsibilities: "keyResponsibilities",
    requirements: "requirements",
    softskills: "softSkills",
    notes: "description",
    isactive: "isActive",
    active: "isActive",
  };

  return rows.map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      const key = aliases[header] || header;
      entry[key] = String(values[index] ?? "").trim();
    });
    return entry;
  });
}

function normalizeBulkBoolean(value: any, defaultValue = false) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return defaultValue;
  if (["true", "1", "yes", "y", "on", "active"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off", "inactive"].includes(normalized)) return false;
  return defaultValue;
}

function normalizeBulkNumber(value: any, fallback = 0) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBulkEmploymentType(value: any) {
  const normalized = normalizeText(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return "full_time";
  if (["intern", "internship", "trainee"].includes(normalized)) return normalized === "trainee" ? "trainee" : "intern";
  return normalized;
}

function buildRecruitmentJobOpeningPayload(input: Record<string, any> = {}) {
  const title = normalizeText(input.title || input.designation);
  const designation = normalizeText(input.designation || input.title || title);
  const department = normalizeText(input.department);
  const employmentType = normalizeBulkEmploymentType(input.employmentType);
  const isInternship = ["intern", "trainee"].includes(employmentType);

  return {
    jobCode: normalizeText(input.jobCode).toUpperCase(),
    title,
    designation,
    department,
    employmentType,
    vacancyTotal: Math.max(1, normalizeBulkNumber(input.vacancyTotal, 1)),
    vacancyFilled: Math.max(0, normalizeBulkNumber(input.vacancyFilled, 0)),
    isPaid: input.isPaid !== undefined ? normalizeBulkBoolean(input.isPaid, !isInternship) : !isInternship,
    internshipDurationMonths: Math.max(0, normalizeBulkNumber(input.internshipDurationMonths, isInternship ? 6 : 0)),
    description: normalizeText(input.description),
    aboutTheJob: normalizeText(input.aboutTheJob),
    keyResponsibilities: normalizeText(input.keyResponsibilities),
    requirements: normalizeText(input.requirements),
    softSkills: normalizeText(input.softSkills),
    isActive: input.isActive !== undefined ? normalizeBulkBoolean(input.isActive, true) : true,
  };
}

function collectUniqueRows(rows: Record<string, any>[]) {
  const seen = new Set<string>();
  const uniqueRows: Record<string, any>[] = [];

  for (const row of rows) {
    const key = normalizeText(row.jobCode).toUpperCase() || `${normalizeText(row.title || row.designation).toLowerCase()}|${normalizeText(row.department).toLowerCase()}`;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueRows.push(row);
  }

  return uniqueRows;
}

async function ensureWorkspaceOrThrow(userId: string) {
  const { workspace } = await getCurrentWorkspace(userId);
  if (!workspace) {
    const error: any = new Error("Workspace not found for this user.");
    error.statusCode = 404;
    throw error;
  }
  return workspace;
}

async function getCandidateDocument(workspaceId: any, candidateId: string) {
  const candidate = await RecruitmentCandidate.findOne({ workspaceId, _id: candidateId }).exec();
  if (!candidate) {
    const error: any = new Error("Recruitment candidate not found.");
    error.statusCode = 404;
    throw error;
  }
  return candidate;
}

async function upsertCandidateFromPayload({
  workspace,
  candidate,
  input,
  file,
  isUpdate = false,
}: {
  workspace: any;
  candidate: any;
  input: Record<string, any>;
  file?: Express.Multer.File | null;
  isUpdate?: boolean;
}) {
  const payload = buildCandidateMutationPayload(input || {});
  const jobOpenings = await getRecruitmentJobOpeningsForWorkspace(workspace);
  const matchedOpening = findRecruitmentJobOpening(jobOpenings, {
    jobCode: payload.jobCode,
    department: payload.department,
    title: payload.positionApplied,
    designation: payload.positionApplied,
  });

  const actorUserId = workspace?.owner || null;
  const actorName = workspace?.workspaceName || workspace?.businessName || "HR Manager";

  if (!isUpdate) {
    candidate.workspaceId = workspace._id;
    candidate.candidateCode = buildCandidateCode((await RecruitmentCandidate.countDocuments({ workspaceId: workspace._id })) + 1);
    candidate.createdByUserId = actorUserId;
    candidate.createdByName = actorName;
    candidate.appliedAt = new Date();
    candidate.statusHistory = [
      {
        status: payload.status,
        note: "Candidate added to the recruitment pipeline.",
        changedByUserId: actorUserId,
        changedByName: actorName,
        createdAt: new Date(),
      },
    ];
  }

  candidate.firstName = payload.firstName || candidate.firstName || "";
  candidate.middleName = payload.middleName;
  candidate.lastName = payload.lastName || candidate.lastName || "";
  candidate.fullName = payload.fullName || buildFullName(candidate);
  candidate.email = payload.email || candidate.email || "";
  candidate.phone = payload.phone;
  candidate.department = payload.department;
  candidate.jobCode = payload.jobCode || matchedOpening?.jobCode || candidate.jobCode || "";
  candidate.positionApplied = payload.positionApplied || candidate.positionApplied || "";
  candidate.sourceType = payload.sourceType;
  candidate.sourceReference = payload.sourceReference;
  candidate.sourceNotes = payload.sourceNotes;
  candidate.contactMethod = payload.contactMethod;
  candidate.currentCompany = payload.currentCompany;
  candidate.dateOfBirth = payload.dateOfBirth;
  candidate.country = payload.country;
  candidate.state = payload.state;
  candidate.city = payload.city;
  candidate.currentAddress = payload.currentAddress;
  candidate.earliestStartDate = payload.earliestStartDate;
  candidate.availability = payload.availability;
  candidate.experience = payload.experience;
  candidate.expectedSalary = payload.expectedSalary;
  candidate.education = payload.education;
  candidate.employmentHistory = payload.employmentHistory;
  candidate.skills = payload.skills;
  candidate.certifications = payload.certifications;
  candidate.coverLetter = payload.coverLetter;
  candidate.notes = payload.notes;
  candidate.customFields = payload.customFields;

  const statusChanged = normalizeStatus(candidate.status) !== payload.status;
  candidate.status = payload.status;
  candidate.statusUpdatedAt = new Date();

  if (payload.status === "Selected" && !candidate.selectedAt) {
    candidate.selectedAt = new Date();
  }

  if (payload.status === "Converted to Employee" && !candidate.hiredAt) {
    candidate.hiredAt = new Date();
  }

  if (statusChanged || isUpdate) {
    candidate.statusHistory = [
      ...(Array.isArray(candidate.statusHistory) ? candidate.statusHistory : []),
      {
        status: payload.status,
        note: isUpdate ? "Recruitment record updated." : "Candidate added to the recruitment pipeline.",
        changedByUserId: actorUserId,
        changedByName: actorName,
        createdAt: new Date(),
      },
    ];
  }

  const resumeAttachment = await uploadResumeAttachment(file || null);
  if (resumeAttachment) {
    candidate.resume = resumeAttachment;
  }

  if (payload.status === "Converted to Employee") {
    await applyRecruitmentOpeningFillForWorkspace(workspace, {
      jobCode: candidate.jobCode,
      department: candidate.department,
      positionApplied: candidate.positionApplied,
    });
  }

  candidate.updatedByUserId = actorUserId;
  candidate.updatedByName = actorName;

  await candidate.save();
  const savedCandidate = await RecruitmentCandidate.findById(candidate._id).lean().exec();
  return buildCandidateView(savedCandidate);
}

export async function getRecruitmentOverviewForCurrentUser(userId: string) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const [candidates, jobOpenings] = await Promise.all([
    loadRecruitmentCandidates(workspace._id),
    ensureRecruitmentJobOpenings(workspace),
  ]);

  const summary = buildOverviewSummary(candidates, jobOpenings);
  const departmentOptions = await getDepartmentOptions(workspace._id, jobOpenings);

  return {
    summary,
    candidates,
    jobOpenings,
    jobTitleOptions: getActiveRecruitmentJobTitleOptions(jobOpenings),
    departmentOptions,
    sourceOptions: RECRUITMENT_SOURCE_TYPES,
    statusOptions: RECRUITMENT_STATUSES,
  };
}

export async function getRecruitmentJobOpeningsForCurrentUser(userId: string) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const jobOpenings = await getRecruitmentJobOpeningsForWorkspace(workspace);
  return {
    jobOpenings,
    jobTitleOptions: getActiveRecruitmentJobTitleOptions(jobOpenings),
    summary: buildOverviewSummary(await loadRecruitmentCandidates(workspace._id), jobOpenings),
  };
}

export async function createRecruitmentCandidateForCurrentUser(userId: string, input: Record<string, any>, file: Express.Multer.File | null = null) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const candidate = new RecruitmentCandidate();
  const created = await upsertCandidateFromPayload({ workspace, candidate, input, file, isUpdate: false });

  return {
    candidate: created,
    overview: await getRecruitmentOverviewForCurrentUser(userId),
  };
}

export async function createRecruitmentJobOpeningForCurrentUser(userId: string, input: Record<string, any>) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const jobOpening = await createRecruitmentJobOpeningForWorkspace(workspace, input);

  return {
    jobOpening,
    overview: await getRecruitmentOverviewForCurrentUser(userId),
  };
}

export async function updateRecruitmentJobOpeningForCurrentUser(userId: string, jobCode: string, input: Record<string, any>) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const jobOpening = await updateRecruitmentJobOpeningForWorkspace(workspace, jobCode, input);

  return {
    jobOpening,
    overview: await getRecruitmentOverviewForCurrentUser(userId),
  };
}

export async function bulkUploadRecruitmentJobOpeningsForCurrentUser(userId: string, file: Express.Multer.File | null) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  if (!file?.buffer?.length) {
    const error: any = new Error("CSV file is required for bulk upload.");
    error.statusCode = 400;
    throw error;
  }

  const fileName = String(file.originalname || "").toLowerCase();
  const isCsvFile = file.mimetype === "text/csv" || fileName.endsWith(".csv");
  if (!isCsvFile) {
    const error: any = new Error("Only CSV files are supported for bulk job opening upload.");
    error.statusCode = 400;
    throw error;
  }

  const rows = collectUniqueRows(parseCsvText(file.buffer.toString("utf8")));
  if (rows.length === 0) {
    const error: any = new Error("No job openings found in the uploaded CSV.");
    error.statusCode = 400;
    throw error;
  }

  const existingOpenings = await getRecruitmentJobOpeningsForWorkspace(workspace);
  const existingByCode = new Map(
    existingOpenings
      .map((opening) => [normalizeText(opening.jobCode).toUpperCase(), opening])
      .filter(([code]) => Boolean(code)),
  );

  const results = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const rawRow of rows) {
    const payload = buildRecruitmentJobOpeningPayload(rawRow);
    if (!payload.title || !payload.department) {
      skippedCount += 1;
      continue;
    }

    const normalizedCode = normalizeText(payload.jobCode).toUpperCase();
    const existing = normalizedCode ? existingByCode.get(normalizedCode) : null;

    if (existing) {
      const updated = await updateRecruitmentJobOpeningForWorkspace(workspace, existing.jobCode, payload);
      existingByCode.set(updated.jobCode.toUpperCase(), updated);
      results.push(updated);
      updatedCount += 1;
      continue;
    }

    const created = await createRecruitmentJobOpeningForWorkspace(workspace, payload);
    existingByCode.set(created.jobCode.toUpperCase(), created);
    results.push(created);
    createdCount += 1;
  }

  return {
    importedCount: createdCount + updatedCount,
    createdCount,
    updatedCount,
    skippedCount,
    jobOpenings: await getRecruitmentJobOpeningsForWorkspace(workspace),
    overview: await getRecruitmentOverviewForCurrentUser(userId),
    results,
  };
}

export async function updateRecruitmentCandidateForCurrentUser(userId: string, candidateId: string, input: Record<string, any>, file: Express.Multer.File | null = null) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const candidate = await getCandidateDocument(workspace._id, candidateId);
  const updated = await upsertCandidateFromPayload({ workspace, candidate, input, file, isUpdate: true });

  return {
    candidate: updated,
    overview: await getRecruitmentOverviewForCurrentUser(userId),
  };
}

export async function sendRecruitmentCandidateEmailForCurrentUser(userId: string, candidateId: string, input: Record<string, any> = {}) {
  const workspace = await ensureWorkspaceOrThrow(userId);
  const candidate = await getCandidateDocument(workspace._id, candidateId);
  const templateType = normalizeText(input.templateType) || "status_update";
  const subject = `Update on your application for ${candidate.positionApplied || "the role"}`;

  await sendMail({
    to: candidate.email,
    subject,
    html: `
      <p>Hi ${buildFullName(candidate) || "there"},</p>
      <p>This is an update on your application for <strong>${candidate.positionApplied || "the role"}</strong>.</p>
      <p>Current status: <strong>${candidate.status || "Applied"}</strong></p>
      <p>Reference code: ${candidate.candidateCode || "-"}</p>
    `,
  });

  candidate.emailHistory = [
    ...(Array.isArray(candidate.emailHistory) ? candidate.emailHistory : []),
    {
      templateType,
      subject,
      recipientEmail: candidate.email,
      sentByUserId: mongoose.Types.ObjectId.isValid(String(workspace.owner || "")) ? workspace.owner : null,
      sentByName: workspace?.workspaceName || workspace?.businessName || "HR Manager",
      sentAt: new Date(),
    },
  ];
  candidate.updatedByUserId = mongoose.Types.ObjectId.isValid(String(workspace.owner || "")) ? workspace.owner : null;
  candidate.updatedByName = workspace?.workspaceName || workspace?.businessName || "HR Manager";
  await candidate.save();

  const savedCandidate = await RecruitmentCandidate.findById(candidate._id).lean().exec();
  return {
    candidate: buildCandidateView(savedCandidate),
    overview: await getRecruitmentOverviewForCurrentUser(userId),
  };
}
