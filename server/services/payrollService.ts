// @ts-nocheck
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Holiday from "../models/Holiday.js";
import LeaveRequest from "../models/LeaveRequest.js";
import PayrollCycle from "../models/PayrollCycle.js";
import PayrollEntry from "../models/PayrollEntry.js";
import PayrollPayment from "../models/PayrollPayment.js";
import PayrollPayslip from "../models/PayrollPayslip.js";

function asObjectId(value: any): mongoose.Types.ObjectId | null {
  try {
    if (!value) return null;
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

function safeString(value: any, fallback = "") {
  return String(value ?? fallback).trim();
}

function safeNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const PAYROLL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function payrollError(message: string, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function normalizeMoney(value: any, fallback = 0) {
  return Math.round(safeNumber(value, fallback) * 100) / 100;
}

function normalizeCurrency(value: any, fallback = "INR") {
  const resolved = safeString(value, fallback).toUpperCase() || fallback;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: resolved }).format(0);
    return resolved;
  } catch {
    return fallback;
  }
}

function normalizeTimeZone(value: any, fallback = "Asia/Kolkata") {
  const resolved = safeString(value, fallback) || fallback;
  try {
    new Intl.DateTimeFormat("en", { timeZone: resolved }).format(new Date());
    return resolved;
  } catch {
    return fallback;
  }
}

function payrollDateParts(date: Date, timeZone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date).map((part) => [part.type, part.value]));
}

function parsePayrollPeriod(input: any = {}, timeZone = "Asia/Kolkata") {
  const current = payrollDateParts(new Date(), timeZone);
  // Payroll for a month is only complete once that month ends, so the
  // default (when no month/year is requested) is the last completed month.
  let year = Number(current.year);
  let monthIndex = Number(current.month) - 1 - 1;
  if (monthIndex < 0) {
    monthIndex = 11;
    year -= 1;
  }
  const requestedYear = input.year ?? input.fiscalYear;
  if (requestedYear !== undefined && /^\d{4}$/.test(String(requestedYear))) year = Number(requestedYear);
  const requestedMonth = input.month ?? input.monthIndex;
  if (requestedMonth !== undefined && safeString(requestedMonth)) {
    const labelIndex = PAYROLL_MONTHS.findIndex((name) => name.toLowerCase() === safeString(requestedMonth).toLowerCase());
    const numericMonth = Number(requestedMonth);
    if (labelIndex >= 0) monthIndex = labelIndex;
    else if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) monthIndex = numericMonth - 1;
    else if (Number.isInteger(numericMonth) && numericMonth >= 0 && numericMonth <= 11) monthIndex = numericMonth;
  }
  if (!Number.isInteger(year) || year < 2000 || year > 3000 || monthIndex < 0 || monthIndex > 11) {
    throw payrollError("Select a valid payroll month and year.");
  }
  return {
    year,
    monthIndex,
    monthLabel: PAYROLL_MONTHS[monthIndex],
    cycleKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
  };
}

function getPayrollMonthStats(year: number, monthIndex: number, timeZone: string) {
  const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
  const workingDateKeys: string[] = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const parts = payrollDateParts(new Date(Date.UTC(year, monthIndex, day, 12)), timeZone);
    if (parts.weekday !== "Sun") workingDateKeys.push(`${parts.year}-${parts.month}-${parts.day}`);
  }
  return { totalDays, workingDateKeys, workingDays: workingDateKeys.length };
}

function resolveAnnualCtc(salaryPackage: any = {}) {
  const annual = normalizeMoney(salaryPackage.grossAnnual ?? salaryPackage.annualCtc, 0);
  if (annual > 0) return annual;
  const amount = normalizeMoney(salaryPackage.amount, 0);
  const frequency = safeString(salaryPackage.payFrequency, "annual").toLowerCase();
  if (frequency === "monthly") return normalizeMoney(amount * 12);
  if (frequency === "weekly") return normalizeMoney(amount * 52);
  if (frequency === "biweekly") return normalizeMoney(amount * 26);
  return amount;
}

