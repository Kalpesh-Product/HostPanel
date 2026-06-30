import mongoose from "mongoose";
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

export async function getPayrollSnapshotForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  query?: any;
}) {
  const { workspaceId, query = {} } = input;

  const cycles = await PayrollCycle.find({ workspaceId })
    .sort({ year: -1, month: -1 })
    .lean();

  const totalEmployees = cycles.reduce((sum, c) => sum + (c.summary?.totalEmployees || 0), 0);
  const totalNetPayable = cycles.reduce((sum, c) => sum + (c.summary?.totalNetPayable || 0), 0);
  const paidCycles = cycles.filter((c) => c.status === "Paid").length;
  const pendingCycles = cycles.filter((c) => c.status === "Pending").length;

  return {
    cycles,
    summary: {
      totalCycles: cycles.length,
      paidCycles,
      pendingCycles,
      totalEmployees,
      totalNetPayable,
    },
  };
}

export async function listPayslipsForCurrentUser(input: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  query?: any;
}) {
  const { workspaceId, userId, query = {} } = input;

  const filter: any = { workspaceId, employeeUserId: userId };
  if (query.year) filter.year = safeNumber(query.year);
  if (query.cycleId) filter.payrollCycleId = asObjectId(query.cycleId);

  const payslips = await PayrollPayslip.find(filter)
    .sort({ generatedAt: -1 })
    .lean();

  return payslips;
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
    currency: safeString(entry.financials.currency, "INR"),
    paymentStatus: "Processing",
    paymentMethod,
    transactionId,
    bankDetails: {},
    paymentHistory: [{ status: "Processing", note: "Payment initiated", changedBy: userId, createdAt: new Date() }],
    initiatedBy: userId,
    payrollSnapshot: entry.toObject(),
  });

  const cycle = await PayrollCycle.findById(cycleObjectId).exec();
  if (cycle && cycle.status === "Pending") {
    cycle.status = "Sent to Finance";
    cycle.sentToFinanceAt = new Date();
    cycle.sentToFinanceBy = userId;
    await cycle.save();
  }

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
    currency: safeString(entry.financials.currency, "INR"),
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
      currency: safeString(entry.financials.currency, "INR"),
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
    entry.financials.paymentStatus = "Paid";
    await entry.save();
  }

  const cycle = await PayrollCycle.findById(payslip.payrollCycleId).exec();
  if (cycle) {
    const allPaid = await PayrollEntry.countDocuments({
      cycleId: payslip.payrollCycleId,
      "financials.paymentStatus": { $ne: "Paid" },
    }).exec();
    if (allPaid === 0) {
      cycle.status = "Paid";
      cycle.paidAt = new Date();
      cycle.paidBy = userId;
      await cycle.save();
    }
  }

  return payslip;
}
