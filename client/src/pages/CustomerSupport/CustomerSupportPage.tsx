import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import PageFrame from "../../components/Pages/PageFrame";

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Resolved"
  | "Closed"
  | "Pending"
  | "Escalated"
  | "Rejected";

type SupportTicket = {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  status: TicketStatus;
  requestedAt: string;
  requestedByName: string;
  requestedByEmail: string;
  acceptedByName: string;
  acceptedByEmail: string;
  resolvedByName: string;
  resolvedByEmail: string;
  role: string;
  department: string | null;
  workspaceName: string;
  image: { id: string; url: string };
  resolutionMessage: string;
  resolutionAttachment: { id: string; url: string };
  resolvedAt: string | null;
  closedByUserAt: string | null;
};

type SupportPayload = {
  raised: SupportTicket[];
  history: SupportTicket[];
};

const statusPillClass: Record<TicketStatus, string> = {
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Closed: "bg-green-100 text-green-700",
  Pending: "bg-slate-100 text-slate-700",
  Escalated: "bg-red-100 text-red-700",
  Rejected: "bg-rose-100 text-rose-700",
};

const SUPPORT_TICKETS_API = "/api/tickets/support-tickets";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function CustomerSupportPage() {
  const axios = useAxiosPrivate();
  const [activeTab, setActiveTab] = useState<"raised" | "history">("raised");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [supportData, setSupportData] = useState<SupportPayload>({
    raised: [],
    history: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const currentList = useMemo(
    () => (activeTab === "raised" ? supportData.raised : supportData.history),
    [activeTab, supportData],
  );

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(SUPPORT_TICKETS_API);
      const payload = response?.data?.data || {};
      setSupportData({
        raised: Array.isArray(payload?.raised) ? payload.raised : [],
        history: Array.isArray(payload?.history) ? payload.history : [],
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load support tickets.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setImageFile(null);
  };

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      if (imageFile) formData.append("image", imageFile);

      await axios.post(SUPPORT_TICKETS_API, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Support ticket submitted.");
      resetCreateForm();
      setIsCreateModalOpen(false);
      setActiveTab("raised");
      await loadTickets();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit support ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeTicket = async (ticket: SupportTicket) => {
    try {
      setIsSubmitting(true);
      await axios.patch(`${SUPPORT_TICKETS_API}/${ticket.id}/close`);
      toast.success(`Ticket ${ticket.ticketId} closed.`);
      await loadTickets();
      setIsDetailsModalOpen(false);
      setSelectedTicket(null);
      setActiveTab("history");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to close ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsSubmitting(true);
      await axios.post(`${SUPPORT_TICKETS_API}/${selectedTicket.id}/follow-up`, {
        description: followUpDescription.trim(),
      });
      toast.success("Follow-up issue raised successfully.");
      setIsFollowUpModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedTicket(null);
      setFollowUpDescription("");
      await loadTickets();
      setActiveTab("raised");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create follow-up ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageFrame>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase">Customer Support</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track issue lifecycle with clear ownership and resolution context.
            </p>
          </div>

          <div className="w-full md:w-auto md:flex md:justify-end">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full md:w-auto bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Raise Issue
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5EAF1] rounded-2xl shadow-[0_10px_30px_rgba(17,24,39,0.06)] overflow-hidden">
          <div className="px-5 sm:px-7 border-b border-[#E8EDF4] bg-[#FAFBFD]">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("raised")}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "raised"
                    ? "text-[#1E3D73] border-[#1E3D73]"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                Issue Raised
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "history"
                    ? "text-[#1E3D73] border-[#1E3D73]"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                History of Issues
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading tickets...</div>
            ) : currentList.length === 0 ? (
              <div className="text-sm text-gray-500">No issues found.</div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-[#EDF1F6]">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-[#F7F9FC]">
                    <tr>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Ticket ID
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Issue Title
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Requested At
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Resolved By
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Accepted By
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-[#4B5563] text-left whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-[#FBFCFE]">
                        <td className="px-3 py-3.5 text-sm text-gray-700 border-t border-[#EEF2F7] whitespace-nowrap">
                          {ticket.ticketId || "-"}
                        </td>
                        <td className="px-3 py-3.5 text-sm text-gray-800 border-t border-[#EEF2F7]">
                          <div className="truncate font-medium">{ticket.title}</div>
                        </td>
                        <td className="px-3 py-3.5 text-sm text-gray-700 border-t border-[#EEF2F7] whitespace-nowrap">
                          {formatDate(ticket.requestedAt)}
                        </td>
                        <td className="px-3 py-3.5 text-sm text-gray-700 border-t border-[#EEF2F7] whitespace-nowrap">
                          {ticket.resolvedByName || "-"}
                        </td>
                        <td className="px-3 py-3.5 text-sm border-t border-[#EEF2F7]">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              statusPillClass[ticket.status] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-sm text-gray-700 border-t border-[#EEF2F7] whitespace-nowrap">
                          {ticket.acceptedByName || "-"}
                        </td>
                        <td className="px-3 py-3.5 text-sm border-t border-[#EEF2F7] whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setIsDetailsModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#E9EEF8] text-[#1E3D73] hover:bg-[#DDE6F5]"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Raise a Support Issue
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitTicket} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="issue-title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="issue-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter issue title"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1E3D73]/20 focus:border-[#1E3D73]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="issue-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description / Issue
                </label>
                <textarea
                  id="issue-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Describe the issue in detail"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-[#1E3D73]/20 focus:border-[#1E3D73]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="issue-image"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Image Upload (Optional)
                </label>
                <label
                  htmlFor="issue-image"
                  className="w-full border border-dashed border-gray-300 rounded-md px-3 py-3 flex items-center justify-center gap-2 text-sm text-gray-600 cursor-pointer hover:border-[#1E3D73]"
                >
                  <Upload size={16} />
                  {imageFile ? imageFile.name : "Choose an image file"}
                </label>
                <input
                  id="issue-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setImageFile(file || null);
                  }}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDetailsModalOpen && selectedTicket ? (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-xl max-h-[72vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                Ticket Details
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedTicket(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close details modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto max-h-[calc(72vh-110px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Ticket ID:</span> <span className="font-medium text-gray-800">{selectedTicket.ticketId || "-"}</span></div>
                <div><span className="text-gray-500">Workspace:</span> <span className="font-medium text-gray-800">{selectedTicket.workspaceName || "-"}</span></div>
                <div><span className="text-gray-500">Role:</span> <span className="font-medium text-gray-800">{selectedTicket.role || "-"}</span></div>
                <div><span className="text-gray-500">Department:</span> <span className="font-medium text-gray-800">{selectedTicket.department || "-"}</span></div>
                <div><span className="text-gray-500">Requested At:</span> <span className="font-medium text-gray-800">{formatDate(selectedTicket.requestedAt)}</span></div>
                <div><span className="text-gray-500">Accepted By:</span> <span className="font-medium text-gray-800">{selectedTicket.acceptedByName || "-"}</span></div>
                <div><span className="text-gray-500">Resolved By:</span> <span className="font-medium text-gray-800">{selectedTicket.resolvedByName || "-"}</span></div>
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Status:</span>{" "}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusPillClass[selectedTicket.status]}`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E7EEF5] rounded-lg p-2.5">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Issue Title</div>
                <div className="text-sm font-medium text-gray-900">{selectedTicket.title || "-"}</div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E7EEF5] rounded-lg p-2.5">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Issue Description / Follow Up</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-20 overflow-y-auto pr-1">{selectedTicket.description || "-"}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#F8FAFC] border border-[#E7EEF5] rounded-lg p-2.5">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Issue Attachment</div>
                  {selectedTicket.image?.url ? (
                    <a href={selectedTicket.image.url} target="_blank" rel="noreferrer" className="text-sm text-[#1E3D73] underline">
                      View Uploaded Image
                    </a>
                  ) : (
                    <div className="text-sm text-gray-500">No attachment</div>
                  )}
                </div>
                <div className="bg-[#F8FAFC] border border-[#E7EEF5] rounded-lg p-2.5">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Resolution Attachment</div>
                  {selectedTicket.resolutionAttachment?.url ? (
                    <a href={selectedTicket.resolutionAttachment.url} target="_blank" rel="noreferrer" className="text-sm text-[#1E3D73] underline">
                      View Resolution File
                    </a>
                  ) : (
                    <div className="text-sm text-gray-500">No resolution attachment</div>
                  )}
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E7EEF5] rounded-lg p-2.5">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Resolution</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-20 overflow-y-auto pr-1">{selectedTicket.resolutionMessage || "-"}</div>
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-gray-200 flex flex-wrap gap-2 justify-end bg-white">
              {selectedTicket.status === "Resolved" ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void closeTicket(selectedTicket)}
                  className="px-4 py-2 rounded-md text-sm bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                >
                  Close Ticket
                </button>
              ) : null}
              {selectedTicket.status === "Resolved" ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsFollowUpModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-md text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  Follow Up
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isFollowUpModalOpen && selectedTicket ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Follow Up Issue
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsFollowUpModalOpen(false);
                  setFollowUpDescription("");
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close follow-up modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitFollowUp} className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Follow-up for ticket{" "}
                <span className="font-medium">{selectedTicket.ticketId || "-"}</span>.
              </p>
              <div>
                <label
                  htmlFor="followup-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Follow Up Message (Optional)
                </label>
                <textarea
                  id="followup-description"
                  value={followUpDescription}
                  onChange={(event) => setFollowUpDescription(event.target.value)}
                  rows={4}
                  placeholder="Explain what is still pending or unresolved."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-[#1E3D73]/20 focus:border-[#1E3D73]"
                />
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Submit Follow Up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
