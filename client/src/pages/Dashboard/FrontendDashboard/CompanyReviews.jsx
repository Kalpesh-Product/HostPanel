import React, { useMemo, useState } from "react";
import AgTable from "../../../components/AgTable";
import PageFrame from "../../../components/Pages/PageFrame";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import { MenuItem, TextField, IconButton, Button } from "@mui/material";
import { MdOutlineRateReview } from "react-icons/md";
import MuiModal from "../../../components/MuiModal";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const CompanyReviews = () => {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);

  // 🔹 Fetch Reviews
  const {
    data = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: [
      "companyReviews",
      selectedCompany?.companyId,
      auth?.user?.companyId,
    ],
    enabled: !!(selectedCompany || auth?.user?.companyId),
    queryFn: async () => {
      const companyId = selectedCompany?.companyId || auth?.user?.companyId;

      const parseReviews = (response) => {
        const reviews =
          response?.data?.reviews ??
          response?.data?.data?.reviews ??
          response?.data?.data ??
          response?.data;
        return Array.isArray(reviews) ? reviews : [];
      };

      const statuses = ["pending", "rejected", "approved"];
      const responses = await Promise.all(
        statuses.map((status) =>
          axiosPrivate.get(
            `/api/review?companyId=${companyId}&status=${status}`,
            {
              headers: { "Cache-Control": "no-cache" },
            },
          ),
        ),
      );

      return responses.flatMap((response) => parseReviews(response));
    },
  });

  // 🔹 Mutation for updating review status
  const updateReviewMutation = useMutation({
    mutationFn: async ({ reviewId, status }) => {
      const res = await axiosPrivate.patch(`/api/review/${reviewId}`, {
        status,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Review updated");
      queryClient.invalidateQueries(["companyReviews"]);
      setOpenModal(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Update failed");
    },
  });

  // 🔹 Comment Modal form
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { description: "" },
  });

  const handleOpenModal = (review) => {
    reset({ description: review.description || "" });
    setOpenModal(true);
  };

  const onSubmitComment = () => {
    setOpenModal(false);
  };

  const handleStatusChange = (reviewId, newStatus) => {
    updateReviewMutation.mutate({ reviewId, status: newStatus });
  };

  const formatStatusLabel = (status) => {
    if (!status) return "Pending";
    const normalized = String(status).toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getApproverRejectorName = (review) => {
    const normalizedStatus = String(review?.status || "").toLowerCase();
    const actor =
      normalizedStatus === "approved"
        ? review?.approvedBy
        : normalizedStatus === "rejected"
          ? review?.rejectedBy
          : null;

    if (!actor || typeof actor !== "object") return "-";

    const userType = String(actor?.userType || "").toUpperCase();

    if (userType === "MASTER") {
      const firstName = actor?.user?.firstName?.trim?.() || "";
      const lastName = actor?.user?.lastName?.trim?.() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || "-";
    }

    if (userType === "HOST") {
      return actor?.user?.name?.trim?.() || "-";
    }

    return "-";
  };

  const rows = useMemo(() => {
    const statusOrder = {
      pending: 0,
      rejected: 1,
      approved: 2,
    };

    return (Array.isArray(data) ? data : [])
      .slice()
      .sort((a, b) => {
        const aStatus = String(a?.status || "pending").toLowerCase();
        const bStatus = String(b?.status || "pending").toLowerCase();
        const aRank = statusOrder[aStatus] ?? Number.MAX_SAFE_INTEGER;
        const bRank = statusOrder[bStatus] ?? Number.MAX_SAFE_INTEGER;
        return aRank - bRank;
      })
      .map((review, index) => ({
        ...review,
        srNo: index + 1,
      }));
  }, [data]);

  // 🔹 Table columns
  const columns = [
    { field: "srNo", headerName: "SrNo", width: 100 },
    {
      field: "reviewerName",
      headerName: "Reviewer Name",
      valueGetter: (params) =>
        params.data.reviewerName ||
        params.data.reviewreName ||
        params.data.fullName ||
        params.data.name ||
        "-",
    },
    {
      field: "rating",
      headerName: "Rating",
      valueGetter: (params) =>
        params.data.starCount ??
        params.data.rating ??
        params.data.ratingValue ??
        "-",
    },
    // { field: "productType", headerName: "Product" },
    // { field: "noOfPeople", headerName: "People Count" },
    // { field: "mobileNumber", headerName: "Mobile Number" },
    // { field: "email", headerName: "Email" },
    // { field: "startDate", headerName: "Start Date" },
    // { field: "endDate", headerName: "End Date" },
    // { field: "recievedDate", headerName: "Received Date" },
    {
      field: "status",
      headerName: "Status",
      cellRenderer: (params) => {
        const value = formatStatusLabel(params.data.status);
        const isFinalStatus = value === "Approved" || value === "Rejected";

        const statusStyles = {
          Pending: { bg: "#FEF3C7", color: "#F59E0B" }, // amber
          // Contacted: { bg: "#DBEAFE", color: "#3B82F6" }, // blue
          Approved: { bg: "#D1FAE5", color: "#10B981" }, // green
          Rejected: { bg: "#FEE2E2", color: "#EF4444" }, // red
        };

        const badgeStyles = {
          borderRadius: "9999px",
          padding: "4px 16px",
          fontWeight: 600,
          fontSize: "0.85rem",
          backgroundColor: statusStyles[value]?.bg,
          color: statusStyles[value]?.color,
          lineHeight: 1.5,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        };

        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            {isFinalStatus ? (
              <span style={badgeStyles}>{value}</span>
            ) : (
              <TextField
                select
                size="small"
                value={value}
                onChange={(e) =>
                  handleStatusChange(
                    params.data._id,
                    e.target.value.toLowerCase(),
                  )
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "9999px",
                    px: 1.5,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    backgroundColor: statusStyles[value]?.bg,
                    color: statusStyles[value]?.color,
                    "& fieldset": { border: "none" },
                  },
                  "& .MuiSelect-select": {
                    textAlign: "center",
                  },
                }}
              >
                {["Pending", "Approved", "Rejected"].map((option) => (
                  <MenuItem
                    key={option}
                    value={option}
                    sx={{
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      borderRadius: "9999px",

                      my: 0.5,
                    }}
                  >
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
      field: "comment",
      headerName: "Description",
      cellRenderer: (params) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          {/* <IconButton onClick={() => handleOpenModal(params.data)}>
            <MdOutlineRateReview />
          </IconButton> */}
          <button
            className="text-blue-500 underline font-semibold"
            onClick={() => handleOpenModal(params.data)}
          >
            View Description
          </button>
        </div>
      ),
    },
    {
      field: "approvedRejectedBy",
      headerName: "Approved/Rejected By",
      valueGetter: (params) => getApproverRejectorName(params?.data),
      minWidth: 220,
    },
  ];

  if (isPending) return <>Loading Reviews</>;
  if (isError)
    return <span className="text-red-500">Error Loading Reviews</span>;

  return (
    <div className="p-4">
      <PageFrame>
        <AgTable data={rows} columns={columns} tableTitle={"Reviews"} search />

        {rows.length === 0 && (
          <div className="text-center text-gray-500 py-4">No records found</div>
        )}
      </PageFrame>

      {/* 🔹 Comment Modal */}
      <MuiModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Review Description"
      >
        <form
          onSubmit={handleSubmit(onSubmitComment)}
          className="flex flex-col gap-4"
        >
          <Controller
            name="description"
            control={control}
            rules={{ required: "Comment cannot be empty" }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description"
                multiline
                rows={4}
                fullWidth
                disabled={true}
              />
            )}
          />
          {/* <PrimaryButton
            title="Update Comment"
            type="submit"
            isLoading={updateLeadMutation.isLoading}
          /> */}
        </form>
      </MuiModal>
    </div>
  );
};

export default CompanyReviews;
