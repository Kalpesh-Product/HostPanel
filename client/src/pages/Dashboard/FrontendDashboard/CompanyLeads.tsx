// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
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

const WEBSITE_BUILDER_LEAD_STORAGE_KEY = "website_builder_preview_leads";

const CompanyLeads = () => {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeVertical, setActiveVertical] = useState("co-working");
  const [previewLeads, setPreviewLeads] = useState([]);
  const workspaceId =
    selectedCompany?.workspaceId ||
    auth?.user?.primaryWorkspace ||
    auth?.user?.workspaceMembership?.workspace ||
    auth?.user?.workspaceId ||
    "";

  useEffect(() => {
    let mounted = true;
    const resolveVertical = async () => {
      try {
        const companyId = selectedCompany?.companyId || auth?.user?.companyId || "";
        const businessName = selectedCompany?.companyName || auth?.user?.companyName || "";
        const response = await axiosPrivate.get("/api/editor/get-websites", {
          params: { workspaceId, companyId, businessName },
        });
        const websites = Array.isArray(response?.data) ? response.data : [];
        const vertical = String(websites?.[0]?.vertical || "").trim();
        if (mounted && vertical) setActiveVertical(vertical);
      } catch {
        if (mounted) setActiveVertical("co-working");
      }
    };
    if (workspaceId || selectedCompany?.companyId || auth?.user?.companyId) {
      void resolveVertical();
    }
    return () => {
      mounted = false;
    };
  }, [
    axiosPrivate,
    workspaceId,
    selectedCompany?.companyId,
    selectedCompany?.companyName,
    auth?.user?.companyId,
    auth?.user?.companyName,
  ]);

  useEffect(() => {
    const syncPreviewLeads = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(WEBSITE_BUILDER_LEAD_STORAGE_KEY) || "[]",
        );
        setPreviewLeads(Array.isArray(stored) ? stored : []);
      } catch (error) {
        console.error("Failed to load preview leads", error);
      }
    };

    syncPreviewLeads();
    window.addEventListener("storage", syncPreviewLeads);
    return () => window.removeEventListener("storage", syncPreviewLeads);
  }, []);

  // ðŸ”¹ Fetch Leads
  const {
    data = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ["leadCompany", selectedCompany?.companyId, auth?.user?.companyId, workspaceId],
    enabled: !!(selectedCompany || auth?.user?.companyId || workspaceId),
    queryFn: async () => {
      const companyId = selectedCompany?.companyId || auth?.user?.companyId;
      const response = await axiosPrivate.get(
        `/api/leads/get-leads?companyId=${encodeURIComponent(
          companyId || "",
        )}&workspaceId=${encodeURIComponent(workspaceId || "")}`,
        { headers: { "Cache-Control": "no-cache" } },
      );
      return Array.isArray(response?.data) ? response.data : [];
    },
  });

  // ðŸ”¹ Mutation for updating lead
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

  // ðŸ”¹ Comment Modal form
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

  // ðŸ”¹ Table columns
  const dynamicVerticalColumns = useMemo(() => {
    const map = {
      "co-working": [
        { field: "productType", headerName: "Product" },
        { field: "noOfPeople", headerName: "People Count" },
        { field: "startDate", headerName: "Start Date" },
        { field: "endDate", headerName: "End Date" },
      ],
      "co-living": [
        { field: "roomType", headerName: "Room Type" },
        { field: "startDate", headerName: "Move-in Date" },
        { field: "stayDuration", headerName: "Stay Duration" },
      ],
      workation: [
        { field: "packageName", headerName: "Package" },
        { field: "attendees", headerName: "Team Size" },
        { field: "startDate", headerName: "Travel Date" },
      ],
      hostel: [
        { field: "dormType", headerName: "Dorm Type" },
        { field: "startDate", headerName: "Check-in" },
        { field: "endDate", headerName: "Check-out" },
      ],
      "meeting-rooms": [
        { field: "roomType", headerName: "Room" },
        { field: "attendees", headerName: "Attendees" },
        { field: "startDate", headerName: "Booking Date" },
        { field: "timeSlot", headerName: "Time Slot" },
      ],
      cafe: [
        { field: "inquiryType", headerName: "Inquiry Type" },
        { field: "attendees", headerName: "Guest Count" },
        { field: "startDate", headerName: "Preferred Date" },
      ],
    };
    return map[activeVertical] || map["co-working"];
  }, [activeVertical]);

  const columns = [
    { field: "srNo", headerName: "SrNo", width: 100 },
    { field: "fullName", headerName: "Lead Name" },
    { field: "source", headerName: "Source" },
    ...dynamicVerticalColumns,
    { field: "mobileNumber", headerName: "Mobile Number" },
    { field: "email", headerName: "Email" },
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

  const mergedLeads = useMemo(() => {
    const remote = Array.isArray(data) ? data : [];
    const local = Array.isArray(previewLeads) ? previewLeads : [];
    return [...local, ...remote];
  }, [data, previewLeads]);

  useEffect(() => {
    if (previewLeads.length > 0) {
      const firstLeadVertical = String(previewLeads[0]?.vertical || "").trim();
      if (firstLeadVertical) setActiveVertical(firstLeadVertical);
    }
  }, [previewLeads]);

  if (isPending && previewLeads.length === 0) return <>Loading Leads</>;
  if (isError) return <span className="text-red-500">Error Loading Leads</span>;

  return (
    <div className="p-4">
      <PageFrame>
        {/* <YearWiseTable data={data} tableTitle={"Leads"} columns={columns} /> */}
        <YearWiseTable
          data={mergedLeads}
          tableTitle={"Leads"}
          columns={columns}
        />

        {mergedLeads.length === 0 && (
          <div className="text-center text-gray-500 py-4">No records found</div>
        )}
      </PageFrame>

      {/* ðŸ”¹ Comment Modal */}
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


