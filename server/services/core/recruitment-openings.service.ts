// @ts-nocheck
import RecruitmentJobOpening from "../../models/RecruitmentJobOpening.js";

const FALLBACK_JOB_TITLE = "Untitled Position";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeDepartment(value = "") {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return "HR";
  if (normalized.includes("sales")) return "Sales & CRM";
  if (normalized.includes("finance") || normalized.includes("account")) return "Finance";
  if (normalized.includes("tech") || normalized.includes("engineering")) return "Tech";
  if (normalized.includes("lead") || normalized.includes("exec") || normalized.includes("top")) return "Leadership";
  if (normalized.includes("it")) return "IT";
  if (normalized.includes("maint")) return "Maintenance";
  if (normalized.includes("admin")) return "Administration";
  return "HR";
}

function createJobCode(department, index) {
  const prefix = normalizeDepartment(department)
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 3)
    .toUpperCase() || "JOB";
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function buildUniqueJobCode(openings = [], department = "", preferredCode = "") {
  const existingCodes = new Set(
    openings
      .map((opening) => normalizeText(opening?.jobCode).toUpperCase())
      .filter(Boolean),
  );

  let nextCode = normalizeText(preferredCode).toUpperCase();
  if (!nextCode) {
    nextCode = createJobCode(department, openings.length);
  }

  let attempt = openings.length + 1;
  while (existingCodes.has(nextCode)) {
    nextCode = createJobCode(department, attempt);
    attempt += 1;
  }

  return nextCode;
}

function buildJobOpeningView(opening = {}, index = 0) {
  const vacancyTotal = Number(opening.vacancyTotal || 0);
  const vacancyFilled = Number(opening.vacancyFilled || 0);
  const remainingVacancies = Math.max(vacancyTotal - vacancyFilled, 0);
  const title = normalizeText(opening.title) || FALLBACK_JOB_TITLE;
  const jobCode = normalizeText(opening.jobCode).toUpperCase() || createJobCode(opening.department, index);
  const department = normalizeDepartment(opening.department);
  const employmentType = normalizeText(opening.employmentType) || "full_time";

  return {
    id: jobCode,
    jobCode,
    title,
    designation: normalizeText(opening.designation) || title,
    department,
    employmentType,
    employmentTypeLabel: employmentType === "intern" ? "Intern" : employmentType === "full_time" ? "Full Time" : employmentType,
    isPaid: opening.isPaid !== false,
    internshipDurationMonths: Number(opening.internshipDurationMonths || 0),
    vacancyTotal,
    vacancyFilled,
    remainingVacancies,
    isActive: opening.isActive !== false,
    description: normalizeText(opening.description),
    createdAt: opening.createdAt || null,
    updatedAt: opening.updatedAt || null,
    status: opening.isActive !== false && remainingVacancies > 0 ? "Active" : "Inactive",
  };
}

async function persistOpenings(workspaceId, openings) {
  await RecruitmentJobOpening.deleteMany({ workspaceId });
  if (openings.length > 0) {
    await RecruitmentJobOpening.insertMany(
      openings.map((opening) => ({
        ...opening,
        workspaceId,
      })),
    );
  }
  return openings;
}

