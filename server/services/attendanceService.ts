// @ts-nocheck
import mongoose from "mongoose";
import { uploadFileToS3 } from "../config/s3config.js";
import Attendance from "../models/Attendance.js";
import Department from "../models/Department.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { resolveMembershipByWorkspace } from "../utils/resolveMembership.js";

const DEFAULT_WORK_HOUR_START = 9;
const DEFAULT_LATE_MINUTES = 30;
const HALF_DAY_MINUTES = 4 * 60;

const toId = (value = "") => String(value || "").trim();

const getLocalDate = (value = new Date()) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDateKey = (value = new Date()) => {
  const date = getLocalDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toMonthBounds = (monthKey = "") => {
  const normalized = String(monthKey || "").trim();
  const now = new Date();
  const fallbackMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = (normalized || fallbackMonthKey).split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, monthKey: `${year}-${String(month + 1).padStart(2, "0")}` };
};

const toTimeLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (!safeSeconds) return "--";
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.round((safeSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const getStatusLabel = (status = "") => {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "present_late":
      return "late";
    case "half_day":
      return "half-day";
    case "on_break":
      return "present";
    case "wfh":
      return "present";
    default:
      return normalized || "absent";
  }
};

const getDisplayStatus = (status = "") => {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "present_late":
      return "Present Late";
    case "half_day":
      return "Half Day";
    case "on_break":
      return "On Break";
    case "sunday_off":
      return "Sunday Off";
    default:
      return normalized.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()) || "Absent";
  }
};

const getRoleName = (role = "") => {
  if (!role) return "";
  if (typeof role === "object" && role?.name) return String(role.name);
  return String(role);
};

const normalizeRole = (role = "") =>
  getRoleName(role).trim().toLowerCase().replace(/[\s-]+/g, "_");

const getRoleBand = (role = "") => {
  const normalized = normalizeRole(role);
  if (normalized === "founder") return "owner";
  if (normalized === "super_admin" || normalized === "superadmin") return "super_admin";
  if (normalized === "admin" || normalized === "admin_manager") return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

const getWorkspaceIdFromUser = async (userId) => {
  const normalizedUserId = toId(userId?.userId || userId?.id || userId?._id || userId);
  const user = await HostUser.findById(normalizedUserId)
    .select("_id name email primaryWorkspace hasCompletedWorkspaceSetup")
    .lean()
    .exec();

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  let workspaceId = user.primaryWorkspace || null;
  if (!workspaceId) {
    const membership = await WorkspaceMember.findOne({ user: user._id, isActive: true })
      .sort({ isPrimary: -1, createdAt: 1 })
      .select("workspace")
      .lean()
      .exec();
    workspaceId = membership?.workspace || null;
  }

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    const error = new Error("Workspace not found for this user.");
    error.statusCode = 404;
    throw error;
  }

  const workspace = await Workspace.findById(workspaceId).lean().exec();
  if (!workspace) {
    const error = new Error("Workspace not found for this user.");
    error.statusCode = 404;
    throw error;
  }

  const membership = await resolveMembershipByWorkspace(workspace._id, user._id, "role departments grantedModules isPrimary isActive status");
  if (!membership) {
    const error = new Error("You do not have workspace access.");
    error.statusCode = 403;
    throw error;
  }

  return { user, workspace, membership };
};

const canManageAttendanceGeofence = (membership) => {
  const roleName = String(getRoleName(membership?.role || "")).trim().toLowerCase();
  const roleBand = getRoleBand(roleName);
  return (
    roleBand === "owner" ||
    roleBand === "super_admin" ||
    roleBand === "admin" ||
    roleBand === "manager" ||
    roleName.includes("hr")
  );
};

const TEST_MEMBER_HINTS = [
  "test",
  "dummy",
  "sample",
  "fake",
  "demo",
  "temp",
  "testing",
];

