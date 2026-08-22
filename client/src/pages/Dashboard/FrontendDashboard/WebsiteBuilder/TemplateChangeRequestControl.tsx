import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, History, XCircle } from "lucide-react";
import { toast } from "sonner";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
import TemplatePickerGrid, { type TemplateAvailability } from "./TemplatePickerGrid";
import { buildDemoPreviewDraft } from "./templates/demoPreviewData";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_REGISTRY } from "./templates/templateRegistry";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";

type ChangeRequest = {
  _id: string;
  currentTemplateId: string;
  requestedTemplateId: string;
  status: "pending" | "approved" | "rejected" | "completed";
  rejectionReason?: string;
  requestedAt?: string;
  completedAt?: string;
};

type ChangeSummary = {
  websiteId: string;
  plan: "basic" | "professional" | "custom";
  currentTemplateId: string;
  quota: {
    period: "monthly" | "lifetime";
    limit: number;
    used: number;
    remaining: number;
  };
  templates: TemplateAvailability[];
  activeRequest: ChangeRequest | null;
  history: ChangeRequest[];
};

type TemplateChangeRequestControlProps = {
  websiteId: string;
  companyId: string;
  workspaceId: string;
};

const templateName = (templateId?: string) =>
  TEMPLATE_REGISTRY[String(templateId || "").trim()]?.name ||
  TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID].name;

const statusStyles = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-blue-200 bg-blue-50 text-blue-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const StatusIcon = ({ status }: { status: ChangeRequest["status"] }) => {
  if (status === "completed") return <CheckCircle2 size={14} />;
  if (status === "rejected") return <XCircle size={14} />;
  return <Clock3 size={14} />;
};

