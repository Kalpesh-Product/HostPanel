import { useState } from "react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageFrame from "../../../components/Pages/PageFrame";
import { toast } from "sonner";
import { MdVerified } from "react-icons/md";
import {
  BadgeCheck,
  Ban,
  BadgeX,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Target,
  XCircle,
} from "lucide-react";
import { statusPillClass } from "../../../lib/status-pill";
import VerifyBusinessForm from "./VerifyBusinessForm";
import { TIER_OPTIONS } from "./verifyBusinessTiers";

type Tab = "listings" | "status" | "history";

const TAB_LABELS: Record<Tab, string> = {
  listings: "Listings",
  status: "Status",
  history: "Payment History",
};

// Public page for a listing on wono.co — same helper/URL shape as the
// Listings page's own "Open this listing live on wono.co" link.
function getLiveListingUrl(item: any) {
  const name = String(item?.companyName || "").trim();
  if (!name) return "";
  const params = new URLSearchParams();
  const type = String(item?.companyType || "").trim();
  const city = String(item?.city || "").trim();
  const country = String(item?.country || "").trim();
  if (type) params.set("companyType", type);
  if (city) params.set("state", city);
  if (country) params.set("country", country);
  const query = params.toString();
  return `https://wono.co/listings/${encodeURIComponent(name)}${query ? `?${query}` : ""}`;
}

function getInitials(value: string) {
  return (
    String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "N"
  );
}

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const tierLabel = (value?: string | null) =>
  TIER_OPTIONS.find((t) => t.value === value)?.label || value || "--";

// Same rule the server applies when the payment lands: a renewal / plan
// change starts when the current plan ends (so no paid days are lost), or
// today if it has already expired.
const projectPeriod = (currentExpiry?: string | null, tier?: string) => {
  const months = TIER_OPTIONS.find((t) => t.value === tier)?.months || 1;
  const expiry = currentExpiry ? new Date(currentExpiry) : null;
  const stillActive = Boolean(expiry && expiry.getTime() > Date.now());
  const start = stillActive ? new Date(expiry as Date) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return { start, end, stillActive };
};

