import type { ReactNode } from "react";
import { Drawer, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface MuiAsideProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
}

const MuiAside = ({ open, onClose, children, title }: MuiAsideProps) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        className: "bg-gray-100",
        sx: { width: { xs: "90vw", sm: "500px", md: "600px" } },
      }}
    >
      <div className="flex items-center justify-between border-b-default border-borderGray p-3">
        <IconButton
          onClick={onClose}
          sx={{
            backgroundColor: "#e5e7eb",
            color: "#374151",
            "&:hover": { backgroundColor: "#d1d5db", color: "#111827" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <div className="font-pmedium text-subtitle">{title}</div>
        <div></div>
      </div>

      <div className="flex h-screen flex-col items-center justify-start gap-4">
        <div className="w-full p-4">{children}</div>
      </div>
    </Drawer>
  );
};

export default MuiAside;