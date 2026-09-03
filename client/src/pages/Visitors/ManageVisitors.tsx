import { useState } from "react";
import { Download } from "lucide-react";
import AgTable from "../../components/AgTable";
import PrimaryButton from "../../components/PrimaryButton";
import { useQuery, useMutation } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import humanTime from "../../utils/humanTime";
import DetalisFormatted from "../../components/DetalisFormatted";
import MuiModal from "../../components/MuiModal";
import { Controller, useForm } from "react-hook-form";
import { TextField } from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { queryClient } from "../../main";
import { toast } from "sonner";
import ThreeDotMenu from "../../components/ThreeDotMenu";
import PageFrame from "../../components/Pages/PageFrame";
import YearWiseTable from "../../components/Tables/YearWiseTable";
import { createReport } from "../../services/reports";
import { downloadReportFile } from "../../utils/report-download";
import ExportReportModal, { type ExportParams } from "../../components/ExportReportModal";
import ReportExportButton from "@/components/ReportExportButton";
import { isDateInExportPeriod } from '@/utils/export-period';

const ManageVisitors = () => {
  const axios = useAxiosPrivate();
  const [modalMode, setModalMode] = useState("view");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const { setValue, handleSubmit, reset, control } = useForm();
  
  const { data: visitorsData = [], isPending: isVisitorsData } = useQuery({
    queryKey: ["visitors"],
    queryFn: async () => {
      const response = await axios.get("/api/visitors/fetch-visitors");
      return response.data;
    },
  });

  const { mutate, isPending: isUpdating } = useMutation({
    mutationFn: async (updatedData) => {
      const response = await axios.patch(
        `/api/visitors/update-visitor/${selectedVisitor.mongoId}`,
        updatedData
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success("Visitor updated successfully");
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(error.message || "Update failed");
    },
  });

  const openModalWithMode = (visitor, mode) => {
    setSelectedVisitor(visitor);
    setModalMode(mode);
    setIsModalOpen(true);

    if (mode === "edit") {
      setValue("firstName", visitor.firstName || "");
      setValue("lastName", visitor.lastName || "");
      setValue("email", visitor.email || "");
      setValue("phoneNumber", visitor.phoneNumber || "");
      setValue("purposeOfVisit", visitor.purposeOfVisit || "");
      setValue(
        "checkOutRaw",
        visitor.checkOutRaw ? dayjs(visitor.checkOutRaw) : null
      );
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalMode("view");
    setSelectedVisitor(null);
  };

  const submit = (data) => {
    mutate({
      ...data,
      checkOut: data.checkOutRaw ? dayjs(data.checkOutRaw).toISOString() : null,
    });
  };

  const visitorsColumns = [
    { field: "srNo", headerName: "Sr No" },
    { field: "firstName", headerName: "First Name" },
    { field: "lastName", headerName: "Last Name" },
    { field: "email", headerName: "Email" },
    { field: "phoneNumber", headerName: "Phone No" },
    { field: "purposeOfVisit", headerName: "Purpose" },
    { field: "toMeet", headerName: "To Meet" },
    {
      field: "checkIn",
      headerName: "Check In",
      cellRenderer: (params) => humanTime(params.value),
    },
    { field: "checkOut", headerName: "Checkout" },
    {
      field: "actions",
      headerName: "Actions",
      cellRenderer: ({ data }) => {
        return (
          <ThreeDotMenu
            menuItems={[
              {
                label: "View details",
                onClick: () => openModalWithMode(data, "view"),
              },
              {
                label: "Edit",
                onClick: () => openModalWithMode(data, "edit"),
              },
            ]}
          />
        );
      },
    },
  ];

  const handleExportReport = async ({ format, dataWindow, period, reportMonth, dateFrom, dateTo }: ExportParams) => {
    const reportFormat = format === "Excel" ? "Excel" : "PDF";
    const exportRows = (visitorsData || [])
      .filter((m) => m.visitorFlag !== "Client")
      .filter((item) => isDateInExportPeriod(item.checkIn || item.createdAt || item.updatedAt, { dateFrom, dateTo }))
      .map((item, index) => ({
        label: `${index + 1}. ${item.firstName || ""} ${item.lastName || ""}`.trim() || "Visitor",
        value: [
          `Email: ${item.email || "-"}`,
          `Phone: ${item.phoneNumber || "-"}`,
          `Purpose: ${item.purposeOfVisit || "-"}`,
          `To Meet: ${item?.toMeet?.firstName || ""} ${item?.toMeet?.lastName || ""}`.trim() || "To Meet: -",
          `Check In: ${item.checkIn || "-"}`,
          `Check Out: ${item.checkOut || "-"}`,
        ].join(" | "),
      }));
    if (exportRows.length === 0) {
      toast.error("There are no visitors to export.");
      return;
    }
    try {
      const response = await createReport({
        title: "Visitors",
        department: "Front Office",
        category: "Other",
        dataWindow,
        reportMonth,
        period: period || "Current view",
        generatedBy: "Manager",
        format: reportFormat,
        description: "Visitor check-in details for the current view.",
        sourceType: "visitors",
        sourceRef: "manage-visitors",
        reportRows: exportRows,
        monthlyData: [],
      });
      await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
      window.dispatchEvent(new Event("reports:refresh"));
      toast.success(`${reportFormat} visitors report saved to Reports.`);
    } catch (error) {
      toast.error(error?.message || "Failed to export visitors report.");
    }
  };

  return (
    <div>
      <PageFrame>
        <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
              Visitors
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">
              Monitor visitor check-ins and manage visit records.
            </p>
          </div>
          <ReportExportButton onClick={() => setShowExportModal(true)} />
        </div>

        <YearWiseTable
          dateColumn={"checkIn"}
          search
          tableTitle="Visitors Today"
          data={visitorsData
            .filter((m) => m.visitorFlag !== "Client")
            .map((item, index) => ({
              srNo: index + 1,
              mongoId: item._id,
              firstName: item.firstName,
              lastName: item.lastName,
              email: item.email,
              phoneNumber: item.phoneNumber,
              purposeOfVisit: item.purposeOfVisit,
              toMeet: `${item?.toMeet?.firstName || ""} ${
                item?.toMeet?.lastName || ""
              }`,
              checkIn: item.checkIn,
              checkOut: item.checkOut ? humanTime(item.checkOut) : "",
              checkOutRaw: item.checkOut,
            }))}
          columns={visitorsColumns}
        />
      </PageFrame>

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Visitors"
        subtitle="Select format and date range to export."
        department="Front Office"
        category="Other"
        sourceRef="manage-visitors"
        reportTitle="Visitors"
        defaultDataWindow="Monthly"
        onExport={handleExportReport}
      />

      <MuiModal
        open={isModalOpen}
        onClose={handleCloseModal}
        title="Visitor Details"
      >
        <form
          onSubmit={handleSubmit(submit)}
          className="grid grid-cols-1 gap-4"
        >
          {modalMode === "view" ? (
            <>
              <DetalisFormatted
                title="First Name"
                detail={selectedVisitor?.firstName}
              />
              <DetalisFormatted
                title="Last Name"
                detail={selectedVisitor?.lastName}
              />
              <DetalisFormatted
                title="Phone Number"
                detail={selectedVisitor?.phoneNumber}
              />
              <DetalisFormatted title="Email" detail={selectedVisitor?.email} />
              <DetalisFormatted
                title="Purpose"
                detail={selectedVisitor?.purposeOfVisit}
              />
              <DetalisFormatted
                title="Checkout"
                detail={
                  selectedVisitor?.checkOutRaw
                    ? humanTime(selectedVisitor.checkOutRaw)
                    : ""
                }
              />
            </>
          ) : (
            <>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name"
                    size="small"
                    fullWidth
                  />
                )}
              />
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name"
                    size="small"
                    fullWidth
                  />
                )}
              />
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    size="small"
                    fullWidth
                  />
                )}
              />
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Email" size="small" fullWidth />
                )}
              />
              <Controller
                name="purposeOfVisit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Purpose"
                    size="small"
                    fullWidth
                  />
                )}
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Controller
                  name="checkOutRaw"
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      label="Checkout Time"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
              <PrimaryButton
                title={isUpdating ? "Saving..." : "Save"}
                disabled={isUpdating}
                type="submit"
              />
            </>
          )}
        </form>
      </MuiModal>
    </div>
  );
};

export default ManageVisitors;