const TemplateChangeRequestControl = ({
  websiteId,
  companyId,
  workspaceId,
}: TemplateChangeRequestControlProps) => {
  const axios = useAxiosPrivate();
  const queryClient = useQueryClient();
  const submitGuardRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const identityReady = Boolean(websiteId && (workspaceId || companyId));
  const queryKey = ["website-template-change", websiteId, workspaceId, companyId];

  const summaryQuery = useQuery<ChangeSummary>({
    queryKey,
    enabled: identityReady,
    queryFn: async () => {
      const response = await axios.get("/api/editor/template-change/summary", {
        params: { websiteId, workspaceId, companyId },
      });
      return response.data;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/editor/template-change/requests", {
        websiteId,
        workspaceId,
        companyId,
        requestedTemplateId: selectedId,
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Template change request submitted");
      setOpen(false);
      setStep("choose");
      setSelectedId("");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to submit template change request";
      toast.error(message);
    },
    onSettled: () => {
      submitGuardRef.current = false;
    },
  });

  const summary = summaryQuery.data;
  const activeRequest = summary?.activeRequest;
  const latestRequest = summary?.history?.[0] || null;
  const currentTemplateId = summary?.currentTemplateId || DEFAULT_TEMPLATE_ID;
  const quotaReached = Boolean(summary && summary.quota.remaining <= 0);

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setStep("choose");
  }, [open]);

  const handlePreview = (templateId: string) => {
    const draft = buildDemoPreviewDraft(templateId);
    localStorage.setItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.open("/website-preview", "_blank", "noopener,noreferrer");
  };

  const handleSubmit = () => {
    if (!selectedId || submitMutation.isPending || submitGuardRef.current) return;
    submitGuardRef.current = true;
    submitMutation.mutate();
  };

  const controlLabel = activeRequest ? "View template request" : "Change template";
  const controlDisabled = !identityReady || summaryQuery.isLoading || Boolean(summaryQuery.error);

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={controlDisabled}
          className="inline-flex items-center justify-center rounded-lg border border-[#2563EB] bg-[#2563EB] px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-white"
        >
          {summaryQuery.isLoading ? "Checking access..." : controlLabel}
        </button>
        {activeRequest ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyles[activeRequest.status]}`}
          >
            <StatusIcon status={activeRequest.status} />
            {activeRequest.status === "pending"
              ? "Request pending"
              : "Approved — awaiting template change"}
          </span>
        ) : latestRequest?.status === "completed" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 size={13} />
            {templateName(latestRequest.currentTemplateId)}
            <ArrowRight size={12} />
            {templateName(latestRequest.requestedTemplateId)}
          </span>
        ) : latestRequest?.status === "rejected" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700">
            <XCircle size={13} /> Last request rejected
          </span>
        ) : null}
      </div>

      <Dialog
        open={open}
        onClose={() => {
          if (!submitMutation.isPending) setOpen(false);
        }}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {activeRequest ? "Template change request" : "Choose a template to change"}
              </h3>
              <p className="mt-1 text-xs font-normal text-slate-500">
                Preview templates with sample content. Your website content is preserved until Master Panel completes the change.
              </p>
            </div>
            {summary ? (
              <div className="text-right">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {summary.plan} plan
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {summary.quota.remaining} of {summary.quota.limit} changes remaining
                  {summary.quota.period === "monthly" ? " this month" : ""}
                </span>
              </div>
            ) : null}
          </div>
        </DialogTitle>

        <DialogContent dividers>
          {summaryQuery.isLoading ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-slate-500" role="status">
              Loading template access…
            </div>
          ) : summaryQuery.error ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm font-semibold text-slate-800">Template-change access could not be loaded.</p>
              <button
                type="button"
                onClick={() => summaryQuery.refetch()}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : activeRequest ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-5 py-4">
              <div className={`rounded-xl border p-4 ${statusStyles[activeRequest.status]}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <StatusIcon status={activeRequest.status} />
                  {activeRequest.status === "pending"
                    ? "Request submitted — approval pending"
                    : "Request approved — Master Panel can now apply the change"}
                </div>
                <p className="mt-2 text-xs leading-5 opacity-90">
                  You cannot submit another request until this one is rejected or completed.
                </p>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-y border-slate-200 py-6">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current</span>
                  <p className="mt-1 text-base font-semibold text-slate-900">{templateName(activeRequest.currentTemplateId)}</p>
                </div>
                <ArrowRight className="text-slate-400" size={20} />
                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Requested</span>
                  <p className="mt-1 text-base font-semibold text-[#2563EB]">{templateName(activeRequest.requestedTemplateId)}</p>
                </div>
              </div>
            </div>
          ) : step === "confirm" ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-5 py-4">
              <div className="border-y border-slate-200 py-6">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current template</span>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{templateName(currentTemplateId)}</p>
                  </div>
                  <ArrowRight className="text-[#2563EB]" size={22} />
                  <div className="text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Requested template</span>
                    <p className="mt-1 text-lg font-semibold text-[#2563EB]">{templateName(selectedId)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
                Submitting sends this request to Master Panel. Your current website and draft remain unchanged until the request is approved and the template change is completed there.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 py-2">
              {quotaReached ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Your plan’s template-change limit has been reached. You can still preview available templates.
                </div>
              ) : null}
              <TemplatePickerGrid
                selectedId={selectedId}
                currentId={currentTemplateId}
                availability={summary?.templates || []}
                onSelect={setSelectedId}
                onPreview={handlePreview}
              />
              {summary?.history?.length ? (
                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <History size={14} /> Request history
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100">
                    {summary.history.slice(0, 5).map((request) => (
                      <div key={request._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                          {templateName(request.currentTemplateId)} <ArrowRight size={12} /> {templateName(request.requestedTemplateId)}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold capitalize ${statusStyles[request.status]}`}>
                          <StatusIcon status={request.status} /> {request.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
          {step === "confirm" && !activeRequest ? (
            <button
              type="button"
              onClick={() => setStep("choose")}
              disabled={submitMutation.isPending}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitMutation.isPending}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Close
            </button>
          )}
          {!activeRequest && step === "choose" ? (
            <button
              type="button"
              onClick={() => setStep("confirm")}
              disabled={!selectedId || quotaReached}
              className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          ) : !activeRequest && step === "confirm" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedId || submitMutation.isPending}
              className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit request"}
            </button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TemplateChangeRequestControl;
