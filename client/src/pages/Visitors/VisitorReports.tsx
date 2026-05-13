import { useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useQuery } from "@tanstack/react-query";
import humanTime from "../../utils/humanTime";
import humanDate from "../../utils/humanDateForamt";
import MuiModal from "../../components/MuiModal";
import DetalisFormatted from "../../components/DetalisFormatted";
import PageFrame from "../../components/Pages/PageFrame";
import YearWiseTable from "../../components/Tables/YearWiseTable";

const VisitorReports = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const axios = useAxiosPrivate();

  const { data: visitorsData = [], isPending: isVisitorsData } = useQuery({
    queryKey: ["visitor-reports"],
    queryFn: async () => {
      const response = await axios.get("/api/visitors/fetch-visitors");
      return response.data;
    },
  });

  const handleDetailsClick = (visitor: any) => {
    setSelectedVisitor(visitor);
    setIsModalOpen(true);
  };

  const meetingReportsColumn = [
    { field: "srNo", headerName: "Sr No" },
    { field: "visitorType", headerName: "Type" },
    {
      field: "name",
      headerName: "Name",
      cellRenderer: (params: any) => (
        <div role="button" onClick={() => handleDetailsClick(params.data)}>
          <span className="underline text-primary cursor-pointer">
            {params.value}
          </span>
        </div>
      ),
    },
    { field: "address", headerName: "Address" },
    { field: "email", headerName: "Email" },
    { field: "phone", headerName: "Phone No" },
    { field: "purpose", headerName: "Purpose" },
    { field: "toMeet", headerName: "To Meet" },
    {
      field: "dateOfVisit",
      headerName: "Date Of Visit",
      cellRenderer: (params: any) => humanDate(params.value),
    },
    {
      field: "checkIn",
      headerName: "Check In",
      cellRenderer: (params: any) => humanTime(params.value),
    },
    {
      field: "checkOut",
      headerName: "Check Out",
      cellRenderer: (params: any) => humanTime(params.value),
    },
  ];

  const rows = visitorsData.map((visitor: any, index: number) => ({
    srNo: index + 1,
    name: `${visitor.firstName || ""} ${visitor.lastName || ""}`,
    address: visitor.address || "-",
    email: visitor.email || "-",
    phone: visitor.phoneNumber || "-",
    purpose: visitor.purposeOfVisit || "-",
    toMeet: visitor.toMeet?.firstName || "Kalpesh Naik",
    checkIn: visitor.checkIn,
    checkOut: visitor.checkOut,
    rawData: visitor,
    visitorType: visitor.visitorFlag || "-",
    date: visitor.checkIn,
    dateOfVisit: visitor.checkIn,
  }));

  return (
    <div className="flex flex-col gap-8 p-4">
      <PageFrame>
        <div>
          <YearWiseTable
            exportData
            dateColumn={"date"}
            search={true}
            searchColumn={"name"}
            tableTitle={"Visitor Reports"}
            data={rows}
            columns={meetingReportsColumn}
            loading={isVisitorsData}
          />
        </div>
      </PageFrame>

      <MuiModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Visitor Details"
      >
        {selectedVisitor && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            <div className="font-bold">Personal Information</div>
            <DetalisFormatted title="Name" detail={selectedVisitor.name} />
            <DetalisFormatted title="Phone" detail={selectedVisitor.phone} />
            <DetalisFormatted title="Email" detail={selectedVisitor.email} />
            <br />
            <div className="font-bold">Visit Details</div>
            <DetalisFormatted title="To Meet" detail={selectedVisitor.toMeet} />
            <DetalisFormatted title="Purpose" detail={selectedVisitor.purpose} />
            <DetalisFormatted title="Check In" detail={selectedVisitor.checkIn} />
            <DetalisFormatted title="Check Out" detail={selectedVisitor.checkOut} />
            <DetalisFormatted
              title="Date of Visit"
              detail={humanDate(selectedVisitor.rawData?.dateOfVisit)}
            />
            {selectedVisitor.rawData?.image?.url && (
              <div className="lg:col-span-2">
                <img
                  src={selectedVisitor.rawData.image.url}
                  alt="Visitor Attachment"
                  className="max-w-full max-h-96 rounded border"
                />
              </div>
            )}
          </div>
        )}
      </MuiModal>
    </div>
  );
};

export default VisitorReports;