function payrollRoleLabel(value: any) {
  const label = safeString(value?.name ?? value, "Employee");
  return label.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPayrollLeaderRole(value: any) {
  const normalized = safeString(value?.name ?? value).toLowerCase().replace(/[_-]+/g, " ").trim();
  return normalized === "founder" || normalized === "super admin" || normalized === "owner";
}

function isUnpaidLeave(leave: any) {
  const leaveType = safeString(leave?.leaveType).toLowerCase();
  return leaveType.includes("unpaid") || leaveType.includes("loss of pay") || leaveType === "lop";
}

function applyPayrollAdjustments(entry: any, adjustments: any[] = []) {
  const bonuses = normalizeMoney(adjustments.filter((item) => item.type === "bonus").reduce((sum, item) => sum + normalizeMoney(item.amount), 0));
  const deductions = normalizeMoney(adjustments.filter((item) => item.type === "deduction").reduce((sum, item) => sum + normalizeMoney(item.amount), 0));
  const gross = normalizeMoney(entry.financials?.attendanceGrossPay ?? entry.financials?.baseSalary);
  const benefits = normalizeMoney(entry.financials?.benefits);
  const standard = normalizeMoney(entry.financials?.standardDeductions);
  return {
    ...entry,
    financials: {
      ...entry.financials,
      hrBonus: bonuses,
      hrDeductions: deductions,
      netSalary: normalizeMoney(Math.max(0, gross + benefits + bonuses - standard - deductions)),
    },
    manualAdjustments: adjustments,
    adjustmentReason: adjustments.map((item) => safeString(item.reason)).filter(Boolean).join(" | "),
  };
}

function summarizePayrollEntries(entries: any[] = []) {
  return entries.reduce((summary, employee) => {
    summary.totalEmployees += 1;
    summary.totalWorkingDays += safeNumber(employee.attendance?.workingDays);
    summary.totalGross += safeNumber(employee.financials?.attendanceGrossPay) + safeNumber(employee.financials?.benefits) + safeNumber(employee.financials?.hrBonus);
    summary.totalBenefits += safeNumber(employee.financials?.benefits);
    summary.totalStandardDeductions += safeNumber(employee.financials?.standardDeductions);
    summary.totalAttendanceDeductions += safeNumber(employee.financials?.attendanceDeductions);
    summary.totalManualBonuses += safeNumber(employee.financials?.hrBonus);
    summary.totalManualDeductions += safeNumber(employee.financials?.hrDeductions);
    summary.totalNetPayable += safeNumber(employee.financials?.netSalary);
    return summary;
  }, {
    totalEmployees: 0, totalWorkingDays: 0, totalGross: 0, totalBenefits: 0,
    totalStandardDeductions: 0, totalAttendanceDeductions: 0,
    totalManualBonuses: 0, totalManualDeductions: 0, totalNetPayable: 0,
  });
}

function normalizePayrollEntry(entry: any) {
  const item = entry?.toObject ? entry.toObject() : entry;
  return {
    ...item,
    id: safeString(item.employeeId || item._id),
    profileId: safeString(item.profileId),
    cycleId: safeString(item.cycleId),
    name: safeString(item.employeeName),
    payment: {
      status: safeString(item.financials?.paymentStatus, "Pending"),
      recordId: item.financials?.paymentRecordId ? safeString(item.financials.paymentRecordId) : null,
      transactionId: safeString(item.financials?.paymentTransactionId),
      paidAt: item.financials?.paidAt || null,
      method: safeString(item.financials?.paymentMethod),
    },
    payslip: {
      id: item.financials?.payslipId ? safeString(item.financials.payslipId) : null,
      url: safeString(item.financials?.payslipUrl),
      fileUrl: safeString(item.financials?.payslipUrl),
      fileName: safeString(item.financials?.payslipFileName),
      generatedAt: item.financials?.payslipGeneratedAt || null,
      sentAt: item.financials?.payslipSentAt || null,
    },
  };
}

async function buildPayrollCycleView(cycle: any, financeOnly = false) {
  if (!cycle) return null;
  const allEntries = await PayrollEntry.find({ cycleId: cycle._id }).sort({ employeeName: 1 }).lean();
  const entries = financeOnly
    ? allEntries.filter((entry) => safeNumber(entry.financials?.netSalary) > 0)
    : allEntries;
  const summary = summarizePayrollEntries(entries);
  return {
    id: safeString(cycle._id),
    cycleKey: cycle.cycleKey,
    month: cycle.month,
    year: cycle.year,
    monthLabel: cycle.monthLabel,
    displayMonth: `${cycle.monthLabel} ${cycle.year}`,
    status: cycle.status,
    processedOn: cycle.processedOn || cycle.updatedAt || cycle.createdAt || null,
    preparedAt: cycle.preparedAt || null,
    sentToFinanceAt: cycle.sentToFinanceAt || null,
    paidAt: cycle.paidAt || null,
    summary,
    totalEmployees: entries.length,
    totalAmount: normalizeMoney(summary.totalNetPayable),
    employees: entries.map(normalizePayrollEntry),
  };
}

async function calculateWorkspacePayrollEntries(workspace: any, period: any, existingByProfile = new Map()) {
  const zone = normalizeTimeZone(workspace?.preferences?.timezone);
  const workspaceCurrency = normalizeCurrency(workspace?.preferences?.currency);
  const stats = getPayrollMonthStats(period.year, period.monthIndex, zone);
  const todayParts = payrollDateParts(new Date(), zone);
  const todayKey = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const startKey = `${period.cycleKey}-01`;
  const endKey = `${period.cycleKey}-${String(stats.totalDays).padStart(2, "0")}`;
  const periodEnd = new Date(`${endKey}T23:59:59.999Z`);
  const profiles = await EmployeeProfile.find({
    workspaceId: workspace._id,
    isActive: { $ne: false },
    status: { $nin: ["inactive", "terminated"] },
    $and: [
      {
        $or: [
          { "salaryPackage.grossAnnual": { $gt: 0 } },
          { "salaryPackage.amount": { $gt: 0 } },
        ],
      },
      {
        $or: [
          { joiningDate: { $exists: false } },
          { joiningDate: null },
          { joiningDate: { $lte: periodEnd } },
        ],
      },
    ],
  })
    .populate("departments", "name")
    .populate("workspaceRole", "name")
    .sort({ fullName: 1 })
    .lean();
  const userIds = profiles.map((profile) => profile.linkedUserId).filter(Boolean);
  const [attendanceRecords, leaveRequests, holidays] = await Promise.all([
    userIds.length
      ? Attendance.find({ workspaceId: workspace._id, employeeUserId: { $in: userIds }, dateKey: { $gte: startKey, $lte: endKey } }).lean()
      : [],
    userIds.length
      ? LeaveRequest.find({
          workspaceId: workspace._id,
          requesterUserId: { $in: userIds },
          status: "approved",
          startDate: { $lte: new Date(`${endKey}T23:59:59.999Z`) },
          endDate: { $gte: new Date(`${startKey}T00:00:00.000Z`) },
        }).lean()
      : [],
    Holiday.find({
      workspaceId: workspace._id,
      isActive: true,
      entryKind: "holiday",
      dateKey: { $gte: startKey, $lte: endKey },
    }).lean(),
  ]);
  const holidayDateKeys = new Set(holidays.map((holiday) => holiday.dateKey));
  const attendanceByKey = new Map(attendanceRecords.map((record) => [`${record.employeeUserId}:${record.dateKey}`, record]));
  const leaveByKey = new Map();
  for (const leave of leaveRequests) {
    const cursor = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    cursor.setUTCHours(12, 0, 0, 0);
    end.setUTCHours(12, 0, 0, 0);
    while (cursor <= end) {
      const parts = payrollDateParts(cursor, zone);
      leaveByKey.set(`${leave.requesterUserId}:${parts.year}-${parts.month}-${parts.day}`, leave);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return profiles.map((profile) => {
    const annualCtc = resolveAnnualCtc(profile.salaryPackage);
    const monthlyCtc = normalizeMoney(annualCtc / 12);
    const dailyRate = stats.workingDays ? normalizeMoney(monthlyCtc / stats.workingDays) : 0;
    const joiningDate = profile.joiningDate ? new Date(profile.joiningDate) : null;
    let joiningKey = "";
    if (joiningDate && !Number.isNaN(joiningDate.getTime())) {
      const joiningParts = payrollDateParts(joiningDate, zone);
      joiningKey = `${joiningParts.year}-${joiningParts.month}-${joiningParts.day}`;
    }
    const employeeUserKey = safeString(profile.linkedUserId || profile._id);
    let present = 0;
    let paidLeaves = 0;
    let halfDays = 0;
    let unpaidLeaves = 0;
    let projectedDays = 0;
    let holidayDays = 0;
    let preJoiningDays = 0;
    for (const dateKey of stats.workingDateKeys) {
      if (joiningKey && dateKey < joiningKey) {
        preJoiningDays += 1;
        continue;
      }
      if (dateKey >= todayKey) {
        projectedDays += 1;
        continue;
      }
      if (holidayDateKeys.has(dateKey)) {
        holidayDays += 1;
        continue;
      }
      const attendance = attendanceByKey.get(`${employeeUserKey}:${dateKey}`);
      const leave = leaveByKey.get(`${employeeUserKey}:${dateKey}`);
      const status = safeString(attendance?.status).toLowerCase();
      if (["present", "present_late", "wfh", "on_break", "overtime"].includes(status)) present += 1;
      else if (leave && isUnpaidLeave(leave)) {
        if (leave.leaveMode === "half_day") halfDays += 1;
        else unpaidLeaves += 1;
      }
      else if (leave) paidLeaves += 1;
      else if (["half_day", "shortfall"].includes(status)) halfDays += 1;
      else unpaidLeaves += 1;
    }
    // Days that haven't happened yet this cycle aren't earned yet — only actual
    // present/paid/leave days count as payable, so a mid-cycle preview reflects
    // pay earned so far, not an assumption that the rest of the month is worked.
    const payableDays = normalizeMoney(present + paidLeaves + holidayDays + halfDays / 2);
    const absenceUnits = normalizeMoney(unpaidLeaves + halfDays / 2 + preJoiningDays + projectedDays);
    const attendanceDeductions = normalizeMoney(Math.min(monthlyCtc, dailyRate * absenceUnits));
    const attendanceGrossPay = normalizeMoney(Math.max(0, monthlyCtc - attendanceDeductions));
    const allowances = normalizeMoney(profile.salaryPackage?.allowances);
    const fixedDeductions = normalizeMoney(profile.salaryPackage?.deductions);
    const prorationFactor = stats.workingDays ? payableDays / stats.workingDays : 0;
    const existing = existingByProfile.get(safeString(profile._id));
    const entry = {
      profileId: profile._id,
      linkedUserId: profile.linkedUserId || null,
      employeeId: safeString(profile.employeeId || profile._id).toUpperCase(),
      employeeName: safeString(profile.fullName, "Employee"),
      department: isPayrollLeaderRole(profile.workspaceRole)
        ? "All Departments"
        : (profile.departments || []).map((department) => safeString(department?.name)).filter(Boolean).join(" / ") || "Unassigned",
      departmentId: profile.departments?.[0]?._id || null,
      role: payrollRoleLabel(profile.workspaceRole),
      roleId: profile.workspaceRole?._id || null,
      salaryPackage: {
        annualCtc, grossAnnual: annualCtc, monthlyCtc, grossMonthly: monthlyCtc,
        currency: workspaceCurrency,
        benefits: allowances, deductions: fixedDeductions,
      },
      attendance: {
        totalDays: stats.totalDays, workingDays: stats.workingDays, payableDays,
        present, projectedDays, halfDays, paidLeaves, holidayDays, preJoiningDays, absentDays: unpaidLeaves, unpaidLeaves, dailyRate,
        presentPay: normalizeMoney(dailyRate * present),
        leavePay: normalizeMoney(dailyRate * paidLeaves),
        halfDayPay: normalizeMoney(dailyRate * halfDays / 2),
        holidayPay: normalizeMoney(dailyRate * holidayDays),
      },
      financials: {
        baseSalary: monthlyCtc,
        benefits: normalizeMoney(allowances * prorationFactor),
        standardDeductions: normalizeMoney(fixedDeductions * prorationFactor),
        attendanceDeductions,
        attendanceGrossPay,
        monthlyGrossSalary: monthlyCtc,
        hrBonus: 0,
        hrDeductions: 0,
        netSalary: 0,
        currency: workspaceCurrency,
        prorationFactor: normalizeMoney(prorationFactor),
        paymentStatus: existing?.financials?.paymentStatus || "Pending",
        paymentRecordId: existing?.financials?.paymentRecordId || null,
        paymentTransactionId: existing?.financials?.paymentTransactionId || "",
        paidAt: existing?.financials?.paidAt || null,
        paymentMethod: existing?.financials?.paymentMethod || "",
        paymentErrorMessage: existing?.financials?.paymentErrorMessage || "",
        paymentHistory: existing?.financials?.paymentHistory || [],
        payslipId: existing?.financials?.payslipId || null,
        payslipUrl: existing?.financials?.payslipUrl || "",
        payslipFileName: existing?.financials?.payslipFileName || "",
        payslipGeneratedAt: existing?.financials?.payslipGeneratedAt || null,
        payslipSentAt: existing?.financials?.payslipSentAt || null,
      },
      manualAdjustments: existing?.manualAdjustments || [],
      hasSalaryPackage: annualCtc > 0,
    };
    return applyPayrollAdjustments(entry, entry.manualAdjustments);
  });
}

async function getOrCreatePayrollCycle(workspace: any, query: any = {}) {
  const zone = normalizeTimeZone(workspace?.preferences?.timezone);
  const period = parsePayrollPeriod(query, zone);
  let cycle = await PayrollCycle.findOne({ workspaceId: workspace._id, cycleKey: period.cycleKey });
  if (!cycle) {
    cycle = await PayrollCycle.create({
      workspaceId: workspace._id,
      ownerId: workspace.owner,
      cycleKey: period.cycleKey,
      month: period.monthIndex,
      year: period.year,
      monthLabel: period.monthLabel,
      status: "Pending",
      employeeEntries: [],
      summary: {},
    });
  }
  if (cycle.status === "Pending") {
    const existingEntries = await PayrollEntry.find({ cycleId: cycle._id }).lean();
    const existingByProfile = new Map(existingEntries.map((entry) => [safeString(entry.profileId), entry]));
    const entries = await calculateWorkspacePayrollEntries(workspace, period, existingByProfile);
    if (entries.length) {
      await PayrollEntry.bulkWrite(entries.map((entry) => ({
        updateOne: {
          filter: { cycleId: cycle._id, profileId: entry.profileId },
          update: { $set: { ...entry, workspaceId: workspace._id, cycleId: cycle._id } },
          upsert: true,
        },
      })));
    }
    await PayrollEntry.deleteMany({
      cycleId: cycle._id,
      profileId: { $nin: entries.map((entry) => entry.profileId) },
    });
    cycle.employeeEntries = entries;
    cycle.summary = summarizePayrollEntries(entries);
    await cycle.save();
  }
  return { cycle, period, zone };
}

async function buildPayrollSnapshot(workspace: any, query: any = {}, financeOnly = false) {
  const { cycle, period, zone } = await getOrCreatePayrollCycle(workspace, query);
  const historyCycles = await PayrollCycle.find({
    workspaceId: workspace._id,
    cycleKey: { $ne: period.cycleKey },
    status: { $ne: "Pending" },
  }).sort({ year: -1, month: -1 }).limit(24).lean();
  const currentCycle = await buildPayrollCycleView(cycle, financeOnly);
  const history = await Promise.all(historyCycles.map((item) => buildPayrollCycleView(item, financeOnly)));
  return {
    currentCycle,
    history,
    filters: {
      departments: [...new Set((currentCycle?.employees || []).map((item) => item.department).filter(Boolean))].sort(),
      roles: [...new Set((currentCycle?.employees || []).map((item) => item.role).filter(Boolean))].sort(),
      months: PAYROLL_MONTHS,
      years: [period.year - 2, period.year - 1, period.year, period.year + 1].map(String),
    },
    settings: {
      currency: normalizeCurrency(workspace?.preferences?.currency),
      timezone: zone,
    },
  };
}

export async function getHrPayrollSnapshot(input: { workspace: any; userId: any; query?: any }) {
  return buildPayrollSnapshot(input.workspace, input.query || {}, false);
}

export async function prepareHrPayrollCycle(input: { workspace: any; userId: any; body?: any }) {
  const { cycle } = await getOrCreatePayrollCycle(input.workspace, input.body || {});
  if (cycle.status === "Pending") {
    const now = new Date();
    cycle.status = "Prepared";
    cycle.processedOn = cycle.processedOn || now;
    cycle.preparedAt = now;
    cycle.preparedBy = input.userId;
    await cycle.save();
  }
  return { currentCycle: await buildPayrollCycleView(cycle) };
}

export async function updateHrPayrollCycleStatus(input: { workspace: any; userId: any; cycleId: string; body?: any }) {
  const cycle = await PayrollCycle.findOne({ _id: input.cycleId, workspaceId: input.workspace._id });
  if (!cycle) throw payrollError("Payroll cycle not found.", 404);
  const allowedStatuses = ["Pending", "Prepared", "Sent to Finance"];
  const nextStatus = safeString(input.body?.status);
  if (!allowedStatuses.includes(nextStatus)) throw payrollError("Invalid payroll cycle status.");
  if (allowedStatuses.indexOf(nextStatus) < allowedStatuses.indexOf(cycle.status)) {
    throw payrollError("Payroll cycle status cannot move backwards.", 409);
  }
  const now = new Date();
  cycle.status = nextStatus;
  cycle.processedOn = cycle.processedOn || now;
  if (nextStatus === "Prepared") { cycle.preparedAt = now; cycle.preparedBy = input.userId; }
  if (nextStatus === "Sent to Finance") { cycle.sentToFinanceAt = now; cycle.sentToFinanceBy = input.userId; }
  await cycle.save();
  return { currentCycle: await buildPayrollCycleView(cycle) };
}

export async function addHrPayrollAdjustment(input: { workspace: any; userId: any; cycleId: string; profileId: string; body?: any }) {
  const cycle = await PayrollCycle.findOne({ _id: input.cycleId, workspaceId: input.workspace._id });
  if (!cycle) throw payrollError("Payroll cycle not found.", 404);
  if (cycle.status !== "Pending") {
    throw payrollError("Payroll adjustments are only allowed while the cycle is pending.", 409);
  }
  const type = safeString(input.body?.type);
  const amount = normalizeMoney(input.body?.amount);
  const reason = safeString(input.body?.reason);
  if (!["bonus", "deduction"].includes(type) || amount <= 0 || reason.length < 3) {
    throw payrollError("Type, positive amount, and a reason are required.");
  }
  const entry = await PayrollEntry.findOne({ cycleId: cycle._id, profileId: input.profileId });
  if (!entry) throw payrollError("Employee payroll record not found.", 404);
  const adjustments = [
    ...(entry.manualAdjustments || []).map((item) => item.toObject ? item.toObject() : item),
    { type, amount, reason, createdBy: input.userId, createdAt: new Date() },
  ];
  Object.assign(entry, applyPayrollAdjustments(entry.toObject(), adjustments));
  await entry.save();
  const entries = await PayrollEntry.find({ cycleId: cycle._id }).lean();
  cycle.employeeEntries = entries;
  cycle.summary = summarizePayrollEntries(entries);
  await cycle.save();
  return { currentCycle: await buildPayrollCycleView(cycle) };
}

export async function getPayrollSnapshotForCurrentUser(input: {
  workspace: any;
  userId?: any;
  query?: any;
}) {
  return buildPayrollSnapshot(input.workspace, input.query || {}, true);
}

export async function listPayslipsForCurrentUser(input: {
  workspace: any;
  userId: mongoose.Types.ObjectId;
  userEmail?: string;
  query?: any;
}) {
  const { workspace, userId, userEmail, query = {} } = input;
  const profile = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [{ linkedUserId: userId }, ...(userEmail ? [{ email: userEmail }] : [])],
  }).lean();
  if (!profile) return { employee: null, payslips: [], monthGroups: [] };
  const filter: any = { workspaceId: workspace._id, employeeProfileId: profile._id };
  if (query.year) filter.year = safeNumber(query.year);
  if (query.cycleId) filter.payrollCycleId = asObjectId(query.cycleId);
  const payslips = await PayrollPayslip.find(filter)
    .sort({ year: -1, generatedAt: -1 })
    .lean();
  return {
    employee: { id: safeString(profile._id), employeeId: profile.employeeId, name: profile.fullName },
    payslips: payslips.map((item) => ({
      ...item,
      id: safeString(item._id),
      payrollCycleId: safeString(item.payrollCycleId),
      employeeProfileId: safeString(item.employeeProfileId),
    })),
    monthGroups: [],
  };
}

export async function processPayrollPaymentForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cycleId: string;
  employeeProfileId: string;
  body?: any;
}) {
  const { workspaceId, userId, cycleId, employeeProfileId, body = {} } = input;

  const cycleObjectId = asObjectId(cycleId);
  const profileObjectId = asObjectId(employeeProfileId);
  if (!cycleObjectId || !profileObjectId) {
    throw Object.assign(new Error("Invalid cycleId or employeeProfileId."), { statusCode: 400 });
  }

  const entry = await PayrollEntry.findOne({
    workspaceId,
    cycleId: cycleObjectId,
    profileId: profileObjectId,
  }).exec();

  if (!entry) {
    throw Object.assign(new Error("Payroll entry not found."), { statusCode: 404 });
  }

  const cycle = await PayrollCycle.findOne({ _id: cycleObjectId, workspaceId }).exec();
  if (!cycle) throw payrollError("Payroll cycle not found.", 404);
  if (cycle.status === "Pending") {
    throw payrollError("Payroll must be sent to Finance before payment processing.", 409);
  }
  const existingPayment = await PayrollPayment.findOne({
    workspaceId,
    payrollCycleId: cycleObjectId,
    employeeProfileId: profileObjectId,
  }).lean();
  if (existingPayment) {
    throw payrollError("A payment record already exists for this employee and payroll cycle.", 409);
  }

  const paymentMethod = safeString(body.paymentMethod, "bank_transfer");
  const transactionId = safeString(body.transactionId, `TXN-${Date.now()}`);

  entry.financials.paymentStatus = "Processing";
  entry.financials.paymentMethod = paymentMethod;
  if (!Array.isArray(entry.financials.paymentHistory)) entry.financials.paymentHistory = [];
  entry.financials.paymentHistory.push(`Payment initiated via ${paymentMethod} on ${new Date().toISOString()}`);

  await entry.save();

  const payment = await PayrollPayment.create({
    workspaceId,
    payrollCycleId: cycleObjectId,
    employeeProfileId: profileObjectId,
    employeeUserId: entry.linkedUserId,
    employeeId: entry.employeeId,
    employeeName: entry.employeeName,
    department: entry.department,
    departmentId: entry.departmentId,
    cycleKey: `CYCLE-${cycleObjectId.toString().slice(-6)}`,
    monthLabel: "",
    year: new Date().getFullYear(),
    amount: safeNumber(entry.financials.netSalary),
    currency: normalizeCurrency(entry.financials.currency),
    paymentStatus: "Processing",
    paymentMethod,
    transactionId,
    bankDetails: {},
    paymentHistory: [{ status: "Processing", note: "Payment initiated", changedBy: userId, createdAt: new Date() }],
    initiatedBy: userId,
    payrollSnapshot: entry.toObject(),
  });

  return { entry, payment };
}

