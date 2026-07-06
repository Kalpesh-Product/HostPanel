// @ts-nocheck
import jwt from "jsonwebtoken";
import HostUser from "../models/HostUser.js";
import bcrypt from "bcryptjs";
import Company from "../models/Company.js";
import Otp from "../models/Otp.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import Workspace from "../models/Workspace.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import { sendMail } from "../config/mailer.js";
import crypto from "crypto";
import { TenantCompany } from "../models/TenantCompany.js";
import TenantEmployee from "../models/TenantEmployee.js";
import {
  resolveAccessibleWorkspaceMemberships,
  resolveActiveWorkspaceMembership,
} from "../utils/resolveMembership.js";
import { ensureEmployeeProfileForMember } from "../services/core/hr.service.js";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).+$/;

const validateStrongPassword = (password: string) => {
  if (!password || password.length < 8) return "Must be at least 8 characters long.";
  if (password.length > 72) return "Password cannot exceed 72 characters.";
  if (!PASSWORD_REGEX.test(password)) {
    return "Should include both uppercase and lowercase letters and at least one number or special character.";
  }
  return "";
};

const getPasswordResetSessionSecret = () =>
  process.env.PASSWORD_RESET_OTP_SECRET || process.env.ACCESS_TOKEN_SECRET;

const signPasswordResetSession = (email: string) => {
  const secret = getPasswordResetSessionSecret();
  if (!secret) throw new Error("Password reset secret not configured");
  return jwt.sign(
    { purpose: "password_reset_session", email: String(email || "").trim().toLowerCase() },
    secret,
    { expiresIn: "15m" },
  );
};

const verifyPasswordResetSession = (token: string) => {
  const secret = getPasswordResetSessionSecret();
  if (!secret) throw new Error("Password reset secret not configured");
  return jwt.verify(token, secret);
};

const hasPasswordBeenUsedRecently = async (user: any, plainPassword: string) => {
  const currentHash = String(user?.password || "");
  if (currentHash && (await bcrypt.compare(plainPassword, currentHash))) return true;
  const history = Array.isArray(user?.passwordHistory) ? user.passwordHistory : [];
  for (const entry of history.slice(0, 2)) {
    const oldHash = String(entry?.hash || "");
    if (oldHash && (await bcrypt.compare(plainPassword, oldHash))) return true;
  }
  return false;
};

const applyPasswordUpdateWithHistory = async (user: any, nextPassword: string) => {
  const currentHash = String(user?.password || "");
  user.password = nextPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  const history = Array.isArray(user?.passwordHistory) ? user.passwordHistory : [];
  if (currentHash) history.unshift({ hash: currentHash, changedAt: new Date() });
  user.passwordHistory = history.slice(0, 2);
  await user.save();
};

const getInviteSecret = () =>
  process.env.HOST_INVITE_TOKEN_SECRET ||
  process.env.REGISTER_INVITE_SECRET ||
  process.env.ACCESS_TOKEN_SECRET;

const decodeSignupInviteToken = (token) => {
  const secret = getInviteSecret();
  if (!secret) throw new Error("Invite secret not configured");
  return jwt.verify(token, secret);
};
const normalizePlan = (plan: string) => {
  const lower = String(plan || "").trim().toLowerCase();
  if (lower === "basic") return "basic";
  if (lower === "professional") return "professional";
  if (["custom", "customise", "customize", "customised", "customized"].includes(lower)) return "custom";
  return "basic";
};

