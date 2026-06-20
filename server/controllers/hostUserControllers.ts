// @ts-nocheck
import HostUser from "../models/HostUser.js";
import bcrypt from "bcryptjs";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import HostCompany from "../models/Company.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import { uploadFileToS3, deleteFileFromS3ByUrl } from "../config/s3config.js";
import { resolveActiveWorkspaceMembership } from "../utils/resolveMembership.js";

const derivePrimaryVertical = (businessTypes = []) => {
  const normalized = businessTypes.map((item) => String(item || "").trim().toLowerCase());
  if (normalized.includes("co-working")) return "co-working";
  if (normalized.includes("co-living")) return "co-living";
  if (normalized.includes("workation")) return "workation";
  if (normalized.includes("hostels") || normalized.includes("hostel")) return "hostel";
  if (normalized.includes("meeting rooms") || normalized.includes("meeting-rooms")) return "meeting-rooms";
  if (normalized.includes("cafe")) return "cafe";
  return "";
};

const formatIndustryFromBusinessTypes = (businessTypes = []) =>
  businessTypes
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");

export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const {
      name,
      designation,
      phone,
      linkedInProfile,
      languages,
      address,
      profileImage,
      isActive,
    } = req.body;

    const updatedPOC = await HostUser.findByIdAndUpdate(
      userId,
      {
        ...(name && { name }),
        ...(designation && { designation }),
        ...(phone && { phone }),
        ...(linkedInProfile && { linkedInProfile }),
        ...(languages && { languages }),
        ...(address && { address }),
        ...(profileImage && { profileImage }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
      { new: true, runValidators: true },
    );

    if (!updatedPOC) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found." });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedPOC,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update profile.",
    });
  }
};

