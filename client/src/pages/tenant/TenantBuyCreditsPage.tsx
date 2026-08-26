import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  History,
  Paperclip,
  Plus,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardsGridSkeleton } from '@/components/ui/Skeleton';
import PageFrame from '@/components/Pages/PageFrame';
import WebsiteFormField from '@/components/WebsiteFormField';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency, getWorkspaceCurrencySymbol } from '@/lib/workspaceLocalization';
import { statusPillClass } from '../../lib/status-pill';

// ─── Backend service imports ───
import {
  getMyTenantCompanyCreditRequests,
  createMyTenantCompanyCreditRequest,
  submitMyTenantCompanyCreditRequestPayment,
} from '@/services/tenant-companies';

const CREDIT_RATE = 10;
const MIN_CREDIT_REQUEST = 50;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeId(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function formatDate(value: string): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

function getStatusLabel(status: string): string {
  const n = normalizeId(status);
  const map: Record<string, string> = {
    low_credits_alert: 'Low Credits',
    pending_sales_approval: 'Pending Approval',
    approved_awaiting_payment: 'Awaiting Payment',
    payment_submitted: 'Payment Submitted',
    payment_confirmed: 'Payment Confirmed',
    invoice_generated: 'Invoice Generated',
    credits_added: 'Credits Added',
    completed: 'Completed',
    rejected: 'Rejected',
    payment_failed: 'Payment Failed',
    payment_rejected: 'Payment Rejected',
  };
  return map[n] || normalizeText(status) || 'Pending';
}

interface CreditRequest {
  id: string;
  requestedCredits: number;
  approvedCredits: number;
  ratePerCredit: number;
  totalAmount: number;
  requestedReason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requestedAt?: string;
  paymentProofFileUrl?: string;
  invoiceFileUrl?: string;
  paymentTransactionId?: string;
}

export default function TenantBuyCreditsPage() {
  const workspacePreferences = useWorkspacePreferences();
  const currentUser = getStoredUser() || {};
  const userRole = getStoredTenantRole() || 'tenant-employee';
  const canManageTenant = isTenantAdminRole(userRole) || isTenantManagerRole(userRole);
  const tenantCompanyName = currentUser?.tenantCompanyName || currentUser?.workspaceMembership?.tenantCompanyName || getStoredTenantCompanyName() || 'Tenant Workspace';
  const tenantCompanyId = normalizeId(currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [companyCreditsAllocated, setCompanyCreditsAllocated] = useState(0);
  const [companyCreditsRemaining, setCompanyCreditsRemaining] = useState(0);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newCredits, setNewCredits] = useState('');
  const [newReason, setNewReason] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currencySymbol = getWorkspaceCurrencySymbol(workspacePreferences.currency);
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  useEffect(() => {
    let active = true;

    const loadRequests = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await getMyTenantCompanyCreditRequests();
        const payload = response?.data || {};
        const requests = Array.isArray(payload.creditRequests) ? payload.creditRequests : [];
        const tenant = payload.tenant || {};
        if (active) {
          setCreditRequests(requests);
          setCompanyCreditsAllocated(Number(tenant.creditsAllocated || 0));
          if (typeof tenant.creditsRemaining === 'number') {
            setCompanyCreditsRemaining(Number(tenant.creditsRemaining || 0));
          } else {
            setCompanyCreditsRemaining(Math.max(0, Number(tenant.creditsAllocated || 0) - Number(tenant.creditsUsed || 0)));
          }
        }
      } catch (error: any) {
        if (active) setErrorMessage(error?.message || 'Unable to load credit requests.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadRequests();
    return () => { active = false; };
  }, [tenantCompanyId]);

  const refreshRequests = async () => {
    const response = await getMyTenantCompanyCreditRequests();
    const payload = response?.data || {};
    const requests = Array.isArray(payload.creditRequests) ? payload.creditRequests : [];
    const tenant = payload.tenant || {};
    setCreditRequests(requests);
    setCompanyCreditsAllocated(Number(tenant.creditsAllocated || 0));
    if (typeof tenant.creditsRemaining === 'number') {
      setCompanyCreditsRemaining(Number(tenant.creditsRemaining || 0));
    } else {
      setCompanyCreditsRemaining(Math.max(0, Number(tenant.creditsAllocated || 0) - Number(tenant.creditsUsed || 0)));
    }
  };

  const openCreateModal = () => {
    setNewCredits('');
    setNewReason('');
    setFormErrors({});
    setShowNewRequestForm(true);
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const credits = Number(newCredits);
    if (!newCredits.trim()) errors.newCredits = 'Credit amount is required.';
    else if (Number.isNaN(credits) || !Number.isFinite(credits)) errors.newCredits = 'Enter a valid number.';
    else if (!Number.isInteger(credits)) errors.newCredits = 'Whole credits only — no decimals.';
    else if (credits < MIN_CREDIT_REQUEST) errors.newCredits = `Minimum credit request is ${MIN_CREDIT_REQUEST} CR.`;
    else if (credits > 100000) errors.newCredits = 'That looks too large. Contact sales directly for bulk purchases.';
    if (newReason.trim().length > 300) errors.newReason = 'Keep the reason under 300 characters.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageTenant) return;
    if (!validateCreateForm()) return;
    const credits = Number(newCredits || 0);

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await createMyTenantCompanyCreditRequest({
        requestedCredits: credits,
        requestedReason: newReason.trim(),
      });
      toast.success(`Credit request for ${credits} credits submitted successfully.`);
      setShowNewRequestForm(false);
      setNewCredits('');
      setNewReason('');
      setFormErrors({});
      // Reload requests + credit balance
      await refreshRequests();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create credit request.');
      toast.error(error?.message || 'Unable to create credit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPaying = (request: CreditRequest) => {
    setPayingRequestId(request.id);
    setPaymentProofFile(null);
    setPaymentError('');
    setTransactionId('');
  };

  const cancelPaying = () => {
    setPayingRequestId(null);
    setPaymentProofFile(null);
    setPaymentError('');
    setTransactionId('');
  };

  const validateAndSelectFile = (file: File | null | undefined) => {
    if (!file) return;
    const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowedType) {
      setPaymentError('Attach an image (PNG/JPG) or PDF of the payment proof.');
      setPaymentProofFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('File is too large — maximum size is 5MB.');
      setPaymentProofFile(null);
      return;
    }
    setPaymentError('');
    setPaymentProofFile(file);
  };

  const handlePayRequest = async (request: CreditRequest) => {
    if (!request.id) return;
    if (!paymentProofFile) {
      setPaymentError('Please attach a payment proof screenshot before submitting.');
      return;
    }
    setIsSubmitting(true);
    setPaymentError('');
    setErrorMessage('');
    try {
      await submitMyTenantCompanyCreditRequestPayment(request.id, {
        paymentProof: paymentProofFile,
        transactionId: transactionId.trim(),
      });
      toast.success('Payment proof submitted. Awaiting finance verification.');
      cancelPaying();
      // Reload requests to reflect the updated status
      await refreshRequests();
    } catch (error: any) {
      setPaymentError(error?.message || 'Unable to submit payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <CardsGridSkeleton count={4} />;

  const creditUsagePercent = companyCreditsAllocated > 0 ? Math.min(100, Math.round(((companyCreditsAllocated - companyCreditsRemaining) / companyCreditsAllocated) * 100)) : 0;
  const isCreditLow = companyCreditsRemaining <= MIN_CREDIT_REQUEST / 5;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Buy Credits
              </h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Request additional meeting-room credits for {tenantCompanyName}.
              </p>
            </div>
          </div>

          {!canManageTenant && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-pmedium text-amber-800">
              Only tenant managers and admins can request credits. Contact your company manager for assistance.
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">
              {errorMessage}
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 shrink-0">
            <div className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 ${isCreditLow ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
              <div className="min-w-0">
                <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${isCreditLow ? 'text-red-600' : 'text-emerald-600'}`}>Remaining Credits</p>
                <p className="text-[15px] font-pmedium text-slate-900">{companyCreditsRemaining.toFixed(0)}</p>
              </div>
              <div className={`p-2 rounded-2xl shrink-0 ${isCreditLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}><Wallet size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium uppercase tracking-widest mb-1 text-blue-600">Total Allocated</p>
                <p className="text-[15px] font-pmedium text-slate-900">{companyCreditsAllocated.toFixed(0)}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><CreditCard size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-violet-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium uppercase tracking-widest mb-1 text-violet-600">Total Requests</p>
                <p className="text-[15px] font-pmedium text-slate-900">{creditRequests.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-violet-50 text-violet-600 shrink-0"><History size={16} /></div>
            </div>
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Panel header row: pricing info → usage */}
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-lg bg-white border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB]">Pricing: 1 CR = {currencySymbol}{CREDIT_RATE}</span>
                <span className="rounded-lg bg-white border border-amber-100 bg-amber-50/50 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-amber-600">Minimum: {MIN_CREDIT_REQUEST} CR</span>
                {companyCreditsAllocated > 0 && (
                  <span className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">{creditUsagePercent}% used</span>
                )}
              </div>
              {canManageTenant && (
                <button onClick={openCreateModal}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap">
                  <Plus size={13} strokeWidth={3} /> New Credit Request
                </button>
              )}
            </div>

            {/* Request history table */}
            <div className="overflow-x-auto flex-1 bg-white/20">
              <table className="w-full min-w-[900px] text-left font-pmedium">
                <thead className="border-b border-slate-100/60 bg-slate-50/50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Request</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Requested On</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {creditRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                            <CreditCard size={22} />
                          </div>
                          <p className="font-pmedium text-slate-700">No credit requests yet</p>
                          <p className="mt-1 text-[12px] font-pregular text-slate-400">
                            {canManageTenant ? 'Create a new request to purchase additional credits for your company.' : 'Contact your tenant manager to request more credits.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : creditRequests.map((request) => {
                    const reqStatus = normalizeId(request.status);
                    const needsPayment = reqStatus === 'approved_awaiting_payment';
                    const awaitingAction = reqStatus === 'pending_sales_approval';
                    const isPaid = ['completed', 'credits_added', 'payment_confirmed', 'invoice_generated', 'payment_submitted'].includes(reqStatus);
                    const isRejected = reqStatus === 'rejected' || reqStatus === 'payment_failed' || reqStatus === 'payment_rejected';
                    const showInvoice = (reqStatus === 'completed' || reqStatus === 'credits_added' || reqStatus === 'invoice_generated') && request.invoiceFileUrl;
                    const isPaying = payingRequestId === request.id;
                    return (
                      <Fragment key={request.id}>
                        <tr className="transition-colors hover:bg-slate-50/50 group align-top">
                          <td className="px-5 py-4 max-w-[280px]">
                            <span className="text-[13px] font-pmedium text-slate-900 block">{Number(request.requestedCredits || 0)} CR request</span>
                            {request.requestedReason && <p className="mt-1 text-[11px] font-pregular text-slate-500 line-clamp-2">{request.requestedReason}</p>}
                            {isRejected && (
                              <span className="mt-1.5 inline-flex"><span className={statusPillClass('rejected')}>{getStatusLabel(request.status)}</span></span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="text-[13px] font-pmedium text-slate-900">{formatCurrency(request.totalAmount)}</p>
                            {Number(request.totalAmount || 0) > 0 && (
                              <p className="mt-1 text-[10px] font-pmedium text-slate-400">{Number(request.requestedCredits || 0)} CR × {currencySymbol}{Number(request.ratePerCredit || CREDIT_RATE)}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`${statusPillClass(isRejected ? 'rejected' : isPaid ? 'completed' : needsPayment ? 'awaiting payment' : 'pending approval')}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-[11px] font-pmedium text-slate-600">
                              <Clock size={11} /> {formatDate(request.createdAt || request.requestedAt || '')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-center gap-1.5">
                              {needsPayment && !isPaying && (
                                <button disabled={isSubmitting} onClick={() => startPaying(request)}
                                  className="bg-[#2563EB] text-white px-3.5 py-2 rounded-xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60">
                                  Upload Proof
                                </button>
                              )}
                              {awaitingAction && (
                                <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 py-2">Awaiting sales approval</span>
                              )}
                              {showInvoice && (
                                <button disabled={isSubmitting} onClick={() => window.open(request.invoiceFileUrl, '_blank')} title="View invoice"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                                  <ExternalLink size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isPaying && (
                          <tr>
                            <td colSpan={5} className="px-5 pb-5">
                              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0"><Paperclip size={13} /></div>
                                    <div>
                                      <p className="text-[12px] font-pmedium text-slate-900">Submit Payment Proof</p>
                                      <p className="text-[10px] font-pregular text-slate-500">{formatCurrency(request.totalAmount)} due for {Number(request.requestedCredits || 0)} CR.</p>
                                    </div>
                                  </div>
                                  <button type="button" onClick={cancelPaying} disabled={isSubmitting} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"><X size={13} /></button>
                                </div>

                                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                                  onChange={(e) => { validateAndSelectFile(e.target.files?.[0]); e.target.value = ''; }} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}
                                  className="w-full cursor-pointer border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-white hover:border-[#2563EB] hover:bg-slate-50 transition-colors">
                                  <div className="w-10 h-10 bg-blue-50 rounded-full shadow-sm flex items-center justify-center mb-2">
                                    <Paperclip className="text-[#2563EB]" size={16} />
                                  </div>
                                  <p className="text-[12px] font-pmedium text-[#0F172A]">{paymentProofFile ? paymentProofFile.name : 'Upload payment screenshot or PDF'}</p>
                                  <p className="text-[10px] font-pmedium text-slate-400 mt-0.5">PNG, JPG or PDF up to 5MB</p>
                                </button>

                                <WebsiteFormField
                                  label="Transaction ID (Optional)"
                                  maxLength={80}
                                  placeholder="e.g. UPI reference / bank txn id"
                                  value={transactionId}
                                  onChange={(e) => setTransactionId(e.target.value)}
                                />

                                {paymentError && (
                                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] font-pmedium text-red-600 flex items-start gap-1.5">
                                    <XCircle size={13} className="mt-0.5 shrink-0" /> {paymentError}
                                  </div>
                                )}

                                <div className="flex justify-end gap-2">
                                  <button type="button" disabled={isSubmitting} onClick={cancelPaying}
                                    className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">Cancel</button>
                                  <button type="button" disabled={isSubmitting || !paymentProofFile} onClick={() => void handlePayRequest(request)}
                                    className="px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-1.5">
                                    {isSubmitting ? 'Submitting...' : 'Submit Proof'} {!isSubmitting && <CheckCircle2 size={13} />}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── New credit request modal ── */}
        {showNewRequestForm && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 animate-in fade-in duration-200" onClick={() => !isSubmitting && setShowNewRequestForm(false)}>
            <form onSubmit={handleCreateRequest} noValidate className="bg-white rounded-t-[2rem] sm:rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70 max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-[#2563EB] text-white">
                    <CreditCard size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800 truncate">Request Additional Credits</h2>
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mt-0.5">For {tenantCompanyName}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowNewRequestForm(false)} disabled={isSubmitting} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-[12px] font-pmedium text-blue-800 flex items-start gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  Credits will be added to {tenantCompanyName}&apos;s balance once the payment is confirmed.
                </div>

                <div className="grid grid-cols-1 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <WebsiteFormField
                    label={`Credit Amount (Minimum ${MIN_CREDIT_REQUEST})`}
                    type="number"
                    min={MIN_CREDIT_REQUEST}
                    step={1}
                    required
                    error={!!formErrors.newCredits}
                    helperText={formErrors.newCredits}
                    placeholder={`Enter number of credits (min ${MIN_CREDIT_REQUEST})`}
                    value={newCredits}
                    onChange={(e) => {
                      setNewCredits(e.target.value);
                      if (formErrors.newCredits) setFormErrors((prev) => ({ ...prev, newCredits: '' }));
                    }}
                  />
                  <WebsiteFormField
                    label="Reason (Optional)"
                    multiline
                    minRows={3}
                    maxLength={300}
                    helperText={formErrors.newReason || `${newReason.trim().length}/300 characters`}
                    placeholder="Why does your team need extra credits?"
                    value={newReason}
                    onChange={(e) => {
                      setNewReason(e.target.value);
                      if (formErrors.newReason) setFormErrors((prev) => ({ ...prev, newReason: '' }));
                    }}
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-[12px]">
                  <div className="flex items-center justify-between font-pmedium text-slate-700">
                    <span>Estimated Price</span>
                    <span className="font-pmedium text-slate-900">{formatCurrency(Number(newCredits || 0) * CREDIT_RATE)}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-pregular text-slate-500">
                    {newCredits ? `${newCredits} CR × ${currencySymbol}${CREDIT_RATE} = ${formatCurrency(Number(newCredits) * CREDIT_RATE)}` : `Enter credits to see price (${currencySymbol}${CREDIT_RATE} per CR)`}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button type="button" onClick={() => setShowNewRequestForm(false)} disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-1.5">
                  {isSubmitting ? 'Submitting...' : 'Submit Request'} {!isSubmitting && <Plus size={13} strokeWidth={3} />}
                </button>
              </div>
            </form>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
