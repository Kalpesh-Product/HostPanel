/**
 * DepartmentVisitorsCard — live visitor approval queue for the current
 * member's department, shown on every department manager dashboard. A
 * standard visitor logged in Visitor Management with this department and a
 * host chosen shows up here for the host to Accept/Reject; once accepted,
 * frontdesk checks the visitor in from Visitor Management itself.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { SectionCard } from "./DashboardShared";
import { useFreshCurrentUser } from "@/hooks/useFreshCurrentUser";
import { getVisitorManagementOverview, reviewVisitorDecision } from "@/services/visitors";

interface VisitorRecord {
  id?: string;
  recordId?: string;
  name?: string;
  fullName?: string;
  hostUserId?: string;
  hostName?: string;
  host?: string;
  hostEmail?: string;
  hostDepartment?: string;
  hostDepartments?: string[];
  hostGroupValue?: string;
  department?: string;
  company?: string;
  reason?: string;
  statusKey?: string;
  approvalStatus?: string;
  status?: string;
  rejectionReason?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

type VisitorDecision = "approved" | "rejected";

interface NoticeState {
  type: "success" | "error";
  text: string;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
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
    return normalizedDepartment && (normalizedValue.includes(normalizedDepartment) || normalizedDepartment.includes(normalizedValue));
  });
}

function formatTimeLabel(value: string | null | undefined): string {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.floor(diffMs / day))}d ago`;
}

function getVisitorStatusLabel(visitor: VisitorRecord): string {
  const status = normalizeText(visitor?.statusKey || visitor?.status || "");
  if (status.includes("checked_in")) return "Checked In";
  if (status.includes("checked_out")) return "Checked Out";
  if (status.includes("approved")) return "Approved";
  if (status.includes("rejected") || status.includes("cancelled")) return "Rejected";
  return "Pending Approval";
}

function getVisitorBadge(status: string) {
  const badgeClass = "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border animate-pulse";
  const baseClass = "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border";
  switch (status) {
    case "Pending Approval":
      return <span className={`${badgeClass} bg-amber-100 text-amber-700 border-amber-200`}>Pending</span>;
    case "Approved":
      return <span className={`${baseClass} bg-blue-100 text-blue-700 border-blue-200`}>Approved</span>;
    case "Checked In":
      return <span className={`${baseClass} bg-emerald-100 text-emerald-700 border-emerald-200`}>Checked In</span>;
    case "Checked Out":
      return <span className={`${baseClass} bg-red-100 text-red-700 border-red-200`}>Checked Out</span>;
    default:
      return <span className={`${baseClass} bg-gray-100 text-gray-700 border-gray-200`}>{status}</span>;
  }
}

function getVisitorTimelineValue(visitor: VisitorRecord): string | null {
  return visitor?.checkOutAt || visitor?.checkInAt || visitor?.updatedAt || visitor?.createdAt || null;
}

interface DepartmentVisitorsCardProps {
  department: string;
  title: string;
}

export const DepartmentVisitorsCard = ({ department, title }: DepartmentVisitorsCardProps) => {
  const currentUser = useFreshCurrentUser();
  const queryClient = useQueryClient();
  const [visitorNotice, setVisitorNotice] = useState<NoticeState | null>(null);
  const [reviewingVisitorId, setReviewingVisitorId] = useState("");

  const queryKey = useMemo(() => ["dashboard-department-visitors", department], [department]);

  const { data: visitors = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const overview = await getVisitorManagementOverview();
      const list = (overview as { visitors?: unknown })?.visitors;
      return Array.isArray(list) ? (list as VisitorRecord[]) : [];
    },
    staleTime: 60 * 1000,
  });

  const currentUserIds = useMemo(() => {
    return [
      currentUser?.id,
      currentUser?._id,
      currentUser?.userId,
      currentUser?.memberId,
      currentUser?.workspaceMembership?.userId,
      currentUser?.workspaceMembership?.memberUserId,
      currentUser?.workspaceMembership?.memberId,
      currentUser?.workspaceMembership?.id,
      currentUser?.workspaceMembership?._id,
      currentUser?.workspace?.userId,
      currentUser?.workspace?.memberId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }, [currentUser]);

  const currentUserName = useMemo(() => normalizeText(currentUser?.fullName || currentUser?.name || currentUser?.displayName || ""), [currentUser]);
  const currentUserEmail = useMemo(() => normalizeText(currentUser?.email || ""), [currentUser]);
  const currentUserDepartments = useMemo(() => {
    const rawDepartments = [
      currentUser?.workspaceMembership?.department,
      ...(Array.isArray(currentUser?.workspaceMembership?.departments) ? currentUser.workspaceMembership.departments.map(toDepartmentName) : []),
      currentUser?.department,
      ...(Array.isArray(currentUser?.departments) ? currentUser.departments.map(toDepartmentName) : []),
      currentUser?.workspace?.department,
    ];
    const normalizedDepartments = rawDepartments.map((value) => normalizeText(value)).filter(Boolean);
    const uniqueDepartments = normalizedDepartments.length > 0 ? Array.from(new Set(normalizedDepartments)) : [department];
    if (!uniqueDepartments.includes(department)) {
      uniqueDepartments.push(department);
    }
    return uniqueDepartments;
  }, [currentUser, department]);

  const filteredVisitors = useMemo(() => {
    return visitors
      .filter((visitor) => {
        const hostUserId = String(visitor?.hostUserId || "").trim();
        const hostName = normalizeText(visitor?.hostName || visitor?.host || "");
        const hostEmail = normalizeText(visitor?.hostEmail || "");
        const hostDepartment = normalizeText(visitor?.department || "");
        const hostGroupValue = normalizeText(visitor?.hostGroupValue || "");
        const hostDepartments = Array.isArray(visitor?.hostDepartments)
          ? visitor.hostDepartments.map((dept) => normalizeText(dept)).filter(Boolean)
          : [];

        const matchedByUser = hostUserId && currentUserIds.includes(hostUserId);
        const matchedByName = currentUserName && hostName && (hostName === currentUserName || hostName.includes(currentUserName) || currentUserName.includes(hostName));
        const matchedByEmail = currentUserEmail && hostEmail && hostEmail === currentUserEmail;
        const matchedByDepartment = currentUserDepartments.length > 0 && [hostDepartment, hostGroupValue, ...hostDepartments].some((value) => departmentMatches(value, currentUserDepartments));

        return matchedByUser || matchedByName || matchedByEmail || matchedByDepartment;
      })
      .filter((visitor) => {
        const key = normalizeText(visitor?.statusKey || visitor?.status || "");
        return key.includes("pending") || key.includes("approved") || key.includes("checked_in") || key === "checked in";
      })
      .slice(0, 4);
  }, [visitors, currentUserDepartments, currentUserEmail, currentUserIds, currentUserName]);

  const handleVisitorDecision = async (visitor: VisitorRecord, decision: VisitorDecision) => {
    const visitorId = visitor?.id || visitor?.recordId;
    if (!visitorId) return;

    const hostUserId = String(visitor?.hostUserId || "").trim();
    if (!hostUserId || !currentUserIds.includes(hostUserId)) {
      setVisitorNotice({ type: "error", text: "Only the assigned host can approve or reject this visitor request." });
      return;
    }

    let rejectionReason = "";
    if (decision === "rejected") {
      rejectionReason = window.prompt(`Reason for rejecting ${visitor.name || "this visitor"}:`, "") || "";
      if (!rejectionReason.trim()) return;
    }

    setReviewingVisitorId(String(visitorId));
    setVisitorNotice(null);

    try {
      await reviewVisitorDecision(visitorId, { decision, reason: rejectionReason.trim() });

      queryClient.setQueryData<VisitorRecord[]>(queryKey, (current = []) =>
        current.map((entry) => {
          const entryId = String(entry.id || entry.recordId || "");
          if (entryId !== String(visitorId)) return entry;
          return {
            ...entry,
            approvalStatus: decision,
            statusKey: decision,
            status: decision === "approved" ? "approved" : "rejected",
            rejectionReason: decision === "rejected" ? rejectionReason.trim() : "",
          };
        }),
      );

      setVisitorNotice({
        type: "success",
        text: decision === "approved"
          ? `${visitor.name || "Visitor"} approved. Frontdesk has been notified.`
          : `${visitor.name || "Visitor"} rejected. Frontdesk has been notified.`,
      });
    } catch (decisionError) {
      setVisitorNotice({ type: "error", text: (decisionError as Error)?.message || "Unable to review the visitor right now." });
    } finally {
      setReviewingVisitorId("");
    }
  };

  const visitorError = error ? (error as Error)?.message || "Visitor requests could not be loaded." : "";

  return (
    <SectionCard title={title} linkLabel="View all" linkRoute="/visitors/visitor-management">
      <div className="space-y-3">
        {visitorError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-small font-pmedium text-amber-700">{visitorError}</div>
        ) : null}

        {visitorNotice ? (
          <div className={`rounded-xl border px-3 py-2 text-small font-pmedium ${visitorNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {visitorNotice.text}
          </div>
        ) : null}

        {isLoading ? (
          <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">Loading live visitor activity...</p></div>
        ) : filteredVisitors.length > 0 ? filteredVisitors.map((visitor) => {
          const visitorKey = visitor.recordId || visitor.id;
          const isPending = normalizeText(visitor?.statusKey || visitor?.approvalStatus || visitor?.status).includes("pending");
          return (
            <div key={visitorKey} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500">
                  <BadgeCheck size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-content font-pmedium text-gray-900 truncate">{visitor.name || visitor.fullName || "Visitor"}</p>
                  <p className="text-small text-gray-500 truncate">To meet: {visitor.hostName || title}</p>
                  <div className="mt-1">{getVisitorBadge(getVisitorStatusLabel(visitor))}</div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-small text-gray-400">{formatTimeLabel(getVisitorTimelineValue(visitor))}</p>
                {String(visitor?.hostUserId || "").trim() &&
                currentUserIds.includes(String(visitor?.hostUserId || "").trim()) &&
                isPending ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVisitorDecision(visitor, "approved")}
                      disabled={Boolean(reviewingVisitorId) && String(visitor.id || visitor.recordId || "") === reviewingVisitorId}
                      className="rounded-md border border-emerald-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVisitorDecision(visitor, "rejected")}
                      disabled={Boolean(reviewingVisitorId) && String(visitor.id || visitor.recordId || "") === reviewingVisitorId}
                      className="rounded-md border border-red-200 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        }) : (
          <div className="min-h-48 flex items-center justify-center"><p className="text-content text-gray-400 text-center">No visitor requests for {title.replace(/ Visitors$/, "")}</p></div>
        )}
      </div>
    </SectionCard>
  );
};

export default DepartmentVisitorsCard;
