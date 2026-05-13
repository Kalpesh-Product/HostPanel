import type { MouseEventHandler, ReactNode } from "react";
import { CircularProgress } from "@mui/material";
import { motion } from "motion/react";

interface SecondaryButtonProps {
  title: ReactNode;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  fontSize?: string;
  externalStyles?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

const SecondaryButton = ({
  title,
  handleSubmit,
  type,
  fontSize,
  externalStyles,
  disabled,
  isLoading,
}: SecondaryButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      disabled={disabled || isLoading}
      type={type ?? "button"}
      className={`flex items-center justify-center gap-2 px-8 py-2 ${
        disabled || isLoading ? "bg-gray-400" : "bg-borderGray"
      } motion-preset-slide-up-sm rounded-md text-black ${
        fontSize ? fontSize : "text-content leading-5"
      } ${externalStyles ?? ""}`}
      onClick={handleSubmit}
    >
      {isLoading && <CircularProgress size={16} sx={{ color: "#1E3D73" }} />}
      <span>{isLoading ? `${String(title)}ing` : title}</span>
    </motion.button>
  );
};

export default SecondaryButton;
