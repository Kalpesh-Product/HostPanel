// @ts-nocheck
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import { Lock } from "lucide-react";

interface CardProps {
  title: ReactNode;
  icon?: ReactNode;
  bgcolor?: string;
  fontColor?: string;
  fontFamily?: string;
  titleColor?: string;
  fullHeight?: boolean;
  route: string;
  locked?: boolean;
  lockReason?: string;
  onClick?: () => void;
  interactive?: boolean;
  state?: Record<string, unknown>;
}

const Card = ({
  title,
  icon,
  bgcolor,
  fontColor,
  fontFamily,
  titleColor,
  fullHeight,
  route,
  locked = false,
  lockReason = "You don't have access to this item.",
  onClick,
  interactive = true,
  state,
}: CardProps) => {
  const navigate = useNavigate();

  const cardVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.03,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      onClick={() => {
        if (locked) {
          onClick?.();
          return;
        }
        if (!interactive) {
          onClick?.();
          return;
        }
        if (onClick) {
          onClick();
          return;
        }
        navigate(route, state ? { state } : undefined);
      }}
      title={locked ? lockReason : undefined}
      className={`group relative flex w-full flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md transition-all hover:border-[0.2px] hover:border-primary hover:shadow-xl ${
        fullHeight ? "h-60" : ""
      } ${locked ? "cursor-not-allowed opacity-75" : interactive ? "cursor-pointer" : "cursor-default"}`}
      style={{
        backgroundColor: bgcolor || "#ffffff",
        color: fontColor || "#111111",
        fontFamily: fontFamily || "'Poppins', sans-serif",
        pointerEvents: locked ? "auto" : "auto",
      }}
    >
      {locked ? (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
          <Lock size={12} />
          Locked
        </span>
      ) : interactive ? (
        <motion.span
          className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          whileHover={{ x: 4 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <FaArrowRight size={14} />
        </motion.span>
      ) : null}

      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      )}

      <h3
        className={`${!icon ? "text-title" : "text-base"} whitespace-nowrap font-bold`}
        style={{ color: titleColor || "inherit" }}
      >
        {title}
      </h3>
    </motion.div>
  );
};

export default Card;
