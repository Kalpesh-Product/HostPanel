// @ts-nocheck
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";

interface CardProps {
  title: ReactNode;
  icon?: ReactNode;
  bgcolor?: string;
  fontColor?: string;
  fontFamily?: string;
  titleColor?: string;
  fullHeight?: boolean;
  route: string;
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
      onClick={() => navigate(route)}
      className={`group relative flex w-full flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-md transition-all hover:border-[0.2px] hover:border-primary hover:shadow-xl ${
        fullHeight ? "h-60" : ""
      }`}
      style={{
        backgroundColor: bgcolor || "#ffffff",
        color: fontColor || "#111111",
        fontFamily: fontFamily || "'Poppins', sans-serif",
      }}
    >
      <motion.span
        className="absolute right-4 top-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        whileHover={{ x: 4 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <FaArrowRight size={14} />
      </motion.span>

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
