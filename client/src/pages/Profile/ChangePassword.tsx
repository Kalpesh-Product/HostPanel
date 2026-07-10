import React, { useState } from "react";
import TextField from "@mui/material/TextField";
import PrimaryButton from "../../components/PrimaryButton";
import useAuth from "../../hooks/useAuth";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { AxiosError } from "axios";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";

const ChangePassword = ({ pageTitle }: { pageTitle?: string }) => {
  const [isChanging, setIsChanging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { auth } = useAuth();
  const axios = useAxiosPrivate();
  const userId = auth?.user?._id;

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handlePasswordCheck = async () => {
    try {
      setIsVerifying(true);

      if (!formData.currentPassword) {
        setErrorMessage("Please provide your current password.");
        return;
      }

      if (!userId) {
        setErrorMessage("User not found. Please re-login.");
        return;
      }

      const res = await axios.patch(
        `/api/profile/verify-password/${userId}`,
        {
          currentPassword: formData.currentPassword,
        },
      );

      toast.success(res?.data?.message || "Password verified.");
      setPasswordVerified(true);
      setErrorMessage("");
    } catch (error) {
      const msg =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message ||
        "Failed to verify password. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      setPasswordVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setIsChanging(true);

      const { currentPassword, newPassword, confirmPassword } = formData;

      if (!currentPassword || !newPassword || !confirmPassword) {
        setErrorMessage("All fields are required.");
        return;
      }

      if (!passwordVerified) {
        setErrorMessage("Please verify your current password first.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage("New password and confirm password do not match.");
        return;
      }

      if (newPassword.length < 8) {
        setErrorMessage("New password must be at least 8 characters long.");
        return;
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])/.test(newPassword)) {
        setErrorMessage(
          "New password must include both uppercase and lowercase letters.",
        );
        return;
      }

      if (!/(?=.*\d)(?=.*[^A-Za-z0-9])/.test(newPassword)) {
        setErrorMessage(
          "New password must include at least one number and one special character.",
        );
        return;
      }

      if (!userId) {
        setErrorMessage("User not found. Please re-login.");
        return;
      }

      const res = await axios.patch(
        `/api/profile/change-password/${userId}`,
        {
          currentPassword,
          newPassword,
          confirmPassword,
        },
      );

      toast.success(res?.data?.message || "Password changed successfully.");
      setSuccessMessage("Password changed successfully!");

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordVerified(false);
      setErrorMessage("");
    } catch (error) {
      const msg =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message ||
        "Failed to change password. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="border-default border-borderGray rounded-xl bg-white p-4">
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">Change Password</span>
      </div>

      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <KeyRound size={20} />
          </div>
          <div>
            {/* <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-blue-600">Security</p> */}
            <h2 className="text-lg font-pmedium text-slate-900">Update Password</h2>
          </div>
        </div>

        {/* Current Password Field */}
        <div className="mb-5 w-full flex justify-between md:justify-start items-center gap-2 md:gap-4">
          <TextField
            size="small"
            label="Current Password"
            type="password"
            disabled={passwordVerified}
            sx={{
              width: {
                xs: "100%",
                sm: "100%",
                md: "49.3%",
              },
            }}
            value={formData.currentPassword}
            onChange={(e) => handleChange("currentPassword", e.target.value)}
            required
            fullWidth
            InputProps={{
              sx: {
                borderRadius: "1rem",
                backgroundColor: passwordVerified ? "#f0fdf4" : "#f8fafc",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: passwordVerified ? "#bbf7d0" : "#e2e8f0",
                },
              },
            }}
          />
          {!passwordVerified && (
            <PrimaryButton
              title="Verify"
              type="button"
              disabled={!formData.currentPassword || isVerifying}
              loading={isVerifying}
              handleSubmit={handlePasswordCheck}
            />
          )}
          {passwordVerified && (
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-green-50 border border-green-200 px-4 py-2 text-xs font-semibold text-green-700">
              <ShieldCheck size={14} /> Verified
            </span>
          )}
        </div>

        {/* New Password and Confirm Password Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <TextField
            size="small"
            label="New Password"
            type="password"
            disabled={!passwordVerified}
            value={formData.newPassword}
            onChange={(e) => handleChange("newPassword", e.target.value)}
            fullWidth
            required
            InputProps={{
              sx: {
                borderRadius: "1rem",
                backgroundColor: "#f8fafc",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e2e8f0",
                },
              },
            }}
          />
          <TextField
            size="small"
            label="Confirm Password"
            type="password"
            disabled={!passwordVerified}
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            fullWidth
            required
            InputProps={{
              sx: {
                borderRadius: "1rem",
                backgroundColor: "#f8fafc",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e2e8f0",
                },
              },
            }}
          />
        </div>

        {/* Error and Success Messages */}
        {errorMessage && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        {/* Password Requirements */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 mb-5">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Password Requirements</span>
          </div>
          <ul className="text-xs text-slate-500 list-disc pl-5 space-y-1">
            <li>Must be at least 8 characters long.</li>
            <li>Should include both uppercase and lowercase letters.</li>
            <li>Must contain at least one number or special character.</li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center items-center">
          <PrimaryButton
            title="Submit"
            handleSubmit={handlePasswordChange}
            disabled={!passwordVerified || isChanging}
            loading={isChanging}
          />
        </div>
      </section>
    </div>
  );
};

export default ChangePassword;
