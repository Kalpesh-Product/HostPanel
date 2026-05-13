import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { motion } from "motion/react";

interface DataCardProps {
  title: ReactNode;
  description: ReactNode;
  data: ReactNode;
  route?: string;
  onClick?: () => void;
}

const DataCard = ({ title, description, data, route, onClick }: DataCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-full rounded-xl p-6 text-left shadow-md transition-colors duration-200">
      <div className="mb-4 flex flex-col items-center justify-between md:flex-row">
        <div className="text-title font-semibold text-black">{title}</div>
        <div>
          <div className="text-2xl font-bold text-black">{data}</div>
        </div>
      </div>

      <hr className="mb-4 border-gray-300" />

      <div className="flex items-center justify-between">
        <div className="text-sm capitalize text-gray-800">{description}</div>

        {typeof route === "string" && route.trim() !== "" && route !== "#" && (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.8 }}
            className="group cursor-pointer rounded-full p-2 transition-colors duration-200 hover:bg-primary"
            onClick={() => {
              if (onClick) {
                onClick();
              }
              navigate(route);
            }}
          >
            <FaArrowRight
              size={12}
              className="text-black transition-colors group-hover:text-white"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DataCard;