export const verifyPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required.",
      });
    }

    const user = await HostUser.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password verified.",
    });
  } catch (error) {
    console.error("Password Verification Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to verify password.",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current, new, and confirm password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }
    if (newPassword.length > 72) {
      return res
        .status(400)
        .json({ message: "Password cannot exceed 72 characters" });
    }

    // must contain at least one lowercase and one uppercase letter
    const hasUpperAndLower = /(?=.*[a-z])(?=.*[A-Z])/;

    // must contain at least one number AND one special character
    const hasNumberAndSpecial = /(?=.*\d)(?=.*\W)/;

    if (!hasUpperAndLower.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must include both uppercase and lowercase letters.",
      });
    }

    if (!hasNumberAndSpecial.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must include at least one number and one special character.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    const user = await HostUser.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword)
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });

    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to change password.",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user;
    const user = await HostUser.findById(userId).lean().exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    let workspace = null;
    if (user.primaryWorkspace) {
      workspace = await Workspace.findById(user.primaryWorkspace).lean().exec();
    }

    if (!workspace) {
      workspace = await Workspace.findOne({ owner: user._id, isActive: true })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }

    if (!workspace) {
      const membershipWorkspace = await WorkspaceMember.findOne({
        user: user._id,
        isActive: true,
      })
        .sort({ isPrimary: -1, createdAt: 1 })
        .populate("workspace")
        .lean()
        .exec();
      workspace = membershipWorkspace?.workspace || null;
    }

    let workspaceMembership = null;
    if (workspace?._id) {
      workspaceMembership = await WorkspaceMember.findOne({
        user: user._id,
        isActive: true,
        workspace: workspace._id,
      })
        .sort({ isPrimary: -1, createdAt: 1 })
        .populate("role")
        .populate("departments")
        .lean()
        .exec();
    }

    if (!workspaceMembership) {
      workspaceMembership = await resolveActiveWorkspaceMembership(user);
    }

    // Fetch linked EmployeeProfile for jobTitle
    let employeeProfile = null;
    if (workspace?._id) {
      employeeProfile = await EmployeeProfile.findOne({
        $or: [
          { linkedUserId: user._id },
          { linkedWorkspaceMemberId: workspaceMembership?._id },
        ],
        workspaceId: workspace._id,
        isActive: true,
      })
        .select("jobTitle fullName")
        .lean()
        .exec();
    }

    const workspaceBusinessName = String(workspace?.businessName || "")
      .trim()
      .toLowerCase();

    const linkedCompanyId =
      typeof user?.company === "string"
        ? user.company
        : user?.company?._id || user?.company?.id || null;

    let company =
      (user?.companyId
        ? await HostCompany.findOne({ companyId: user.companyId }).lean().exec()
        : null) ||
      (linkedCompanyId
        ? await HostCompany.findById(linkedCompanyId).lean().exec()
        : null);

    if (workspaceBusinessName) {
      const companyName = String(company?.companyName || "").trim().toLowerCase();
      if (!company || (companyName && companyName !== workspaceBusinessName)) {
        const workspaceMatchedCompany = await HostCompany.findOne({
          companyName: new RegExp(`^${workspaceBusinessName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        })
          .lean()
          .exec();
        if (workspaceMatchedCompany) {
          company = workspaceMatchedCompany;
          await HostUser.findByIdAndUpdate(userId, {
            company: workspaceMatchedCompany._id,
            companyId: workspaceMatchedCompany.companyId,
          }).exec();
        }
      }
    }

    const resolvedCompanyName = String(company?.companyName || "").trim().toLowerCase();
    const shouldSuppressLogoForMismatch = Boolean(
      workspaceBusinessName && resolvedCompanyName && resolvedCompanyName !== workspaceBusinessName,
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          logo: shouldSuppressLogoForMismatch ? null : company?.logo || null,
          companyName: company?.companyName || user?.companyName || "",
          workspaceMembership: workspaceMembership
            ? {
              role: workspaceMembership.role?.name || (typeof workspaceMembership.role === "string" ? workspaceMembership.role : "member"),
              isPrimary: workspaceMembership.isPrimary,
              isActive: workspaceMembership.isActive,
              departments: Array.isArray(workspaceMembership.departments)
                ? workspaceMembership.departments.map((d: any) => ({
                  id: d._id,
                  name: d.name,
                }))
                : [],
              jobTitle: employeeProfile?.jobTitle || null,
            }
            : user?.workspaceMembership || null,
        },
        workspace: workspace || null,
      },
    });
  } catch (error) {
    console.error("Get My Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load profile.",
    });
  }
};

export const updateCompanyLogo = async (req, res) => {
  try {
    const userId = req.user;
    const user = await HostUser.findById(userId).lean().exec();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Logo file is required.",
      });
    }

    let workspace = null;
    if (user.primaryWorkspace) {
      workspace = await Workspace.findById(user.primaryWorkspace).lean().exec();
    }
    if (!workspace) {
      workspace = await Workspace.findOne({ owner: user._id, isActive: true })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }
    if (!workspace) {
      const membershipWorkspace = await WorkspaceMember.findOne({
        user: user._id,
        isActive: true,
      })
        .sort({ isPrimary: -1, createdAt: 1 })
        .populate("workspace")
        .lean()
        .exec();
      workspace = membershipWorkspace?.workspace || null;
    }

    const workspaceBusinessName = String(workspace?.businessName || "")
      .trim()
      .toLowerCase();

    const linkedCompanyId =
      typeof user?.company === "string"
        ? user.company
        : user?.company?._id || user?.company?.id || null;

    let company =
      (user?.companyId
        ? await HostCompany.findOne({ companyId: user.companyId }).exec()
        : null) ||
      (linkedCompanyId ? await HostCompany.findById(linkedCompanyId).exec() : null);

    if (workspaceBusinessName) {
      const companyName = String(company?.companyName || "").trim().toLowerCase();
      if (!company || (companyName && companyName !== workspaceBusinessName)) {
        const workspaceMatchedCompany = await HostCompany.findOne({
          companyName: new RegExp(`^${workspaceBusinessName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        }).exec();

        if (workspaceMatchedCompany) {
          company = workspaceMatchedCompany;
          await HostUser.findByIdAndUpdate(userId, {
            company: workspaceMatchedCompany._id,
            companyId: workspaceMatchedCompany.companyId,
          }).exec();
        } else if (workspace?.businessName) {
          const requestedCompanyId = String(user?.companyId || "").trim();
          const existingCompanyWithSameId = requestedCompanyId
            ? await HostCompany.findOne({ companyId: requestedCompanyId }).select("_id").lean().exec()
            : null;
          const fallbackCompanyId =
            requestedCompanyId && !existingCompanyWithSameId
              ? requestedCompanyId
              : `${requestedCompanyId || "CMP"}-${Date.now()}`;
          const createdCompany = await HostCompany.create({
            companyId: fallbackCompanyId,
            companyName: String(workspace.businessName || "").trim(),
            companyCity: String(workspace.city || "").trim(),
            companyState: String(workspace.state || "").trim(),
            companyCountry: String(workspace.country || "").trim(),
            businessTypes: Array.isArray(workspace.businessTypes) ? workspace.businessTypes : [],
            industry: formatIndustryFromBusinessTypes(
              Array.isArray(workspace.businessTypes) ? workspace.businessTypes : [],
            ),
            verticalType: derivePrimaryVertical(
              Array.isArray(workspace.businessTypes) ? workspace.businessTypes : [],
            ),
            vertical: derivePrimaryVertical(
              Array.isArray(workspace.businessTypes) ? workspace.businessTypes : [],
            ),
            isRegistered: true,
          });
          company = createdCompany;
          await HostUser.findByIdAndUpdate(userId, {
            company: createdCompany._id,
            companyId: createdCompany.companyId,
          }).exec();
        }
      }
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    const safeFileName = String(req.file.originalname || "logo")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const route = `company/logo/${company.companyId}-${Date.now()}-${safeFileName}`;
    const uploadedLogo = await uploadFileToS3(route, req.file);

    const previousLogoUrl = company?.logo?.url;
    company.logo = uploadedLogo;
    await company.save();

    if (previousLogoUrl) {
      try {
        await deleteFileFromS3ByUrl(previousLogoUrl);
      } catch {
        // keep request successful even if old cleanup fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Company logo updated successfully.",
      data: {
        logo: company.logo,
      },
    });
  } catch (error) {
    console.error("Update Company Logo Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update company logo.",
    });
  }
};