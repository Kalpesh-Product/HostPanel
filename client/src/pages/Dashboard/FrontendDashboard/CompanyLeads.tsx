import React, { useState } from "react";
import YearWiseTable from "../../../components/Tables/YearWiseTable";
import PageFrame from "../../../components/Pages/PageFrame";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import { MenuItem, TextField, IconButton } from "@mui/material";
import { MdOutlineRateReview } from "react-icons/md";
import MuiModal from "../../../components/MuiModal";
import { Controller, useForm } from "react-hook-form";
import PrimaryButton from "../../../components/PrimaryButton";
import { toast } from "sonner";

const CompanyLeads = () => {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // 🔹 Fetch Leads
  const {
    data = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ["leadCompany"],
    enabled: !!(selectedCompany || auth?.user?.companyId),
    queryFn: async () => {
      const companyId = selectedCompany?.companyId || auth?.user?.companyId;
      const response = await axiosPrivate.get(
        `/api/leads/get-leads?companyId=${companyId}`,
        { headers: { "Cache-Control": "no-cache" } },
      );
      return Array.isArray(response?.data) ? response.data : [];
    },
  });

  // 🔹 Mutation for updating lead
  const updateLeadMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosPrivate.patch("/api/leads/update-lead", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Lead updated");
      queryClient.invalidateQueries(["leadCompany"]);
      setOpenModal(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Update failed");
    },
  });

  // 🔹 Comment Modal form
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { comment: "" },
  });

  const handleOpenModal = (lead) => {
    setSelectedLead(lead);
    reset({ comment: lead.comment || "" });
    setOpenModal(true);
  };

  const onSubmitComment = (data) => {
    updateLeadMutation.mutate({
      leadId: selectedLead._id,
      comment: data.comment,
    });
  };

  const handleStatusChange = (leadId, newStatus) => {
    updateLeadMutation.mutate({ leadId, status: newStatus });
  };

  // 🔹 Table columns
  const columns = [
    { field: "srNo", headerName: "SrNo", width: 100 },
    { field: "fullName", headerName: "Lead Name" },
    { field: "source", headerName: "Source" },
    { field: "productType", headerName: "Product" },
    { field: "noOfPeople", headerName: "People Count" },
    { field: "mobileNumber", headerName: "Mobile Number" },
    { field: "email", headerName: "Email" },
    { field: "startDate", headerName: "Start Date" },
    { field: "endDate", headerName: "End Date" },
    { field: "recievedDate", headerName: "Received Date" },
    {
      field: "status",
      headerName: "Status",
      cellRenderer: (params) => {
        const value = params.data.status || "Pending";

        const statusStyles = {
          Pending: { bg: "#FEF3C7", color: "#F59E0B" }, // amber
          Contacted: { bg: "#DBEAFE", color: "#3B82F6" }, // blue
          Closed: { bg: "#D1FAE5", color: "#10B981" }, // green
          Rejected: { bg: "#FEE2E2", color: "#EF4444" }, // red
        };

        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <TextField
              select
              size="small"
              value={value}
              onChange={(e) =>
                handleStatusChange(params.data._id, e.target.value)
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
              {["Pending", "Contacted", "Closed", "Rejected"].map((option) => (
                <MenuItem
                  key={option}
                  value={option}
                  sx={{
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    borderRadius: "9999px",
                    backgroundColor: statusStyles[option]?.bg,
                    color: statusStyles[option]?.color,
                    my: 0.5,
                  }}
                >
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </div>
        );
      },
    },
    {
      field: "comment",
      headerName: "Comment",
      cellRenderer: (params) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <IconButton onClick={() => handleOpenModal(params.data)}>
            <MdOutlineRateReview />
          </IconButton>
        </div>
      ),
    },
  ];

  if (isPending) return <>Loading Leads</>;
  if (isError) return <span className="text-red-500">Error Loading Leads</span>;

  return (
    <div className="p-4">
      <PageFrame>
        {/* <YearWiseTable data={data} tableTitle={"Leads"} columns={columns} /> */}
        <YearWiseTable
          data={Array.isArray(data) ? data : []} // 👈 ensure array
          tableTitle={"Leads"}
          columns={columns}
        />

        {Array.isArray(data) && data.length === 0 && (
          <div className="text-center text-gray-500 py-4">No records found</div>
        )}
      </PageFrame>

      {/* 🔹 Comment Modal */}
      <MuiModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Update Comment"
      >
        <form
          onSubmit={handleSubmit(onSubmitComment)}
          className="flex flex-col gap-4"
        >
          <Controller
            name="comment"
            control={control}
            rules={{ required: "Comment cannot be empty" }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Comment"
                multiline
                rows={4}
                fullWidth
              />
            )}
          />
          <PrimaryButton
            title="Update Comment"
            type="submit"
            isLoading={updateLeadMutation.isLoading}
          />
        </form>
      </MuiModal>
    </div>
  );
};

export default CompanyLeads;