const isLikelyTestMember = (member = {}) => {
  const values = [
    member?.employeeId,
    member?.employeeCode,
    member?.fullName,
    member?.name,
    member?.user?.name,
    member?.user?.email,
    member?.email,
    member?.role?.name,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return values.some((value) => TEST_MEMBER_HINTS.some((hint) => value.includes(hint)));
};

const formatGeofence = (workspace) => {
  const source = workspace?.attendanceGeofence || {};
  return {
    enabled: Boolean(source.enabled),
    latitude: source.latitude ?? null,
    longitude: source.longitude ?? null,
    radiusMeters: Number.isFinite(Number(source.radiusMeters)) ? Number(source.radiusMeters) : 150,
    updatedAt: source.updatedAt || null,
    updatedBy: source.updatedBy || null,
  };
};

const toFiniteNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const getDistanceMeters = (from = {}, to = {}) => {
  const lat1 = toFiniteNumber(from.lat);
  const lng1 = toFiniteNumber(from.lng);
  const lat2 = toFiniteNumber(to.lat);
  const lng2 = toFiniteNumber(to.lng);
  if ([lat1, lng1, lat2, lng2].some((value) => value == null)) return null;

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const a = sinLat * sinLat + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
};

const assertWithinAttendanceGeofence = (workspace, input = {}, actionLabel = "attendance") => {
  const geofence = formatGeofence(workspace);
  if (!geofence.enabled) {
    throw Object.assign(new Error("Attendance geofence is disabled or not configured."), { statusCode: 400 });
  }

  if (toFiniteNumber(geofence.latitude) == null || toFiniteNumber(geofence.longitude) == null) {
    throw Object.assign(new Error("Attendance geofence is not configured."), { statusCode: 400 });
  }

  const latitude = toFiniteNumber(input?.latitude);
  const longitude = toFiniteNumber(input?.longitude);
  if (latitude == null || longitude == null) {
    throw Object.assign(new Error("Location access is required before clocking attendance."), { statusCode: 400 });
  }

  const distance = getDistanceMeters(
    { lat: latitude, lng: longitude },
    { lat: geofence.latitude, lng: geofence.longitude },
  );

  if (distance == null) {
    throw Object.assign(new Error("Unable to validate attendance location."), { statusCode: 400 });
  }

  if (distance > Number(geofence.radiusMeters || 150)) {
    throw Object.assign(
      new Error(`You are outside the allowed attendance geofence for ${actionLabel}.`),
      { statusCode: 400 },
    );
  }

  return { latitude, longitude, distance, geofence };
};

const sanitizeGeofenceInput = (input = {}) => {
  const enabled = input.enabled === true || String(input.enabled).toLowerCase() === "true";
  const latitude = input.latitude === "" || input.latitude == null ? null : Number(input.latitude);
  const longitude = input.longitude === "" || input.longitude == null ? null : Number(input.longitude);
  const radiusMeters = input.radiusMeters === "" || input.radiusMeters == null ? null : Number(input.radiusMeters);

  if (enabled) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw Object.assign(new Error("Latitude and longitude are required when geofence is enabled."), { statusCode: 400 });
    }
    if (!Number.isFinite(radiusMeters) || radiusMeters < 25 || radiusMeters > 5000) {
      throw Object.assign(new Error("Radius must be between 25 and 5000 meters."), { statusCode: 400 });
    }
  }

  return {
    enabled,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    radiusMeters: Number.isFinite(radiusMeters) ? radiusMeters : 150,
  };
};

const decodeGeofenceValue = (value = "") => {
  try {
    return decodeURIComponent(String(value || "").replace(/\+/g, " "));
  } catch {
    return String(value || "");
  }
};

