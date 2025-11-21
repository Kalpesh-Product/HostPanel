import HostUser from "../models/HostUser.js";
import bcrypt from "bcryptjs";

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
      { new: true, runValidators: true }
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

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
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

    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to change password.",
    });
  }
};
