// @ts-nocheck
import React, { useMemo, useState } from "react";
import { MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { FaUserCircle } from "react-icons/fa";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import PageFrame from "../../../../components/Pages/PageFrame";
import AgTable from "../../../../components/AgTable";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import useAuth from "../../../../hooks/useAuth";

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

const parseReviews = (response) => {
  const reviews =
    response?.data?.reviews ??
    response?.data?.data?.reviews ??
    response?.data?.data ??
    response?.data;
  return Array.isArray(reviews) ? reviews : [];
};

const WebsiteBuilderReviews = () => {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReview, setSelectedReview] = useState(null);

  const companyId =
    selectedCompany?.companyId || auth?.user?.companyId || "";
  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceId ||
    "";

  const { data = [], isPending, isError } = useQuery({
    queryKey: ["websiteBuilderReviews", companyId, workspaceId],
    enabled: !!companyId || !!workspaceId,
    queryFn: async () => {
      const response = await axiosPrivate.get(`/api/review`, {
        params: {
          companyId,
          workspaceId,
        },
        headers: { "Cache-Control": "no-cache" },
      });
      return parseReviews(response);
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ reviewId, status }) => {
      const res = await axiosPrivate.patch(`/api/review/${reviewId}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Review updated");
      queryClient.invalidateQueries(["websiteBuilderReviews"]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Update failed");
    },
  });

  const rows = useMemo(() => {
    const statusOrder = { pending: 0, rejected: 1, approved: 2 };
    return (Array.isArray(data) ? data : [])
      .slice()
      .sort((a, b) => {
        const aStatus = String(a?.status || "pending").toLowerCase();
        const bStatus = String(b?.status || "pending").toLowerCase();
        return (statusOrder[aStatus] ?? 99) - (statusOrder[bStatus] ?? 99);
      })
      .map((item, index) => ({
        ...item,
        srNo: index + 1,
      }));
  }, [data]);

  const columns = useMemo(
    () => [
      { field: "srNo", headerName: "SrNo", width: 90 },
      {
        field: "reviewerName",
        headerName: "Name",
        minWidth: 180,
        valueGetter: (params) =>
          params.data.reviewerName ||
          params.data.reviewreName ||
          params.data.fullName ||
          params.data.name ||
          "-",
      },
      {
        field: "reviewerImage",
        headerName: "Image",
        minWidth: 110,
        cellRenderer: (params) => {
          const imageUrl = String(params?.data?.reviewerImage || params?.data?.image || "").trim();
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
      {
        field: "role",
        headerName: "Role",
        minWidth: 160,
        valueGetter: (params) =>
          params.data.role || params.data.designation || params.data.jobPosition || "-",
      },
      {
        field: "rating",
        headerName: "Rating",
        minWidth: 110,
        valueGetter: (params) =>
          params.data.starCount ?? params.data.rating ?? params.data.rate ?? "-",
      },
      { field: "source", headerName: "Source", minWidth: 140 },
      {
        field: "submittedAt",
        headerName: "Submitted",
        minWidth: 160,
        valueGetter: (params) =>
          params.data.submittedAt || params.data.createdAt || params.data.updatedAt || "-",
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 170,
        cellRenderer: (params) => {
          const display = formatStatus(params?.data?.status);
          const style = statusStyles[display] || statusStyles.Pending;
          const isFinalStatus = display === "Approved" || display === "Rejected";

          return (
            <div style={{ display: "flex", justifyContent: "center" }}>
              {isFinalStatus ? (
                <span
                  style={{
                    borderRadius: "9999px",
                    padding: "4px 16px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    backgroundColor: style.bg,
                    color: style.color,
                    lineHeight: 1.5,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {display}
                </span>
              ) : (
                <TextField
                  select
                  size="small"
                  value={display}
                  onChange={(event) =>
                    updateReviewMutation.mutate({
                      reviewId: params.data._id,
                      status: String(event.target.value).toLowerCase(),
                    })
                  }
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
              )}
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
    [updateReviewMutation],
  );

  if (isPending) return <div className="p-4">Loading reviews...</div>;
  if (isError) return <div className="p-4 text-red-500">Error loading reviews.</div>;

  return (
    <div className="p-4">
      <PageFrame>
        <div className="mb-4">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Website Reviews
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Public website reviews submitted through the builder template. Only approved reviews should be shown on the live site.
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
              value={
                selectedReview?.reviewerName ||
                selectedReview?.reviewreName ||
                selectedReview?.fullName ||
                selectedReview?.name ||
                ""
              }
              size="small"
              fullWidth
              disabled
            />
            <TextField
              label="Role"
              value={
                selectedReview?.role ||
                selectedReview?.designation ||
                selectedReview?.jobPosition ||
                ""
              }
              size="small"
              fullWidth
              disabled
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Reviewer Image:</span>
              {selectedReview?.reviewerImage || selectedReview?.image ? (
                <img
                  src={selectedReview?.reviewerImage || selectedReview?.image}
                  alt={selectedReview?.reviewerName || "Reviewer"}
                  className="h-14 w-14 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <FaUserCircle className="h-14 w-14 text-slate-400" />
              )}
            </div>
            <TextField
              label="Rating"
              value={
                selectedReview?.starCount ??
                selectedReview?.rating ??
                selectedReview?.rate ??
                ""
              }
              size="small"
              fullWidth
              disabled
            />
            <TextField
              label="Review"
              value={
                selectedReview?.review ||
                selectedReview?.comment ||
                selectedReview?.description ||
                ""
              }
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