export async function ensureRecruitmentJobOpenings(workspace) {
  if (!workspace?._id) return [];

  const storedOpenings = await RecruitmentJobOpening.find({ workspaceId: workspace._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .exec();

  if (!storedOpenings.length) return [];

  const normalizedOpenings = storedOpenings.map((opening, index) => ({
    ...opening,
    ...buildJobOpeningView(opening, index),
  }));

  const needsPersist = normalizedOpenings.some((opening, index) => {
    const original = storedOpenings[index] || {};
    return (
      normalizeText(original.jobCode).toUpperCase() !== opening.jobCode
      || normalizeDepartment(original.department) !== opening.department
      || normalizeText(original.title) !== opening.title
      || normalizeText(original.designation) !== opening.designation
      || Boolean(original.isActive !== false) !== opening.isActive
    );
  });

  if (needsPersist) {
    await persistOpenings(workspace._id, normalizedOpenings);
  }

  return normalizedOpenings.map(buildJobOpeningView);
}

export async function getRecruitmentJobOpeningsForWorkspace(workspace) {
  return ensureRecruitmentJobOpenings(workspace);
}

export function getActiveRecruitmentJobTitleOptions(openings = []) {
  return openings
    .map(buildJobOpeningView)
    .filter((opening) => opening.isActive && opening.remainingVacancies > 0)
    .map((opening) => ({
      jobCode: opening.jobCode,
      title: opening.title,
      designation: opening.designation,
      department: opening.department,
      employmentType: opening.employmentType,
      employmentTypeLabel: opening.employmentTypeLabel,
      isPaid: opening.isPaid,
      internshipDurationMonths: opening.internshipDurationMonths,
      remainingVacancies: opening.remainingVacancies,
      description: opening.description,
      label: `${opening.designation} (${opening.department})`,
    }));
}

export function findRecruitmentJobOpening(openings = [], query = {}) {
  const normalizedCode = normalizeText(query.jobCode).toUpperCase();
  const hasDepartment = Boolean(normalizeText(query.department));
  const normalizedDepartment = hasDepartment ? normalizeDepartment(query.department) : "";
  const normalizedTitle = normalizeText(query.title || query.designation).toLowerCase();

  return openings.find((opening, index) => {
    const view = buildJobOpeningView(opening, index);
    if (normalizedCode && view.jobCode.toUpperCase() === normalizedCode) return true;
    if (normalizedTitle && [view.title, view.designation].map((value) => String(value || "").toLowerCase()).includes(normalizedTitle)) return true;
    if (hasDepartment && normalizedDepartment && view.department !== normalizedDepartment) return false;
    return Boolean(normalizedTitle);
  }) || null;
}

export async function createRecruitmentJobOpeningForWorkspace(workspace, input = {}) {
  const openings = await RecruitmentJobOpening.find({ workspaceId: workspace._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .exec();

  const title = normalizeText(input.title);
  const designation = normalizeText(input.designation) || title;
  const department = normalizeDepartment(input.department);
  const opening = {
    workspaceId: workspace._id,
    jobCode: buildUniqueJobCode(openings, department, input.jobCode),
    title,
    designation,
    department,
    employmentType: normalizeText(input.employmentType) || "full_time",
    isPaid: input.isPaid !== false,
    internshipDurationMonths: Number(input.internshipDurationMonths || 0),
    vacancyTotal: Math.max(1, Number(input.vacancyTotal || 1)),
    vacancyFilled: Math.max(0, Number(input.vacancyFilled || 0)),
    isActive: input.isActive !== false,
    description: normalizeText(input.description),
  };

  openings.unshift(opening);
  await persistOpenings(workspace._id, openings);
  return buildJobOpeningView(opening, 0);
}

export async function updateRecruitmentJobOpeningForWorkspace(workspace, jobCode, input = {}) {
  const openings = await RecruitmentJobOpening.find({ workspaceId: workspace._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .exec();

  const normalizedCode = normalizeText(jobCode).toUpperCase();
  const index = openings.findIndex((opening, openingIndex) => buildJobOpeningView(opening, openingIndex).jobCode.toUpperCase() === normalizedCode);

  if (index < 0) {
    const error = new Error("Recruitment job opening not found.");
    error.statusCode = 404;
    throw error;
  }

  const nextOpening = {
    ...openings[index],
    title: Object.prototype.hasOwnProperty.call(input, "title") ? normalizeText(input.title) : normalizeText(openings[index].title),
    designation: Object.prototype.hasOwnProperty.call(input, "designation") ? normalizeText(input.designation) : normalizeText(openings[index].designation || openings[index].title),
    department: Object.prototype.hasOwnProperty.call(input, "department") ? normalizeDepartment(input.department) : normalizeDepartment(openings[index].department),
    employmentType: Object.prototype.hasOwnProperty.call(input, "employmentType") ? normalizeText(input.employmentType) || "full_time" : normalizeText(openings[index].employmentType || "full_time"),
    isPaid: Object.prototype.hasOwnProperty.call(input, "isPaid") ? input.isPaid !== false : openings[index].isPaid !== false,
    internshipDurationMonths: Object.prototype.hasOwnProperty.call(input, "internshipDurationMonths") ? Number(input.internshipDurationMonths || 0) : Number(openings[index].internshipDurationMonths || 0),
    vacancyTotal: Object.prototype.hasOwnProperty.call(input, "vacancyTotal") ? Math.max(1, Number(input.vacancyTotal || 1)) : Math.max(1, Number(openings[index].vacancyTotal || 1)),
    vacancyFilled: Object.prototype.hasOwnProperty.call(input, "vacancyFilled") ? Math.max(0, Number(input.vacancyFilled || 0)) : Math.max(0, Number(openings[index].vacancyFilled || 0)),
    isActive: Object.prototype.hasOwnProperty.call(input, "isActive") ? Boolean(input.isActive) : openings[index].isActive !== false,
    description: Object.prototype.hasOwnProperty.call(input, "description") ? normalizeText(input.description) : normalizeText(openings[index].description),
  };

  if (nextOpening.vacancyFilled > nextOpening.vacancyTotal) {
    nextOpening.vacancyFilled = nextOpening.vacancyTotal;
  }

  openings[index] = nextOpening;
  await persistOpenings(workspace._id, openings);
  return buildJobOpeningView(nextOpening, index);
}

export async function applyRecruitmentOpeningFillForWorkspace(workspace, candidate = {}) {
  const openings = await RecruitmentJobOpening.find({ workspaceId: workspace._id })
    .sort({ createdAt: 1, _id: 1 })
    .lean()
    .exec();

  if (!openings.length) return null;

  const normalizedCode = normalizeText(candidate.jobCode || candidate.jobOpeningCode).toUpperCase();
  const hasDepartment = Boolean(normalizeText(candidate.department));
  const normalizedDepartment = hasDepartment ? normalizeDepartment(candidate.department) : "";
  const normalizedTitle = normalizeText(candidate.positionApplied || candidate.position || candidate.designation).toLowerCase();

  const index = openings.findIndex((opening) => {
    const openingCode = normalizeText(opening.jobCode).toUpperCase();
    const openingTitle = normalizeText(opening.title).toLowerCase();
    const openingDesignation = normalizeText(opening.designation || opening.title).toLowerCase();
    const openingDepartment = normalizeDepartment(opening.department);

    if (normalizedCode && openingCode === normalizedCode) return true;
    if (hasDepartment && normalizedDepartment && openingDepartment !== normalizedDepartment) return false;
    if (normalizedTitle && openingTitle !== normalizedTitle && openingDesignation !== normalizedTitle) return false;
    return Boolean(normalizedTitle);
  });

  if (index < 0) return null;

  const opening = { ...openings[index] };
  opening.vacancyFilled = Math.min(Number(opening.vacancyTotal || 1), Number(opening.vacancyFilled || 0) + 1);
  opening.isActive = opening.vacancyFilled < Number(opening.vacancyTotal || 1);
  openings[index] = opening;

  await persistOpenings(workspace._id, openings);
  return buildJobOpeningView(opening, index);
}

export function getRecruitmentJobOpeningViewsForWorkspace(workspace) {
  return getRecruitmentJobOpeningsForWorkspace(workspace);
}
