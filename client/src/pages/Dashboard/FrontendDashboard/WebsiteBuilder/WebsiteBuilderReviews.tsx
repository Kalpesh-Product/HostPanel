import { useEffect, useMemo, useState } from "react";
import {
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { FaUserCircle } from "react-icons/fa";
import PageFrame from "../../../../components/Pages/PageFrame";
import AgTable from "../../../../components/AgTable";

const mockReviews = [
  {
    _id: "r1",
    reviewerName: "Ananya Sharma",
    role: "Product Manager",
    rating: 5,
    reviewerImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    review:
      "Great workspace experience, smooth booking and helpful support team.",
    status: "pending",
    source: "Website Form",
    submittedAt: "2026-05-28",
  },
  {
    _id: "r2",
    reviewerName: "Rohit Mehta",
    role: "Founder",
    rating: 4,
    reviewerImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    review:
      "Good amenities and location. Team is responsive and professional.",
    status: "approved",
    source: "Website Form",
    submittedAt: "2026-05-25",
  },
];
const WEBSITE_BUILDER_REVIEW_STORAGE_KEY = "website_builder_preview_reviews";

const formatStatus = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "Pending";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const statusStyles = {
  Pending: { bg: "#FEF3C7", color: "#B45309" },
  Approved: { bg: "#D1FAE5", color: "#065F46" },
  Rejected: { bg: "#FEE2E2", color: "#991B1B" },
};

const WebsiteBuilderReviews = () => {
  const [rows, setRows] = useState(
    mockReviews.map((item, index) => ({ ...item, srNo: index + 1 })),
  );
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    const syncPreviewReviews = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(WEBSITE_BUILDER_REVIEW_STORAGE_KEY) || "[]",
        );
        const merged = [...(Array.isArray(stored) ? stored : []), ...mockReviews].map(
          (item, index) => ({
            ...item,
            srNo: index + 1,
          }),
        );
        setRows(merged);
      } catch (error) {
        console.error("Failed to load website builder reviews", error);
      }
    };

    syncPreviewReviews();
    window.addEventListener("storage", syncPreviewReviews);
    return () => window.removeEventListener("storage", syncPreviewReviews);
  }, []);

  const updateStatus = (reviewId, nextStatus) => {
    setRows((prev) =>
      prev.map((row) =>
        row._id === reviewId ? { ...row, status: String(nextStatus).toLowerCase() } : row,
      ),
    );
  };

  const columns = useMemo(
    () => [
      { field: "srNo", headerName: "SrNo", width: 90 },
      { field: "reviewerName", headerName: "Name", minWidth: 180 },
      {
        field: "reviewerImage",
        headerName: "Image",
        minWidth: 110,
        cellRenderer: (params) => {
          const imageUrl = String(params?.data?.reviewerImage || "").trim();
          if (!imageUrl) {
            return <FaUserCircle className="h-9 w-9 text-slate-400" />;
          }
          return (
            <img
              src={imageUrl}
              alt={params?.data?.reviewerName || "Reviewer"}
              className="h-9 w-9 rounded-full object-cover border border-slate-200"
            />
          );
        },
      },
      { field: "role", headerName: "Role", minWidth: 160 },
      { field: "rating", headerName: "Rating", minWidth: 110 },
      { field: "source", headerName: "Source", minWidth: 140 },
      { field: "submittedAt", headerName: "Submitted", minWidth: 140 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 170,
        cellRenderer: (params) => {
          const display = formatStatus(params?.data?.status);
          const style = statusStyles[display] || statusStyles.Pending;
          return (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <TextField
                select
                size="small"
                value={display}
                onChange={(event) => updateStatus(params.data._id, event.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "9999px",
                    px: 1.5,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    backgroundColor: style.bg,
                    color: style.color,
                    "& fieldset": { border: "none" },
                  },
                }}
              >
                {["Pending", "Approved", "Rejected"].map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          );
        },
      },
      {
        field: "review",
        headerName: "Review",
        minWidth: 180,
        cellRenderer: (params) => (
          <button
            type="button"
            className="text-primary underline font-semibold"
            onClick={() => setSelectedReview(params.data)}
          >
            View Review
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-4">
      <PageFrame>
        <div className="mb-4">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Website Reviews
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Builder UI placeholder for company-scoped review moderation. Backend integration pending.
          </p>
        </div>
        <AgTable data={rows} columns={columns} tableTitle="Reviews" search />
      </PageFrame>

      <Dialog
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Review Details</DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-1 gap-3 py-1">
            <TextField
              label="Reviewer Name"
              value={selectedReview?.reviewerName || ""}
              size="small"
              fullWidth
              disabled
            />
            <TextField
              label="Role"
              value={selectedReview?.role || ""}
              size="small"
              fullWidth
              disabled
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Reviewer Image:</span>
              {selectedReview?.reviewerImage ? (
                <img
                  src={selectedReview.reviewerImage}
                  alt={selectedReview?.reviewerName || "Reviewer"}
                  className="h-14 w-14 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <FaUserCircle className="h-14 w-14 text-slate-400" />
              )}
            </div>
            <TextField
              label="Rating"
              value={selectedReview?.rating || ""}
              size="small"
              fullWidth
              disabled
            />
            <TextField
              label="Review"
              value={selectedReview?.review || ""}
              size="small"
              fullWidth
              multiline
              minRows={4}
              disabled
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedReview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default WebsiteBuilderReviews;
