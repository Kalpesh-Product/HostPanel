import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface TicketCardProps {
  title: ReactNode;
  icon?: ReactNode;
  data?: ReactNode;
  bgcolor?: string;
  fontColor?: string;
  height?: string | number;
  fontFamily?: string;
  titleColor?: string;
  route: string;
}

const TicketCard = ({
  title,
  icon,
  data,
  bgcolor,
  fontColor,
  height,
  fontFamily,
  titleColor,
  route,
}: TicketCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(route)}
      className="flex cursor-pointer flex-col items-center justify-center rounded-md p-4 text-center shadow-md"
      style={{
        backgroundColor: bgcolor || "#ffffff",
        color: fontColor || "black",
        height: height || "",
      }}
    >
      <div
        style={{ fontFamily: fontFamily || "" }}
        className="mb-4 flex items-center justify-center text-4xl"
      >
        {icon || data}
      </div>
      <span style={{ color: titleColor || "black" }} className="text-center">
        {title}
      </span>
    </div>
  );
};

export default TicketCard;