const extractInviteIdentity = (decoded: any) => {
  const inviteEmail =
    decoded?.inviteEmail || decoded?.email || decoded?.userInfo?.email || "";
  const firstName = decoded?.firstName || decoded?.userInfo?.firstName || "";
  const lastName = decoded?.lastName || decoded?.userInfo?.lastName || "";
  const combinedName = `${firstName} ${lastName}`.trim();
  const inviteName =
    decoded?.inviteName ||
    decoded?.fullName ||
    decoded?.name ||
    decoded?.userInfo?.name ||
    decoded?.userInfo?.fullName ||
    decoded?.userInfo?.inviteName ||
    combinedName ||
    "";
  const selectedPlan =
    normalizePlan(decoded?.selectedPlan ||
      decoded?.goals ||
      decoded?.userInfo?.selectedPlan ||
      decoded?.userInfo?.goals ||
      "basic");
  const businessName =
    decoded?.businessName ||
    decoded?.companyName ||
    decoded?.userInfo?.businessName ||
    decoded?.userInfo?.companyName ||
    "";
  const inviteType =
    decoded?.inviteType ||
    decoded?.userInfo?.inviteType ||
    "master";
  const country =
    decoded?.country ||
    decoded?.companyCountry ||
    decoded?.workspaceCountry ||
    decoded?.userInfo?.country ||
    decoded?.userInfo?.companyCountry ||
    decoded?.userInfo?.workspaceCountry ||
    "";
  const state =
    decoded?.state ||
    decoded?.companyState ||
    decoded?.workspaceState ||
    decoded?.userInfo?.state ||
    decoded?.userInfo?.companyState ||
    decoded?.userInfo?.workspaceState ||
    "";
  const city =
    decoded?.city ||
    decoded?.companyCity ||
    decoded?.workspaceCity ||
    decoded?.userInfo?.city ||
    decoded?.userInfo?.companyCity ||
    decoded?.userInfo?.workspaceCity ||
    "";
  const businessTypesRaw =
    decoded?.businessTypes ||
    decoded?.businessType ||
    decoded?.verticalTypes ||
    decoded?.verticalType ||
    decoded?.verticals ||
    decoded?.companyTypes ||
    decoded?.companyType ||
    decoded?.workspaceType ||
    decoded?.workspaceTypes ||
    decoded?.userInfo?.businessTypes ||
    decoded?.userInfo?.businessType ||
    decoded?.userInfo?.verticalTypes ||
    decoded?.userInfo?.verticalType ||
    decoded?.userInfo?.verticals ||
    decoded?.userInfo?.companyTypes ||
    decoded?.userInfo?.companyType ||
    decoded?.userInfo?.workspaceType ||
    decoded?.userInfo?.workspaceTypes ||
    [];
  const businessTypes = Array.isArray(businessTypesRaw)
    ? businessTypesRaw.map((item: any) => String(item || "").trim()).filter(Boolean)
    : String(businessTypesRaw || "")
      .split(/[,\|\/;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    inviteEmail,
    inviteName,
    selectedPlan,
    businessName,
    inviteType,
    country,
    state,
    city,
    businessTypes,
  };
};

const buildAuthUserPayload = (
  user: any,
  company: any,
  workspaceCount = 0,
  workspaceMembership: any = null,
  accessibleWorkspaces: any[] = [],
  hasCompletedWorkspaceSetupOverride: boolean | null = null,
) => ({
  ...user,
  companyName: company?.companyName,
  logo: company?.logo,
  isWebsiteTemplate: company?.isWebsiteTemplate,
  hasCompletedWorkspaceSetup:
    hasCompletedWorkspaceSetupOverride === null
      ? Boolean(user?.hasCompletedWorkspaceSetup)
      : Boolean(hasCompletedWorkspaceSetupOverride),
  primaryWorkspace: user?.primaryWorkspace || null,
  workspaceCount,
  workspaceMembership: workspaceMembership
    ? {
        role: workspaceMembership.role?.name || (typeof workspaceMembership.role === "string" ? workspaceMembership.role : "member"),
        isPrimary: workspaceMembership.isPrimary,
        isActive: workspaceMembership.isActive,
      }
    : user?.workspaceMembership || null,
  accessibleWorkspaces,
});

const getAccessibleWorkspaces = async (userId: any) => {
  const memberships = await resolveAccessibleWorkspaceMemberships(userId);

  return memberships
    .filter((membership: any) => membership?.workspace)
    .map((membership: any) => {
      const workspace = membership.workspace;
      return {
        id: String(workspace?._id || ""),
        workspaceName: workspace?.workspaceName || "Workspace",
        businessName: workspace?.businessName || "",
        location: [workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", "),
        isPrimary: Boolean(membership?.isPrimary),
      };
    });
};

const normalizeInviteEmail = (email: string) =>
  String(email || "").trim().toLowerCase();

const getFounderEmailForWorkspace = async (workspaceId: any) => {
  if (!workspaceId) return "";
  const workspace = await Workspace.findById(workspaceId).populate("owner", "email").lean().exec();
  return workspace?.owner?.email || "";
};


const resolveCompanyForActiveWorkspace = async (user: any, activeMembership: any) => {
  if (activeMembership?.workspace) {
    const activeWorkspace = await Workspace.findById(activeMembership.workspace)
      .select("company companyId businessName")
      .lean()
      .exec();

    if (activeWorkspace) {
      const companyFromWorkspace =
        (activeWorkspace?.company
          ? await Company.findById(activeWorkspace.company).lean().exec()
          : null) ||
        (activeWorkspace?.companyId
          ? await Company.findOne({ companyId: activeWorkspace.companyId }).lean().exec()
          : null);

      if (companyFromWorkspace) {
        const workspaceBusinessName = String(activeWorkspace?.businessName || "")
          .trim()
          .toLowerCase();
        const resolvedCompanyName = String(companyFromWorkspace?.companyName || "")
          .trim()
          .toLowerCase();

        // If legacy data links to a different company, suppress it so UI falls back to default WONO logo.
        if (workspaceBusinessName && resolvedCompanyName && workspaceBusinessName !== resolvedCompanyName) {
          return null;
        }

        return companyFromWorkspace;
      }

      const workspaceBusinessName = String(activeWorkspace?.businessName || "").trim();
      if (workspaceBusinessName) {
        const workspaceMatchedCompany = await Company.findOne({
          companyName: new RegExp(
            `^${workspaceBusinessName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        })
          .lean()
          .exec();

        if (workspaceMatchedCompany) {
          return workspaceMatchedCompany;
        }
      }
    }
  }

  const linkedCompanyId =
    typeof user?.company === "string"
      ? user.company
      : user?.company?._id || user?.company?.id || null;

  return (
    (user?.companyId ? await Company.findOne({ companyId: user.companyId }).lean().exec() : null) ||
    (linkedCompanyId ? await Company.findById(linkedCompanyId).lean().exec() : null)
  );
};

const ensureInviteUserRecord = async (inviteEmail: string, inviteName: string) => {
  const normalizedEmail = normalizeInviteEmail(inviteEmail);
  let user = await HostUser.findOne({ email: normalizedEmail }).exec();
  if (user) return user;

  const company = await Company.findOne({}).lean().exec();
  if (!company?._id || !company?.companyId) {
    throw new Error("INVITE_COMPANY_NOT_FOUND");
  }

  const fallbackCompanyId = `${company.companyId}-dev-${Date.now()
    .toString()
    .slice(-6)}`;

  user = await HostUser.create({
    company: company._id,
    companyId: fallbackCompanyId,
    name: inviteName,
    email: normalizedEmail,
    isActive: true,
    hasCompletedWorkspaceSetup: false,
  });

  return user;
};

const enrichInviteLocationAndTypes = async ({
  businessName,
  country,
  state,
  city,
  businessTypes,
}: {
  businessName: string;
  country: string;
  state: string;
  city: string;
  businessTypes: string[];
}) => {
  const normalizedBusinessName = String(businessName || "").trim();
  let resolvedCountry = String(country || "").trim();
  let resolvedState = String(state || "").trim();
  let resolvedCity = String(city || "").trim();
  let resolvedBusinessTypes = Array.isArray(businessTypes)
    ? businessTypes.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!normalizedBusinessName) {
    return {
      country: resolvedCountry,
      state: resolvedState,
      city: resolvedCity,
      businessTypes: resolvedBusinessTypes,
    };
  }

  const workspace = await Workspace.findOne({
    businessName: normalizedBusinessName,
    isActive: true,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean()
    .exec();

  if (workspace) {
    resolvedCountry = resolvedCountry || String(workspace.country || "").trim();
    resolvedState = resolvedState || String(workspace.state || "").trim();
    resolvedCity = resolvedCity || String(workspace.city || "").trim();
    if (!resolvedBusinessTypes.length) {
      resolvedBusinessTypes = Array.isArray(workspace.businessTypes)
        ? workspace.businessTypes
          .map((item: any) => String(item || "").trim())
          .filter(Boolean)
        : [];
    }
  }

  if (!resolvedCountry || !resolvedState || !resolvedCity) {
    const company = await Company.findOne({
      companyName: normalizedBusinessName,
    })
      .lean()
      .exec();

    if (company) {
      resolvedCountry = resolvedCountry || String(company.companyCountry || "").trim();
      resolvedState = resolvedState || String(company.companyState || "").trim();
      resolvedCity = resolvedCity || String(company.companyCity || "").trim();
    }
  }

  return {
    country: resolvedCountry,
    state: resolvedState,
    city: resolvedCity,
    businessTypes: resolvedBusinessTypes,
  };
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Invalid data" });

    const emailRegex = /^[a-zA-Z0-9_.±]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "invalid data" });

    const user = await HostUser.findOne({ email }).lean().exec();

    if (!user) return res.status(404).json({ message: "No user found" });
    if (user?.isActive === false) {
      return res.status(403).json({
        code: "ACCOUNT_DISABLED",
        message: "Account access disabled by founder.",
      });
    }

    const activeMembership = await resolveActiveWorkspaceMembership(user);
    let hasCompletedWorkspaceSetupForSession = Boolean(user?.hasCompletedWorkspaceSetup);
    if (!activeMembership && user?.hasCompletedWorkspaceSetup) {
      const lastMembership = await WorkspaceMember.findOne({ user: user._id })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean()
        .exec();
      const disabledByFounder =
        lastMembership &&
        (lastMembership.isActive === false ||
          String(lastMembership.status || "").toLowerCase() === "disabled");

      if (disabledByFounder) {
        const founderEmail = await getFounderEmailForWorkspace(lastMembership?.workspace);
        return res.status(403).json({
          code: "ACCOUNT_DISABLED",
          founderEmail: founderEmail || "",
          message: "Account access disabled by founder.",
        });
      }

      // Legacy accounts can have setup flag true with no active workspace.
      // Treat them as setup-incomplete so frontend can route to create workspace.
      hasCompletedWorkspaceSetupForSession = false;
    }

    // Run company lookup, workspace count, accessible workspaces, tenant check,
    // and password verification all in parallel — previously 5+ sequential round-trips.
    const [
      company,
      workspaceCount,
      accessibleWorkspaces,
      tenantEmp,
      isPasswordValid,
    ] = await Promise.all([
      resolveCompanyForActiveWorkspace(user, activeMembership),
      WorkspaceMember.countDocuments({ user: user._id, isActive: true }),
      getAccessibleWorkspaces(user._id),
      user?.email
        ? TenantEmployee.findOne({ email: normalizeInviteEmail(user.email), status: "Active" }).exec()
        : Promise.resolve(null),
      bcrypt.compare(password, user.password),
    ]);

    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid password" });

    const workspaceMembership = activeMembership;

    delete user.password;
    delete user.refreshToken;

    const accessToken = jwt.sign(
      {
        userInfo: {
          ...user,
          hasCompletedWorkspaceSetup: hasCompletedWorkspaceSetupForSession,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        userInfo: {
          ...user,
          hasCompletedWorkspaceSetup: hasCompletedWorkspaceSetupForSession,
        },
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "15d" }
    );

    const inviteStatusUpdate =
      user.inviteStatus === "invite_sent" || user.inviteStatus === "registered"
        ? { inviteStatus: "joined", joinedAt: new Date() }
        : {};
    await HostUser.findOneAndUpdate({ email }, { refreshToken, ...inviteStatusUpdate }).lean().exec();

    if (inviteStatusUpdate.inviteStatus) {
      // Keep WorkspaceMember.status in sync
      await WorkspaceMember.updateMany(
        { user: user._id, status: "invited", isActive: true },
        { $set: { status: "joined" } },
      );
    }

    res.cookie("clientCookie", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    // Check if user is a tenant employee
    let tenantRole = null;
    let tenantCompanyId = null;
    let tenantCompanyName = null;
    let tenantLastLoginAt = null;
    let tenantWorkspaceId = null;
    // tenantEmp was already fetched in the parallel Promise.all above
    if (tenantEmp) {
      const tenantCompany = await TenantCompany.findById(tenantEmp.tenantCompanyId).lean().exec();
      if (tenantCompany) {
        tenantRole = tenantEmp.tenantRole || (tenantEmp.role === "Manager" ? "tenant-manager" : "tenant-employee");
        tenantCompanyId = String(tenantCompany._id);
        tenantCompanyName = tenantCompany.companyName || "";
        tenantWorkspaceId = String(tenantCompany.workspaceId || "");
        tenantLastLoginAt = tenantEmp.lastLoginAt || null;
        // Fire-and-forget: don't block login response for a lastLoginAt update
        void TenantEmployee.updateOne(
          { _id: tenantEmp._id },
          { $set: { lastLoginAt: new Date() } }
        ).exec().catch(() => {});
      }
    }

    res.status(200).json({
      user: {
        ...buildAuthUserPayload(
          user,
          company,
          workspaceCount,
          workspaceMembership,
          accessibleWorkspaces,
          hasCompletedWorkspaceSetupForSession,
        ),
        primaryWorkspace: tenantWorkspaceId || user?.primaryWorkspace || null,
        tenantRole,
        tenantCompanyId,
        tenantCompanyName,
        tenantLastLoginAt,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookies = req.cookies;
    const headerRefreshToken =
      req.headers["x-refresh-token"] ||
      (String(req.headers?.authorization || "").startsWith("Bearer ")
        ? String(req.headers.authorization).split(" ")[1]
        : "");
    const refreshToken = String(headerRefreshToken || cookies?.clientCookie || "");
    if (!refreshToken) {
      return res.sendStatus(201);
    }
    const user = await HostUser.findOne({ refreshToken }).lean().exec();
    if (!user) {
      res.clearCookie("clientCookie", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      return res.sendStatus(201);
    }

    await HostUser.findOneAndUpdate({ refreshToken }, { refreshToken: "" })
      .lean()
      .exec();
    res.clearCookie("clientCookie", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    res.sendStatus(201);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    //Validate the email
    const user = await HostUser.findOne({ email });

    if (!email) return res.status(400).json({ message: "Email is required" });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found with this email" });
    }

    //Generate Token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    //Send email with reset link
    const resetUrl = `${process.env.FRONTEND_PROD_LINK}reset-password/${resetToken}`;

    const message = `
      <p>Hi ${user.name || ""},</p> 
      <p>You requested a password reset. Click below to reset your password:</p>
      <a href="${resetUrl}" target="_blank">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
    `;

    try {
      await sendMail({
        to: user.email,
        subject: "Password Reset Request",
        html: message,
      });

      res.status(200).json({
        success: true,
        message: "Password reset email sent successfully",
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.log("email error", error);
      res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    console.log("error", error);
    next(error);
  }
};

export const startForgotPasswordWithOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ message: "Email is required." });

    const user = await HostUser.findOne({ email: normalizedEmail }).lean().exec();
    if (!user) return res.status(404).json({ message: "Email doesn't exist." });

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    await Otp.updateMany(
      { email: normalizedEmail, purpose: "password_reset", isUsed: false },
      { $set: { isUsed: true } },
    );
    await Otp.create({
      email: normalizedEmail,
      code: otp,
      purpose: "password_reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      payload: {},
    });

    await sendMail({
      to: normalizedEmail,
      subject: "WONO Password Reset OTP",
      html: `
        <p>Hi ${user?.name || ""},</p>
        <p>Your OTP for password reset is:</p>
        <h2>${otp}</h2>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return res.status(200).json({ message: "OTP sent successfully.", email: normalizedEmail });
  } catch (error) {
    next(error);
  }
};

export const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: "password_reset",
      isUsed: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpRecord) return res.status(400).json({ message: "Please request OTP first." });
    if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res.status(429).json({ message: "OTP attempts exceeded. Request a new OTP." });
    }
    if (String(otpRecord.code) !== String(otp)) {
      await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const user = await HostUser.findOne({ email: normalizedEmail }).lean().exec();
    if (!user) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res.status(404).json({ message: "Email doesn't exist." });
    }

    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
    const resetSessionToken = signPasswordResetSession(normalizedEmail);
    return res.status(200).json({
      message: "OTP verified successfully.",
      resetSessionToken,
      email: normalizedEmail,
    });
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset session expired. Verify OTP again." });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid reset session." });
    }
    next(error);
  }
};

