import type { MouseEventHandler, ReactNode } from "react";
import { CircularProgress } from "@mui/material";
import { motion } from "motion/react";
import useAuth from "../hooks/useAuth";

interface PrimaryButtonProps {
  title: ReactNode;
  handleSubmit?: MouseEventHandler<HTMLButtonElement> | (() => void);
  onClick?: MouseEventHandler<HTMLButtonElement> | (() => void);
  type?: "button" | "submit" | "reset";
  fontSize?: string;
  externalStyles?: string;
  disabled?: boolean;
  padding?: string;
  className?: string;
  isPending?: boolean;
  isLoading?: boolean;
  loading?: boolean;
}

const PrimaryButton = ({
  title,
  handleSubmit,
  onClick,
  type,
  fontSize,
  externalStyles,
  disabled,
  padding,
  className,
  isPending,
  isLoading,
  loading,
}: PrimaryButtonProps) => {
  const { auth } = useAuth();
  const isBusy = Boolean(isPending || isLoading || loading);
  const isReadOnlySession = Boolean(auth?.impersonation);
  const isDisabled = disabled || isBusy || isReadOnlySession;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      disabled={isDisabled}
      type={isReadOnlySession && type === "submit" ? "button" : type ?? "button"}
      title={isReadOnlySession ? "Read-only staff view - changes are disabled" : undefined}
      className={`btn-pill flex items-center justify-center gap-2 ${
        isDisabled ? "cursor-not-allowed bg-slate-300" : "bg-[#2563EB] hover:bg-blue-700"
      } motion-preset-slide-up-sm text-white transition ${
        fontSize ?? "text-sm leading-5"
      } ${externalStyles ?? ""} ${padding ? padding : "px-8 py-2"} ${className ?? ""}`}
      onClick={isReadOnlySession ? undefined : onClick ?? handleSubmit}
    >
      {isBusy && <CircularProgress size={16} sx={{ color: "#1E3D73" }} />}
      <span className="whitespace-nowrap">{title}</span>
    </motion.button>
  );
};

export default PrimaryButton;
