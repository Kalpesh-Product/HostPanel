import { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { motion } from "motion/react";
import { AlertTriangle, Eye, EyeOff, Trash2 } from "lucide-react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useLogout from "../../hooks/useLogout";

const AccountDeletionDangerZone = () => {
  const { auth } = useAuth();
  const axios = useAxiosPrivate();
  const logout = useLogout();
  const isReadOnlySession = Boolean(auth?.impersonation);
  const currentRole = String(
    (auth?.user as any)?.workspaceMembership?.role || (auth?.user as any)?.role || "",
  ).toLowerCase();
  const isFounder = currentRole === "founder";

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canConfirmDelete =
    Boolean(deletePassword) && (!isFounder || deleteConfirmText.trim().toUpperCase() === "DELETE");

  const resetConfirmation = () => {
    setShowDeleteConfirm(false);
    setDeletePassword("");
    setShowDeletePassword(false);
    setDeleteConfirmText("");
    setDeleteError("");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }
    if (isFounder && deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError("");
      const res = await axios.post("/api/profile/delete-account", {
        password: deletePassword,
        ...(isFounder ? { confirmText: deleteConfirmText.trim() } : {}),
      });
      toast.success(res?.data?.message || "Your account has been deleted.");
      await logout();
    } catch (error) {
      const message =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message ||
        "Failed to delete account. Please try again.";
      setDeleteError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const dangerButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-8 py-2 text-sm leading-5 font-pmedium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300";

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
      <div className="flex flex-col items-start gap-5 lg:flex-row lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-pmedium text-slate-900">Danger Zone</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Delete your account. Your record is kept, but you will no longer be able to log in.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            disabled={isReadOnlySession}
            title={isReadOnlySession ? "Read-only staff view — changes are disabled" : undefined}
            onClick={() => setShowDeleteConfirm(true)}
            className={dangerButtonClass}
          >
            <Trash2 size={16} /> Delete My Account
          </motion.button>
        ) : null}
      </div>

      {showDeleteConfirm ? (
        <div className="mt-5 space-y-4 border-t border-rose-100 pt-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <p className="mb-2 text-sm font-pmedium text-rose-700">
              Are you sure you want to delete your account?
            </p>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-600">
              <li>You will be logged out immediately and won't be able to log in again.</li>
              <li>Your record is kept for company history — this is not permanent erasure.</li>
              {isFounder ? (
                <>
                  <li className="font-pmedium text-rose-700">
                    You are the Founder/Owner of this company — deleting your account will also
                    delete every team member's account in your workspace. No one on your team
                    will be able to log in afterwards.
                  </li>
                  <li>This cannot be undone by you or your team — only reversible by support.</li>
                </>
              ) : (
                <li>This can only be reversed by your company's founder/admin.</li>
              )}
            </ul>
          </div>

          <div className="grid gap-4 md:max-w-3xl md:grid-cols-2">
            <TextField
              size="small"
              label="Current Password"
              type={showDeletePassword ? "text" : "password"}
              value={deletePassword}
              onChange={(event) => {
                setDeletePassword(event.target.value);
                setDeleteError("");
              }}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => setShowDeletePassword((current) => !current)}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={showDeletePassword ? "Hide password" : "Show password"}
                      title={showDeletePassword ? "Hide password" : "Show password"}
                    >
                      {showDeletePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: "1rem", backgroundColor: "#fff" },
              }}
            />

            {isFounder ? (
              <TextField
                size="small"
                label='Type "DELETE" to confirm'
                value={deleteConfirmText}
                onChange={(event) => {
                  setDeleteConfirmText(event.target.value);
                  setDeleteError("");
                }}
                fullWidth
                InputProps={{ sx: { borderRadius: "1rem", backgroundColor: "#fff" } }}
              />
            ) : null}
          </div>

          {deleteError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-pmedium text-rose-700">
              {deleteError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetConfirmation}
              className="rounded-xl border border-slate-200 bg-white px-8 py-2 text-sm leading-5 font-pmedium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              disabled={isDeleting || !canConfirmDelete || isReadOnlySession}
              onClick={handleDeleteAccount}
              className={dangerButtonClass}
            >
              <Trash2 size={16} />
              {isDeleting ? "Deleting..." : isFounder ? "Delete My Account & Team" : "Confirm Delete"}
            </motion.button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default AccountDeletionDangerZone;
