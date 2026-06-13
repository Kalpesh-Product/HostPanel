import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { MOCK_CREDIT_REQUESTS, MOCK_TENANT_COMPANIES, initMockTenantSession } from './mock-tenant-data';
import PageFrame from '@/components/Pages/PageFrame';

// ─── Backend service imports (uncomment when backend ready) ───
// import { getTenantCompanies, updateTenantCompanyCreditRequest } from '@/services/tenant-companies';
// ─── New API functions needed (not yet in services) ───
//   getMyTenantCompanyCreditRequests(tenantCompanyId: string) => Promise<CreditRequest[]>
//   createMyTenantCompanyCreditRequest(tenantCompanyId: string, payload: { credits: number, reason?: string }) => Promise<CreditRequest>
//   submitMyTenantCompanyCreditRequestPayment(tenantCompanyId: string, requestId: string) => Promise<any>

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
  if (n === 'approved' || n === 'completed') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (n === 'rejected' || n === 'cancelled' || n === 'failed') return 'border-rose-200 bg-rose-100 text-rose-700';
  if (n === 'paid' || n === 'payment received') return 'border-blue-200 bg-blue-100 text-blue-700';
  return 'border-amber-200 bg-amber-100 text-amber-700';
}

interface CreditRequest {
  id: string;
  credits: number;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paymentLink?: string;
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

  useEffect(() => {
    let active = true;

    const loadRequests = async () => {
      initMockTenantSession();
      setIsLoading(true);
      setErrorMessage('');
      try {
        // ─── Backend call (uncomment when backend ready) ───
        // if (tenantCompanyId) {
        //   const requests = await getMyTenantCompanyCreditRequests(tenantCompanyId);
        //   if (!active) return;
        //   setCreditRequests(Array.isArray(requests) ? requests : []);
        // }

        // ⚠️ Placeholder
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!active) return;
        setCreditRequests(MOCK_CREDIT_REQUESTS as CreditRequest[]);
        const company = MOCK_TENANT_COMPANIES[0];
        if (company) {
          setCompanyCreditsAllocated(Number(company.creditsAllocated || company.creditsTotal || 0));
          setCompanyCreditsRemaining(Number(company.creditsRemaining || company.addOnCredits?.remainingCredits || 0));
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
      // ─── Backend call (uncomment when backend ready) ───
      // if (tenantCompanyId) {
      //   await createMyTenantCompanyCreditRequest(tenantCompanyId, {
      //     credits,
      //     reason: newReason.trim(),
      //     price: credits * 10,
      //   });
      // }
      setNoticeMessage(`Credit request for ${credits} credits submitted successfully.`);
      setShowNewRequestForm(false);
      setNewCredits('');
      setNewReason('');
      // Reload requests
      // const requests = await getMyTenantCompanyCreditRequests(tenantCompanyId);
      // setCreditRequests(Array.isArray(requests) ? requests : []);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create credit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayRequest = async (request: CreditRequest) => {
    if (!request.id || !tenantCompanyId) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // ─── Backend call (uncomment when backend ready) ───
      // const result = await submitMyTenantCompanyCreditRequestPayment(tenantCompanyId, request.id);
      // if (result?.paymentUrl) {
      //   window.open(result.paymentUrl, '_blank');
      // }
      setNoticeMessage('Payment link generated. You will be redirected shortly.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to process payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCredits = useMemo(
    () => creditRequests.filter((r) => normalizeId(r.status) === 'pending').reduce((sum, r) => sum + Number(r.credits || 0), 0),
    [creditRequests],
  );
  const approvedCredits = useMemo(
    () => creditRequests.filter((r) => normalizeId(r.status) === 'approved' || normalizeId(r.status) === 'completed').reduce((sum, r) => sum + Number(r.credits || 0), 0),
    [creditRequests],
  );

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
            <p className="mt-1 text-sm font-pmedium text-slate-500">
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
                  const needsPayment = reqStatus === 'pending' || reqStatus === 'approved';
                  return (
                    <div key={request.id} className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${needsPayment ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-pbold text-slate-900">{request.credits} Credits</h3>
                            <span className={`rounded-md border px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest ${getStatusTone(request.status)}`}>
                              {normalizeText(request.status || 'Pending')}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-pmedium text-slate-500">
                            <Clock size={12} /> {formatDate(request.createdAt)}
                          </p>
                          {request.reason && (
                            <p className="mt-1 text-sm font-pregular text-slate-600">{request.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {needsPayment && (
                          <button disabled={isSubmitting} onClick={() => handlePayRequest(request)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-pbold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                            Pay Now <ExternalLink size={14} />
                          </button>
                        )}
                        {reqStatus === 'paid' && (
                          <button disabled={isSubmitting} onClick={() => window.open('#', '_blank')}
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
