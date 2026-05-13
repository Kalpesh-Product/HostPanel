import type { ReactNode } from "react";
import ThreeDotMenu from "./ThreeDotMenu";
import { MdFolderShared } from "react-icons/md";
import { useNavigate } from "react-router-dom";

interface GoogleFolderCardProps {
  title: ReactNode;
  routeId: string;
  files?: unknown[];
}

const GoogleFolderCard = ({ title, routeId, files }: GoogleFolderCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-xl bg-borderGray p-2 px-4 text-black transition-all hover:bg-gray-200"
      onClick={() =>
        navigate(`${routeId}`, {
          state: { title, files },
          replace: true,
        })
      }
    >
      <div className="flex items-end gap-2">
        <span className="text-title">
          <MdFolderShared />
        </span>
        <span className="font-pmedium text-content">{title}</span>
      </div>
      <ThreeDotMenu menuItems={[{ label: "Rename" }]} />
    </div>
  );
};

export default GoogleFolderCard;