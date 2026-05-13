import type { MouseEventHandler, ReactNode } from "react";
import { CircularProgress } from "@mui/material";
import { motion } from "motion/react";

interface PrimaryButtonProps {
  title: ReactNode;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  fontSize?: string;
  externalStyles?: string;
  disabled?: boolean;
  padding?: string;
  className?: string;
  isPending?: boolean;
}

const PrimaryButton = ({
  title,
  handleSubmit,
  type,
  fontSize,
  externalStyles,
  disabled,
  padding,
  className,
  isPending,
}: PrimaryButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      disabled={disabled || isPending}
      type={type}
      className={` flex items-center justify-center gap-2 ${
        disabled || isPending ? "cursor-not-allowed bg-gray-400" : "bg-primary"
      } motion-preset-slide-up-sm rounded-md text-white ${
        fontSize ? fontSize : "text-content leading-5"
      } ${externalStyles ?? ""} ${padding ? padding : "px-8 py-2"} ${className ?? ""}`}
      onClick={handleSubmit}
    >
      {isPending && <CircularProgress size={16} sx={{ color: "#1E3D73" }} />}
      <span className="whitespace-nowrap">{isPending ? `${title}` : title}</span>
    </motion.button>
  );
};

export default PrimaryButton;