export const resetPasswordWithOtpSession = async (req, res, next) => {
  try {
    const { resetSessionToken, password, confirmPassword } = req.body;
    if (!resetSessionToken) {
      return res.status(400).json({ message: "Reset session token is required." });
    }
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    const strengthMessage = validateStrongPassword(password);
    if (strengthMessage) return res.status(400).json({ message: strengthMessage });

    const decoded: any = verifyPasswordResetSession(resetSessionToken);
    const normalizedEmail = String(decoded?.email || "").trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ message: "Invalid reset session." });

    const user = await HostUser.findOne({ email: normalizedEmail }).select("+password").exec();
    if (!user) return res.status(404).json({ message: "Email doesn't exist." });

    const usedRecently = await hasPasswordBeenUsedRecently(user, password);
    if (usedRecently) {
      return res
        .status(400)
        .json({ message: "New password cannot be same as current or last 2 passwords." });
    }

    await applyPasswordUpdateWithHistory(user, password);
    return res.status(200).json({ success: true, message: "Password reset successful." });
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset session expired. Verify OTP again." });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid reset session." });
    }
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword)
      return res
        .status(400)
        .json({ message: "Password and Confirm Password are required" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    const strengthMessage = validateStrongPassword(password);
    if (strengthMessage) return res.status(400).json({ message: strengthMessage });

    // Hash the reset token to find user
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await HostUser.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password");

    if (!user)
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token" });

    // ✅ Check if new password is same as old password
    const usedRecently = await hasPasswordBeenUsedRecently(user, password);
    if (usedRecently)
      return res.status(400).json({
        message: "New password cannot be same as current or last 2 passwords.",
      });

    // ✅ Update password
    await applyPasswordUpdateWithHistory(user, password);

    // ✅ Send confirmation email
    const successMessage = `
      <p>Hi ${user.firstName || user.name || ""},</p>
      <p>Your password has been successfully reset.</p>
      <p>You can now <a href="${process.env.FRONTEND_PROD_LINK
      }" target="_blank">log in</a> with your new password.</p>
      <p>If you did not perform this action, please contact us immediately.</p>
      <br/>
      <p>Best,<br/>The Wono Team</p>
    `;

    try {
      await sendMail({
        to: user.email,
        subject: "Your Password Has Been Reset Successfully",
        html: successMessage,
      });
    } catch (error) {
      console.error(
        "⚠️ Password reset confirmation email failed:",
        error.message
      );
    }

    res.status(200).json({
      success: true,
      message: "Password reset successful. A confirmation email has been sent.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    next(error);
  }
};

export const getRegisterPrefill = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: "Invite token is required." });

    const decoded = decodeSignupInviteToken(token);
    const {
      inviteEmail,
      inviteName,
      selectedPlan,
      businessName,
      inviteType,
      country,
      state,
      city,
      businessTypes,
    } =
      extractInviteIdentity(decoded);

    if (!inviteEmail || !inviteName) {
      return res.status(400).json({ message: "Invalid invite token payload." });
    }

    const user = await ensureInviteUserRecord(inviteEmail, inviteName);

    if (user.password) {
      return res.status(409).json({
        message: "Account is already registered. Please sign in.",
      });
    }

    const enriched = await enrichInviteLocationAndTypes({
      businessName,
      country,
      state,
      city,
      businessTypes,
    });

    res.status(200).json({
      fullName: inviteName,
      email: inviteEmail,
      selectedPlan,
      businessName,
      inviteType,
      country: enriched.country,
      state: enriched.state,
      city: enriched.city,
      businessTypes: enriched.businessTypes,
    });
  } catch (error) {
    if (error?.message === "INVITE_COMPANY_NOT_FOUND") {
      return res.status(400).json({
        message:
          "No company found to attach this invited user. Please create at least one company first.",
      });
    }
    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invite link has expired." });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid invite link." });
    }
    next(error);
  }
};

