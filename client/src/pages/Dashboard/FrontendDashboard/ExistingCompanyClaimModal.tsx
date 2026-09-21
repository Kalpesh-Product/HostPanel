// @ts-nocheck
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Search, Upload, X } from "lucide-react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { ROLE_OPTIONS } from "./VerifyBusinessForm";
import useNomadListingCapacity, {
  EXISTING_COMPANY_CLAIM_QUERY_KEY,
} from "../../../hooks/useNomadListingCapacity";

// Mirrors CLAIM_DOCUMENT_TYPES in existingCompanyClaimControllers.ts. One
// shared set covers every listing under the claimed company.
const DOCUMENT_TYPES = [
  { key: "business_registration", label: "Business Registration Certificate", required: true },
  { key: "tax_id", label: "Tax / GST Registration", required: true },
  { key: "address_proof", label: "Business Address Proof", required: false },
  { key: "signatory_id", label: "Authorized Signatory ID", required: false },
];

const inputClass =
  "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none";

const EMPTY_FORM = { fullName: "", email: "", mobile: "", role: "", registeredCompanyName: "" };

export const CLAIM_STATUS_QUERY_KEY = EXISTING_COMPANY_CLAIM_QUERY_KEY;

export default function ExistingCompanyClaimModal({ onClose }) {
  const axios = useAxiosPrivate();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data: claim, isPending: isLoadingStatus } = useQuery({
    queryKey: CLAIM_STATUS_QUERY_KEY,
    queryFn: async () => (await axios.get("/api/listings/existing-company/status")).data,
  });

  // Start the form from the person submitting (workspace founder or whoever
  // is signed in). After a rejection, start from what was submitted last time
  // so nothing has to be retyped. Only fills an untouched form.
  useEffect(() => {
    const source = claim?.status === "rejected" ? claim.contact : claim?.prefill;
    if (!source) return;
    setForm((prev) =>
      Object.values(prev).every((v) => !v) ? { ...EMPTY_FORM, ...source } : prev,
    );
  }, [claim?.status, claim?.prefill?.email, claim?.contact?.email]);

  const { data: results = [], isFetching: isSearching } = useQuery({
    queryKey: ["existing-company-search", debouncedSearch],
    enabled: debouncedSearch.length >= 2 && !selectedCompany,
    queryFn: async () =>
      (await axios.get("/api/listings/existing-company/search", { params: { q: debouncedSearch } })).data,
  });

  const { data: companyListings, isFetching: isLoadingListings, error: listingsError } = useQuery({
    queryKey: ["existing-company-listings", selectedCompany?.companyId],
    enabled: Boolean(selectedCompany),
    retry: false,
    queryFn: async () =>
      (
        await axios.get(
          `/api/listings/existing-company/${encodeURIComponent(selectedCompany.companyId)}/listings`,
        )
      ).data,
  });

  const { mutate: submitClaim, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      data.append("nomadsCompanyId", selectedCompany.companyId);
      Object.entries(form).forEach(([k, v]) => data.append(k, v.trim()));
      Object.entries(files).forEach(([k, f]) => f && data.append(k, f));
      return (await axios.post("/api/listings/existing-company/claim", data)).data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Claim submitted");
      void queryClient.invalidateQueries({ queryKey: CLAIM_STATUS_QUERY_KEY });
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to submit claim");
    },
  });

  const hasPriorDoc = (label) => (claim?.documents || []).some((d) => d.label === label);
  const missingDoc = DOCUMENT_TYPES.find((d) => d.required && !files[d.key] && !hasPriorDoc(d.label));
  const missingField = Object.entries(form).find(([, v]) => !v.trim());
  const canSubmit =
    Boolean(selectedCompany) && confirmed && !missingDoc && !missingField && !isSubmitting;

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const listings = companyListings?.listings || [];

  // All of the company's listings transfer and are shown, but the plan
  // limit caps how many can be ENABLED at once — and while the total is at or
  // over it, no new listings can be added. Only the plan's numbers are needed
  // (no companyId, so the hook's own listings query stays disabled).
  const { plan, limit: listingLimit } = useNomadListingCapacity("");
  const planName = plan === "professional" ? "Professional" : plan === "custom" ? "Custom" : "Basic";
  const overLimit = listingLimit !== null && listings.length > listingLimit;
  const atLimit = listingLimit !== null && listings.length === listingLimit;

  const isPendingClaim = claim?.status === "pending";
  const isApprovedClaim = !isPendingClaim && (claim?.status === "approved" || Boolean(claim?.linked));
  const roleOptions =
    form.role && !ROLE_OPTIONS.includes(form.role) ? [form.role, ...ROLE_OPTIONS] : ROLE_OPTIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-5">
          <div>
            <p className="text-[14px] font-pmedium text-slate-950">Verify your existing listings on wono.co</p>
            <p className="mt-1 text-[12px] font-pmedium text-slate-500">
              Already listed on wono.co? Find your company, confirm the listings are yours and upload
              proof. Once our team approves, every listing under it shows up in your account.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {isLoadingStatus ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : isPendingClaim ? (
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="text-[12px] font-pmedium text-slate-700">
                Your claim on <b>{claim.nomadsCompanyName || "the selected company"}</b>
                {claim.listingCount ? ` (${claim.listingCount} listings)` : ""} is pending review. We'll
                move the listings to your account once your documents are verified.
              </div>
            </div>
          </div>
        ) : isApprovedClaim ? (
          <div className="p-5">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-[12px] font-pmedium text-slate-700">
                Verification approved
                {claim.reviewedAt ? ` on ${new Date(claim.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}` : ""}
                . The listings of <b>{claim.nomadsCompanyName || "your company"}</b>
                {claim.listingCount ? ` (${claim.listingCount})` : ""} now appear in your Listings.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {claim?.status === "rejected" && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <div className="text-[12px] font-pmedium text-slate-700">
                  Your previous claim was rejected
                  {claim.rejectionReason ? `: ${claim.rejectionReason}` : "."} You can correct the
                  details and submit again.
                </div>
              </div>
            )}

            {/* 1. Find company */}
            <section>
              <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-400 mb-2">
                1 · Find your company
              </p>
              {selectedCompany ? (
                <label className="flex items-center gap-2.5 rounded-xl border border-blue-500 bg-blue-50 p-3 text-[12px] font-pmedium text-slate-800">
                  <input type="checkbox" className="accent-blue-600" checked readOnly />
                  <span className="flex-1">
                    {selectedCompany.companyName}
                    <span className="text-slate-500">
                      {" "}
                      · {[selectedCompany.companyCity, selectedCompany.companyCountry].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-blue-700 underline"
                    onClick={() => {
                      setSelectedCompany(null);
                      setConfirmed(false);
                    }}
                  >
                    Change
                  </button>
                </label>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      className={`${inputClass} pl-9`}
                      placeholder="Search by company name (min. 2 letters)"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                  {isSearching && <p className="mt-2 text-[11px] text-slate-400">Searching...</p>}
                  {!isSearching && debouncedSearch.length >= 2 && results.length === 0 && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      No unclaimed company found with that name.
                    </p>
                  )}
                  <div className="mt-2 space-y-1.5">
                    {results.map((c) => (
                      <label
                        key={c.companyId}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-[12px] font-pmedium text-slate-700 cursor-pointer hover:border-blue-300"
                      >
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={false}
                          onChange={() => setSelectedCompany(c)}
                        />
                        <span>
                          {c.companyName}
                          <span className="text-slate-500">
                            {" "}
                            · {[c.companyCity, c.companyCountry].filter(Boolean).join(", ")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* 2. Listings under it */}
            {selectedCompany && (
              <section>
                <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-400 mb-2">
                  2 · Listings that will be transferred
                </p>
                {isLoadingListings ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : listingsError ? (
                  <p className="text-[12px] text-rose-600">
                    {listingsError?.response?.data?.message || "Couldn't load this company's listings."}
                  </p>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {listings.length === 0 ? (
                        <p className="p-3 text-[12px] text-slate-500">This company has no listings yet.</p>
                      ) : (
                        listings.map((l) => (
                          <div key={l.businessId} className="flex items-center justify-between gap-3 p-3 text-[12px] font-pmedium">
                            <span className="text-slate-800">{l.companyTitle || "Untitled listing"}</span>
                            <span className="text-slate-500 capitalize">
                              {[l.companyType, l.city].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    {listings.length > 0 && listingLimit !== null && (
                      <div
                        className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-[12px] font-pmedium text-slate-700 ${
                          overLimit || atLimit
                            ? "border-amber-200 bg-amber-50"
                            : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        {overLimit || atLimit ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          {overLimit ? (
                            <>
                              All <b>{listings.length}</b> listings will be shown, but your {planName} plan
                              lets you keep only <b>{listingLimit}</b> enabled at a time — the rest stay
                              disabled until you disable another one to swap. You also won't be able to add
                              new listings unless you delete some or upgrade your plan.
                            </>
                          ) : atLimit ? (
                            <>
                              These {listings.length} listings use up your {planName} plan's{" "}
                              <b>{listingLimit}</b>-listing limit, so you won't be able to add new ones
                              unless you delete some or upgrade your plan.
                            </>
                          ) : (
                            <>
                              These {listings.length} listings will be shown and enabled. Your {planName}{" "}
                              plan allows <b>{listingLimit}</b> in total, so you can add{" "}
                              {listingLimit - listings.length} more.
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <label className="mt-3 flex items-start gap-2 text-[12px] font-pmedium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-blue-600"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      I confirm all {listings.length} listing{listings.length === 1 ? "" : "s"} above
                      belong to my business and should be transferred to this account.
                    </label>
                  </>
                )}
              </section>
            )}

            {/* 3. Contact + documents */}
            {selectedCompany && (
              <>
                <section>
                  <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-400 mb-2">
                    3 · Basic information
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className={inputClass} placeholder="Your full name" value={form.fullName} onChange={setField("fullName")} />
                    <select className={inputClass} value={form.role} onChange={setField("role")}>
                      <option value="">Select your role</option>
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={setField("email")} />
                    <input className={inputClass} placeholder="Mobile" value={form.mobile} onChange={setField("mobile")} />
                    <input
                      className={`${inputClass} sm:col-span-2`}
                      placeholder="Registered company name"
                      value={form.registeredCompanyName}
                      onChange={setField("registeredCompanyName")}
                    />
                  </div>
                </section>

                <section>
                  <p className="text-[11px] font-pmedium uppercase tracking-widest text-slate-400 mb-2">
                    4 · Proof documents (PDF or image, max 5 MB each)
                  </p>
                  <div className="space-y-2">
                    {DOCUMENT_TYPES.map((d) => (
                      <label
                        key={d.key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-[12px] font-pmedium text-slate-700 cursor-pointer hover:border-blue-300"
                      >
                        <span>
                          {d.label}
                          {d.required && <span className="text-rose-500"> *</span>}
                          <span className="block text-[11px] text-slate-400">
                            {files[d.key]
                              ? files[d.key].name
                              : hasPriorDoc(d.label)
                                ? "Using the document already on file"
                                : "No file chosen"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-blue-700">
                          <Upload size={13} /> Choose
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) =>
                            setFiles((prev) => ({ ...prev, [d.key]: e.target.files?.[0] || null }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 hover:bg-slate-50"
          >
            {isPendingClaim || isApprovedClaim ? "Close" : "Cancel"}
          </button>
          {!isPendingClaim && !isApprovedClaim && (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => submitClaim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit for verification"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
