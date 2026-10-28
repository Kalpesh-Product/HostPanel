/**
 * TeamLiveStatusCard — real-time attendance roster for the current member's
 * department, shown on every department manager dashboard (HR, Administration,
 * Sales, Finance, Maintenance, Tech, IT). Self-contained: fetches its own data
 * and filters to whichever department is passed in, falling back to that
 * department if the member's own profile data doesn't list it.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Radio, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import { getTeamAttendance } from "@/services/attendance";

interface AttendanceRecord {
  id?: string;
  userId?: string;
  employeeId?: string;
  employeeName?: string;
  employeeRole?: string;
  name?: string;
  role?: string;
  department?: string;
  departments?: string[];
  checkIn?: string;
  checkInAt?: string | null;
  clockIn?: string;
  startedAt?: string;
  checkOut?: string;
  checkOutAt?: string | null;
  clockOut?: string;
  endedAt?: string;
  status?: string;
  displayStatus?: string;
  leaveMode?: string;
  mode?: string;
}

interface RosterEntry {
  id: string;
  name: string;
  role: string;
  status: string;
  avatar: string;
  checkInLabel: string;
  checkOutLabel: string;
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toDepartmentName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    return String((value as { name?: unknown }).name || "");
  }
  return "";
}

function departmentMatches(value = "", departmentKeys: string[] = []): boolean {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return false;
  return departmentKeys.some((department) => {
    const normalizedDepartment = normalizeText(department);
    return (
      normalizedDepartment &&
      (normalizedValue.includes(normalizedDepartment) ||
        normalizedDepartment.includes(normalizedValue))
    );
  });
}

function initialsFor(name = ""): string {
  return (
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "T"
  );
}

function formatTimeOnly(value: unknown): string {
  if (!value) return "--";
  const text = String(value).trim();
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(text)) {
    return text.toUpperCase();
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAttendanceStatusLabel(row: AttendanceRecord = {}): string {
  const normalized = normalizeText(
    row?.displayStatus || row?.status || row?.leaveMode || row?.mode || "",
  );
  if (normalized.includes("present late")) return "Present Late";
  if (normalized === "late") return "Present Late";
  if (normalized === "half-day" || normalized === "half_day") return "Half Day";
  if (
    normalized.includes("on_leave") ||
    normalized.includes("on leave") ||
    normalized.includes("leave")
  )
    return "On Leave";
  if (normalized === "on_break" || normalized.includes("break"))
    return "On Break";
  if (normalized.includes("checked in") || normalized.includes("present"))
    return "Present";
  if (normalized.includes("absent")) return "Absent";
  if (row?.checkInAt || row?.checkIn) return "Present";
  return "Absent";
}

function getAttendanceStatusUI(status = ""): {
  dot: string;
  text: string;
  icon: LucideIcon | null;
  label: string;
} {
  const normalized = normalizeText(status);
  if (normalized.includes("present late") || normalized === "late") {
    return {
      dot: "bg-amber-500 shadow-amber-500/50",
      text: "text-amber-600",
      icon: CheckCircle2,
      label: "Present Late",
    };
  }
  if (normalized.includes("present") || normalized.includes("checked in")) {
    return {
      dot: "bg-emerald-500 shadow-emerald-500/50",
      text: "text-emerald-600",
      icon: CheckCircle2,
      label: "Present",
    };
  }
  if (normalized.includes("break")) {
    return {
      dot: "bg-blue-500 shadow-blue-500/50",
      text: "text-blue-600",
      icon: Users,
      label: "On Break",
    };
  }
  if (normalized.includes("leave")) {
    return {
      dot: "bg-slate-400 shadow-slate-400/50",
      text: "text-slate-500",
      icon: null,
      label: "On Leave",
    };
  }
  return {
    dot: "bg-slate-400 shadow-slate-400/50",
    text: "text-slate-500",
    icon: null,
    label: "Absent",
  };
}

interface TeamLiveStatusCardProps {
  /** Omit to show a workspace-wide roster (e.g. the founder dashboard) instead of filtering to one department. */
  department?: string;
  viewAllRoute?: string;
}