export const startRegisterWithOtp = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { fullName, email, password, confirmPassword } = req.body;
    if (!token)
      return res.status(400).json({ message: "Invite token is required." });
    if (!password || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    const strengthMessage = validateStrongPassword(password);
    if (strengthMessage) return res.status(400).json({ message: strengthMessage });

    const decoded = decodeSignupInviteToken(token);
    const { inviteEmail, inviteName } = extractInviteIdentity(decoded);

    if (!inviteEmail || !inviteName) {
      return res.status(400).json({ message: "Invalid invite token payload." });
    }
    if (email !== inviteEmail || fullName !== inviteName) {
      return res
        .status(400)
        .json({ message: "Invite details mismatch for this registration link." });
    }

    const user = await ensureInviteUserRecord(inviteEmail, inviteName);

    if (user.password) {
      return res.status(409).json({
        message: "Account is already registered. Please sign in.",
      });
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

    await Otp.updateMany(
      { email: inviteEmail, purpose: "registration", isUsed: false },
      { $set: { isUsed: true } },
    );
    await Otp.create({
      email: inviteEmail,
      code: otp,
      purpose: "registration",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      payload: {
        fullName: inviteName,
        email: inviteEmail,
        password,
      },
    });

    await sendMail({
      to: inviteEmail,
      subject: "WONO Registration OTP",
      html: `
      <p>Hi ${inviteName},</p>
      <p>Your OTP for registration is:</p>
      <h2>${otp}</h2>
      <p>This OTP expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({
      message: "OTP sent successfully.",
      email: normalizeInviteEmail(inviteEmail),
    });
  } catch (error) {
    if (error?.message === "INVITE_COMPANY_NOT_FOUND") {
      return res.status(400).json({
        message:
          "No company found to attach this invited user. Please create at least one company first.",
      });
    }
    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invite link has expired." });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid invite link." });
    }
    next(error);
  }
};

export const verifyRegisterOtpAndComplete = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;
    if (!token)
      return res.status(400).json({ message: "Invite token is required." });
    if (!otp) return res.status(400).json({ message: "OTP is required." });

    const decoded = decodeSignupInviteToken(token);
    const { inviteEmail, inviteName } = extractInviteIdentity(decoded);

    if (!inviteEmail || !inviteName)
      return res.status(400).json({ message: "Invalid invite token payload." });

    const otpRecord = await Otp.findOne({
      email: inviteEmail,
      purpose: "registration",
      isUsed: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpRecord)
      return res.status(400).json({ message: "Please request OTP first." });
    if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new OTP." });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res
        .status(429)
        .json({ message: "OTP attempts exceeded. Request a new OTP." });
    }
    if (String(otpRecord.code) !== String(otp)) {
      await Otp.updateOne(
        { _id: otpRecord._id },
        { $inc: { attempts: 1 } },
      );
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const user = await ensureInviteUserRecord(inviteEmail, inviteName);

    if (user.password) {
      return res.status(409).json({
        message: "Account is already registered. Please sign in.",
      });
    }

    const payloadName = otpRecord?.payload?.fullName || inviteName;
    const payloadPassword = otpRecord?.payload?.password;
    if (!payloadPassword) {
      return res
        .status(400)
        .json({ message: "Registration session expired. Start again." });
    }

    user.name = payloadName;
    user.password = payloadPassword;
    user.inviteStatus = "registered";
    user.registeredAt = new Date();
    await user.save();

    if (decoded?.inviteType === "workspace-employee" && decoded?.workspaceId) {
      const workspace = await Workspace.findById(decoded.workspaceId).lean().exec();
      if (workspace?._id) {
        const profile = await EmployeeProfile.findOne({
          workspaceId: workspace._id,
          email: normalizeInviteEmail(email),
        }).lean().exec();

        if (profile) {
          const profileRole = profile.workspaceRole || null;
          const profileDepartments = Array.isArray(profile.departments) ? profile.departments.filter(Boolean) : [];
          await WorkspaceMember.findOneAndUpdate(
            { workspace: workspace._id, user: user._id },
            {
              $set: {
                workspace: workspace._id,
                user: user._id,
                role: profileRole,
                departments: profileDepartments,
                status: "active",
                isPrimary: true,
                isActive: true,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          ).exec();
        }
      }
    }

    const linkedMemberships = await WorkspaceMember.find({ user: user._id })
      .populate("role")
      .populate("departments")
      .exec();
    for (const membership of linkedMemberships) {
      const membershipWorkspace = await Workspace.findById(membership.workspace).lean().exec();
      if (!membershipWorkspace) continue;
      await ensureEmployeeProfileForMember({
        workspace: membershipWorkspace,
        member: membership,
        user,
      });
    }

    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });

    return res.status(200).json({
      message: "Registration completed successfully. You can now sign in.",
    });
  } catch (error) {
    if (error?.message === "INVITE_COMPANY_NOT_FOUND") {
      return res.status(400).json({
        message:
          "No company found to attach this invited user. Please create at least one company first.",
      });
    }
    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Invite link has expired." });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid invite link." });
    }
    next(error);
  }
};

export const startRegisterDirect = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Full name, email, password, and confirm password are required.",
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    const strengthMessage = validateStrongPassword(password);
    if (strengthMessage) return res.status(400).json({ message: strengthMessage });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await HostUser.findOne({ email: normalizedEmail })
      .lean()
      .exec();
    if (existing) {
      return res
        .status(409)
        .json({
          message:
            "This email already exists in host panel. Use a different email for new account.",
        });
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    await Otp.updateMany(
      { email: normalizedEmail, purpose: "registration", isUsed: false },
      { $set: { isUsed: true } },
    );
    await Otp.create({
      email: normalizedEmail,
      code: otp,
      purpose: "registration",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      payload: {
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        password,
      },
    });

    await sendMail({
      to: normalizedEmail,
      subject: "WONO Registration OTP",
      html: `
      <p>Hi ${String(fullName).trim()},</p>
      <p>Your OTP for registration is:</p>
      <h2>${otp}</h2>
      <p>This OTP expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return res.status(200).json({
      message: "OTP sent successfully.",
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRegisterOtpDirect = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      purpose: "registration",
      isUsed: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpRecord) {
      return res.status(400).json({ message: "Please request OTP first." });
    }
    if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new OTP." });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res
        .status(429)
        .json({ message: "OTP attempts exceeded. Request a new OTP." });
    }
    if (String(otpRecord.code) !== String(otp)) {
      await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const existing = await HostUser.findOne({ email: normalizedEmail })
      .lean()
      .exec();
    if (existing) {
      return res
        .status(409)
        .json({ message: "Account already exists. Please sign in." });
    }

    const payloadName = otpRecord?.payload?.fullName || "";
    const payloadPassword = otpRecord?.payload?.password;
    if (!payloadPassword) {
      return res
        .status(400)
        .json({ message: "Registration session expired. Start again." });
    }

    const company = await Company.findOne({}).lean().exec();
    if (!company?._id || !company?.companyId) {
      return res.status(400).json({
        message:
          "No company found to attach this user. Please create at least one company first.",
      });
    }
    const fallbackCompanyId = `${company.companyId}-dev-${Date.now()
      .toString()
      .slice(-6)}`;

    await HostUser.create({
      company: company._id,
      companyId: fallbackCompanyId,
      name: payloadName,
      email: normalizedEmail,
      password: payloadPassword,
      isActive: true,
      hasCompletedWorkspaceSetup: false,
    });

    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });

    return res.status(200).json({
      message: "Registration completed successfully. You can now sign in.",
    });
  } catch (error) {
    next(error);
  }
};

// ─── Tenant Employee Registration ───

export const getTenantRegisterPrefill = async (req, res, next) => {
  try {
    const { inviteToken } = req.query;
    if (!inviteToken) return res.status(400).json({ message: "Invite token is required." });

    const employee = await TenantEmployee.findOne({ inviteToken }).exec();
    if (!employee) {
      return res.status(400).json({ message: "Invalid or expired invite link." });
    }

    const company = await TenantCompany.findById(employee.tenantCompanyId).lean().exec();
    if (!company) {
      return res.status(400).json({ message: "Tenant company not found." });
    }

    if (employee.inviteTokenExpiresAt && new Date(employee.inviteTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "Invite link has expired. Contact your manager for a new invite." });
    }

    if (employee.inviteStatus === "Registered" || employee.userId) {
      return res.status(409).json({ message: "Account is already registered. Please sign in." });
    }

    return res.status(200).json({
      fullName: employee.name || "",
      email: employee.email || "",
      role: employee.role || "Employee",
      tenantRole: employee.role === "Manager" ? "tenant-manager" : "tenant-employee",
      companyName: company.companyName || "",
      tenantCompanyId: String(company._id),
      inviteToken,
    });
  } catch (error) {
    next(error);
  }
};

