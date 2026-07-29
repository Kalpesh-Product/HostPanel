/**
 * TodayAttendanceCard — read-only "working hours / break time" summary for
 * today, shown on the module-access dashboard (admin/manager/employee).
 *
 * Deliberately does NOT re-implement clock-in/out here: the real flow
 * (selfie capture + geolocation) lives on AttendancePage.tsx. This card just
 * reads today's record via the same working service that page uses
 * (getMyAttendance) and links there for the actual action.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Clock, Coffee, LogIn, LogOut, ArrowRight } from "lucide-react";
import { getMyAttendance } from "../../../../services/attendance";
import { formatTime12h } from "../../../../utils/time";
import { getWorkspaceDateKey } from "../../../../lib/workspaceLocalization";
import useWorkspacePreferences from "../../../../hooks/useWorkspacePreferences";

const ATTENDANCE_ROUTE = "/extra-common-modules/attendance";

const formatDuration = (hours?: number): string => {
  if (hours == null || isNaN(hours)) return "--";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const TodayAttendanceCard = () => {
  const navigate = useNavigate();
  const workspacePreferences = useWorkspacePreferences();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-today-attendance"],
    queryFn: async () => {
      const res = await getMyAttendance();
      const records = Array.isArray(res?.data?.records)
        ? res.data.records
        : Array.isArray(res?.records)
          ? res.records
          : [];
      return records;
    },
    staleTime: 60 * 1000,
  });

  const todayRecord = useMemo(() => {
    const records = Array.isArray(data) ? data : [];
    const todayKey = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
    return records.find((record: any) => record?.date === todayKey) || null;
  }, [data, workspacePreferences.timezone]);

  const status: "checked_out" | "checked_in" | "on_break" = todayRecord?.checkOut
    ? "checked_out"
    : todayRecord?.checkIn
      ? "checked_in"
      : "checked_out";

  const breakMinutes = useMemo(() => {
    if (!todayRecord || !Array.isArray(todayRecord.breaks)) return 0;
    return todayRecord.breaks.reduce((sum: number, entry: any) => sum + (Number(entry?.duration) || 0), 0);
  }, [todayRecord]);

  const statusConfig = {
    checked_in: { label: "Checked In", icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-100" },
    on_break: { label: "On Break", icon: Coffee, color: "text-amber-600", bg: "bg-amber-100" },
    checked_out: { label: todayRecord?.checkIn ? "Checked Out" : "Not Checked In", icon: LogOut, color: "text-slate-600", bg: "bg-slate-100" },
  }[status];

  const StatusIcon = statusConfig.icon;

  if (isLoading) {
    return <div className="h-24 rounded-xl border border-borderGray bg-white animate-pulse" />;
  }

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-borderGray bg-white p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(ATTENDANCE_ROUTE)}
    >
      <div className={`p-3 rounded-2xl ${statusConfig.bg} ${statusConfig.color} flex-shrink-0`}>
        <StatusIcon size={20} />
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-2">
        <div>
          <p className="text-small text-gray-500">Status</p>
          <p className="text-content font-pmedium text-gray-900">{statusConfig.label}</p>
        </div>
        <div>
          <p className="text-small text-gray-500">Clock In</p>
          <p className="text-content font-pmedium text-gray-900">
            {todayRecord?.checkIn ? formatTime12h(todayRecord.checkIn) : "--"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-gray-400" />
          <div>
            <p className="text-small text-gray-500">Working Hours</p>
            <p className="text-content font-pmedium text-gray-900">
              {formatDuration(todayRecord?.totalHours ?? (todayRecord?.workingHours ? Number(todayRecord.workingHours) : undefined))}
            </p>
          </div>
        </div>
        <div>
          <p className="text-small text-gray-500">Break Time</p>
          <p className="text-content font-pmedium text-gray-900">{formatDuration(breakMinutes / 60)}</p>
        </div>
      </div>
      <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
    </div>
  );
};

export default TodayAttendanceCard;
