// @ts-nocheck
import HostActivityLog from "../models/HostActivityLog.js";
import HostUser from "../models/HostUser.js";
import Workspace from "../models/Workspace.js";

// Friendly module names shown in the master panel logs table, keyed by the
// first meaningful path segment after /api (or /api/v1).
const MODULE_NAMES = {
  editor: "Website Builder",
  services: "Services",
  leads: "Leads",
  listings: "Listings",
  profile: "Profile",
  review: "Reviews",
  workspaces: "Workspaces",
  organization: "Organization",
  subscription: "Subscription",
  "website-credits": "Website Credits",
  tickets: "Tickets",
  visitors: "Visitors",
  assets: "Assets",
  inventory: "Inventory",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  tasks: "Tasks",
  finance: "Finance",
  hr: "HR",
  attendance: "Attendance",
  it: "IT",
  "meeting-rooms": "Meeting Rooms",
  calendar: "Calendar",
  resources: "Resources",
  "pricing-packages": "Pricing Packages",
  "tenant-companies": "Tenant Companies",
  reports: "Reports",
  recruitment: "Recruitment",
};

const VALID_METHODS = ["POST", "PATCH", "PUT", "DELETE"];
const SENSITIVE_FIELDS = [
  "password",
  "newPassword",
  "confirmPassword",
  "currentPassword",
  "otp",
];
const MAX_PAYLOAD_VALUE_LENGTH = 1000;

const isPossiblyId = (segment) => /^[a-f0-9]{24}$/i.test(segment);

const resolveModule = (pathSegments) => {
  // pathSegments starts after "api"; skip version prefixes like "v1".
  const key = pathSegments.find(
    (segment) => segment !== "api" && !/^v\d+$/.test(segment),
  );
  return MODULE_NAMES[key] || key || "";
};

const resolveAction = (pathSegments) => {
  const withoutIds = pathSegments.filter((segment) => !isPossiblyId(segment));
  return withoutIds.at(-1) || pathSegments.at(-1) || "unknown";
};

const capValue = (value) =>
  typeof value === "string" && value.length > MAX_PAYLOAD_VALUE_LENGTH
    ? `${value.slice(0, MAX_PAYLOAD_VALUE_LENGTH)}… [truncated]`
    : value;

const flattenObject = (obj, prefix = "", result = {}) => {
  for (const key in obj) {
    const value = obj[key];
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      flattenObject(value, prefixedKey, result);
    } else {
      result[prefixedKey] = capValue(value);
    }
  }
  return result;
};

const activityLogger = (req, res, next) => {
  try {
    const startTime = Date.now();

    if (!VALID_METHODS.includes(req.method)) return next();

    const cleanUrl = (req.originalUrl || "").split("?")[0];
    const pathSegments = cleanUrl.split("/").filter(Boolean);

    // Auth flows (login, refresh, otp) are not host activity.
    if (pathSegments.includes("auth")) return next();

    res.on("finish", async () => {
      try {
        // req.user is set by verifyJwt before route handlers run, so by the
        // time the response finishes it is present for authenticated requests.
        // Public endpoints (leads, reviews) and impersonated master admin
        // sessions are not host user activity.
        if (!req.user || req.isImpersonated) return;

        const user = await HostUser.findById(req.user)
          .select("name email company companyId primaryWorkspace")
          .populate("company", "companyName")
          .lean()
          .exec();
        if (!user) return;

        const workspaceId =
          req.workspaceMembership?.workspace ||
          (user.primaryWorkspace ? String(user.primaryWorkspace) : "");

        let workspaceName = "";
        if (workspaceId) {
          const workspace = await Workspace.findById(workspaceId)
            .select("workspaceName")
            .lean()
            .exec();
          workspaceName = workspace?.workspaceName || "";
        }

        const combinedPayload = {
          ...(req.body || {}),
          ...(req.params || {}),
          ...(req.query || {}),
        };

        if (req.file) {
          combinedPayload.uploadedFile = {
            fieldName: req.file.fieldname,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
          };
        }

        if (Array.isArray(req.files) && req.files.length > 0) {
          combinedPayload.uploadedFiles = req.files.map((f) => ({
            fieldName: f.fieldname,
            originalName: f.originalname,
            size: f.size,
            mimeType: f.mimetype,
          }));
        }

        SENSITIVE_FIELDS.forEach((field) => {
          if (field in combinedPayload) combinedPayload[field] = "***";
        });

        await HostActivityLog.create({
          performedBy: user._id,
          fullName: user.name || user.email || "Unknown",
          email: user.email || "",
          action: resolveAction(pathSegments),
          module: resolveModule(pathSegments),
          companyId: user.companyId || "",
          companyName: user.company?.companyName || "",
          workspaceId,
          workspaceName,
          method: req.method,
          statusCode: res.statusCode,
          success: res.statusCode < 400,
          payload: flattenObject(combinedPayload),
          ipAddress: req.ip || "",
          responseTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error("Error in activityLogger:", error?.message || error);
      }
    });

    next();
  } catch (error) {
    next(error);
  }
};

export default activityLogger;
