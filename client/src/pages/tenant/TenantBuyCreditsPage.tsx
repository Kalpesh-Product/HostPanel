import { useEffect, useState, type FormEvent } from 'react';
import {
  Clock,
  CreditCard,
  ExternalLink,
  History,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { CardsGridSkeleton } from '@/components/ui/Skeleton';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';

import PageFrame from '@/components/Pages/PageFrame';

// ─── Backend service imports ───
import {
  getMyTenantCompanyCreditRequests,
  createMyTenantCompanyCreditRequest,
  submitMyTenantCompanyCreditRequestPayment,
} from '@/services/tenant-companies';

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

function getStatusTone(status: string): string {
  const n = normalizeId(status);
  if (n === 'completed' || n === 'credits_added') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (n === 'rejected' || n === 'payment_failed' || n === 'payment_rejected') return 'border-rose-200 bg-rose-100 text-rose-700';
  if (n === 'payment_confirmed' || n === 'invoice_generated' || n === 'payment_submitted') return 'border-blue-200 bg-blue-100 text-blue-700';
  return 'border-amber-200 bg-amber-100 text-amber-700';
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
  return map[n] || normalizeText(status || 'Pending');
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
  const currentUser = getStoredUser() || {};
  const userRole = getStoredTenantRole() || 'tenant-employee';
  const canManageTenant = isTenantAdminRole(userRole) || isTenantManagerRole(userRole);
  const tenantCompanyName = currentUser?.tenantCompanyName || currentUser?.workspaceMembership?.tenantCompanyName || getStoredTenantCompanyName() || 'Tenant Workspace';
  const tenantCompanyId = normalizeId(currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [companyCreditsAllocated, setCompanyCreditsAllocated] = useState(0);
  const [companyCreditsRemaining, setCompanyCreditsRemaining] = useState(0);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newCredits, setNewCredits] = useState('');
  const [newReason, setNewReason] = useState('');
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');

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

  const handleCreateRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageTenant) return;
    const credits = Number(newCredits || 0);
    if (!credits || credits < 50) { setErrorMessage('Minimum credit request is 50 CR.'); return; }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await createMyTenantCompanyCreditRequest({
        requestedCredits: credits,
        requestedReason: newReason.trim(),
      });
      setNoticeMessage(`Credit request for ${credits} credits submitted successfully.`);
      setShowNewRequestForm(false);
      setNewCredits('');
      setNewReason('');
      // Reload requests + credit balance
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
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create credit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayRequest = async (request: CreditRequest, file?: File | null) => {
    if (!request.id) return;
    if (!file) {
      setErrorMessage('Please attach a payment proof screenshot before submitting.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await submitMyTenantCompanyCreditRequestPayment(request.id, {
        paymentProof: file,
        transactionId: transactionId.trim(),
      });
      setNoticeMessage('Payment proof submitted. Awaiting finance verification.');
      // Reset the inline payment form
      setPayingRequestId(null);
      setPaymentProofFile(null);
      setTransactionId('');
      // Reload requests to reflect the updated status
      const response = await getMyTenantCompanyCreditRequests();
      const payload = response?.data || {};
      const requests = Array.isArray(payload.creditRequests) ? payload.creditRequests : [];
      setCreditRequests(requests);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to submit payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <CardsGridSkeleton count={4} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          {/* <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-700 text-2xl font-pbold text-white shadow-md">
            <CreditCard size={22} />
          </div> */}
          <div>
            <h1 className="text-title font-pmedium text-primary uppercase">Buy Credits</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Request additional credits for {tenantCompanyName}.
            </p>
          </div>
        </div>
        {canManageTenant && (
          <button onClick={() => setShowNewRequestForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800">
            <Plus size={16} /> New Credit Request
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div>
      )}
      {noticeMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{noticeMessage}</div>
      )}

      {!canManageTenant && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Only tenant managers and admins can request credits. Contact your company manager for assistance.
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Remaining Credits</p>
          <p className="text-xl font-pbold text-slate-900">{companyCreditsRemaining.toFixed(0)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Total Allocated</p>
          <p className="text-xl font-pbold text-slate-900">{companyCreditsAllocated.toFixed(0)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-0.5">Total Requests</p>
          <p className="text-xl font-pbold text-slate-900">{creditRequests.length}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-pmedium text-slate-500">Pricing: <span className="font-pbold text-slate-800">1 CR = ₹10</span></p>
        <span className="text-slate-300">|</span>
        <p className="text-xs font-pmedium text-slate-500">Minimum: <span className="font-pbold text-slate-800">50 CR</span></p>
      </div>

      <div className="grid flex-1 gap-8 lg:grid-cols-1">
        <div className="flex flex-col gap-8">
          <div className="flex min-h-80 flex-col rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/60 px-6 py-5">
              <h2 className="flex items-center gap-2 text-lg font-pbold text-slate-900">
                <History size={20} className="text-[#2563EB]" /> Credit Request History
              </h2>
              
            </div>

            <div className="flex-1 divide-y divide-slate-50 overflow-y-auto">
              {creditRequests.length > 0 ? (
                creditRequests.map((request) => {
                  const reqStatus = normalizeId(request.status);
                  const needsPayment = reqStatus === 'approved_awaiting_payment';
                  const awaitingAction = reqStatus === 'pending_sales_approval';
                  const isPaid = ['completed', 'credits_added', 'payment_confirmed', 'invoice_generated', 'payment_submitted'].includes(reqStatus);
                  const showInvoice = (reqStatus === 'completed' || reqStatus === 'credits_added' || reqStatus === 'invoice_generated') && request.invoiceFileUrl;
                  const isPaying = payingRequestId === request.id;
                  return (
                    <div key={request.id} className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-pbold text-slate-900">{Number(request.requestedCredits || 0)} Credits</h3>
                            <span className={`rounded-md border px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest ${getStatusTone(request.status)}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-pmedium text-slate-500">
                            <Clock size={12} /> {formatDate(request.createdAt || request.requestedAt || '')}
                          </p>
                          {Number(request.totalAmount || 0) > 0 && (
                            <p className="mt-1 text-xs font-pmedium text-slate-600">
                              {Number(request.requestedCredits || 0)} CR × ₹{Number(request.ratePerCredit || 10)} = <span className="font-pbold">₹{Number(request.totalAmount).toLocaleString('en-IN')}</span>
                            </p>
                          )}
                          {request.requestedReason && (
                            <p className="mt-1 text-sm font-pregular text-slate-600">{request.requestedReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {needsPayment && !isPaying && (
                          <button disabled={isSubmitting} onClick={() => { setPayingRequestId(request.id); setPaymentProofFile(null); setTransactionId(''); }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                            Upload Payment Proof <ExternalLink size={14} />
                          </button>
                        )}
                        {awaitingAction && (
                          <span className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Awaiting sales approval</span>
                        )}
                        {isPaying && (
                          <div className="w-full max-w-xs space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:w-72">
                            <input type="file" accept="image/*,application/pdf" disabled={isSubmitting}
                              onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                              className="block w-full text-[11px] font-pmedium text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-[10px] file:font-pbold file:uppercase file:tracking-widest file:text-white hover:file:bg-slate-800" />
                            <input type="text" value={transactionId} disabled={isSubmitting}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="Transaction ID (optional)"
                              className="w-full rounded-lg border-2 border-transparent bg-white px-3 py-2 text-[11px] font-pmedium text-slate-900 outline-none focus:border-[#2563EB]" />
                            <div className="flex gap-2">
                              <button type="button" disabled={isSubmitting} onClick={() => { setPayingRequestId(null); setPaymentProofFile(null); setTransactionId(''); }}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                              <button type="button" disabled={isSubmitting || !paymentProofFile} onClick={() => handlePayRequest(request, paymentProofFile)}
                                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-pbold uppercase tracking-widest text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">Submit</button>
                            </div>
                          </div>
                        )}
                        {showInvoice && (
                          <button disabled={isSubmitting} onClick={() => window.open(request.invoiceFileUrl, '_blank')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-pbold uppercase tracking-widest text-slate-900 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                            View Invoice <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <CreditCard size={24} />
                  </div>
                  <h3 className="text-lg font-pbold text-slate-900">No credit requests yet</h3>
                  <p className="mt-1 text-sm font-pregular text-slate-500">
                    {canManageTenant ? 'Create a new request to purchase additional credits for your company.' : 'Contact your tenant manager to request more credits.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* New credit request modal */}
      {showNewRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateRequest} className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
              <div>
                <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">New Request</p>
                <h2 className="mt-1 text-xl font-pbold text-slate-900">Request Additional Credits</h2>
              </div>
              <button type="button" onClick={() => setShowNewRequestForm(false)} className="rounded-full bg-white p-2 text-slate-400 shadow-sm transition-colors hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-pmedium text-blue-800">
                Credits will be added to {tenantCompanyName}&apos;s balance once the payment is confirmed.
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-pbold uppercase tracking-widest text-slate-400 px-1">Credit Amount (Minimum 50)</label>
                <input type="number" min={50} required value={newCredits}
                  onChange={(e) => setNewCredits(e.target.value)}
                  placeholder="Enter number of credits (min 50)"
                  className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-pbold uppercase tracking-widest text-slate-400 px-1">Reason (Optional)</label>
                <textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} rows={3}
                  placeholder="Why does your team need extra credits?"
                  className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-pmedium text-slate-900 outline-none transition-all focus:border-[#2563EB] focus:bg-white" />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
                <div className="flex items-center justify-between font-pmedium text-slate-700">
                  <span>Estimated Price</span>
                  <span className="font-pbold text-slate-900">₹{(Number(newCredits || 0) * 10).toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-1 text-xs font-pregular text-slate-500">
                  {newCredits ? `${newCredits} CR × ₹10 = ₹${(Number(newCredits) * 10).toLocaleString('en-IN')}` : 'Enter credits to see price'}
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5">
              <button type="button" onClick={() => setShowNewRequestForm(false)} disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-pbold uppercase tracking-widest text-slate-600 shadow-sm transition-colors hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-xs font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}
      </PageFrame>
    </div>
  );
}
