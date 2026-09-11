import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Paperclip,
  ReceiptIndianRupee,
  Search,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { TablePageSkeleton } from '@/components/ui/Skeleton';
import PageFrame from '@/components/Pages/PageFrame';
import WebsiteFormField from '@/components/WebsiteFormField';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import { getMyTenantRent, submitMyTenantRentPayment } from '@/services/tenant-companies';

interface RentRecord {
  id: string;
  tenantCode?: string;
  companyName?: string;
  periodKey?: string;
  periodLabel?: string;
  dueDate?: string | null;
  dueDateLabel?: string;
  amount: number;
  status: string;
  displayStatus?: string;
  isOverdue?: boolean;
  paymentProof?: { fileName?: string; fileUrl?: string; mimeType?: string; size?: string };
  transactionReference?: string;
  submittedAt?: string | null;
  verifiedByName?: string;
  verifiedAt?: string | null;
  paidAt?: string | null;
  rejection?: { reason?: string; rejectedByName?: string; rejectedAt?: string | null };
  paymentWindowStart?: string | null;
  paymentWindowEnd?: string | null;
  paymentWindowLabel?: string;
  isWithinPaymentWindow?: boolean;
  canSubmitProof?: boolean;
  verifiedTotal?: number;
  submittedTotal?: number;
  remaining?: number;
  payments?: Array<{
    id: string;
    amount: number;
    taxLabel?: string;
    taxRatePercent?: number;
    taxAmount?: number;
    transactionReference?: string;
    status: string;
    proof?: { fileName?: string; fileUrl?: string; mimeType?: string; size?: string };
    receipt?: { fileName?: string; fileUrl?: string; mimeType?: string; size?: string };
    submittedAt?: string | null;
    verifiedAt?: string | null;
    rejection?: { reason?: string; rejectedByName?: string; rejectedAt?: string | null };
  }>;
}

interface RentCompany {
  id?: string;
  companyName?: string;
  tenantCode?: string;
  monthlyRent?: number;
  rentDueDay?: number;
}

function getRentBadgeClass(status: string) {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'proof submitted') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized === 'overdue') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function formatPeriodShort(periodKey?: string, periodLabel?: string): string {
  if (periodLabel) return periodLabel;
  if (!periodKey) return '-';
  const parts = periodKey.split('-');
  if (parts.length === 2) {
    const month = new Date(Number(parts[0]), Number(parts[1]) - 1).toLocaleString('en-US', { month: 'short' });
    return `${month} ${parts[0]}`;
  }
  return periodKey;
}

/* ───────────────────── Main Component ───────────────────── */