export const registerTenantEmployee = async (req, res, next) => {
  try {
    const { inviteToken, password, confirmPassword } = req.body;

    if (!inviteToken) return res.status(400).json({ message: "Invite token is required." });
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    const strengthMessage = validateStrongPassword(password);
    if (strengthMessage) return res.status(400).json({ message: strengthMessage });

    const employee = await TenantEmployee.findOne({ inviteToken }).exec();
    if (!employee) {
      return res.status(400).json({ message: "Invalid or expired invite link." });
    }

    const company = await TenantCompany.findById(employee.tenantCompanyId).exec();
    if (!company) {
      return res.status(400).json({ message: "Tenant company not found." });
    }

    if (employee.inviteTokenExpiresAt && new Date(employee.inviteTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "Invite link has expired. Contact your manager for a new invite." });
    }

    if (employee.inviteStatus === "Registered" || employee.userId) {
      return res.status(409).json({ message: "Account is already registered. Please sign in." });
    }

    const email = employee.email;
    if (!email) {
      return res.status(400).json({ message: "Employee email not found in invite record." });
    }

    // Find existing user or create new one
    let user = await HostUser.findOne({ email: normalizeInviteEmail(email) }).exec();
    if (!user) {
      const fallbackCompany = await Company.findOne({}).lean().exec();
      const fallbackCompanyId = fallbackCompany
        ? `${fallbackCompany.companyId}-dev-${Date.now().toString().slice(-6)}`
        : `tenant-dev-${Date.now().toString().slice(-6)}`;

      user = await HostUser.create({
        company: fallbackCompany?._id || null,
        companyId: fallbackCompanyId,
        name: employee.name || "",
        email: normalizeInviteEmail(email),
        isActive: true,
        hasCompletedWorkspaceSetup: false,
        password,
      });
    } else {
      if (user.password) {
        return res.status(409).json({ message: "Account is already registered. Please sign in." });
      }
      user.name = employee.name || user.name;
      user.password = password;
      user.isActive = true;
      await user.save();
    }

    // Update employee record
    const now = new Date();
    employee.userId = user._id;
    employee.inviteStatus = "Registered";
    employee.inviteAcceptedAt = now;
    employee.registeredAt = now;
    employee.updatedAt = now;

    if (employee.role === "Manager") {
      employee.tenantRole = "tenant-manager";
      company.managerEmployeeId = employee.id;
      await company.save();
    } else {
      employee.tenantRole = "tenant-employee";
    }

    await employee.save();

    return res.status(200).json({
      message: "Registration completed successfully. You can now sign in.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Account already exists. Please sign in." });
    }
    next(error);
  }
};

