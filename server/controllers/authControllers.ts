// @ts-nocheck
import jwt from "jsonwebtoken";
import HostUser from "../models/HostUser.js";
import bcrypt from "bcryptjs";
import Company from "../models/Company.js";
import Otp from "../models/Otp.js";
import { sendMail } from "../config/mailer.js";
import crypto from "crypto";

const getInviteSecret = () =>
  process.env.REGISTER_INVITE_SECRET || process.env.ACCESS_TOKEN_SECRET;

const decodeSignupInviteToken = (token) => {
  const secret = getInviteSecret();
  if (!secret) throw new Error("Invite secret not configured");
  return jwt.verify(token, secret);
};

const extractInviteIdentity = (decoded: any) => {
  const inviteEmail = decoded?.email || decoded?.userInfo?.email || "";
  const firstName = decoded?.firstName || decoded?.userInfo?.firstName || "";
  const lastName = decoded?.lastName || decoded?.userInfo?.lastName || "";
  const combinedName = `${firstName} ${lastName}`.trim();
  const inviteName =
    decoded?.fullName ||
    decoded?.name ||
    decoded?.userInfo?.name ||
    decoded?.userInfo?.fullName ||
    combinedName ||
    "";

  return { inviteEmail, inviteName };
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

    const company = await Company.findOne({ companyId: user?.companyId })
      .lean()
      .exec();
    if (!user) return res.status(404).json({ message: "No user found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "Invalid password" });

    delete user.password;
    delete user.refreshToken;

    const accessToken = jwt.sign(
      { userInfo: { ...user } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userInfo: { ...user } },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "15d" }
    );

    await HostUser.findOneAndUpdate({ email }, { refreshToken }).lean().exec();

    res.cookie("clientCookie", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      user: {
        ...user,
        companyName: company?.companyName,
        logo: company?.logo,
        isWebsiteTemplate: company?.isWebsiteTemplate,
      },
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.clientCookie) {
      return res.sendStatus(201);
    }

    const refreshToken = cookies?.clientCookie;
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

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword)
      return res
        .status(400)
        .json({ message: "Password and Confirm Password are required" });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }
    if (password.length > 72) {
      return res
        .status(400)
        .json({ message: "Password cannot exceed 72 characters" });
    }

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
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword)
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });

    // ✅ Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // ✅ Send confirmation email
    const successMessage = `
      <p>Hi ${user.firstName || user.name || ""},</p>
      <p>Your password has been successfully reset.</p>
      <p>You can now <a href="${
        process.env.FRONTEND_PROD_LINK
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
    const { inviteEmail, inviteName } = extractInviteIdentity(decoded);

    if (!inviteEmail || !inviteName) {
      return res.status(400).json({ message: "Invalid invite token payload." });
    }

    const user = await HostUser.findOne({ email: inviteEmail }).lean().exec();
    if (!user) return res.status(404).json({ message: "Invite user not found." });

    if (user.password) {
      return res.status(409).json({
        message: "Account is already registered. Please sign in.",
      });
    }

    res.status(200).json({
      fullName: inviteName,
      email: inviteEmail,
    });
  } catch (error) {
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
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long." });
    }
    if (password.length > 72) {
      return res
        .status(400)
        .json({ message: "Password cannot exceed 72 characters." });
    }

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

    const user = await HostUser.findOne({ email: inviteEmail }).lean().exec();
    if (!user) return res.status(404).json({ message: "Invite user not found." });

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
      email: inviteEmail,
    });
  } catch (error) {
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

    const user = await HostUser.findOne({ email: inviteEmail }).select("+password");
    if (!user) return res.status(404).json({ message: "Invite user not found." });

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
    await user.save();
    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });

    return res.status(200).json({
      message: "Registration completed successfully. You can now sign in.",
    });
  } catch (error) {
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
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long." });
    }
    if (password.length > 72) {
      return res
        .status(400)
        .json({ message: "Password cannot exceed 72 characters." });
    }

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
    });

    await Otp.updateOne({ _id: otpRecord._id }, { $set: { isUsed: true } });

    return res.status(200).json({
      message: "Registration completed successfully. You can now sign in.",
    });
  } catch (error) {
    next(error);
  }
};

// Backward-compatible aliases for existing /signup URLs
export const getFounderSignupPrefill = getRegisterPrefill;
export const sendFounderSignupOtp = startRegisterWithOtp;
export const completeFounderSignup = verifyRegisterOtpAndComplete;