const VerifyBusiness = () => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("listings");
  const [formOpen, setFormOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState("1m");

  const { data: overview, isPending } = useQuery({
    queryKey: ["verify-business-overview"],
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/verify-business/overview");
      return response.data;
    },
  });

  const { data: history = [], isPending: isHistoryPending } = useQuery({
    queryKey: ["verify-business-history"],
    queryFn: async () => {
      const response = await axiosPrivate.get("/api/verify-business/history");
      return response.data?.data || [];
    },
    enabled: tab === "history",
  });

  const payMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await axiosPrivate.post("/api/verify-business/pay", {
        requestedTier: tier,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.paymentLinkUrl) {
        window.location.href = data.paymentLinkUrl;
      } else {
        toast.error("Payment link wasn't returned — please try again.");
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to start payment",
      );
    },
  });

  const badgeVisibilityMutation = useMutation({
    mutationFn: async ({
      businessId,
      hidden,
    }: {
      businessId: string;
      hidden: boolean;
    }) => {
      const response = await axiosPrivate.patch(
        "/api/verify-business/badge-visibility",
        { businessId, hidden },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verify-business-overview"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update badge visibility",
      );
    },
  });

  const verification = overview?.verification;
  const reqStatus: string | undefined = verification?.status;
  const isPaid = verification?.paymentStatus === "paid";
  const expired = Boolean(
    verification?.verificationExpiresAt &&
      new Date(verification.verificationExpiresAt) <= new Date(),
  );
  const listings = overview?.listings || [];
  const paidHistory = history.filter((h: any) => h.status === "paid");
  const canPay = reqStatus === "approved";
  // First payment after approval uses the plan already chosen in the form —
  // no second plan prompt. Renew / change plan (already paid before) still
  // lets the host pick a different plan.
  const firstPaymentDue = canPay && !isPaid;
  const verifiedNow = isPaid && !expired;

  let statusLabel = "Not Verified";
  if (isPaid && !expired) {
    statusLabel = `Verified until ${formatDate(verification.verificationExpiresAt)}`;
  } else if (isPaid && expired) {
    statusLabel = "Expired";
  } else if (reqStatus === "approved") {
    statusLabel = "Approved — Payment Pending";
  } else if (reqStatus === "pending") {
    statusLabel = "Under Review";
  } else if (reqStatus === "rejected") {
    statusLabel = "Rejected";
  }

  const openPlanModal = (tier?: string) => {
    // Retired plans (3m / 6m) on older records fall back to the first plan.
    const preferred = tier || verification?.activeTier || verification?.requestedTier;
    setSelectedTier(
      TIER_OPTIONS.some((t) => t.value === preferred) ? preferred : TIER_OPTIONS[0].value,
    );
    setPlanModalOpen(true);
  };

  const handleEnableClick = (item: any) => {
    if (item.isVerified) {
      // Already actively verified — just re-show the badge, no payment needed.
      badgeVisibilityMutation.mutate({
        businessId: item.businessId,
        hidden: false,
      });
      return;
    }
    if (reqStatus === "pending") {
      setTab("status");
      return;
    }
    if (firstPaymentDue) {
      payMutation.mutate(verification?.requestedTier || "1m");
      return;
    }
    if (canPay) {
      openPlanModal();
      return;
    }
    setFormOpen(true);
  };

  const handleDisableClick = (item: any) => {
    badgeVisibilityMutation.mutate({
      businessId: item.businessId,
      hidden: true,
    });
  };

  const enableTitle = (item: any) => {
    if (item.isVerified) return "Enable - show the verified badge on this listing";
    if (reqStatus === "pending")
      return "Pending review - see the Status tab";
    if (firstPaymentDue)
      return `Pay Now - ${tierLabel(verification?.requestedTier)} plan`;
    if (canPay) return "Approved - choose a plan and pay";
    return "Enable - submit this business for verification";
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Verify Business
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Get a blue verified badge on your active, public Nomads listings.
              </p>
            </div>
          </div>

          {isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-slate-300" size={28} />
            </div>
          ) : (
            <>
              {/* STATUS BAR */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500 mb-1">
                    {overview?.companyName}
                  </p>
                  <span
                    className={statusPillClass(
                      isPaid ? (expired ? "expired" : "active") : reqStatus || "not verified",
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
                {!verification && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!overview?.eligible) {
                        toast.error(
                          "Enable at least one listing to submit request for verification",
                        );
                        return;
                      }
                      setFormOpen(true);
                    }}
                    className="bg-[#2563EB] text-white px-5 py-2.5 rounded-2xl font-pmedium text-[11px] shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Verify Business
                  </button>
                )}
              </div>

              {/* TABS - same pill style as the shared TabLayout */}
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex-1 min-w-[120px] rounded-xl px-4 py-2 text-center text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                      tab === key
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {TAB_LABELS[key]}
                  </button>
                ))}
              </div>

              {tab === "listings" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left min-w-[1180px]">
                      <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr>
                          <th className="px-5 py-4 whitespace-nowrap">Sr No</th>
                          <th className="px-5 py-4 whitespace-nowrap">Company Name</th>
                          <th className="px-5 py-4 whitespace-nowrap">Title</th>
                          <th className="px-5 py-4 whitespace-nowrap">Type</th>
                          <th className="px-5 py-4 whitespace-nowrap">Country</th>
                          <th className="px-5 py-4 whitespace-nowrap">State</th>
                          <th className="px-5 py-4 whitespace-nowrap">City</th>
                          <th className="px-5 py-4 whitespace-nowrap">Master Status</th>
                          <th className="px-5 py-4 whitespace-nowrap">Visibility</th>
                          <th className="px-5 py-4 text-center whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {listings.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-5 py-16 text-center">
                              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400 mx-auto">
                                <Target size={28} />
                              </div>
                              <p className="text-slate-400 font-pmedium">No listings found.</p>
                            </td>
                          </tr>
                        ) : (
                          listings.map((item: any, idx: number) => {
                            const eligible = item.isActive && item.isPublic;
                            const badgeVisible =
                              item.verifiedBadgeVisible ??
                              (item.isVerified && !item.verifiedBadgeHidden);
                            const isMutatingThisRow =
                              (badgeVisibilityMutation.isPending &&
                                badgeVisibilityMutation.variables?.businessId === item.businessId) ||
                              (firstPaymentDue && !item.isVerified && payMutation.isPending);
                            const pendingReview = !item.isVerified && reqStatus === "pending";

                            return (
                              <tr
                                key={item._id || item.businessId || idx}
                                className="hover:bg-slate-50/50 transition-colors group"
                              >
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="text-[12px] font-pmedium text-slate-400">{idx + 1}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[9px] font-pmedium text-white shadow-sm">
                                      {getInitials(item.companyName)}
                                    </div>
                                    <div>
                                      <p className="text-[12px] font-pmedium text-slate-900 flex items-center gap-1">
                                        {item.companyName || "—"}
                                        {badgeVisible && (
                                          <span
                                            title={
                                              item.verificationExpiresAt
                                                ? `Verified · expires ${formatDate(item.verificationExpiresAt)}`
                                                : "Verified"
                                            }
                                            className="inline-flex items-center"
                                          >
                                            <MdVerified size={14} className="text-[#1d9bf0]" />
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="text-[12px] font-pmedium text-slate-600">{item.companyTitle || "—"}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="text-[12px] font-pmedium text-slate-600 capitalize">{item.companyType || "—"}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="text-[12px] font-pmedium text-slate-600">{item.country || "—"}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="text-[12px] font-pmedium text-slate-600">{item.state || "—"}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className="text-[12px] font-pmedium text-slate-600">{item.city || "—"}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className={statusPillClass(item.isActive ? "Active" : "Inactive")}>
                                    {item.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span className={statusPillClass(item.isPublic ? "Active" : "Inactive")}>
                                    {item.isPublic ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    {item.isActive && item.isPublic && getLiveListingUrl(item) ? (
                                      <a
                                        href={getLiveListingUrl(item)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open this listing live on wono.co"
                                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                                      >
                                        <ExternalLink size={15} strokeWidth={2.5} />
                                      </a>
                                    ) : null}
                                    {!eligible ? (
                                      <span
                                        title="Not eligible - activate and publish this listing first"
                                        className="inline-flex p-1.5 text-slate-300"
                                      >
                                        <Ban size={15} strokeWidth={2.5} />
                                      </span>
                                    ) : (
                                      <>
                                      {badgeVisible ? (
                                        <button
                                          type="button"
                                          disabled={isMutatingThisRow}
                                          onClick={() => handleDisableClick(item)}
                                          title="Disable - hide the verified badge on this listing"
                                          aria-label="Disable verified badge"
                                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50"
                                        >
                                          {isMutatingThisRow ? (
                                            <Loader2 size={15} className="animate-spin" />
                                          ) : (
                                            <BadgeX size={15} strokeWidth={2.5} />
                                          )}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={isMutatingThisRow}
                                          onClick={() => handleEnableClick(item)}
                                          title={enableTitle(item)}
                                          aria-label={enableTitle(item)}
                                          className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${
                                            pendingReview
                                              ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                              : "bg-blue-50 text-[#2563EB] hover:bg-blue-100"
                                          }`}
                                        >
                                          {isMutatingThisRow ? (
                                            <Loader2 size={15} className="animate-spin" />
                                          ) : pendingReview ? (
                                            <Clock size={15} strokeWidth={2.5} />
                                          ) : firstPaymentDue && !item.isVerified ? (
                                            <CreditCard size={15} strokeWidth={2.5} />
                                          ) : (
                                            <BadgeCheck size={15} strokeWidth={2.5} />
                                          )}
                                        </button>
                                      )}
                                      {item.isVerified && (
                                        <button
                                          type="button"
                                          disabled={isMutatingThisRow}
                                          onClick={() => openPlanModal()}
                                          title="Renew / Change Plan"
                                          aria-label="Renew or change plan"
                                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
                                        >
                                          <RefreshCw size={15} strokeWidth={2.5} />
                                        </button>
                                      )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "status" && (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  {!verification ? (
                    <div className="py-10 text-center">
                      <BadgeCheck size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-pmedium mb-4">
                        You haven't submitted this business for verification yet.
                      </p>
                      <button
                        type="button"
                        disabled={!overview?.eligible}
                        onClick={() => setFormOpen(true)}
                        title={
                          overview?.eligible
                            ? undefined
                            : "Activate and publish at least one listing first"
                        }
                        className="bg-[#2563EB] text-white px-5 py-2.5 rounded-2xl font-pmedium text-[11px] shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Verify Business
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          {reqStatus === "approved" ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : reqStatus === "rejected" ? (
                            <XCircle size={18} className="text-rose-500" />
                          ) : (
                            <Clock size={18} className="text-amber-500" />
                          )}
                          <span className={statusPillClass(reqStatus || "pending")}>
                            {reqStatus === "pending" ? "Pending Review" : reqStatus}
                          </span>
                        </div>
                        <p className="text-[11px] font-pmedium text-slate-500">
                          Submitted {formatDate(verification.updatedAt || verification.createdAt)}
                        </p>
                      </div>

                      {reqStatus === "pending" && (
                        <p className="text-[12px] font-pmedium text-slate-600">
                          Our team is reviewing your details and documents. Once
                          approved, you'll be able to choose a plan and pay here.
                        </p>
                      )}

                      {reqStatus === "rejected" && (
                        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
                          <p className="text-[10px] font-pmedium uppercase tracking-widest text-rose-500 mb-1">
                            Reason
                          </p>
                          <p className="text-[12px] font-pmedium text-rose-700">
                            {verification.rejectionReason || "No reason was provided."}
                          </p>
                          <button
                            type="button"
                            onClick={() => setFormOpen(true)}
                            className="mt-3 bg-[#2563EB] text-white px-4 py-2 rounded-xl font-pmedium text-[11px] shadow-sm hover:bg-blue-700"
                          >
                            Edit &amp; Resubmit
                          </button>
                        </div>
                      )}

                      {reqStatus === "approved" && (
                        <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[12px] font-pmedium text-emerald-800">
                            {verifiedNow
                              ? `Verified until ${formatDate(verification.verificationExpiresAt)}.`
                              : `Approved. Pay for your ${tierLabel(verification.requestedTier)} plan to get your verified badge. The payment link is also emailed to ${verification.email}.`}
                          </p>
                          <button
                            type="button"
                            disabled={payMutation.isPending}
                            onClick={() =>
                              firstPaymentDue
                                ? payMutation.mutate(verification?.requestedTier || "1m")
                                : openPlanModal()
                            }
                            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl font-pmedium text-[11px] shadow-sm hover:bg-blue-700 disabled:opacity-60"
                          >
                            {payMutation.isPending && firstPaymentDue ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : null}
                            {isPaid
                              ? "Renew / Change Plan"
                              : `Pay Now — ${tierLabel(verification?.requestedTier)}`}
                          </button>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500 mb-2">
                          Submitted Documents
                        </p>
                        {Array.isArray(verification.proofDocuments) &&
                        verification.proofDocuments.length ? (
                          <div className="flex flex-col gap-1.5">
                            {verification.proofDocuments.map((doc: any) => (
                              <a
                                key={doc.url}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-max items-center gap-1.5 text-[12px] font-pmedium text-blue-600 underline"
                              >
                                <FileText size={13} /> {doc.label || "Document"}
                                <ExternalLink size={11} />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[12px] font-pmedium text-slate-400">
                            No documents on file.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "history" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {isHistoryPending ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-slate-300" size={24} />
                    </div>
                  ) : paidHistory.length === 0 ? (
                    <p className="text-slate-400 font-pmedium text-center py-12">
                      No payments yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[640px]">
                        <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                          <tr>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Type</th>
                            <th className="px-5 py-4">Plan</th>
                            <th className="px-5 py-4">Amount</th>
                            <th className="px-5 py-4">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {paidHistory.map((entry: any) => (
                            <tr key={entry._id}>
                              <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">
                                {formatDate(entry.paidAt)}
                              </td>
                              <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700 capitalize">
                                {entry.changeType}
                              </td>
                              <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">
                                {tierLabel(entry.tier)}
                              </td>
                              <td className="px-5 py-4 text-[12px] font-pmedium text-slate-700">
                                ${entry.amount}
                              </td>
                              <td className="px-5 py-4 text-[12px] font-pmedium">
                                {entry.hostedInvoiceUrl || entry.invoicePdfUrl ? (
                                  <a
                                    href={entry.hostedInvoiceUrl || entry.invoicePdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline inline-flex items-center gap-1"
                                  >
                                    Invoice <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span className="text-slate-400">--</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </PageFrame>

      {formOpen && overview ? (
        <VerifyBusinessForm
          companyName={overview.companyName}
          prefill={overview.prefill}
          documentTypes={overview.documentTypes || []}
          previous={reqStatus === "rejected" ? verification : undefined}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => {
            setFormOpen(false);
            setTab("status");
            queryClient.invalidateQueries({ queryKey: ["verify-business-overview"] });
          }}
        />
      ) : null}

      {planModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <p className="text-[14px] font-pmedium text-slate-950">
              {isPaid ? "Renew / Change Plan" : "Choose a Plan"}
            </p>
            <p className="mt-1 text-[12px] font-pmedium text-slate-500">
              This covers every active, public listing under {overview?.companyName || "this company"}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {TIER_OPTIONS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setSelectedTier(tier.value)}
                  className={`rounded-xl border py-3 px-2 text-center transition-colors ${
                    selectedTier === tier.value
                      ? "border-[#2563EB] bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="font-pmedium text-slate-900">${tier.price}</div>
                  <div className="text-[10px] font-pmedium text-slate-500">{tier.label}</div>
                </button>
              ))}
            </div>
            {isPaid ? (
              (() => {
                const period = projectPeriod(
                  verification?.verificationExpiresAt,
                  selectedTier,
                );
                return (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-[12px] font-pmedium text-slate-700">
                    {period.stillActive ? (
                      <p>
                        Your current plan is valid till{" "}
                        <span className="text-slate-900">
                          {formatDate(verification?.verificationExpiresAt)}
                        </span>
                        . This renewal / plan change will start after your
                        current plan ends, so you won't lose any days.
                      </p>
                    ) : (
                      <p>
                        Your previous plan has expired, so this plan will start
                        today.
                      </p>
                    )}
                    <div className="mt-2 flex justify-between gap-3 text-[11px]">
                      <span>
                        Starts:{" "}
                        <span className="text-slate-900">{formatDate(period.start.toISOString())}</span>
                      </span>
                      <span>
                        Valid till:{" "}
                        <span className="text-emerald-700">{formatDate(period.end.toISOString())}</span>
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payMutation.isPending}
                onClick={() => payMutation.mutate(selectedTier)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {payMutation.isPending ? "Redirecting..." : "Continue to Payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VerifyBusiness;