export default function TenantRentPaymentsPage() {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value: number) => formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [company, setCompany] = useState<RentCompany | null>(null);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);

  const [activeTab, setActiveTab] = useState<'payments' | 'history'>('payments');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [payingRecord, setPayingRecord] = useState<RentRecord | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [proofError, setProofError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewingRecord, setViewingRecord] = useState<RentRecord | null>(null);

  const loadRent = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response: any = await getMyTenantRent();
      const data = response?.data?.data || response?.data || {};
      setCompany(data.company || null);
      setRentRecords(Array.isArray(data.rentRecords) ? data.rentRecords : []);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load rent payments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRent();
  }, []);

  const validateAndSelectFile = (file?: File | null) => {
    if (!file) return;
    const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isAllowedType) {
      setProofError('Attach an image (PNG/JPG) or PDF of the payment proof.');
      setPaymentProofFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError('File is too large — maximum size is 5MB.');
      setPaymentProofFile(null);
      return;
    }
    setProofError('');
    setPaymentProofFile(file);
  };

  const openPaying = (rent: RentRecord) => {
    setPayingRecord(rent);
    setPaymentProofFile(null);
    setTransactionReference('');
    setPaymentAmount(String(rent.remaining ?? rent.amount ?? ''));
    setProofError('');
  };

  const cancelPaying = () => {
    setPayingRecord(null);
    setPaymentProofFile(null);
    setTransactionReference('');
    setPaymentAmount('');
    setProofError('');
  };

  const handleSubmitRentPayment = async () => {
    if (!payingRecord?.id) return;
    if (!paymentProofFile) {
      setProofError('Please attach a payment proof screenshot before submitting.');
      return;
    }
    const amount = Number(paymentAmount);
    const remaining = payingRecord.remaining ?? payingRecord.amount ?? 0;
    if (!(amount > 0)) {
      setProofError('Enter a payment amount greater than zero.');
      return;
    }
    if (amount > remaining) {
      setProofError(`Payment amount cannot exceed the remaining rent of ${formatCurrency(remaining)}.`);
      return;
    }
    setIsSubmitting(true);
    setProofError('');
    try {
      await submitMyTenantRentPayment(payingRecord.id, {
        paymentProof: paymentProofFile,
        amount,
        transactionReference: transactionReference.trim(),
      });
      toast.success('Rent payment proof submitted. Awaiting finance verification.');
      cancelPaying();
      await loadRent();
    } catch (error: any) {
      setProofError(error?.message || 'Unable to submit rent payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const outstanding = rentRecords.filter((r) => r.status !== 'Paid');
    return {
      outstandingAmount: outstanding.reduce((sum, r) => sum + (r.remaining ?? r.amount ?? 0), 0),
      due: rentRecords.filter((r) => r.status === 'Due').length,
      proofSubmitted: rentRecords.filter((r) => r.status === 'Proof Submitted').length,
      paid: rentRecords.filter((r) => r.status === 'Paid').length,
    };
  }, [rentRecords]);

  const filteredRecords = useMemo(() => {
    let records: RentRecord[];

    if (activeTab === 'history') {
      records = rentRecords.filter((r) => r.status === 'Paid');
    } else {
      records = rentRecords.filter((r) => r.status !== 'Paid');
    }

    if (statusFilter === 'Overdue') {
      records = records.filter((r) => r.isOverdue || r.status === 'Overdue');
    } else if (statusFilter !== 'All' && activeTab === 'payments') {
      records = records.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      records = records.filter((r) =>
        (r.periodLabel || r.periodKey || '').toLowerCase().includes(q) ||
        (r.dueDateLabel || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      );
    }

    return records;
  }, [rentRecords, activeTab, statusFilter, searchQuery]);

  if (isLoading) return <TablePageSkeleton rows={5} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row md:items-end justify-between gap-3 shrink-0">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                 Rent Payments
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {company?.companyName ? `${company.companyName}${company.tenantCode ? ` · ${company.tenantCode}` : ''}` : 'Your workspace rent'}
                {company?.rentDueDay ? ` · Rent is due on day ${company.rentDueDay} of every month` : ' · Monthly rent schedule'}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between gap-4">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => void loadRent()} className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] uppercase tracking-wider">Retry</button>
            </div>
          )}

          {/* ── Tab Pills ── */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {[
              { key: 'payments' as const, label: 'Rent Payments' },
              { key: 'history' as const, label: 'Rent History' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setStatusFilter('All'); setSearchQuery(''); }}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'outstanding', label: 'Outstanding', value: formatCurrency(summary.outstandingAmount), isCurrency: true, icon: Wallet, borderClass: '', iconClass: 'bg-slate-50 text-slate-600', labelClass: 'text-slate-400' },
              { key: 'due', label: 'Due', value: String(summary.due), icon: Clock, borderClass: 'border-l-4 border-l-amber-500', iconClass: 'bg-amber-50 text-amber-600', labelClass: 'text-amber-600' },
              { key: 'proof', label: 'Proof Submitted', value: String(summary.proofSubmitted), icon: FileText, borderClass: 'border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600', labelClass: 'text-blue-600' },
              { key: 'paid', label: 'Paid', value: String(summary.paid), icon: CheckCircle2, borderClass: 'border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600', labelClass: 'text-emerald-600' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}>
                  <div className="min-w-0">
                    <p className={`text-[10px] font-pmedium ${card.labelClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                    <p className={`text-[15px] font-pmedium ${card.isCurrency ? 'text-blue-600' : 'text-slate-900'}`}>{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Data Panel ── */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {(activeTab === 'payments'
                  ? ['All', 'Due', 'Proof Submitted', 'Overdue']
                  : ['All']
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex w-full xl:w-auto items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-100/70 text-[11px] sm:text-[12px] font-pmedium text-slate-600 whitespace-nowrap">
                  <CalendarCheck size={13} className="text-slate-400" />
                  {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="relative min-w-[180px] flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search period, date or status..."
                    className="w-full rounded-lg border border-slate-200/60 bg-white py-2.5 pl-9 pr-4 text-[12px] font-pmedium text-[#0F172A] outline-none transition-all placeholder:text-slate-500 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-white text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                  <tr>
                    <th className="px-3.5 py-2 w-[50px] text-center">Sr No</th>
                    <th className="px-3.5 py-2 min-w-[180px]">Period</th>
                    <th className="px-3.5 py-2 hidden sm:table-cell">Due Date</th>
                    <th className="px-3.5 py-2">Amount</th>
                    <th className="px-3.5 py-2 text-center">Status</th>
                    <th className="px-3.5 py-2 hidden md:table-cell">Proof</th>
                    <th className="px-3.5 py-2 text-center w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRecords.length > 0 ? filteredRecords.map((rent, idx) => (
                    <Fragment key={rent.recordId || rent.id}>
                      <tr className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-3.5 py-2 text-center text-[11px] font-pmedium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            {/* <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <CalendarCheck size={14} className="text-slate-500" />
                            </div> */}
                            <div>
                              <p className="font-pmedium text-primary text-sm">{rent.periodLabel || rent.periodKey}</p>
                              {rent.paymentWindowLabel && (
                                <p className="text-[10px] font-pmedium text-slate-400 mt-0.5">{rent.paymentWindowLabel}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2 hidden sm:table-cell">
                          <p className="text-xs font-pmedium text-slate-700">{rent.dueDateLabel || '-'}</p>
                        </td>
                        <td className="px-3.5 py-2">
                          <p className="font-pmedium text-slate-900 text-xs sm:text-sm">{formatCurrency(rent.amount || 0)}</p>
                          {rent.status !== 'Paid' && typeof rent.remaining === 'number' && rent.remaining < rent.amount && (
                            <p className="text-[10px] font-pmedium text-rose-500 mt-0.5">Remaining: {formatCurrency(rent.remaining)}</p>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider border ${getRentBadgeClass(rent.isOverdue ? 'Overdue' : rent.status)}`}>
                            {rent.isOverdue ? 'Overdue' : rent.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 hidden md:table-cell">
                          {rent.paymentProof?.fileUrl ? (
                            <a href={rent.paymentProof.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-pmedium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                              <FileText size={11} /> View
                            </a>
                          ) : (
                            <span className="text-[10px] font-pmedium text-slate-400 uppercase">Not Submitted</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingRecord(rent)}
                              className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all"
                              title="View details"
                            >
                              <Eye size={13} strokeWidth={2.5} />
                            </button>
                            {activeTab === 'payments' && rent.status !== 'Paid' && (rent.status === 'Due' || rent.status === 'Proof Submitted') && rent.canSubmitProof !== false && (
                              <button
                                type="button"
                                onClick={() => openPaying(rent)}
                                className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-[10px] font-pmedium uppercase tracking-wider shadow-sm hover:bg-primary/95 transition-all inline-flex items-center gap-1"
                              >
                                <Wallet size={10} /> {rent.status === 'Proof Submitted' ? 'Add Payment' : rent.isOverdue ? 'Pay Overdue' : 'Pay Rent'}
                              </button>
                            )}
                            {activeTab === 'payments' && rent.status !== 'Paid' && rent.canSubmitProof === false && (
                              <span
                                className="text-[10px] font-pmedium text-slate-400 uppercase inline-flex items-center gap-1 justify-center"
                                title={rent.paymentWindowLabel ? `Payment window: ${rent.paymentWindowLabel}` : 'Payment window unavailable'}
                              >
                                <XCircle size={11} /> Outside Window
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  )) : (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400 font-pmedium bg-slate-50/50">
                        {activeTab === 'history'
                          ? 'No paid rent records yet.'
                          : rentRecords.filter((r) => r.status !== 'Paid').length === 0
                            ? 'All rent is paid. Great job!'
                            : 'No records match your current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </PageFrame>

      {/* ── Pay Rent Modal ── */}
      {payingRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm" onClick={cancelPaying}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-blue-50/40 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                  <Paperclip size={14} />
                </div>
                <div>
                  <p className="text-[13px] font-pmedium text-slate-900">Submit Rent Payment</p>
                  <p className="text-[10px] font-pmedium text-slate-500">{formatPeriodShort(payingRecord.periodKey, payingRecord.periodLabel)}</p>
                </div>
              </div>
              <button onClick={cancelPaying} className="w-8 h-8 shrink-0 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm hover:text-red-500 transition-all border border-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Total Rent</p>
                  <p className="text-[15px] font-pmedium text-slate-900">{formatCurrency(payingRecord.amount || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Remaining</p>
                  <p className="text-[15px] font-pmedium text-blue-600">{formatCurrency(payingRecord.remaining ?? payingRecord.amount ?? 0)}</p>
                </div>
              </div>

              {payingRecord.paymentWindowLabel && (
                <p className="text-[10px] font-pmedium text-blue-600">Payment window: {payingRecord.paymentWindowLabel}</p>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                  Amount (up to {formatCurrency(payingRecord.remaining ?? payingRecord.amount ?? 0)})
                </label>
                <input
                  type="number" min="0" step="0.01" max={payingRecord.remaining ?? payingRecord.amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={String(payingRecord.remaining ?? payingRecord.amount ?? '')}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-pmedium text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                />
                <p className="text-[10px] text-slate-400">You can pay in full or in installments. Late payments stay Overdue until Finance verifies.</p>
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
                label="Transaction Reference (Optional)"
                maxLength={80}
                placeholder="e.g. UPI reference / bank txn id"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
              />

              {payingRecord.rejection?.reason && payingRecord.status === 'Due' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-pmedium text-amber-700">
                  Previous proof was returned{payingRecord.rejection.rejectedByName ? ` by ${payingRecord.rejection.rejectedByName}` : ''}: {payingRecord.rejection.reason}
                </div>
              )}

              {proofError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] font-pmedium text-red-600 flex items-start gap-1.5">
                  <XCircle size={13} className="mt-0.5 shrink-0" /> {proofError}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2.5">
              <button type="button" disabled={isSubmitting} onClick={cancelPaying}
                className="flex-1 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">
                Cancel
              </button>
              <button type="button" disabled={isSubmitting || !paymentProofFile} onClick={() => void handleSubmitRentPayment()}
                className="flex-1 px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-1.5">
                {isSubmitting ? 'Submitting...' : 'Submit Proof'} {!isSubmitting && <CheckCircle2 size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm" onClick={() => setViewingRecord(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-pmedium text-slate-900">{viewingRecord.periodLabel || viewingRecord.periodKey}</p>
                <span className={`mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-pmedium uppercase tracking-wider border ${getRentBadgeClass(viewingRecord.isOverdue ? 'Overdue' : viewingRecord.status)}`}>
                  {viewingRecord.isOverdue ? 'Overdue' : viewingRecord.status}
                </span>
              </div>
              <button onClick={() => setViewingRecord(null)} className="w-8 h-8 shrink-0 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm hover:text-red-500 transition-all border border-slate-200">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Total Rent</p>
                  <p className="mt-1 text-[14px] font-pmedium text-slate-900">{formatCurrency(viewingRecord.amount || 0)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Due Date</p>
                  <p className="mt-1 text-[14px] font-pmedium text-slate-900">{viewingRecord.dueDateLabel || '-'}</p>
                </div>
                {typeof viewingRecord.remaining === 'number' && viewingRecord.status !== 'Paid' && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-blue-500">Remaining</p>
                    <p className="mt-1 text-[14px] font-pmedium text-blue-600">{formatCurrency(viewingRecord.remaining)}</p>
                  </div>
                )}
                {viewingRecord.paidAt && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-500">Paid On</p>
                    <p className="mt-1 text-[14px] font-pmedium text-emerald-700">{viewingRecord.paidAt}</p>
                  </div>
                )}
              </div>

              {viewingRecord.paymentWindowLabel && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Payment Window</p>
                  <p className="text-[11px] font-pmedium text-slate-700 mt-0.5">{viewingRecord.paymentWindowLabel}</p>
                </div>
              )}

              {viewingRecord.paymentProof?.fileUrl && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Payment Proof</p>
                  <a href={viewingRecord.paymentProof.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-pmedium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mt-0.5">
                    <FileText size={11} /> {viewingRecord.paymentProof.fileName || 'View uploaded proof'}
                  </a>
                </div>
              )}

              {viewingRecord.verifiedByName && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Verified By</p>
                  <p className="text-[11px] font-pmedium text-slate-700 mt-0.5">{viewingRecord.verifiedByName}{viewingRecord.verifiedAt ? ` on ${viewingRecord.verifiedAt}` : ''}</p>
                </div>
              )}

              {viewingRecord.rejection?.reason && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-red-500">Rejection Reason</p>
                  <p className="mt-0.5 text-[11px] font-pmedium text-red-700">{viewingRecord.rejection.reason}</p>
                  {viewingRecord.rejection.rejectedByName && (
                    <p className="text-[9px] font-pmedium text-red-400 mt-0.5">By {viewingRecord.rejection.rejectedByName}</p>
                  )}
                </div>
              )}

              {Array.isArray(viewingRecord.payments) && viewingRecord.payments.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1.5">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Installments</p>
                  {viewingRecord.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 text-[11px] border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <span className="font-pmedium text-slate-800">{formatCurrency(payment.amount || 0)}</span>
                        {(payment.taxAmount ?? 0) > 0 && <span className="ml-2 text-[9px] text-slate-400">+{formatCurrency(payment.taxAmount)} {payment.taxLabel || 'Tax'}</span>}
                        <span className={`ml-2 px-2 py-0.5 rounded-md text-[8px] font-pmedium uppercase tracking-wider border ${getRentBadgeClass(payment.status === 'Submitted' ? 'Proof Submitted' : payment.status === 'Verified' ? 'Paid' : 'Due')}`}>
                          {payment.status}
                        </span>
                        {payment.status === 'Returned' && payment.rejection?.reason && (
                          <span className="ml-2 text-amber-700">{payment.rejection.reason}</span>
                        )}
                      </div>
                      {payment.receipt?.fileUrl && (
                        <a href={payment.receipt.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] font-pmedium text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1">
                          <FileText size={11} /> Receipt
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button type="button" onClick={() => setViewingRecord(null)}
                className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
