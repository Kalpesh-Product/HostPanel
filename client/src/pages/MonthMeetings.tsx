import AgTable from "../components/AgTable";
import { useLocation } from "react-router-dom";
import { Avatar, AvatarGroup, Chip } from "@mui/material";
import dayjs from "dayjs";

const MonthMeetings = () => {
  const location = useLocation();
  const { meetings = [] } = (location.state as { meetings?: any[] }) || {};

  const statusColors: Record<string, { bg: string; text: string }> = {
    Upcoming: { bg: "#E3F2FD", text: "#1565C0" },
    Ongoing: { bg: "#FFF3E0", text: "#E65100" },
    Completed: { bg: "#E8F5E9", text: "#1B5E20" },
    Cancelled: { bg: "#FFEBEE", text: "#B71C1C" },
    Available: { bg: "#E3F2FD", text: "#0D47A1" },
    Occupied: { bg: "#ECEFF1", text: "#37474F" },
    Cleaning: { bg: "#E0F2F1", text: "#00796B" },
    Pending: { bg: "#FFFDE7", text: "#F57F17" },
    "In Progress": { bg: "#FBE9E7", text: "#BF360C" },
  };

  const columns = [
    { field: "srNo", headerName: "Sr No" },
    { field: "roomName", headerName: "Room Name" },
    { field: "startDate", headerName: "Date" },
    { field: "startTime", headerName: "Start Time" },
    { field: "endTime", headerName: "End Time" },
    {
      field: "meetingStatus",
      headerName: "Meeting Status",
      cellRenderer: (params: any) => (
        <Chip
          label={params.value || ""}
          sx={{
            backgroundColor: statusColors[params.value]?.bg || "#F5F5F5",
            color: statusColors[params.value]?.text || "#000",
            fontWeight: "bold",
          }}
        />
      ),
    },
    {
      field: "participants",
      headerName: "Participants",
      cellRenderer: (params: any) => {
        const participants = Array.isArray(params.data?.participants)
          ? params.data.participants
          : [];
        return (
          <div className="flex justify-start items-center">
            <AvatarGroup max={4}>
              {participants.map((participant: any, index: number) => (
                <Avatar
                  key={index}
                  alt={participant.firstName}
                  src="https://ui-avatars.com/api/?name=Alice+Johnson&background=random"
                  sx={{ width: 23, height: 23 }}
                />
              ))}
            </AvatarGroup>
          </div>
        );
      },
    },
  ];

  const firstMeetingDate = meetings[0]?.date || new Date().toISOString();
  const month = new Date(firstMeetingDate).toLocaleString("default", { month: "long" });
  const year = new Date(firstMeetingDate).toLocaleString("default", { year: "numeric" });

  const rows = (meetings || []).map((meeting: any, index: number) => {
    const parsedStartDate = new Date(meeting.date);
    const parsedStartTime = new Date(meeting.startTime);
    const parsedEndTime = new Date(meeting.endTime);

    return {
      ...meeting,
      startDate: !isNaN(parsedStartDate.getTime()) ? dayjs(parsedStartDate).format("DD-MM-YYYY") : "Invalid Date",
      startTime: !isNaN(parsedStartTime.getTime())
        ? new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(parsedStartTime).toUpperCase()
        : "Invalid Time",
      endTime: !isNaN(parsedEndTime.getTime())
        ? new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(parsedEndTime).toUpperCase()
        : "Invalid Time",
      srNo: index + 1,
    };
  });

  return (
    <div className="p-4 flex flex-col gap-4">
      <AgTable
        key={meetings.length}
        search
        tableTitle={`${month} ${year} Meetings`}
        data={rows || []}
        columns={columns}
      />
    </div>
  );
};

export default MonthMeetings;