export const sendTenantRegisterOtp = async (req, res, next) => {
  try {
    const { inviteToken, password, confirmPassword } = req.body;
    if (!inviteToken) return res.status(400).json({ message: "Invite token is required." });
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    const strengthMessage = validateStrongPassword(password);
    if (strengthMessage) return res.status(400).json({ message: strengthMessage });

    const employee = await TenantEmployee.findOne({ inviteToken }).exec();
    if (!employee) {
      return res.status(400).json({ message: "Invalid or expired invite link." });
    }
    if (employee.inviteTokenExpiresAt && new Date(employee.inviteTokenExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "Invite link has expired. Contact your manager for a new invite." });
    }
    if (employee.inviteStatus === "Registered" || employee.userId) {
      return res.status(409).json({ message: "Account is already registered. Please sign in." });
    }

    const email = employee.email;
    if (!email) {
      return res.status(400).json({ message: "Employee email not found in invite record." });
    }

    const company = await TenantCompany.findById(employee.tenantCompanyId).lean().exec();
    if (!company) {
      return res.status(400).json({ message: "Tenant company not found." });
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    await Otp.updateMany(
      { email, purpose: "registration", isUsed: false },
      { $set: { isUsed: true } },
    );
    await Otp.create({
      email,
      code: otp,
      purpose: "registration",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      payload: {
        fullName: employee.name,
        email,
        password,
        inviteToken,
        tenantCompanyId: String(company._id),
        role: employee.role,
      },
    });

    await sendMail({
      to: email,
      subject: "WONO Registration OTP",
      html: `
        <p>Hi ${employee.name},</p>
        <p>Your OTP for registration is:</p>
        <h2>${otp}</h2>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return res.status(200).json({
      message: "OTP sent successfully.",
      email,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyTenantRegisterOtpAndComplete = async (req, res, next) => {
  try {
    const { inviteToken, otp } = req.body;
    if (!inviteToken) return res.status(400).json({ message: "Invite token is required." });
    if (!otp) return res.status(400).json({ message: "OTP is required." });

    const employee = await TenantEmployee.findOne({ inviteToken }).exec();
    if (!employee) {
      return res.status(400).json({ message: "Invalid or expired invite link." });
    }
    if (employee.inviteStatus === "Registered" || employee.userId) {
      return res.status(409).json({ message: "Account is already registered. Please sign in." });
    }

    const email = employee.email;
    if (!email) {
      return res.status(400).json({ message: "Employee email not found in invite record." });
    }

    const otpRecord = await Otp.findOne({
      email,
      purpose: "registration",
      isUsed: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpRecord) {
      return res.status(400).json({ message: "Please request OTP first." });
    }
    if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });
      return res.status(429).json({ message: "OTP attempts exceeded. Request a new OTP." });
    }
    if (String(otpRecord.code) !== String(otp)) {
      await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const payload = otpRecord.payload || {};
    const payloadPassword = payload.password;
    if (!payloadPassword) {
      return res.status(400).json({ message: "Registration session expired. Start again." });
    }

    const company = await TenantCompany.findById(employee.tenantCompanyId).exec();
    if (!company) {
      return res.status(400).json({ message: "Tenant company not found." });
    }

    const fallbackCompany = await Company.findOne({}).lean().exec();
    const fallbackCompanyId = fallbackCompany
      ? `${fallbackCompany.companyId}-dev-${Date.now().toString().slice(-6)}`
      : `tenant-dev-${Date.now().toString().slice(-6)}`;

    let user = await HostUser.findOne({ email: normalizeInviteEmail(email) }).exec();
    if (!user) {
      user = await HostUser.create({
        company: fallbackCompany?._id || null,
        companyId: fallbackCompanyId,
        name: employee.name || "",
        email: normalizeInviteEmail(email),
        isActive: true,
        hasCompletedWorkspaceSetup: false,
        password: payloadPassword,
      });
    } else {
      if (user.password) {
        return res.status(409).json({ message: "Account is already registered. Please sign in." });
      }
      user.name = employee.name || user.name;
      user.password = payloadPassword;
      user.isActive = true;
      await user.save();
    }

    const now = new Date();
    employee.userId = user._id;
    employee.inviteStatus = "Registered";
    employee.inviteAcceptedAt = now;
    employee.registeredAt = now;
    employee.updatedAt = now;
    if (employee.role === "Manager") {
      employee.tenantRole = "tenant-manager";
      company.managerEmployeeId = employee.id;
      await company.save();
    } else {
      employee.tenantRole = "tenant-employee";
    }
    await employee.save();
    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });

    return res.status(200).json({
      message: "Registration completed successfully. You can now sign in.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Account already exists. Please sign in." });
    }
    next(error);
  }
};

export const getTenantProfile = async (req, res, next) => {
  try {
    const userId = req.user;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const hostUser = await HostUser.findById(userId).select("email name").lean().exec();
    if (!hostUser || !hostUser.email) {
      return res.status(401).json({ message: "User not found" });
    }

    const userEmail = hostUser.email;

    const emp = await TenantEmployee.findOne({
      email: normalizeInviteEmail(userEmail),
      status: "Active",
    }).exec();

    if (!emp) {
      return res.status(404).json({ message: "Employee record not found" });
    }

    const tenantCompany = await TenantCompany.findById(emp.tenantCompanyId)
      .select("companyName contactName email phone businessType customerDetails companyDetails")
      .lean()
      .exec();

    if (!tenantCompany) {
      return res.status(404).json({ message: "Tenant profile not found" });
    }

    const roleLabel = emp.role === "Manager" ? "Tenant Manager" : "Tenant Employee";

    res.status(200).json({
      employee: {
        name: emp.name || "",
        email: emp.email || "",
        phone: emp.phone || "",
        designation: emp.designation || "",
        role: roleLabel,
        tenantRole: emp.tenantRole || "",
        lastLoginAt: emp.lastLoginAt || null,
        registeredAt: emp.registeredAt || null,
        inviteAcceptedAt: emp.inviteAcceptedAt || null,
        invitedAt: emp.invitedAt || null,
      },
      company: {
        id: String(tenantCompany._id),
        companyName: tenantCompany.companyName || "",
        contactName: tenantCompany.contactName || "",
        email: tenantCompany.email || "",
        phone: tenantCompany.phone || "",
        businessType: tenantCompany.businessType || "",
        customerDetails: tenantCompany.customerDetails || {},
        companyDetails: tenantCompany.companyDetails || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

// Backward-compatible aliases for existing /signup URLs
export const getFounderSignupPrefill = getRegisterPrefill;
export const sendFounderSignupOtp = startRegisterWithOtp;
export const completeFounderSignup = verifyRegisterOtpAndComplete;

// Consumes a one-time "staff view" token minted by master panel (signed with
// a distinct STAFF_VIEW_TOKEN_SECRET, never the invite secret) and logs the
// browser in as the target host user for a short, read-only session — used
// when support staff click "View As" on a support ticket to see exactly what
// that user sees. Deliberately mirrors login()'s response shape but skips
// issuing/persisting a refresh token or cookie: this must never touch the
// real user's own HostUser.refreshToken, since that would silently sign them
// out of their own active session.
export const consumeStaffViewToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.STAFF_VIEW_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ message: "Staff view link is invalid or expired." });
    }

    if (decoded?.purpose !== "staff-view" || !decoded?.hostUserId) {
      return res.status(401).json({ message: "Staff view link is invalid or expired." });
    }

    const user = await HostUser.findById(decoded.hostUserId).lean().exec();
    if (!user) return res.status(404).json({ message: "Host user not found." });
    if (user?.isActive === false) {
      return res.status(403).json({ message: "This account is disabled." });
    }

    delete user.password;
    delete user.refreshToken;

    const activeMembership = await resolveActiveWorkspaceMembership(user);
    const [company, workspaceCount, accessibleWorkspaces] = await Promise.all([
      resolveCompanyForActiveWorkspace(user, activeMembership),
      WorkspaceMember.countDocuments({ user: user._id, isActive: true }),
      getAccessibleWorkspaces(user._id),
    ]);

    const accessToken = jwt.sign(
      {
        userInfo: { ...user, hasCompletedWorkspaceSetup: Boolean(user?.hasCompletedWorkspaceSetup) },
        impersonation: true,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.STAFF_VIEW_SESSION_EXPIRY || "20m" },
    );

    return res.status(200).json({
      user: buildAuthUserPayload(
        user,
        company,
        workspaceCount,
        activeMembership,
        accessibleWorkspaces,
        Boolean(user?.hasCompletedWorkspaceSetup),
      ),
      accessToken,
      impersonation: true,
    });
  } catch (error) {
    next(error);
  }
};