export async function generatePayslipForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  cycleId: string;
  employeeProfileId: string;
}) {
  const { workspaceId, userId, cycleId, employeeProfileId } = input;

  const cycleObjectId = asObjectId(cycleId);
  const profileObjectId = asObjectId(employeeProfileId);
  if (!cycleObjectId || !profileObjectId) {
    throw Object.assign(new Error("Invalid cycleId or employeeProfileId."), { statusCode: 400 });
  }

  const entry = await PayrollEntry.findOne({
    workspaceId,
    cycleId: cycleObjectId,
    profileId: profileObjectId,
  }).exec();

  if (!entry) {
    throw Object.assign(new Error("Payroll entry not found."), { statusCode: 404 });
  }

  if (entry.financials.paymentStatus !== "Paid") {
    throw payrollError("Payslips can only be generated after Finance confirms payment as paid.", 409);
  }

  const existingPayslip = await PayrollPayslip.findOne({
    workspaceId,
    payrollCycleId: cycleObjectId,
    employeeProfileId: profileObjectId,
  });

  if (existingPayslip) {
    return existingPayslip;
  }

  const cycle = await PayrollCycle.findById(cycleObjectId).lean();
  const payslip = await PayrollPayslip.create({
    workspaceId,
    payrollCycleId: cycleObjectId,
    employeeProfileId: profileObjectId,
    employeeUserId: entry.linkedUserId,
    employeeId: entry.employeeId,
    employeeName: entry.employeeName,
    department: entry.department,
    departmentId: entry.departmentId,
    cycleKey: cycle?.cycleKey || `CYCLE-${cycleObjectId.toString().slice(-6)}`,
    monthLabel: cycle?.monthLabel || "",
    year: cycle?.year || new Date().getFullYear(),
    amount: safeNumber(entry.financials.netSalary),
    currency: normalizeCurrency(entry.financials.currency),
    fileName: `payslip-${entry.employeeId}-${cycle?.cycleKey || "unknown"}.pdf`,
    fileUrl: "",
    fileFormat: "pdf",
    summary: {
      baseSalary: safeNumber(entry.financials.baseSalary),
      benefits: safeNumber(entry.financials.benefits),
      standardDeductions: safeNumber(entry.financials.standardDeductions),
      attendanceDeductions: safeNumber(entry.financials.attendanceDeductions),
      hrBonus: safeNumber(entry.financials.hrBonus),
      hrDeductions: safeNumber(entry.financials.hrDeductions),
      netPayable: safeNumber(entry.financials.netSalary),
      currency: normalizeCurrency(entry.financials.currency),
    },
    generatedBy: userId,
    generatedAt: new Date(),
  });

  entry.financials.payslipId = payslip._id as mongoose.Types.ObjectId;
  entry.financials.payslipFileName = payslip.fileName;
  entry.financials.payslipGeneratedAt = new Date();
  await entry.save();

  return payslip;
}

export async function sendPayslipToEmployeeForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  payslipId: string;
}) {
  const { workspaceId, userId, payslipId } = input;

  const payslipObjectId = asObjectId(payslipId);
  if (!payslipObjectId) {
    throw Object.assign(new Error("Invalid payslipId."), { statusCode: 400 });
  }

  const payslip = await PayrollPayslip.findOne({
    _id: payslipObjectId,
    workspaceId,
  }).exec();

  if (!payslip) {
    throw Object.assign(new Error("Payslip not found."), { statusCode: 404 });
  }

  payslip.sentToEmployeeAt = new Date();
  payslip.sentToEmployeeBy = userId;
  payslip.emailDeliveryStatus = "Sent";
  await payslip.save();

  const entry = await PayrollEntry.findOne({
    workspaceId,
    cycleId: payslip.payrollCycleId,
    profileId: payslip.employeeProfileId,
  }).exec();

  if (entry) {
    entry.financials.payslipSentAt = new Date();
    await entry.save();
  }

  return payslip;
}
