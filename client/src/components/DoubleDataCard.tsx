import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import { motion } from "motion/react";

interface DoubleDataCardProps {
  title: ReactNode;
  secondTitle?: ReactNode;
  secondData: ReactNode;
  description: ReactNode;
  data: ReactNode;
  route?: string;
  onClick?: () => void;
}

const DoubleDataCard = ({
  title,
  secondTitle = "",
  secondData,
  description,
  data,
  route,
  onClick,
}: DoubleDataCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="w-full rounded-xl p-6 text-left shadow-md transition-colors duration-200">
      <div className="flex flex-col gap-0">
        <div className="mb-2 flex flex-col items-center justify-between md:flex-row">
          <div className="text-subtitle font-semibold text-black">{title}</div>
          <div>
            <div className="text-xl font-bold text-black">{data}</div>
          </div>
        </div>
        <div className="text-sm capitalize text-gray-800">{description}</div>
      </div>

      <hr className="my-2 border-gray-300" />

      <div className="flex flex-col gap-2">
        <div className="mb-4 flex flex-col items-center justify-between md:flex-row">
          <div className="text-subtitle font-semibold text-black">
            {secondTitle}
          </div>
          <div>
            <div className="text-xl font-bold text-black">{secondData}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
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

export default DoubleDataCard;