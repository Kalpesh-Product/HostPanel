// @ts-nocheck
import mongoose from "mongoose";
import { uploadFileToS3 } from "../config/s3config.js";
import Attendance from "../models/Attendance.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Department from "../models/Department.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import { resolveMembershipByWorkspace } from "../utils/resolveMembership.js";
import { findApprovedLeaveOnDate } from "./core/leave.service.js";
import {
  DEFAULT_WORKSPACE_TIMEZONE,
  getZonedDateKey,
  getZonedDateTimeParts,
  normalizeTimeZone,
  parseWorkspaceDateTime,
} from "../utils/workspaceLocalization.js";

// Fallback thresholds used only for records created before per-workspace
// attendance settings existed (record.workStartMinutes/halfDayThresholdSeconds
// are null). New records snapshot resolved values from workspace.attendanceSettings.
const DEFAULT_WORK_HOUR_START = 9;
const DEFAULT_LATE_MINUTES = 30;
const HALF_DAY_MINUTES = 4 * 60;
// Checking in at or after 1:20 PM always counts as a half day, regardless of
// hours worked afterward.
const HALF_DAY_CHECKIN_CUTOFF_MINUTES = 13 * 60 + 20;

const toId = (value = "") => String(value || "").trim();

const parseHHMM = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
};

