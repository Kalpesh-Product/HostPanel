import type { ReactNode, MouseEvent } from "react";
import { useState } from "react";
import { Popover, IconButton, CircularProgress } from "@mui/material";
import { MdMoreHoriz } from "react-icons/md";

interface MenuItem {
  label: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

interface ThreeDotMenuProps {
  rowId?: string | number;
  menuItems: MenuItem[];
  isLoading?: boolean;
  disabled?: boolean;
}

const ThreeDotMenu = ({ menuItems, isLoading, disabled = false }: ThreeDotMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <IconButton onClick={handleOpen} disabled={disabled}>
        <MdMoreHoriz />
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <div className="w-full rounded-xl bg-white motion-preset-slide-down-sm">
          {menuItems.map(({ label, onClick, disabled: itemDisabled }, index) => (
            <div
              key={index}
              onClick={() => {
                if (!itemDisabled) {
                  onClick?.();
                  handleClose();
                }
              }}
              className={`border-borderGray cursor-pointer border-b-[1px] p-4 py-2 text-content hover:bg-gray-200 ${
                label === "Cancel" ? "bg-red-100 text-red-600" : "bg-white text-primary"
              } ${itemDisabled ? "cursor-not-allowed text-gray-400" : ""}`}
            >
              {isLoading ? <CircularProgress size={16} /> : label}
            </div>
          ))}
        </div>
      </Popover>
    </div>
  );
};

export default ThreeDotMenu;