export const TeamLiveStatusCard = ({
  department,
  viewAllRoute = "/common-modules/attendance",
}: TeamLiveStatusCardProps) => {
  const currentUser = useFreshCurrentUser();

  const currentUserDepartments = useMemo(() => {
    if (!department) return [];
    const rawDepartments = [
      currentUser?.workspaceMembership?.department,
      ...(Array.isArray(currentUser?.workspaceMembership?.departments)
        ? currentUser.workspaceMembership.departments.map(toDepartmentName)
        : []),
      currentUser?.department,
      ...(Array.isArray(currentUser?.departments)
        ? currentUser.departments.map(toDepartmentName)
        : []),
      currentUser?.workspace?.department,
    ];

    const normalizedDepartments = rawDepartments
      .map((value) => normalizeText(value))
      .filter(Boolean);
    const uniqueDepartments =
      normalizedDepartments.length > 0
        ? Array.from(new Set(normalizedDepartments))
        : [department];

    if (!uniqueDepartments.includes(department)) {
      uniqueDepartments.push(department);
    }

    return uniqueDepartments;
  }, [currentUser, department]);

  const { data: teamAttendance = [], isLoading } = useQuery({
    queryKey: ["dashboard-team-live-status", department],
    queryFn: async () => {
      const response = await getTeamAttendance({
        date: new Date().toISOString().slice(0, 10),
      });
      const records = (response as { records?: unknown })?.records;
      return Array.isArray(records) ? (records as AttendanceRecord[]) : [];
    },
    staleTime: 60 * 1000,
  });

  const liveTeamRoster = useMemo<RosterEntry[]>(() => {
    const statusOrder: Record<string, number> = {
      Present: 0,
      "Present Late": 1,
      "On Break": 2,
      "Half Day": 3,
      "On Leave": 4,
      Absent: 5,
    };

    return teamAttendance
      .filter((row) => {
        if (!department) return true;
        const rowDepartmentValues = [
          row?.department,
          row?.role,
          row?.employeeRole,
          ...(Array.isArray(row?.departments) ? row.departments : []),
        ];
        return rowDepartmentValues.some((value) =>
          departmentMatches(value, currentUserDepartments),
        );
      })
      .map((row, index) => ({
        id:
          row?.userId ||
          row?.employeeId ||
          row?.id ||
          `${row?.name || "staff"}-${index}`,
        name: row?.name || row?.employeeName || "Team Member",
        role: row?.role || row?.employeeRole || row?.department || "Employee",
        status: getAttendanceStatusLabel(row),
        avatar: initialsFor(row?.name || row?.employeeName || row?.role || "T"),
        checkInLabel: formatTimeOnly(
          row?.checkInAt ||
            row?.checkIn ||
            row?.clockIn ||
            row?.startedAt ||
            null,
        ),
        checkOutLabel: formatTimeOnly(
          row?.checkOutAt ||
            row?.checkOut ||
            row?.clockOut ||
            row?.endedAt ||
            null,
        ),
      }))
      .sort(
        (left, right) =>
          (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99),
      )
      .slice(0, 4);
  }, [currentUserDepartments, teamAttendance, department]);

  const presentCount = liveTeamRoster.filter((staff) =>
    normalizeText(staff.status).includes("present"),
  ).length;

  return (
    <section className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Radio size={17} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
              Team Live Status
            </h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Today&apos;s department attendance and punch activity.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-emerald-700">
            {presentCount}/{liveTeamRoster.length} present
          </span>
          <Link
            to={viewAllRoute}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            title="View attendance"
          >
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="max-h-[320px] flex-1 space-y-2.5 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <p className="text-[11px] text-slate-400">Loading team status...</p>
          </div>
        ) : liveTeamRoster.length > 0 ? (
          liveTeamRoster.map((staff) => {
            const statusUI = getAttendanceStatusUI(staff.status);
            return (
              <div
                key={staff.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition hover:border-blue-100 hover:bg-blue-50/40"
              >
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3D73] text-[11px] font-pbold text-white">
                    {staff.avatar}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${statusUI.dot}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[11px] font-pmedium text-slate-900">
                      {staff.name}
                    </p>
                    <span
                      className={`flex-shrink-0 rounded-md bg-white px-2 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] ${statusUI.text}`}
                    >
                      {statusUI.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {staff.role}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    In {staff.checkInLabel}{" "}
                    {staff.checkOutLabel !== "--"
                      ? `• Out ${staff.checkOutLabel}`
                      : ""}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-48 items-center justify-center">
            <p className="text-[11px] text-slate-400">No roster data yet</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TeamLiveStatusCard;