const parseGeofenceCoordinates = (input = "") => {
  const value = String(input || "").trim();
  if (!value) return null;

  const coordinateMatch =
    value.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i) ||
    value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i) ||
    value.match(/!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])q=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])ll=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(?:^|[?&/])center=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)/i) ||
    value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1]);
    const longitude = Number(coordinateMatch[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  try {
    const url = new URL(value);
    const query = url.searchParams.get("q") || url.searchParams.get("ll") || url.searchParams.get("center");
    if (query) {
      const parts = query.split(",").map((item) => Number(item.trim()));
      if (parts.length >= 2 && parts.every((part) => Number.isFinite(part))) {
        return { latitude: parts[0], longitude: parts[1] };
      }
    }

    const pathMatch = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (pathMatch) {
      const latitude = Number(pathMatch[1]);
      const longitude = Number(pathMatch[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch {
    // ignore invalid URL parsing and fall through
  }

  return null;
};

const extractGeofenceSearchTerm = (input = "") => {
  const value = String(input || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const query =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      url.searchParams.get("destination") ||
      url.searchParams.get("daddr") ||
      url.searchParams.get("ll") ||
      url.searchParams.get("center");
    if (query) return decodeGeofenceValue(query);

    const pathname = decodeGeofenceValue(url.pathname);
    const packedCoordinateMatch = pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i) || pathname.match(/!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/i);
    if (packedCoordinateMatch) return `${packedCoordinateMatch[1]},${packedCoordinateMatch[2]}`;

    const placeMatch = pathname.match(/\/place\/([^/]+)/i);
    if (placeMatch?.[1]) return decodeGeofenceValue(placeMatch[1]);

    const searchMatch = pathname.match(/\/search\/([^/]+)/i);
    if (searchMatch?.[1]) return decodeGeofenceValue(searchMatch[1]);

    const dirMatch = pathname.match(/\/dir\/([^/]+)/i);
    if (dirMatch?.[1]) return decodeGeofenceValue(dirMatch[1]);

    const coordinateMatch = pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (coordinateMatch) return `${coordinateMatch[1]},${coordinateMatch[2]}`;
  } catch {
    // ignore and fall back to raw input
  }

  return value;
};

const buildGeofenceShareUrl = (latitude, longitude) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

const buildGeofenceEmbedUrl = (latitude, longitude) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;
};

const buildGeofenceSearchEmbedUrl = (searchTerm) => {
  const term = String(searchTerm || "").trim();
  if (!term) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(term)}&output=embed`;
};

export async function resolveAttendanceGeofenceLocation(user, input = {}) {
  const rawValue = String(input?.url || input?.value || "").trim();
  if (!rawValue) {
    const error = new Error("Map URL is required.");
    error.statusCode = 400;
    throw error;
  }

  const directCoordinates = parseGeofenceCoordinates(rawValue);
  if (directCoordinates) {
    return {
      input: rawValue,
      resolvedUrl: rawValue,
      latitude: directCoordinates.latitude,
      longitude: directCoordinates.longitude,
      shareUrl: buildGeofenceShareUrl(directCoordinates.latitude, directCoordinates.longitude),
      embedUrl: buildGeofenceEmbedUrl(directCoordinates.latitude, directCoordinates.longitude),
      source: "coordinates",
    };
  }

  let resolvedUrl = rawValue;
  try {
    const response = await fetch(rawValue, {
      redirect: "follow",
      method: "GET",
    });
    resolvedUrl = response?.url || rawValue;
  } catch {
    resolvedUrl = rawValue;
  }

  const resolvedCoordinates = parseGeofenceCoordinates(resolvedUrl);
  if (resolvedCoordinates) {
    return {
      input: rawValue,
      resolvedUrl,
      latitude: resolvedCoordinates.latitude,
      longitude: resolvedCoordinates.longitude,
      shareUrl: buildGeofenceShareUrl(resolvedCoordinates.latitude, resolvedCoordinates.longitude),
      embedUrl: buildGeofenceEmbedUrl(resolvedCoordinates.latitude, resolvedCoordinates.longitude),
      source: "resolved-url",
    };
  }

  const searchTerm = extractGeofenceSearchTerm(resolvedUrl) || extractGeofenceSearchTerm(rawValue);
  const embedUrl = buildGeofenceSearchEmbedUrl(searchTerm);
  if (!embedUrl) {
    const error = new Error("Unable to resolve map coordinates from the provided link.");
    error.statusCode = 400;
    throw error;
  }

  return {
    input: rawValue,
    resolvedUrl,
    latitude: null,
    longitude: null,
    shareUrl: resolvedUrl,
    embedUrl,
    source: "search",
  };
}

const getDepartmentNamesForMembership = async (membership) => {
  const departmentIds = Array.isArray(membership?.departments)
    ? membership.departments.map((dept) => toId(dept?._id || dept)).filter(Boolean)
    : [];

  if (!departmentIds.length) return [];

  const departments = await Department.find({ _id: { $in: departmentIds } })
    .select("name")
    .lean()
    .exec();

  return departments.map((dept) => dept?.name).filter(Boolean);
};

const getManagedDepartmentIds = async (workspaceId, membership, userId) => {
  const roleBand = getRoleBand(membership?.role || "");
  if (roleBand === "owner" || roleBand === "super_admin" || roleBand === "admin") {
    return null;
  }

  if (roleBand !== "manager") return [];

  const assignedDepartmentIds = Array.isArray(membership?.departments)
    ? membership.departments.map((dept) => toId(dept?._id || dept)).filter(Boolean)
    : [];

  const managedDepartments = await Department.find({
    workspaceId,
    isActive: true,
    $or: [
      { _id: { $in: assignedDepartmentIds.length ? assignedDepartmentIds : [null] } },
      { managerUser: userId },
    ],
  })
    .select("_id")
    .lean()
    .exec();

  return Array.from(
    new Set(
      managedDepartments
        .map((dept) => toId(dept?._id))
        .filter(Boolean),
    ),
  );
};

const getAttendanceRecordStatus = (record) => {
  const checkInAt = record?.checkInAt ? new Date(record.checkInAt) : null;
  const checkOutAt = record?.checkOutAt ? new Date(record.checkOutAt) : null;
  const workedSeconds = Math.max(0, Number(record?.workedSeconds) || 0);
  const activeBreak = Boolean(record?.isActiveBreak);

  if (!checkInAt && !checkOutAt) {
    return getDisplayStatus(record?.status || "absent");
  }

  if (activeBreak) return "On Break";

  if (workedSeconds <= HALF_DAY_MINUTES * 60 && checkOutAt) {
    return "Half Day";
  }

  if (checkInAt) {
    const lateThreshold = new Date(checkInAt);
    lateThreshold.setHours(DEFAULT_WORK_HOUR_START, DEFAULT_LATE_MINUTES, 0, 0);
    if (checkInAt > lateThreshold && !checkOutAt) {
      return "Late";
    }
    if (checkInAt > lateThreshold && checkOutAt) {
      return "Late";
    }
  }

  return "Present";
};

const computeWorkedSeconds = (record, fallbackEnd = null) => {
  const checkInAt = record?.checkInAt ? new Date(record.checkInAt) : null;
  const checkOutAt = record?.checkOutAt ? new Date(record.checkOutAt) : fallbackEnd;
  if (!checkInAt || !checkOutAt) return Math.max(0, Number(record?.workedSeconds) || 0);
  const total = Math.max(0, Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 1000));
  const breakSeconds = Math.max(0, Number(record?.breakSeconds) || 0);
  return Math.max(0, total - breakSeconds);
};

const formatRecordForFrontend = async (record, membership = null) => {
  const plain = record?.toObject ? record.toObject() : { ...record };
  const departments = await getDepartmentNamesForMembership(membership || plain?.__membership || {});
  const attendanceDate = plain?.attendanceDate || plain?.dateKey || null;
  const correctedCheckIn = plain?.correctionRequest?.requestedCheckInAt || null;
  const correctedCheckOut = plain?.correctionRequest?.requestedCheckOutAt || null;
  const effectiveCheckIn = correctedCheckIn || plain?.checkInAt || null;
  const effectiveCheckOut = correctedCheckOut || plain?.checkOutAt || null;
  const computedWorkedSeconds = computeWorkedSeconds({
    ...plain,
    checkInAt: effectiveCheckIn,
    checkOutAt: effectiveCheckOut,
  });

  const employeeRole = membership
    ? getRoleName(membership?.role || "")
    : (plain?.roleLabel || "");

  return {
    recordId: toId(plain?._id),
    id: toId(plain?._id),
    userId: toId(plain?.employeeUserId),
    employeeName: plain?.employeeName || "",
    employeeId: plain?.employeeId || (membership?.employeeId || ""),
    employeeRole,
    department: plain?.department?.name || plain?.departmentLabel || departments[0] || "General",
    date: plain?.dateKey || toDateLabel(attendanceDate),
    checkIn: toTimeLabel(effectiveCheckIn),
    checkOut: toTimeLabel(effectiveCheckOut),
    status: getStatusLabel(plain?.status || "absent"),
    source: plain?.mode || "office",
    checkInLocation: plain?.checkInLocation || "",
    checkOutLocation: plain?.checkOutLocation || "",
    checkInSelfie: plain?.checkInSelfieUrl || "",
    checkOutSelfie: plain?.checkOutSelfieUrl || "",
    workingHours: formatDuration(computedWorkedSeconds),
    totalHours: Number((computedWorkedSeconds / 3600).toFixed(2)),
    overtime: Number((Math.max(0, computedWorkedSeconds - 8 * 3600) / 3600).toFixed(2)),
    isPresent: Boolean(plain?.checkInAt || plain?.checkOutAt),
    isLate: getDisplayStatus(plain?.status || "") === "Present Late" || getStatusLabel(plain?.status || "") === "late",
    isEarlyDeparture: false,
    lateMinutes: 0,
    earlyMinutes: 0,
    breaks: Array.isArray(plain?.breakLogs)
      ? plain.breakLogs.map((entry) => ({
        startTime: toTimeLabel(entry?.startAt),
        endTime: toTimeLabel(entry?.endAt),
        duration: Math.round((Number(entry?.durationSeconds) || 0) / 60),
        type: "break",
      }))
      : [],
    correction: plain?.correctionRequest
      ? {
        requestedAt: plain.correctionRequest.requestedAt || "",
        status: plain.correctionRequest.status || "pending",
        reason: plain.correctionRequest.reason || "",
        type: "correction",
        originalCheckIn: toTimeLabel(plain.correctionRequest.originalCheckInAt || plain.checkInAt),
        originalCheckOut: toTimeLabel(plain.correctionRequest.originalCheckOutAt || plain.checkOutAt),
        requestedCheckIn: toTimeLabel(plain.correctionRequest.requestedCheckInAt || plain.checkInAt),
        requestedCheckOut: toTimeLabel(plain.correctionRequest.requestedCheckOutAt || plain.checkOutAt),
        actionedBy: plain.correctionRequest.reviewedByName || "",
        rejectionReason: plain.correctionRequest.reviewedReason || "",
      }
      : null,
  };
};

const buildAttendanceDateMap = (records = []) => {
  const map = new Map();
  for (const record of records) {
    const key = String(record?.dateKey || toDateKey(record?.attendanceDate || new Date()));
    map.set(key, record);
  }
  return map;
};

const getMonthDateKeys = (monthKey = "") => {
  const { start, end, monthKey: normalizedMonthKey } = toMonthBounds(monthKey);
  const keys = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { keys, start, end, monthKey: normalizedMonthKey };
};

const buildStats = (rows = []) => {
  const present = rows.filter((row) => row.status === "present").length;
  const absent = rows.filter((row) => row.status === "absent" || row.status === "sunday_off").length;
  const late = rows.filter((row) => row.status === "late").length;
  const halfDay = rows.filter((row) => row.status === "half-day").length;
  const workingDays = rows.filter((row) => row.status !== "sunday_off").length;
  const total = rows.length;
  return {
    present,
    absent,
    late,
    halfDay,
    total,
    workingDays,
    attendancePercentage: workingDays > 0 ? Math.round((present / workingDays) * 100) : 0,
  };
};

const buildMonthlyRowsForMember = async (memberUserId, employeeName, departmentName, monthKey, workspaceId, visibleMembership = null) => {
  const { keys } = getMonthDateKeys(monthKey);
  const [start, end] = [keys[0], keys[keys.length - 1]];
  const records = await Attendance.find({
    workspaceId,
    employeeUserId: memberUserId,
    dateKey: { $gte: start, $lte: end },
  })
    .sort({ dateKey: 1, createdAt: 1 })
    .lean()
    .exec();

  const recordMap = buildAttendanceDateMap(records);
  const employeeRole = visibleMembership ? getRoleName(visibleMembership?.role || "") : "";
  const employeeIdFromMembership = visibleMembership?.employeeId || "";
  const rows = [];
  for (const dateKey of keys) {
    const existing = recordMap.get(dateKey);
    if (existing) {
      rows.push({
        ...(await formatRecordForFrontend(existing, visibleMembership)),
        employeeName: employeeName || existing.employeeName || "",
        department: departmentName || existing.department?.name || "General",
      });
      continue;
    }

    const date = new Date(`${dateKey}T12:00:00.000Z`);
    rows.push({
      recordId: `absent-${memberUserId}-${dateKey}`,
      id: `absent-${memberUserId}-${dateKey}`,
      userId: toId(memberUserId),
      employeeName: employeeName || "",
      employeeId: employeeIdFromMembership,
      employeeRole,
      department: departmentName || "General",
      date: dateKey,
      checkIn: "",
      checkOut: "",
      status: date.getUTCDay() === 0 ? "sunday_off" : "absent",
      source: "office",
      checkInLocation: "",
      checkOutLocation: "",
      checkInSelfie: "",
      checkOutSelfie: "",
      workingHours: "--",
      totalHours: 0,
      overtime: 0,
      isPresent: false,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      earlyMinutes: 0,
      breaks: [],
      correction: null,
    });
  }

  return rows;
};

const saveSelfie = async (workspaceId, userId, action, file, dateKey) => {
  if (!file) {
    return {
      url: "",
      publicId: "",
      folder: "",
      uploadedAt: null,
      action,
    };
  }

  const safeName = String(file.originalname || `${action}.jpg`)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  const folder = `attendance/${workspaceId}/${userId}/${dateKey}`;
  const route = `${folder}/${Date.now()}-${action}-${safeName}`;
  const uploaded = await uploadFileToS3(route, file);

  return {
    url: uploaded.url || "",
    publicId: uploaded.id || "",
    folder,
    uploadedAt: new Date(),
    action,
  };
};

const getTodayRecord = async (workspace, userId) => {
  const workspaceId = workspace?._id;
  const dateKey = toDateKey();
  const attendanceDate = getLocalDate();
  let record = await Attendance.findOne({
    workspaceId,
    employeeUserId: userId,
    dateKey,
  }).exec();

  if (!record) {
    const member = await resolveMembershipByWorkspace(workspaceId, userId, "role departments");
    const departmentId = Array.isArray(member?.departments) && member.departments.length > 0
      ? member.departments[0]?._id || member.departments[0]
      : null;
    const departmentName = Array.isArray(member?.departments) && member.departments.length > 0
      ? String(member.departments[0]?.name || "")
      : "";
    const roleName = getRoleName(member?.role || "");
    record = await Attendance.create({
      workspaceId,
      ownerId: workspace.owner,
      employeeUserId: userId,
      employeeName: "",
      employeeRole: member?.role || "",
      department: departmentId || null,
      attendanceDate,
      dateKey,
      mode: "office",
      status: "absent",
      checkInAt: null,
      checkOutAt: null,
      punchSelfies: [],
      isActiveBreak: false,
      activeBreakStartedAt: null,
      breakSeconds: 0,
      workedSeconds: 0,
      breakLogs: [],
      correctionRequest: null,
      reviewedReason: "",
      departmentLabel: departmentName,
      roleLabel: roleName,
    });
  }

  return record;
};

const recalculateAfterCorrection = (record) => {
  const checkInAt = record.checkInAt ? new Date(record.checkInAt) : null;
  const checkOutAt = record.checkOutAt ? new Date(record.checkOutAt) : null;
  if (!checkInAt || !checkOutAt) return;
  const grossSeconds = Math.max(0, Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 1000));
  const breakSeconds = Math.max(0, Number(record.breakSeconds) || 0);
  record.workedSeconds = Math.max(0, grossSeconds - breakSeconds);
  record.status = record.workedSeconds <= HALF_DAY_MINUTES * 60
    ? "half_day"
    : (checkInAt.getHours() > DEFAULT_WORK_HOUR_START || (checkInAt.getHours() === DEFAULT_WORK_HOUR_START && checkInAt.getMinutes() > DEFAULT_LATE_MINUTES))
      ? "present_late"
      : "present";
};

const canManageTeamAttendance = (membership) => {
  const band = getRoleBand(membership?.role || "");
  return band === "owner" || band === "super_admin" || band === "admin" || band === "manager";
};

export async function checkInAttendance(userId, input = {}, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  assertWithinAttendanceGeofence(workspace, input, "check-in");
  const record = await getTodayRecord(workspace, user._id);

  if (record.checkInAt && !record.checkOutAt) {
    const error = new Error("You are already checked in.");
    error.statusCode = 409;
    throw error;
  }

  const now = new Date(input?.timestamp || new Date());
  const selfie = await saveSelfie(workspace._id, user._id, "check_in", selfieFile, record.dateKey);

  record.employeeName = user.name || record.employeeName || "";
  record.employeeRole = membership?.role || record.employeeRole || "";
  if (!record.department && Array.isArray(membership?.departments) && membership.departments.length > 0) {
    record.department = membership.departments[0]?._id || membership.departments[0] || null;
  }
  record.checkInAt = now;
  record.checkOutAt = null;
  record.checkInSelfieUrl = selfie.url;
  record.checkInSelfiePublicId = selfie.publicId;
  record.checkInSelfieFolder = selfie.folder;
  record.checkInSelfieUploadedAt = selfie.uploadedAt;
  record.punchSelfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
  record.punchSelfies.push(selfie);
  record.isActiveBreak = false;
  record.activeBreakStartedAt = null;
  record.breakSeconds = 0;
  record.workedSeconds = 0;
  record.breakLogs = [];
  record.status = now.getHours() > DEFAULT_WORK_HOUR_START || (now.getHours() === DEFAULT_WORK_HOUR_START && now.getMinutes() > DEFAULT_LATE_MINUTES)
    ? "present_late"
    : "present";
  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
  };
}

export async function getAttendanceGeofence(userId) {
  const { workspace, membership } = await getWorkspaceIdFromUser(userId);
  return {
    geofence: formatGeofence(workspace),
    canEdit: canManageAttendanceGeofence(membership),
  };
}

export async function updateAttendanceGeofence(userId, input = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  if (!canManageAttendanceGeofence(membership)) {
    const error = new Error("You do not have permission to update the attendance geofence.");
    error.statusCode = 403;
    throw error;
  }

  const next = sanitizeGeofenceInput(input);
  const nextGeofence = {
    enabled: true,
    latitude: next.latitude,
    longitude: next.longitude,
    radiusMeters: next.radiusMeters,
    updatedAt: new Date(),
    updatedBy: user._id,
  };

  await Workspace.findByIdAndUpdate(
    workspace._id,
    { $set: { attendanceGeofence: nextGeofence } },
    { new: true, runValidators: true },
  ).exec();

  return {
    geofence: formatGeofence({ attendanceGeofence: nextGeofence }),
  };
}

export async function checkOutAttendance(userId, input = {}, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  assertWithinAttendanceGeofence(workspace, input, "check-out");
  const record = await getTodayRecord(workspace, user._id);

  if (!record.checkInAt) {
    const error = new Error("You must check in before checking out.");
    error.statusCode = 400;
    throw error;
  }

  if (record.checkOutAt) {
    const error = new Error("You are already checked out.");
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  const selfie = await saveSelfie(workspace._id, user._id, "check_out", selfieFile, record.dateKey);

  if (record.isActiveBreak && record.activeBreakStartedAt) {
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(record.activeBreakStartedAt).getTime()) / 1000));
    const latestBreak = Array.isArray(record.breakLogs) ? record.breakLogs[record.breakLogs.length - 1] : null;
    if (latestBreak && !latestBreak.endAt) {
      latestBreak.endAt = now;
      latestBreak.durationSeconds = seconds;
    }
    record.breakSeconds = Math.max(0, Number(record.breakSeconds) + seconds);
    record.isActiveBreak = false;
    record.activeBreakStartedAt = null;
  }

  record.checkOutAt = now;
  record.punchSelfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
  record.punchSelfies.push(selfie);

  const workedSeconds = computeWorkedSeconds(record, now);
  record.workedSeconds = workedSeconds;
  record.status = workedSeconds <= HALF_DAY_MINUTES * 60
    ? "half_day"
    : (new Date(record.checkInAt).getHours() > DEFAULT_WORK_HOUR_START || (new Date(record.checkInAt).getHours() === DEFAULT_WORK_HOUR_START && new Date(record.checkInAt).getMinutes() > DEFAULT_LATE_MINUTES))
      ? "present_late"
      : "present";

  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
  };
}

export async function startBreakAttendance(userId, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const record = await getTodayRecord(workspace, user._id);

  if (!record.checkInAt || record.checkOutAt) {
    const error = new Error("You must be checked in to start break.");
    error.statusCode = 400;
    throw error;
  }

  if (record.isActiveBreak) {
    const error = new Error("Break is already active.");
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  record.isActiveBreak = true;
  record.activeBreakStartedAt = now;
  record.status = "on_break";
  record.breakLogs = Array.isArray(record.breakLogs) ? record.breakLogs : [];
  record.breakLogs.push({
    startAt: now,
    endAt: null,
    durationSeconds: 0,
  });

  if (selfieFile) {
    const selfie = await saveSelfie(workspace._id, user._id, "break_start", selfieFile, record.dateKey);
    record.punchSelfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
    record.punchSelfies.push(selfie);
  }

  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
  };
}

export async function endBreakAttendance(userId, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const record = await getTodayRecord(workspace, user._id);

  if (!record.isActiveBreak || !record.activeBreakStartedAt) {
    const error = new Error("No active break found.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(record.activeBreakStartedAt).getTime()) / 1000));
  const latestBreak = Array.isArray(record.breakLogs) ? record.breakLogs[record.breakLogs.length - 1] : null;
  if (latestBreak && !latestBreak.endAt) {
    latestBreak.endAt = now;
    latestBreak.durationSeconds = seconds;
  }

  record.breakSeconds = Math.max(0, Number(record.breakSeconds) + seconds);
  record.isActiveBreak = false;
  record.activeBreakStartedAt = null;
  record.status = record.checkInAt ? "present" : "absent";

  if (selfieFile) {
    const selfie = await saveSelfie(workspace._id, user._id, "break_end", selfieFile, record.dateKey);
    record.punchSelfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
    record.punchSelfies.push(selfie);
  }

  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
  };
}

export async function getMyAttendanceHistory(userId, query = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const { keys } = getMonthDateKeys(query.month);
  const records = await Attendance.find({
    workspaceId: workspace._id,
    employeeUserId: user._id,
    dateKey: { $gte: keys[0], $lte: keys[keys.length - 1] },
  })
    .sort({ dateKey: 1, createdAt: 1 })
    .lean()
    .exec();

  const recordMap = buildAttendanceDateMap(records);
  const rows = [];
  for (const dateKey of keys) {
    const existing = recordMap.get(dateKey);
    if (existing) {
      rows.push(await formatRecordForFrontend(existing, membership));
      continue;
    }
    const date = new Date(`${dateKey}T12:00:00.000Z`);
    rows.push({
      recordId: `absent-${user._id}-${dateKey}`,
      id: `absent-${user._id}-${dateKey}`,
      userId: toId(user._id),
      employeeName: user.name || "",
      employeeId: "",
      department: Array.isArray(membership?.departments) && membership.departments[0]
        ? String(membership.departments[0]?.name || "General")
        : "General",
      date: dateKey,
      checkIn: "",
      checkOut: "",
      status: date.getUTCDay() === 0 ? "sunday_off" : "absent",
      source: "office",
      checkInLocation: "",
      checkOutLocation: "",
      checkInSelfie: "",
      checkOutSelfie: "",
      workingHours: "--",
      totalHours: 0,
      overtime: 0,
      isPresent: false,
      isLate: false,
      isEarlyDeparture: false,
      lateMinutes: 0,
      earlyMinutes: 0,
      breaks: [],
      correction: null,
    });
  }

  return {
    records: rows,
    stats: buildStats(rows),
  };
}

export async function getTeamAttendanceSnapshot(userId, query = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const visibleRoleBand = getRoleBand(membership?.role || "");
  const { keys } = getMonthDateKeys(query.month);
  const managedDepartmentIds = await getManagedDepartmentIds(workspace._id, membership, user._id);

  const memberFilter = {
    workspace: workspace._id,
    isActive: true,
  };
  const members = await WorkspaceMember.find(memberFilter)
    .populate("user", "name email")
    .populate("departments")
    .populate("role")
    .lean()
    .exec();

  const visibleMembers = members.filter((member) => {
    if (toId(member?.user?._id) === toId(user._id)) return false;
    if (isLikelyTestMember(member)) return false;
    if (managedDepartmentIds === null) return true;
    if (managedDepartmentIds.length === 0) return false;
    const memberDeptIds = Array.isArray(member?.departments)
      ? member.departments.map((dept) => toId(dept?._id || dept)).filter(Boolean)
      : [];
    return memberDeptIds.some((deptId) => managedDepartmentIds.includes(deptId));
  });
  const uniqueVisibleMembers = Array.from(
    new Map(
      visibleMembers
        .filter((member) => toId(member?.user?._id))
        .map((member) => [toId(member.user._id), member]),
    ).values(),
  );

  const memberIds = uniqueVisibleMembers
    .filter((m) => toId(m?._id))
    .map((m) => toId(m._id));
  const employeeProfiles = await EmployeeProfile.find({
    workspaceId: workspace._id,
    linkedWorkspaceMemberId: { $in: memberIds },
  })
    .select("employeeId linkedWorkspaceMemberId linkedUserId")
    .lean()
    .exec();
  const employeeIdByMemberId = new Map(
    employeeProfiles
      .filter((ep) => ep.linkedWorkspaceMemberId)
      .map((ep) => [toId(ep.linkedWorkspaceMemberId), ep.employeeId || ""]),
  );
  const employeeIdByUserId = new Map(
    employeeProfiles
      .filter((ep) => ep.linkedUserId)
      .map((ep) => [toId(ep.linkedUserId), ep.employeeId || ""]),
  );

  const rows = [];
  for (const member of uniqueVisibleMembers) {
    const memberDepartmentName = Array.isArray(member?.departments) && member.departments[0]
      ? String(member.departments[0]?.name || "General")
      : "General";
    const empId = employeeIdByMemberId.get(toId(member._id)) || employeeIdByUserId.get(toId(member.user?._id)) || "";
    const monthlyRows = await buildMonthlyRowsForMember(
      member.user._id,
      member.user.name || member.user.email || "Unknown",
      memberDepartmentName,
      query.month,
      workspace._id,
      { ...member, employeeId: empId },
    );
    rows.push(...monthlyRows);
  }

  const corrections = rows
    .filter((row) => row.correction)
    .map((row) => ({
      id: row.correction?.requestedAt,
      correctionId: row.recordId || row.id,
      userId: row.userId,
      employeeName: row.employeeName || "",
      employeeId: row.employeeId || "",
      employeeRole: row.employeeRole || "",
      department: row.department || "",
      date: row.date || "",
      type: "correction",
      reason: row.correction?.reason || "",
      status: row.correction?.status || "pending",
      originalCheckIn: row.correction?.originalCheckIn || row.checkIn,
      originalCheckOut: row.correction?.originalCheckOut || row.checkOut,
      requestedCheckIn: row.correction?.requestedCheckIn || row.checkIn,
      requestedCheckOut: row.correction?.requestedCheckOut || row.checkOut,
      actionedBy: row.correction?.actionedBy || "",
      rejectionReason: row.correction?.rejectionReason || "",
    }));

  return {
    records: rows,
    allRecords: rows,
    corrections,
    stats: buildStats(rows),
    month: keys[0]?.slice(0, 7) || "",
    totalEmployees: uniqueVisibleMembers.length,
    canManageAttendance: visibleRoleBand !== "employee",
  };
}

export async function getEmployeeAttendanceHistory(userId, targetUserId, query = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const actorBand = getRoleBand(membership?.role || "");
  if (!targetUserId || (!mongoose.isValidObjectId(targetUserId) && targetUserId !== toId(user._id))) {
    const error = new Error("Invalid userId.");
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await HostUser.findById(targetUserId)
    .select("_id name email")
    .lean()
    .exec();

  const targetMembership = await resolveMembershipByWorkspace(workspace._id, targetUserId, "role departments");
  if (!targetMembership) {
    const error = new Error("The requested employee could not be found.");
    error.statusCode = 404;
    throw error;
  }

  if (actorBand === "employee" && toId(targetUserId) !== toId(user._id)) {
    const error = new Error("You do not have permission to view this employee's attendance.");
    error.statusCode = 403;
    throw error;
  }

  const monthKey = query.month;
  const rows = await buildMonthlyRowsForMember(
    targetUserId,
    targetMembership?.user?.name || targetMembership?.fullName || "",
    Array.isArray(targetMembership?.departments) && targetMembership.departments[0]
      ? String(targetMembership.departments[0]?.name || "General")
      : "General",
    monthKey,
    workspace._id,
    targetMembership,
  );

  const targetDepartments = await getDepartmentNamesForMembership(targetMembership);

  const employeeProfileRecord = await EmployeeProfile.findOne({
    workspaceId: workspace._id,
    $or: [
      { linkedWorkspaceMemberId: targetMembership?._id },
      { linkedUserId: targetUserId },
    ],
  })
    .select("employeeId")
    .lean()
    .exec();
  const resolvedEmployeeId = employeeProfileRecord?.employeeId || "";

  return {
    employee: {
      userId: toId(targetUserId),
      fullName: targetUser?.name || targetUser?.email || "",
      employeeId: resolvedEmployeeId,
      role: getRoleName(targetMembership?.role || ""),
      department: targetDepartments.length > 0 ? targetDepartments.join(" / ") : "General",
      departments: targetDepartments,
    },
    records: rows,
  };
}

export async function requestAttendanceCorrection(userId, recordId, input = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  if (!recordId || !mongoose.isValidObjectId(recordId)) {
    const error = new Error("Invalid recordId.");
    error.statusCode = 400;
    throw error;
  }

  const record = await Attendance.findOne({
    _id: recordId,
    workspaceId: workspace._id,
    employeeUserId: user._id,
  }).exec();

  if (!record) {
    const error = new Error("Attendance record not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingStatus = String(record?.correctionRequest?.status || "").toLowerCase();
  if (existingStatus === "pending" || existingStatus === "approved") {
    const error = new Error("A correction request already exists for this attendance record.");
    error.statusCode = 409;
    throw error;
  }

  const requestedCheckInAt = input?.requestedCheckIn ? new Date(input.requestedCheckIn) : null;
  const requestedCheckOutAt = input?.requestedCheckOut ? new Date(input.requestedCheckOut) : null;

  if ((requestedCheckInAt && Number.isNaN(requestedCheckInAt.getTime())) || (requestedCheckOutAt && Number.isNaN(requestedCheckOutAt.getTime()))) {
    const error = new Error("Invalid correction datetime value.");
    error.statusCode = 400;
    throw error;
  }

  record.correctionRequest = {
    originalCheckInAt: record.checkInAt || null,
    originalCheckOutAt: record.checkOutAt || null,
    requestedCheckInAt,
    requestedCheckOutAt,
    reason: String(input?.reason || "").trim(),
    status: "pending",
    reviewedByName: "",
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedReason: "",
  };

  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
  };
}

export async function reviewAttendanceCorrection(userId, recordId, input = {}) {
  const { workspace, membership } = await getWorkspaceIdFromUser(userId);
  const actorBand = getRoleBand(membership?.role || "");
  if (!canManageTeamAttendance(membership)) {
    const error = new Error("You do not have permission to review attendance corrections.");
    error.statusCode = 403;
    throw error;
  }

  const targetId = String(recordId || "").trim();
  if (!targetId || !mongoose.isValidObjectId(targetId)) {
    const error = new Error("Invalid recordId.");
    error.statusCode = 400;
    throw error;
  }

  const decision = String(input?.action || input?.decision || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(decision)) {
    const error = new Error("Decision must be approved or rejected.");
    error.statusCode = 400;
    throw error;
  }

  const record = await Attendance.findOne({ _id: targetId, workspaceId: workspace._id }).exec();
  if (!record) {
    const error = new Error("Attendance record not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!record.correctionRequest || record.correctionRequest.status !== "pending") {
    const error = new Error("This correction request is not pending review.");
    error.statusCode = 400;
    throw error;
  }

  if (decision === "approved") {
    const nextCheckInAt = record.correctionRequest.requestedCheckInAt || record.checkInAt || null;
    const nextCheckOutAt = record.correctionRequest.requestedCheckOutAt || record.checkOutAt || null;
    record.checkInAt = nextCheckInAt;
    record.checkOutAt = nextCheckOutAt;
    recalculateAfterCorrection(record);
  }

  record.correctionRequest.status = decision;
  record.correctionRequest.reviewedByName = "HR";
  record.correctionRequest.reviewedAt = new Date();
  record.correctionRequest.reviewedReason = String(input?.reason || "").trim();
  record.reviewedReason = String(input?.reason || "").trim();
  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
    decision,
    reviewerRole: actorBand,
  };
}
