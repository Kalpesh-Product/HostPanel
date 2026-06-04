// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import YearWiseTable from "../../../components/Tables/YearWiseTable";
import PageFrame from "../../../components/Pages/PageFrame";
import { useSelector } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";
import { MenuItem, TextField, IconButton } from "@mui/material";
import { MdOutlineRateReview, MdOutlineRemoveRedEye } from "react-icons/md";
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLead, setDetailsLead] = useState(null);
  const [activeVertical, setActiveVertical] = useState("co-working");
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

  const handleOpenDetails = (lead) => {
    setDetailsLead(lead);
    setDetailsOpen(true);
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

  const getLeadContext = (lead) => {
    const context = [
      lead?.vertical,
      lead?.productType,
      lead?.roomType,
      lead?.packageName,
      lead?.dormType,
      activeVertical,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return context;
  };

  const resolveLeadCategory = (lead) => {
    const context = getLeadContext(lead);
    if (context.includes("meeting")) return "meeting-rooms";
    if (context.includes("workation")) return "workation";
    if (context.includes("co-living") || context.includes("coliving")) return "co-living";
    if (context.includes("hostel")) return "hostel";
    if (context.includes("cafe")) return "cafe";
    if (context.includes("co-working") || context.includes("cowork")) return "co-working";
    return activeVertical || "co-working";
  };

  const getLeadCategoryLabel = (lead) => {
    const category = resolveLeadCategory(lead);
    const map = {
      "co-working": "Co-Working",
      "co-living": "Co-Living",
      hostel: "Hostel",
      workation: "Workation",
      "meeting-rooms": "Meeting Rooms",
      cafe: "Cafe",
    };
    if (map[category]) return map[category];
    const raw = String(lead?.vertical || category || "").trim();
    return raw ? raw.replace(/\b\w/g, (c) => c.toUpperCase()) : "Co-Working";
  };

  const getPeopleLabel = (lead) => {
    const context = getLeadContext(lead);
    if (context.includes("hostel")) return "Beds Required";
    if (context.includes("workation")) return "No. Of Guests";
    if (context.includes("co-living") || context.includes("coliving")) return "No. Of Occupants";
    if (context.includes("meeting")) return "No. Of Attendees";
    if (context.includes("cafe")) return "Guest Count";
    return "People Count";
  };

  const getLeadDetails = (lead) => {
    if (!lead) return [];
    const details = [];
    const addField = (label, value) => {
      const cleanValue = String(value || "").trim();
      if (!cleanValue) return;
      if (details.some((item) => item.label === label && item.value === cleanValue)) return;
      details.push({ label, value: cleanValue });
    };

    const peopleValue = lead?.noOfPeople || lead?.attendees || "";
    const category = resolveLeadCategory(lead);

    if (category === "co-working") {
      addField("Product", lead?.productType || "");
      addField(getPeopleLabel(lead), peopleValue);
      addField("Start Date", lead?.startDate);
      addField("End Date", lead?.endDate);
      return details;
    }

    if (category === "co-living") {
      addField("Room Type", lead?.roomType);
      addField("Move-in Date", lead?.startDate);
      addField("Stay Duration", lead?.stayDuration);
      return details;
    }

    if (category === "workation") {
      addField("Package", lead?.packageName);
      addField(getPeopleLabel(lead), peopleValue);
      addField("Travel Date", lead?.startDate);
      return details;
    }

    if (category === "hostel") {
      addField("Dorm Type", lead?.dormType);
      addField(getPeopleLabel(lead), peopleValue);
      addField("Check-in", lead?.startDate);
      addField("Check-out", lead?.endDate);
      return details;
    }

    if (category === "meeting-rooms") {
      addField("Room", lead?.roomType);
      addField(getPeopleLabel(lead), peopleValue);
      addField("Booking Date", lead?.startDate);
      addField("Time Slot", lead?.timeSlot);
      return details;
    }

    if (category === "cafe") {
      addField("Inquiry Type", lead?.inquiryType);
      addField(getPeopleLabel(lead), peopleValue);
      addField("Preferred Date", lead?.startDate);
      return details;
    }

    addField("Product", lead?.productType || "");
    addField(getPeopleLabel(lead), peopleValue);
    addField("Start Date", lead?.startDate);
    addField("End Date", lead?.endDate);

    return details;
  };

  const columns = [
    { field: "srNo", headerName: "SrNo", width: 100 },
    { field: "fullName", headerName: "Lead Name" },
    { field: "source", headerName: "Source" },
    {
      field: "product",
      headerName: "Product",
      valueGetter: (params) => getLeadCategoryLabel(params.data),
    },
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
      field: "details",
      headerName: "Details",
      cellRenderer: (params) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <IconButton onClick={() => handleOpenDetails(params.data)}>
            <MdOutlineRemoveRedEye />
          </IconButton>
        </div>
      ),
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
    return Array.isArray(data) ? data : [];
  }, [data]);

  const detailFields = useMemo(
    () => getLeadDetails(detailsLead),
    [detailsLead, activeVertical],
  );

  if (isPending) return <>Loading Leads</>;
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

      <MuiModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Lead Details"
      >
        <div className="grid grid-cols-1 gap-3">
          {detailFields.length ? (
            detailFields.map((item) => (
              <TextField
                key={`${item.label}-${item.value}`}
                label={item.label}
                value={item.value}
                size="small"
                fullWidth
                disabled
              />
            ))
          ) : (
            <div className="text-sm text-gray-500">No lead details available.</div>
          )}
        </div>
      </MuiModal>
    </div>
  );
};

export default CompanyLeads;


