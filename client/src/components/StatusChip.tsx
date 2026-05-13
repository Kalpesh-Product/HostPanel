import { Chip } from "@mui/material";

interface ChipColorStyle {
  backgroundColor: string;
  color: string;
}

interface StatusChipProps {
  status?: string;
  label?: string;
}

const statusColorMap: Record<string, ChipColorStyle> = {
  Pending: { backgroundColor: "#FFECC5", color: "#CC8400" },
  "In Progress": { backgroundColor: "#FFECC5", color: "#CC8400" },
  resolved: { backgroundColor: "#90EE90", color: "#006400" },
  Active: { backgroundColor: "#90EE90", color: "#006400" },
  Inactive: { backgroundColor: "#FF9F93", color: "#B71C1C" },
  Open: { backgroundColor: "#FF9F93", color: "#B71C1C" },
  completed: { backgroundColor: "#D3D3D3", color: "#696969" },
  Approved: { backgroundColor: "#90EE90", color: "#006400" },
  Paid: { backgroundColor: "#90EE90", color: "#006400" },
  Unpaid: { backgroundColor: "#FDECEA", color: "#B71C1C" },
  Closed: { backgroundColor: "#90EE90", color: "#006400" },
  Rejected: { backgroundColor: "#FFCCCC", color: "#B22222" },
  Revoked: { backgroundColor: "#EADCFD", color: "#6B3FA0" },
  Upcoming: { backgroundColor: "#E3F2FD", color: "#1565C0" },
  Assigned: { backgroundColor: "#90EE90", color: "#006400" },
  Ongoing: { backgroundColor: "#FFF3E0", color: "#E65100" },
  Completed: { backgroundColor: "#E8F5E9", color: "#1B5E20" },
  Cancelled: { backgroundColor: "#FFEBEE", color: "#B71C1C" },
  Available: { backgroundColor: "#E3F2FD", color: "#0D47A1" },
  Occupied: { backgroundColor: "#ECEFF1", color: "#37474F" },
  Cleaning: { backgroundColor: "#E0F2F1", color: "#00796B" },
};

const StatusChip = ({ status, label }: StatusChipProps) => {
  const chipStatus = status ?? label ?? "";
  const { backgroundColor, color } = statusColorMap[chipStatus] || {
    backgroundColor: "gray",
    color: "white",
  };

  return (
    <Chip
      label={chipStatus}
      style={{
        backgroundColor,
        color,
      }}
    />
  );
};

export default StatusChip;