const formatLocationLabel = (latitude, longitude, distanceMeters) => {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat == null || lng == null) return "";
  const distanceLabel = Number.isFinite(Number(distanceMeters))
    ? ` · ${Math.round(Number(distanceMeters))}m from geofence center`
    : "";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}${distanceLabel}`;
};

const getLocalDate = (value = new Date(), timezone = DEFAULT_WORKSPACE_TIMEZONE) => {
  const dateKey = getZonedDateKey(value, timezone);
  return parseWorkspaceDateTime(`${dateKey}T00:00:00`, timezone);
};

const toDateKey = (value = new Date(), timezone = DEFAULT_WORKSPACE_TIMEZONE) =>
  getZonedDateKey(value, timezone);

const toMonthBounds = (monthKey = "") => {
  const nowKey = getZonedDateKey(new Date(), DEFAULT_WORKSPACE_TIMEZONE);
  const fallbackMonthKey = nowKey.slice(0, 7);
  const normalized = /^\d{4}-\d{2}$/.test(String(monthKey || "").trim())
    ? String(monthKey).trim()
    : fallbackMonthKey;
  const [yearStr, monthStr] = normalized.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start, end, monthKey: `${year}-${String(month + 1).padStart(2, "0")}` };
};

const toTimeLabel = (value, timezone = DEFAULT_WORKSPACE_TIMEZONE) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeTimeZone(timezone),
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
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
  // HR roles (e.g. "HR Manager", "HR") get workspace-wide attendance visibility,
  // consistent with canManageAttendanceGeofence's existing "hr" carve-out below.
  if (normalized.includes("hr")) return "admin";
  if (normalized === "manager") return "manager";
  return "employee";
};

// Owner/super-admin have workspace-wide reach, so their "department" is every
// department rather than whatever they happen to be assigned to for testing.
// Everyone else shows every department they're actually linked to, not just
// the first one — an admin or manager can be assigned to more than one.
const resolveDepartmentDisplayLabel = (roleName = "", departmentNames = []) => {
  const roleBand = getRoleBand(roleName);
  if (roleBand === "owner" || roleBand === "super_admin") return "All Departments";
  const names = Array.from(
    new Set((departmentNames || []).map((name) => String(name || "").trim()).filter(Boolean)),
  );
  return names.length > 0 ? names.join(" / ") : "General";
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

  const radiusMeters = Number(geofence.radiusMeters || 150);
  if (distance > radiusMeters) {
    const overBy = distance - radiusMeters;
    throw Object.assign(
      new Error(
        `You are ${distance}m from the configured ${actionLabel} location — the allowed radius is ${radiusMeters}m, so you are ${overBy}m outside the geofence.`,
      ),
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

const formatAttendanceSettings = (workspace) => {
  const source = workspace?.attendanceSettings || {};
  return {
    weeklyWorkingHours: Number.isFinite(Number(source.weeklyWorkingHours)) ? Number(source.weeklyWorkingHours) : null,
    workingHoursStart: source.workingHoursStart || null,
    workingHoursEnd: source.workingHoursEnd || null,
    breakDurationMinutes: Number.isFinite(Number(source.breakDurationMinutes)) ? Number(source.breakDurationMinutes) : null,
    updatedAt: source.updatedAt || null,
    updatedBy: source.updatedBy || null,
  };
};

const sanitizeAttendanceSettingsInput = (input = {}) => {
  const weeklyWorkingHours = input.weeklyWorkingHours === "" || input.weeklyWorkingHours == null
    ? NaN
    : Number(input.weeklyWorkingHours);
  const workingHoursStart = String(input.workingHoursStart || "").trim();
  const workingHoursEnd = String(input.workingHoursEnd || "").trim();
  const breakDurationMinutes = input.breakDurationMinutes === "" || input.breakDurationMinutes == null
    ? NaN
    : Number(input.breakDurationMinutes);

  if (!Number.isFinite(weeklyWorkingHours) || weeklyWorkingHours < 1 || weeklyWorkingHours > 168) {
    throw Object.assign(new Error("Weekly working hours must be between 1 and 168."), { statusCode: 400 });
  }

  const startMinutes = parseHHMM(workingHoursStart);
  const endMinutes = parseHHMM(workingHoursEnd);
  if (startMinutes == null || endMinutes == null) {
    throw Object.assign(new Error("Working hours start/end must be valid times in HH:mm format."), { statusCode: 400 });
  }
  if (endMinutes <= startMinutes) {
    throw Object.assign(new Error("Working hours end time must be after the start time."), { statusCode: 400 });
  }

  if (!Number.isFinite(breakDurationMinutes) || breakDurationMinutes < 0 || breakDurationMinutes > 480) {
    throw Object.assign(new Error("Break duration must be between 0 and 480 minutes."), { statusCode: 400 });
  }

  return { weeklyWorkingHours, workingHoursStart, workingHoursEnd, breakDurationMinutes };
};

const isAttendanceConfigured = (workspace) => {
  const geofence = formatGeofence(workspace);
  const geofenceReady = geofence.enabled
    && toFiniteNumber(geofence.latitude) != null
    && toFiniteNumber(geofence.longitude) != null;

  const settings = formatAttendanceSettings(workspace);
  const settingsReady = settings.weeklyWorkingHours != null
    && settings.workingHoursStart != null
    && settings.workingHoursEnd != null
    && settings.breakDurationMinutes != null;

  return geofenceReady && settingsReady;
};

const computeAttendanceThresholds = (workspace) => {
  const settings = formatAttendanceSettings(workspace);
  const workStartMinutes = parseHHMM(settings.workingHoursStart);
  const workEndMinutes = parseHHMM(settings.workingHoursEnd);
  const breakMinutes = Number.isFinite(settings.breakDurationMinutes) ? settings.breakDurationMinutes : 0;

  let halfDayThresholdSeconds = null;
  if (workStartMinutes != null && workEndMinutes != null && workEndMinutes > workStartMinutes) {
    const expectedDailyMinutes = Math.max(0, (workEndMinutes - workStartMinutes) - breakMinutes);
    halfDayThresholdSeconds = Math.round((expectedDailyMinutes * 60) / 2);
  }

  return { workStartMinutes, halfDayThresholdSeconds };
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

// Matches both "HR" and "Human Resources"/"Human Resource" spellings, in
// either a role name or a department name.
const isHrLabel = (value = "") => {
  const normalized = normalizeRole(String(value || ""));
  return normalized.includes("hr") || normalized.includes("human_resource");
};

// HR is treated as full-visibility even when the workspace's role naming
// doesn't literally include "hr" (e.g. a plain "Manager"/"Admin" role that's
// simply been assigned to the "HR" department). This mirrors real-world HR
// access, which spans the whole workspace rather than one department.
const hasHrDepartmentAccess = async (membership) => {
  const departmentNames = await getDepartmentNamesForMembership(membership);
  return departmentNames.some((name) => isHrLabel(name));
};

// "hr" is its own band, distinct from "admin" — HR always gets full
// workspace visibility (like owner/super-admin), while a plain admin is
// scoped to whatever department is assigned to them (see
// getManagedDepartmentIds below).
const resolveAttendanceAccessBand = async (membership) => {
  const roleName = getRoleName(membership?.role || "");
  const normalizedRoleName = normalizeRole(roleName);
  if (normalizedRoleName === "founder") return "owner";
  if (normalizedRoleName === "super_admin" || normalizedRoleName === "superadmin") return "super_admin";
  if (isHrLabel(roleName)) return "hr";
  if (await hasHrDepartmentAccess(membership)) return "hr";
  if (normalizedRoleName === "admin" || normalizedRoleName === "admin_manager") return "admin";
  if (normalizedRoleName === "manager") return "manager";
  return "employee";
};

const getManagedDepartmentIds = async (workspaceId, membership, userId) => {
  const roleBand = await resolveAttendanceAccessBand(membership);
  // Founder/owner, super-admin, and HR see the whole workspace — HR
  // attendance oversight spans every department by design. A plain admin
  // and a manager are scoped to whatever department(s) are assigned to
  // them — an admin with no department assigned sees no team attendance.
  if (roleBand === "owner" || roleBand === "super_admin" || roleBand === "hr") {
    return null;
  }

  if (roleBand !== "manager" && roleBand !== "admin") return [];

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
  const timezone = normalizeTimeZone(plain?.timezone);
  const departments = await getDepartmentNamesForMembership(membership || plain?.__membership || {});
  const attendanceDate = plain?.attendanceDate || plain?.dateKey || null;
  const correctedCheckIn = plain?.correctionRequest?.requestedCheckInAt || null;
  const correctedCheckOut = plain?.correctionRequest?.requestedCheckOutAt || null;
  const effectiveCheckIn = correctedCheckIn || plain?.checkInAt || null;
  const effectiveCheckOut = correctedCheckOut || plain?.checkOutAt || null;

  // Live calculations: while a record is in progress (checked in but not yet
  // checked out) total time and break time are computed against "now" so the
  // UI can show running totals instead of stale zeros.
  const checkInDate = effectiveCheckIn ? new Date(effectiveCheckIn) : null;
  const checkOutDate = effectiveCheckOut ? new Date(effectiveCheckOut) : null;
  const now = new Date();
  const isInProgress = Boolean(checkInDate && !checkOutDate);
  const totalEnd = checkOutDate || (isInProgress ? now : null);

  let totalSeconds = 0;
  if (checkInDate && totalEnd) {
    totalSeconds = Math.max(0, Math.floor((totalEnd.getTime() - checkInDate.getTime()) / 1000));
  } else {
    totalSeconds = Math.max(0, Number(plain?.workedSeconds) || 0);
  }

  let breakSeconds = Math.max(0, Number(plain?.breakSeconds) || 0);
  if (isInProgress && plain?.isActiveBreak && plain?.activeBreakStartedAt) {
    breakSeconds += Math.max(0, Math.floor((now.getTime() - new Date(plain.activeBreakStartedAt).getTime()) / 1000));
  }

  const computedWorkedSeconds = Math.max(0, totalSeconds - breakSeconds);

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
    department: resolveDepartmentDisplayLabel(
      employeeRole,
      departments.length ? departments : [plain?.department?.name || plain?.departmentLabel].filter(Boolean),
    ),
    date: plain?.dateKey || toDateLabel(attendanceDate),
    checkIn: toTimeLabel(effectiveCheckIn, timezone),
    checkOut: toTimeLabel(effectiveCheckOut, timezone),
    status: getStatusLabel(plain?.status || "absent"),
    source: plain?.mode || "office",
    checkInLocation: formatLocationLabel(plain?.checkInLatitude, plain?.checkInLongitude, plain?.checkInDistanceMeters),
    checkOutLocation: formatLocationLabel(plain?.checkOutLatitude, plain?.checkOutLongitude, plain?.checkOutDistanceMeters),
    checkInSelfie: plain?.checkInSelfieUrl || "",
    checkOutSelfie: plain?.checkOutSelfieUrl || "",
    punchSelfies: Array.isArray(plain?.punchSelfies)
      ? plain.punchSelfies.map((entry) => ({
        action: entry?.action || "",
        url: entry?.url || "",
        uploadedAt: entry?.uploadedAt ? toTimeLabel(entry.uploadedAt, timezone) : "",
      }))
      : [],
    workingHours: formatDuration(computedWorkedSeconds),
    totalHours: Number((computedWorkedSeconds / 3600).toFixed(2)),
    overtime: Number((Math.max(0, computedWorkedSeconds - 8 * 3600) / 3600).toFixed(2)),
    checkInAt: effectiveCheckIn ? new Date(effectiveCheckIn).toISOString() : null,
    checkOutAt: effectiveCheckOut ? new Date(effectiveCheckOut).toISOString() : null,
    isInProgress,
    isActiveBreak: Boolean(plain?.isActiveBreak),
    activeBreakStartedAt: plain?.activeBreakStartedAt ? new Date(plain.activeBreakStartedAt).toISOString() : null,
    totalSeconds,
    breakSeconds,
    workedSeconds: computedWorkedSeconds,
    totalTime: formatDuration(totalSeconds),
    breakTime: formatDuration(breakSeconds),
    isPresent: Boolean(plain?.checkInAt || plain?.checkOutAt),
    isLate: getDisplayStatus(plain?.status || "") === "Present Late" || getStatusLabel(plain?.status || "") === "late",
    isEarlyDeparture: false,
    lateMinutes: 0,
    earlyMinutes: 0,
    breaks: Array.isArray(plain?.breakLogs)
      ? plain.breakLogs.map((entry) => {
        const breakStartDate = entry?.startAt ? new Date(entry.startAt) : null;
        const isActiveBreakEntry = isInProgress && Boolean(entry?.startAt) && !entry?.endAt;
        const breakEndDate = entry?.endAt ? new Date(entry.endAt) : null;
        let breakDurationSeconds = Math.max(0, Number(entry?.durationSeconds) || 0);
        if (isActiveBreakEntry && breakStartDate) {
          breakDurationSeconds = Math.max(0, Math.floor((now.getTime() - breakStartDate.getTime()) / 1000));
        }
        return {
          startTime: toTimeLabel(entry?.startAt, timezone),
          endTime: toTimeLabel(breakEndDate || (isActiveBreakEntry ? now : null), timezone),
          startAt: breakStartDate ? breakStartDate.toISOString() : null,
          endAt: breakEndDate ? breakEndDate.toISOString() : null,
          duration: Math.round(breakDurationSeconds / 60),
          type: "break",
        };
      })
      : [],
    correction: plain?.correctionRequest
      ? {
        requestedAt: plain.correctionRequest.requestedAt || "",
        status: plain.correctionRequest.status || "pending",
        reason: plain.correctionRequest.reason || "",
        type: "correction",
        originalCheckIn: toTimeLabel(plain.correctionRequest.originalCheckInAt || plain.checkInAt, timezone),
        originalCheckOut: toTimeLabel(plain.correctionRequest.originalCheckOutAt || plain.checkOutAt, timezone),
        requestedCheckIn: toTimeLabel(plain.correctionRequest.requestedCheckInAt || plain.checkInAt, timezone),
        requestedCheckOut: toTimeLabel(plain.correctionRequest.requestedCheckOutAt || plain.checkOutAt, timezone),
        breaks: Array.isArray(plain.correctionRequest.requestedBreaks)
          ? plain.correctionRequest.requestedBreaks.map((adjustment) => ({
            breakIndex: adjustment?.breakIndex ?? 0,
            originalStart: toTimeLabel(adjustment?.originalStartAt, timezone),
            originalEnd: toTimeLabel(adjustment?.originalEndAt, timezone),
            requestedStart: toTimeLabel(adjustment?.requestedStartAt || adjustment?.originalStartAt, timezone),
            requestedEnd: toTimeLabel(adjustment?.requestedEndAt || adjustment?.originalEndAt, timezone),
          }))
          : [],
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
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { keys, start, end, monthKey: normalizedMonthKey };
};

const buildStats = (rows = []) => {
  const present = rows.filter((row) => row.status === "present").length;
  const absent = rows.filter((row) => row.status === "absent" || row.status === "sunday_off").length;
  const late = rows.filter((row) => row.status === "late").length;
  const halfDay = rows.filter((row) => row.status === "half-day").length;
  const workingDays = rows.filter((row) => row.status !== "sunday_off" && row.status !== "upcoming").length;
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

const buildMonthlyRowsForMember = async (memberUserId, employeeName, departmentName, monthKey, workspaceId, visibleMembership = null, todayKey = null) => {
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

    // A day that hasn't happened yet was never "absent" — give it a neutral
    // placeholder instead of painting the rest of the month red.
    if (todayKey && dateKey > todayKey) {
      rows.push({
        recordId: `upcoming-${memberUserId}-${dateKey}`,
        id: `upcoming-${memberUserId}-${dateKey}`,
        userId: toId(memberUserId),
        employeeName: employeeName || "",
        employeeId: employeeIdFromMembership,
        employeeRole,
        department: departmentName || "General",
        date: dateKey,
        checkIn: "",
        checkOut: "",
        status: "upcoming",
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

  let uploaded;
  try {
    uploaded = await uploadFileToS3(route, file);
  } catch (uploadError) {
    console.error("Attendance selfie S3 upload failed:", {
      workspaceId: String(workspaceId || ""),
      userId: String(userId || ""),
      action,
      error: uploadError?.message || uploadError,
    });
    throw Object.assign(new Error("Failed to upload attendance photo. Please try again."), { statusCode: 502 });
  }

  return {
    url: uploaded.url || "",
    publicId: uploaded.id || "",
    folder,
    uploadedAt: new Date(),
    action,
  };
};

const getTodayRecord = async (workspace, user) => {
  const workspaceId = workspace?._id;
  const userId = user?._id;
  const timezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const dateKey = toDateKey(new Date(), timezone);
  const attendanceDate = getLocalDate(new Date(), timezone);
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
    const { workStartMinutes, halfDayThresholdSeconds } = computeAttendanceThresholds(workspace);
    const employeeName = String(user?.name || user?.email || "Employee").trim();
    record = await Attendance.create({
      workspaceId,
      ownerId: workspace.owner,
      employeeUserId: userId,
      employeeName,
      employeeRole: member?.role || "",
      department: departmentId || null,
      attendanceDate,
      dateKey,
      timezone,
      mode: "office",
      status: "absent",
      checkInAt: null,
      checkOutAt: null,
      workStartMinutes,
      halfDayThresholdSeconds,
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

  const halfDayThresholdSeconds = Number.isFinite(record.halfDayThresholdSeconds)
    ? record.halfDayThresholdSeconds
    : HALF_DAY_MINUTES * 60;
  const workStartMinutes = Number.isFinite(record.workStartMinutes)
    ? record.workStartMinutes
    : DEFAULT_WORK_HOUR_START * 60;
  const lateThresholdMinutes = workStartMinutes + DEFAULT_LATE_MINUTES;

  const localCheckIn = getZonedDateTimeParts(checkInAt, normalizeTimeZone(record.timezone));
  const checkInMinutes = localCheckIn.hour * 60 + localCheckIn.minute;
  record.status = (record.workedSeconds <= halfDayThresholdSeconds || checkInMinutes >= HALF_DAY_CHECKIN_CUTOFF_MINUTES)
    ? "half_day"
    : checkInMinutes > lateThresholdMinutes
      ? "present_late"
      : "present";
};

const canManageTeamAttendance = async (membership) => {
  const band = await resolveAttendanceAccessBand(membership);
  return band === "owner" || band === "super_admin" || band === "hr" || band === "admin" || band === "manager";
};

// Block clock-in when the user has an approved leave covering today. Full-day
// leaves block all day; half-day leaves block only during the affected
// session so the user can still clock in for the other half.
const assertNotOnLeave = async (workspace, user) => {
  const timezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const todayKey = toDateKey(new Date(), timezone);
  const approvedLeave = await findApprovedLeaveOnDate(workspace._id, user._id, todayKey);
  if (!approvedLeave) return;

  const mode = String(approvedLeave.leaveMode || "full_day");
  const weeklyHours = Number(workspace?.attendanceSettings?.weeklyWorkingHours);
  const dailyHours = Number.isFinite(weeklyHours) && weeklyHours > 0 ? weeklyHours / 5 : 8;
  const leaveHours = Number(approvedLeave.leaveHours || 0);

  const isFullDayLeave = mode === "full_day" || (mode === "hours" && leaveHours >= dailyHours - 0.001);

  if (isFullDayLeave) {
    throw Object.assign(
      new Error(
        `You are on approved ${approvedLeave.leaveType} leave (${approvedLeave.leaveCode}) today, so clock-in is disabled until it ends.`,
      ),
      { statusCode: 409 },
    );
  }

  if (mode === "half_day" && approvedLeave.halfDaySession) {
    const localNow = getZonedDateTimeParts(new Date(), timezone);
    const minutes = localNow.hour * 60 + localNow.minute;
    const currentSession = minutes < HALF_DAY_CHECKIN_CUTOFF_MINUTES ? "morning" : "evening";
    if (approvedLeave.halfDaySession === currentSession) {
      throw Object.assign(
        new Error(
          `You are on approved ${approvedLeave.halfDaySession} leave (${approvedLeave.leaveCode}) right now. Please clock in during your ${currentSession === "morning" ? "evening" : "morning"} session.`,
        ),
        { statusCode: 409 },
      );
    }
  }
};

export async function checkInAttendance(userId, input = {}, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  await assertNotOnLeave(workspace, user);
  if (!isAttendanceConfigured(workspace)) {
    throw Object.assign(
      new Error("Attendance is not set up for this workspace yet. Ask HR to configure working hours and the geofence in Attendance Settings."),
      { statusCode: 400 },
    );
  }
  const geofenceResult = assertWithinAttendanceGeofence(workspace, input, "check-in");
  const record = await getTodayRecord(workspace, user);

  if (record.checkInAt && !record.checkOutAt) {
    const error = new Error("You are already checked in.");
    error.statusCode = 409;
    throw error;
  }

  // The server timestamp is authoritative. Its absolute UTC instant is safe on
  // Vercel; workspace-local calendar calculations use the saved IANA timezone.
  const now = new Date();
  const timezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const localNow = getZonedDateTimeParts(now, timezone);
  const selfie = await saveSelfie(workspace._id, user._id, "check_in", selfieFile, record.dateKey);

  record.employeeName = user.name || record.employeeName || user.email || "Employee";
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
  record.checkInLatitude = geofenceResult.latitude;
  record.checkInLongitude = geofenceResult.longitude;
  record.checkInDistanceMeters = geofenceResult.distance;
  record.punchSelfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
  record.punchSelfies.push(selfie);
  record.isActiveBreak = false;
  record.activeBreakStartedAt = null;
  record.breakSeconds = 0;
  record.workedSeconds = 0;
  record.breakLogs = [];
  record.timezone = timezone;
  if (!Number.isFinite(record.workStartMinutes) || !Number.isFinite(record.halfDayThresholdSeconds)) {
    const thresholds = computeAttendanceThresholds(workspace);
    record.workStartMinutes = thresholds.workStartMinutes;
    record.halfDayThresholdSeconds = thresholds.halfDayThresholdSeconds;
  }
  const workStartMinutes = Number.isFinite(record.workStartMinutes) ? record.workStartMinutes : DEFAULT_WORK_HOUR_START * 60;
  const lateThresholdMinutes = workStartMinutes + DEFAULT_LATE_MINUTES;
  const checkInMinutes = localNow.hour * 60 + localNow.minute;
  record.status = checkInMinutes >= HALF_DAY_CHECKIN_CUTOFF_MINUTES
    ? "half_day"
    : checkInMinutes > lateThresholdMinutes
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

export async function getAttendanceSettings(userId) {
  const { workspace, membership } = await getWorkspaceIdFromUser(userId);
  return {
    settings: formatAttendanceSettings(workspace),
    canEdit: canManageAttendanceGeofence(membership),
    isConfigured: isAttendanceConfigured(workspace),
  };
}

export async function updateAttendanceSettings(userId, input = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  if (!canManageAttendanceGeofence(membership)) {
    const error = new Error("You do not have permission to update attendance settings.");
    error.statusCode = 403;
    throw error;
  }

  const next = sanitizeAttendanceSettingsInput(input);
  const nextSettings = {
    ...next,
    updatedAt: new Date(),
    updatedBy: user._id,
  };

  await Workspace.findByIdAndUpdate(
    workspace._id,
    { $set: { attendanceSettings: nextSettings } },
    { new: true, runValidators: true },
  ).exec();

  const nextWorkspace = { ...workspace, attendanceSettings: nextSettings };
  return {
    settings: formatAttendanceSettings(nextWorkspace),
    isConfigured: isAttendanceConfigured(nextWorkspace),
  };
}

export async function checkOutAttendance(userId, input = {}, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  if (!isAttendanceConfigured(workspace)) {
    throw Object.assign(
      new Error("Attendance is not set up for this workspace yet. Ask HR to configure working hours and the geofence in Attendance Settings."),
      { statusCode: 400 },
    );
  }
  const geofenceResult = assertWithinAttendanceGeofence(workspace, input, "check-out");
  const record = await getTodayRecord(workspace, user);

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
  record.checkOutSelfieUrl = selfie.url;
  record.checkOutSelfiePublicId = selfie.publicId;
  record.checkOutSelfieFolder = selfie.folder;
  record.checkOutSelfieUploadedAt = selfie.uploadedAt;
  record.checkOutLatitude = geofenceResult.latitude;
  record.checkOutLongitude = geofenceResult.longitude;
  record.checkOutDistanceMeters = geofenceResult.distance;
  record.punchSelfies = Array.isArray(record.punchSelfies) ? record.punchSelfies : [];
  record.punchSelfies.push(selfie);

  const workedSeconds = computeWorkedSeconds(record, now);
  record.workedSeconds = workedSeconds;

  const halfDayThresholdSeconds = Number.isFinite(record.halfDayThresholdSeconds)
    ? record.halfDayThresholdSeconds
    : HALF_DAY_MINUTES * 60;
  const workStartMinutes = Number.isFinite(record.workStartMinutes)
    ? record.workStartMinutes
    : DEFAULT_WORK_HOUR_START * 60;
  const lateThresholdMinutes = workStartMinutes + DEFAULT_LATE_MINUTES;
  const checkInLocalParts = getZonedDateTimeParts(record.checkInAt, normalizeTimeZone(record.timezone));
  const checkInMinutes = checkInLocalParts.hour * 60 + checkInLocalParts.minute;

  record.status = (workedSeconds <= halfDayThresholdSeconds || checkInMinutes >= HALF_DAY_CHECKIN_CUTOFF_MINUTES)
    ? "half_day"
    : checkInMinutes > lateThresholdMinutes
      ? "present_late"
      : "present";

  await record.save();

  return {
    attendance: await formatRecordForFrontend(record, membership),
  };
}

const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Anyone who forgets to clock out (or forgets to end a break) is auto-clocked
// out at 12:00 AM workspace-local time on the day after they checked in, so
// open sessions never bleed into the next day's numbers. The employee can
// then file a correction request (reviewed by HR/admin/manager via
// reviewAttendanceCorrection) to fix the recorded times.
export async function runAttendanceAutoCheckoutSweep() {
  const now = new Date();
  const openRecords = await Attendance.find({
    checkInAt: { $ne: null },
    checkOutAt: null,
  }).exec();

  for (const record of openRecords) {
    const timezone = normalizeTimeZone(record.timezone);
    const currentDateKey = toDateKey(now, timezone);
    if (currentDateKey <= record.dateKey) continue;

    const nextDateKey = addDaysToDateKey(record.dateKey, 1);
    const autoCheckoutMoment = parseWorkspaceDateTime(`${nextDateKey}T00:00:00`, timezone);
    if (Number.isNaN(autoCheckoutMoment.getTime())) continue;

    if (record.isActiveBreak && record.activeBreakStartedAt) {
      const seconds = Math.max(0, Math.floor((autoCheckoutMoment.getTime() - new Date(record.activeBreakStartedAt).getTime()) / 1000));
      const latestBreak = Array.isArray(record.breakLogs) ? record.breakLogs[record.breakLogs.length - 1] : null;
      if (latestBreak && !latestBreak.endAt) {
        latestBreak.endAt = autoCheckoutMoment;
        latestBreak.durationSeconds = seconds;
      }
      record.breakSeconds = Math.max(0, Number(record.breakSeconds) + seconds);
      record.isActiveBreak = false;
      record.activeBreakStartedAt = null;
    }

    record.checkOutAt = autoCheckoutMoment;
    record.autoCheckoutAt = autoCheckoutMoment;

    const workedSeconds = computeWorkedSeconds(record, autoCheckoutMoment);
    record.workedSeconds = workedSeconds;

    const halfDayThresholdSeconds = Number.isFinite(record.halfDayThresholdSeconds)
      ? record.halfDayThresholdSeconds
      : HALF_DAY_MINUTES * 60;
    const workStartMinutes = Number.isFinite(record.workStartMinutes)
      ? record.workStartMinutes
      : DEFAULT_WORK_HOUR_START * 60;
    const lateThresholdMinutes = workStartMinutes + DEFAULT_LATE_MINUTES;
    const checkInLocalParts = getZonedDateTimeParts(record.checkInAt, timezone);
    const checkInMinutes = checkInLocalParts.hour * 60 + checkInLocalParts.minute;

    record.status = (workedSeconds <= halfDayThresholdSeconds || checkInMinutes >= HALF_DAY_CHECKIN_CUTOFF_MINUTES)
      ? "half_day"
      : checkInMinutes > lateThresholdMinutes
        ? "present_late"
        : "present";

    try {
      await record.save();
    } catch (err) {
      console.error(`Attendance auto-checkout failed for record ${record._id}:`, err?.message || err);
    }
  }
}

const AUTO_CHECKOUT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Sweeps for attendance records left open past workspace-local midnight and
 * auto-checks them out. Runs inside the long-lived Express process; safe to
 * call once at startup after MongoDB is connected.
 */
export const startAttendanceAutoCheckoutScheduler = () => {
  const tick = () => {
    runAttendanceAutoCheckoutSweep().catch((err) => {
      console.error("Attendance auto-checkout sweep failed:", err?.message || err);
    });
  };

  tick();
  const timer = setInterval(tick, AUTO_CHECKOUT_SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
};

export async function startBreakAttendance(userId, selfieFile = null) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  if (!isAttendanceConfigured(workspace)) {
    throw Object.assign(
      new Error("Attendance is not set up for this workspace yet. Ask HR to configure working hours and the geofence in Attendance Settings."),
      { statusCode: 400 },
    );
  }
  const record = await getTodayRecord(workspace, user);

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
  if (!isAttendanceConfigured(workspace)) {
    throw Object.assign(
      new Error("Attendance is not set up for this workspace yet. Ask HR to configure working hours and the geofence in Attendance Settings."),
      { statusCode: 400 },
    );
  }
  const record = await getTodayRecord(workspace, user);

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

const getWeekDateKeys = (referenceDate, timezone, weekStartsOn = "monday") => {
  const todayKey = getZonedDateKey(referenceDate, timezone);
  const [year, month, day] = todayKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day));
  const jsDay = anchor.getUTCDay(); // 0=Sun..6=Sat
  const startOffset = weekStartsOn === "sunday" ? jsDay : (jsDay === 0 ? 6 : jsDay - 1);
  const keys = [];
  for (let i = -startOffset; i <= 6 - startOffset; i += 1) {
    const cursor = new Date(anchor);
    cursor.setUTCDate(cursor.getUTCDate() + i);
    keys.push(cursor.toISOString().slice(0, 10));
  }
  return { keys, todayKey };
};

const getWeeklyHoursSummary = async (workspace, userId, timezone) => {
  const weekStartsOn = workspace?.preferences?.weekStartsOn === "sunday" ? "sunday" : "monday";
  const { keys, todayKey } = getWeekDateKeys(new Date(), timezone, weekStartsOn);
  const records = await Attendance.find({
    workspaceId: workspace._id,
    employeeUserId: userId,
    dateKey: { $gte: keys[0], $lte: keys[keys.length - 1] },
  })
    .select("dateKey workedSeconds breakSeconds checkInAt checkOutAt isActiveBreak activeBreakStartedAt")
    .lean()
    .exec();

  let workedSeconds = records.reduce((sum, record) => sum + Math.max(0, Number(record?.workedSeconds) || 0), 0);

  const todayRecord = records.find((record) => record.dateKey === todayKey);
  if (todayRecord?.checkInAt && !todayRecord?.checkOutAt) {
    const now = new Date();
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - new Date(todayRecord.checkInAt).getTime()) / 1000));
    const activeBreakSeconds = todayRecord.isActiveBreak && todayRecord.activeBreakStartedAt
      ? Math.max(0, Math.floor((now.getTime() - new Date(todayRecord.activeBreakStartedAt).getTime()) / 1000))
      : 0;
    const savedBreakSeconds = Math.max(0, Number(todayRecord.breakSeconds) || 0);
    workedSeconds += Math.max(0, elapsedSeconds - savedBreakSeconds - activeBreakSeconds);
  }

  const settings = formatAttendanceSettings(workspace);
  return {
    workedHours: Number((workedSeconds / 3600).toFixed(1)),
    targetHours: settings.weeklyWorkingHours,
  };
};

export async function getMyAttendanceHistory(userId, query = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const timezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const todayKey = toDateKey(new Date(), timezone);
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
  const myRoleName = getRoleName(membership?.role || "");
  const myDepartmentLabel = resolveDepartmentDisplayLabel(
    myRoleName,
    await getDepartmentNamesForMembership(membership),
  );

  const approvedLeaves = await LeaveRequest.find({
    workspaceId: workspace._id,
    requesterUserId: user._id,
    status: "approved",
    startDate: { $lte: new Date(`${keys[keys.length - 1]}T23:59:59.999Z`) },
    endDate: { $gte: new Date(`${keys[0]}T00:00:00.000Z`) },
  })
    .select("leaveCode leaveType leaveMode leaveHours halfDaySession startDate endDate")
    .lean()
    .exec();
  const leaveByDateKey = new Map();
  for (const leave of approvedLeaves) {
    const startKey = (leave.startDate ? new Date(leave.startDate) : new Date()).toISOString().slice(0, 10);
    const endKey = (leave.endDate ? new Date(leave.endDate) : new Date(startKey)).toISOString().slice(0, 10);
    const from = startKey < keys[0] ? keys[0] : startKey;
    const to = endKey > keys[keys.length - 1] ? keys[keys.length - 1] : endKey;
    const cursor = new Date(`${from}T12:00:00.000Z`);
    const last = new Date(`${to}T12:00:00.000Z`);
    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      if (!leaveByDateKey.has(key)) leaveByDateKey.set(key, leave);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const rows = [];
  for (const dateKey of keys) {
    const existing = recordMap.get(dateKey);
    const activeLeave = leaveByDateKey.get(dateKey) || null;
    if (existing) {
      rows.push({
        ...(await formatRecordForFrontend(existing, membership)),
        activeLeave,
      });
      continue;
    }
    // A day that hasn't happened yet was never "absent" — that label only
    // makes sense in hindsight. Give it a neutral placeholder instead so the
    // month view/calendar don't paint the rest of the month red.
    if (dateKey > todayKey) {
      rows.push({
        recordId: `upcoming-${user._id}-${dateKey}`,
        id: `upcoming-${user._id}-${dateKey}`,
        userId: toId(user._id),
        employeeName: user.name || "",
        employeeId: "",
        employeeRole: myRoleName,
        department: myDepartmentLabel,
        date: dateKey,
        checkIn: "",
        checkOut: "",
        status: "upcoming",
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
        activeLeave: null,
      });
      continue;
    }
    const date = new Date(`${dateKey}T12:00:00.000Z`);
    const isOnLeave = Boolean(activeLeave);
    rows.push({
      recordId: isOnLeave ? `leave-${user._id}-${dateKey}` : `absent-${user._id}-${dateKey}`,
      id: isOnLeave ? `leave-${user._id}-${dateKey}` : `absent-${user._id}-${dateKey}`,
      userId: toId(user._id),
      employeeName: user.name || "",
      employeeId: "",
      employeeRole: myRoleName,
      department: myDepartmentLabel,
      date: dateKey,
      checkIn: "",
      checkOut: "",
      status: isOnLeave ? "on_leave" : date.getUTCDay() === 0 ? "sunday_off" : "absent",
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

  const weeklyHours = await getWeeklyHoursSummary(workspace, user._id, timezone);

  return {
    records: rows,
    stats: { ...buildStats(rows), weeklyHours },
  };
}

export async function getTeamAttendanceSnapshot(userId, query = {}) {
  const { workspace, membership, user } = await getWorkspaceIdFromUser(userId);
  const visibleRoleBand = await resolveAttendanceAccessBand(membership);
  const timezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const todayKey = toDateKey(new Date(), timezone);
  const requestedDateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(query.date || "").trim())
    ? String(query.date).trim()
    : todayKey;
  const { keys } = getMonthDateKeys(query.month || requestedDateKey.slice(0, 7));
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

  const memberUserIds = uniqueVisibleMembers.map((m) => m.user._id);
  const memberByUserId = new Map(uniqueVisibleMembers.map((m) => [toId(m.user._id), m]));

  // Roster: a live "who's in" snapshot for the requested day (today by
  // default), one row per visible member — not a per-day log for the whole
  // month, which used to bury today's handful of real punches under a wall
  // of "absent" placeholders for every other day (including future ones).
  const dayRecords = memberUserIds.length
    ? await Attendance.find({
      workspaceId: workspace._id,
      employeeUserId: { $in: memberUserIds },
      dateKey: requestedDateKey,
    }).lean().exec()
    : [];
  const dayRecordByUserId = new Map(dayRecords.map((r) => [toId(r.employeeUserId), r]));
  const approvedLeaves = memberUserIds.length
    ? await LeaveRequest.find({
      workspaceId: workspace._id,
      requesterUserId: { $in: memberUserIds },
      status: "approved",
      startDate: { $lte: new Date(`${requestedDateKey}T23:59:59.999Z`) },
      endDate: { $gte: new Date(`${requestedDateKey}T00:00:00.000Z`) },
    })
      .select("leaveCode leaveType leaveMode leaveHours halfDaySession requesterUserId")
      .lean()
      .exec()
    : [];
  const approvedLeaveByUserId = new Map(
    approvedLeaves.map((leave) => [toId(leave.requesterUserId), leave]),
  );
  const requestedDateIsSunday = new Date(`${requestedDateKey}T12:00:00.000Z`).getUTCDay() === 0;
  const requestedDateIsFuture = requestedDateKey > todayKey;

  const rows = [];
  for (const member of uniqueVisibleMembers) {
    const memberDepartmentName = resolveDepartmentDisplayLabel(
      getRoleName(member?.role || ""),
      Array.isArray(member?.departments) ? member.departments.map((dept) => dept?.name) : [],
    );
    const empId = employeeIdByMemberId.get(toId(member._id)) || employeeIdByUserId.get(toId(member.user?._id)) || "";
    const existing = dayRecordByUserId.get(toId(member.user._id));
    const activeLeave = approvedLeaveByUserId.get(toId(member.user._id)) || null;
    if (existing) {
      rows.push({
        ...(await formatRecordForFrontend(existing, { ...member, employeeId: empId })),
        employeeName: member.user.name || member.user.email || "Unknown",
        department: memberDepartmentName,
        activeLeave,
      });
      continue;
    }
    const leavePlaceholder = activeLeave && !requestedDateIsFuture;
    rows.push({
      recordId: leavePlaceholder ? `leave-${member.user._id}-${requestedDateKey}` : `absent-${member.user._id}-${requestedDateKey}`,
      id: leavePlaceholder ? `leave-${member.user._id}-${requestedDateKey}` : `absent-${member.user._id}-${requestedDateKey}`,
      userId: toId(member.user._id),
      employeeName: member.user.name || member.user.email || "Unknown",
      employeeId: empId,
      employeeRole: getRoleName(member?.role || ""),
      department: memberDepartmentName,
      date: requestedDateKey,
      checkIn: "",
      checkOut: "",
      status: leavePlaceholder ? "on_leave" : requestedDateIsFuture ? "upcoming" : requestedDateIsSunday ? "sunday_off" : "absent",
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
      activeLeave,
    });
  }

  // Corrections can be requested for any past day, so they're gathered
  // separately across the whole requested month rather than from the
  // single-day roster above.
  const monthRecordsWithCorrections = memberUserIds.length
    ? await Attendance.find({
      workspaceId: workspace._id,
      employeeUserId: { $in: memberUserIds },
      dateKey: { $gte: keys[0], $lte: keys[keys.length - 1] },
      correctionRequest: { $ne: null },
    }).lean().exec()
    : [];

  const corrections = [];
  for (const record of monthRecordsWithCorrections) {
    const member = memberByUserId.get(toId(record.employeeUserId));
    const empId = member ? (employeeIdByMemberId.get(toId(member._id)) || employeeIdByUserId.get(toId(member.user?._id)) || "") : "";
    const formatted = await formatRecordForFrontend(record, member ? { ...member, employeeId: empId } : null);
    if (!formatted.correction) continue;
    corrections.push({
      id: formatted.correction.requestedAt,
      correctionId: formatted.recordId || formatted.id,
      userId: formatted.userId,
      employeeName: formatted.employeeName || member?.user?.name || "",
      employeeId: formatted.employeeId || empId,
      employeeRole: formatted.employeeRole || "",
      department: formatted.department || "",
      date: formatted.date || "",
      type: "correction",
      reason: formatted.correction?.reason || "",
      status: formatted.correction?.status || "pending",
      originalCheckIn: formatted.correction?.originalCheckIn || formatted.checkIn,
      originalCheckOut: formatted.correction?.originalCheckOut || formatted.checkOut,
      requestedCheckIn: formatted.correction?.requestedCheckIn || formatted.checkIn,
      requestedCheckOut: formatted.correction?.requestedCheckOut || formatted.checkOut,
      breaks: formatted.correction?.breaks || [],
      actionedBy: formatted.correction?.actionedBy || "",
      rejectionReason: formatted.correction?.rejectionReason || "",
    });
  }

  return {
    records: rows,
    allRecords: rows,
    corrections,
    stats: buildStats(rows),
    date: requestedDateKey,
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
  const timezone = normalizeTimeZone(workspace?.preferences?.timezone);
  const todayKey = toDateKey(new Date(), timezone);
  const rows = await buildMonthlyRowsForMember(
    targetUserId,
    targetMembership?.user?.name || targetMembership?.fullName || "",
    Array.isArray(targetMembership?.departments) && targetMembership.departments[0]
      ? String(targetMembership.departments[0]?.name || "General")
      : "General",
    monthKey,
    workspace._id,
    targetMembership,
    todayKey,
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

  const weeklyHours = await getWeeklyHoursSummary(workspace, targetUserId, timezone);

  return {
    employee: {
      userId: toId(targetUserId),
      fullName: targetUser?.name || targetUser?.email || "",
      employeeId: resolvedEmployeeId,
      role: getRoleName(targetMembership?.role || ""),
      department: resolveDepartmentDisplayLabel(getRoleName(targetMembership?.role || ""), targetDepartments),
      departments: targetDepartments,
    },
    records: rows,
    stats: { weeklyHours },
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

  // The correction form's <input type="time"> only ever sends a bare
  // "HH:MM" (24-hour) value, with no date — anchor it to this record's own
  // day in the workspace's timezone. Full ISO datetime strings (from other
  // callers) still parse as-is.
  const recordTimezone = normalizeTimeZone(record.timezone);
  const parseCorrectionTime = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const bareTimeMatch = /^(\d{1,2}):(\d{2})$/.exec(raw);
    const parsed = bareTimeMatch
      ? parseWorkspaceDateTime(`${record.dateKey}T${raw}:00`, recordTimezone)
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      const error = new Error("Invalid correction datetime value.");
      error.statusCode = 400;
      throw error;
    }
    return parsed;
  };

  const requestedCheckInAt = parseCorrectionTime(input?.requestedCheckIn);
  const requestedCheckOutAt = parseCorrectionTime(input?.requestedCheckOut);

  // A forgotten break-end also gets auto-clocked-out at midnight (see
  // runAttendanceAutoCheckoutSweep), so any break in this day's breakLogs can
  // be corrected the same way as check-in/check-out, addressed by its index.
  const breakLogs = Array.isArray(record.breakLogs) ? record.breakLogs : [];
  const requestedBreaksInput = Array.isArray(input?.breaks) ? input.breaks : [];
  const requestedBreaks = [];
  for (const entry of requestedBreaksInput) {
    const breakIndex = Number(entry?.breakIndex);
    if (!Number.isInteger(breakIndex) || breakIndex < 0 || breakIndex >= breakLogs.length) continue;
    const requestedStartAt = parseCorrectionTime(entry?.requestedStart);
    const requestedEndAt = parseCorrectionTime(entry?.requestedEnd);
    if (!requestedStartAt && !requestedEndAt) continue;
    const existingBreak = breakLogs[breakIndex];
    requestedBreaks.push({
      breakIndex,
      originalStartAt: existingBreak?.startAt || null,
      originalEndAt: existingBreak?.endAt || null,
      requestedStartAt,
      requestedEndAt,
    });
  }

  record.correctionRequest = {
    originalCheckInAt: record.checkInAt || null,
    originalCheckOutAt: record.checkOutAt || null,
    requestedCheckInAt,
    requestedCheckOutAt,
    requestedBreaks,
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
  if (!(await canManageTeamAttendance(membership))) {
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

    const breakAdjustments = Array.isArray(record.correctionRequest.requestedBreaks)
      ? record.correctionRequest.requestedBreaks
      : [];
    if (breakAdjustments.length && Array.isArray(record.breakLogs)) {
      for (const adjustment of breakAdjustments) {
        const breakEntry = record.breakLogs[adjustment.breakIndex];
        if (!breakEntry) continue;
        if (adjustment.requestedStartAt) breakEntry.startAt = adjustment.requestedStartAt;
        if (adjustment.requestedEndAt) breakEntry.endAt = adjustment.requestedEndAt;
        breakEntry.durationSeconds = breakEntry.startAt && breakEntry.endAt
          ? Math.max(0, Math.floor((new Date(breakEntry.endAt).getTime() - new Date(breakEntry.startAt).getTime()) / 1000))
          : 0;
      }
      // Every break correction touches the day's total break time, so working
      // hours come out right whichever break(s) were adjusted.
      record.breakSeconds = record.breakLogs.reduce(
        (sum, breakEntry) => sum + Math.max(0, Number(breakEntry?.durationSeconds) || 0),
        0,
      );
    }

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
