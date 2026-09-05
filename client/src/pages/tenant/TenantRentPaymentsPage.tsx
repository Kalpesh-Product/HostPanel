import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Paperclip,
  ReceiptIndianRupee,
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
  if (normalized === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'proof submitted') return 'bg-blue-100 text-blue-700';
  if (normalized === 'overdue') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

/* ───────────────────── Main Component ───────────────────── */

export default function TenantRentPaymentsPage() {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value: number) => formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [company, setCompany] = useState<RentCompany | null>(null);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);

  const [payingRentId, setPayingRentId] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [proofError, setProofError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPayingRentId(rent.id);
    setPaymentProofFile(null);
    setTransactionReference('');
    setPaymentAmount(String(rent.remaining ?? rent.amount ?? ''));
    setProofError('');
  };

  const cancelPaying = () => {
    setPayingRentId(null);
    setPaymentProofFile(null);
    setTransactionReference('');
    setPaymentAmount('');
    setProofError('');
  };

  const handleSubmitRentPayment = async (rent: RentRecord) => {
    if (!rent.id) return;
    if (!paymentProofFile) {
      setProofError('Please attach a payment proof screenshot before submitting.');
      return;
    }
    const amount = Number(paymentAmount);
    const remaining = rent.remaining ?? rent.amount ?? 0;
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
      await submitMyTenantRentPayment(rent.id, {
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

  if (isLoading) return <TablePageSkeleton rows={5} columns={6} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                <ReceiptIndianRupee size={18} /> Rent Payments
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {company?.companyName ? `${company.companyName}${company.tenantCode ? ` · ${company.tenantCode}` : ''}` : 'Your workspace rent'}
                {company?.rentDueDay ? ` | Rent is due on day ${company.rentDueDay} of every month` : ' | Monthly rent schedule'}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between gap-4">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => void loadRent()} className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-[10px] uppercase tracking-wider">Retry</button>
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'outstanding', label: 'Outstanding', value: formatCurrency(summary.outstandingAmount), isCurrency: true, icon: Wallet },
              { key: 'due', label: 'Due', value: String(summary.due), icon: Clock },
              { key: 'proof', label: 'Proof Submitted', value: String(summary.proofSubmitted), icon: FileText },
              { key: 'paid', label: 'Paid', value: String(summary.paid), icon: CheckCircle2 },
            ].map((card, idx) => {
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-amber-50 text-amber-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600'];
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className={`text-[15px] font-pmedium ${card.isCurrency ? 'text-blue-600' : 'text-slate-900'}`}>{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Records ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-6 py-5">Period</th>
                    <th className="px-6 py-5 hidden sm:table-cell">Due Date</th>
                    <th className="px-6 py-5">Amount</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 hidden md:table-cell">Proof</th>
                    <th className="px-6 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {rentRecords.length > 0 ? rentRecords.map((rent) => (
                    <Fragment key={rent.recordId || rent.id}>
                      <RentRow
                        rent={rent}
                        formatCurrency={formatCurrency}
                        onOpenPaying={() => openPaying(rent)}
                      />
                      {payingRentId === rent.id && (
                        <PayingRow
                          rent={rent}
                          formatCurrency={formatCurrency}
                          paymentProofFile={paymentProofFile}
                          transactionReference={transactionReference}
                          paymentAmount={paymentAmount}
                          proofError={proofError}
                          isSubmitting={isSubmitting}
                          fileInputRef={fileInputRef}
                          onCancelPaying={cancelPaying}
                          onSelectFile={validateAndSelectFile}
                          onTransactionChange={setTransactionReference}
                          onAmountChange={setPaymentAmount}
                          onSubmit={() => void handleSubmitRentPayment(rent)}
                        />
                      )}
                    </Fragment>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-semibold">No rent records yet. Your first rent will appear here once your contract starts.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </PageFrame>
    </div>
  );
}

function RentRow({
  rent,
  formatCurrency,
  onOpenPaying,
}: {
  rent: RentRecord;
  formatCurrency: (value: number) => string;
  onOpenPaying: () => void;
}) {
  const canSubmit = rent.status === 'Due' || rent.status === 'Proof Submitted';
  const hasInstallments = Array.isArray(rent.payments) && rent.payments.length > 0;
  return (
    <>
      <tr className="hover:bg-blue-50/30 transition-all">
        <td className="px-6 py-5">
          <p className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5"><CalendarCheck size={13} className="text-slate-400" /> {rent.periodLabel || rent.periodKey}</p>
        </td>
        <td className="px-6 py-5 hidden sm:table-cell text-xs font-bold text-slate-700">{rent.dueDateLabel || '-'}</td>
        <td className="px-6 py-5">
          <p className="font-black text-slate-900 text-xs sm:text-sm">{formatCurrency(rent.amount || 0)}</p>
          {rent.status !== 'Paid' && typeof rent.remaining === 'number' && rent.remaining < rent.amount && (
            <p className="text-[9px] font-bold text-rose-500">Remaining: {formatCurrency(rent.remaining)}</p>
          )}
        </td>
        <td className="px-6 py-5 text-center">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-pmedium uppercase tracking-wider ${getRentBadgeClass(rent.isOverdue ? 'Overdue' : rent.status)}`}>
            {rent.isOverdue ? 'Overdue' : rent.status}
          </span>
        </td>
        <td className="px-6 py-5 hidden md:table-cell">
          {rent.paymentProof?.fileUrl ? (
            <a href={rent.paymentProof.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-pmedium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
              <FileText size={11} /> View
            </a>
          ) : (
            <span className="text-[9px] font-bold text-slate-400 uppercase">Not Submitted</span>
          )}
        </td>
        <td className="px-6 py-5 text-center">
          {rent.status === 'Paid' ? (
            <span className="text-[9px] font-bold text-emerald-600 uppercase inline-flex items-center gap-1 justify-center"><CheckCircle2 size={11} /> Paid</span>
          ) : canSubmit && rent.canSubmitProof !== false ? (
            <button
              type="button"
              onClick={onOpenPaying}
              className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-[9px] font-pmedium uppercase tracking-wider shadow-sm hover:bg-primary/95 transition-all inline-flex items-center gap-1"
            >
              <Wallet size={10} /> {rent.status === 'Proof Submitted' ? 'Add Payment' : 'Pay Rent'}
            </button>
          ) : (
            <span
              className="text-[9px] font-bold text-slate-400 uppercase inline-flex items-center gap-1 justify-center"
              title={rent.paymentWindowLabel ? `Payment window: ${rent.paymentWindowLabel}` : 'Payment window unavailable'}
            >
              <XCircle size={11} /> Outside Window
            </span>
          )}
        </td>
      </tr>
      {hasInstallments && (
        <tr>
          <td colSpan={6} className="px-6 pb-4 pt-0">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-1.5">
              <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Installments</p>
              {rent.payments!.slice().reverse().map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 text-[11px] border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <div>
                    <span className="font-pmedium text-slate-800">{formatCurrency(payment.amount || 0)}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] font-pmedium uppercase tracking-wider ${getRentBadgeClass(payment.status === 'Submitted' ? 'Proof Submitted' : payment.status === 'Verified' ? 'Paid' : 'Due')}`}>
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
          </td>
        </tr>
      )}
    </>
  );
}

function PayingRow({
  rent,
  formatCurrency,
  paymentProofFile,
  transactionReference,
  paymentAmount,
  proofError,
  isSubmitting,
  fileInputRef,
  onCancelPaying,
  onSelectFile,
  onTransactionChange,
  onAmountChange,
  onSubmit,
}: {
  rent: RentRecord;
  formatCurrency: (value: number) => string;
  paymentProofFile: File | null;
  transactionReference: string;
  paymentAmount: string;
  proofError: string;
  isSubmitting: boolean;
  fileInputRef: { current: HTMLInputElement | null };
  onCancelPaying: () => void;
  onSelectFile: (file?: File | null) => void;
  onTransactionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const remaining = rent.remaining ?? rent.amount ?? 0;
  return (
    <tr>
      <td colSpan={6} className="px-6 pb-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0"><Paperclip size={13} /></div>
              <div>
                <p className="text-[12px] font-pmedium text-slate-900">Submit Rent Payment</p>
                <p className="text-[10px] font-pregular text-slate-500">{formatCurrency(remaining)} remaining for {rent.periodLabel || rent.periodKey} (total {formatCurrency(rent.amount)}).</p>
                {rent.paymentWindowLabel && <p className="text-[10px] font-pmedium text-blue-600 mt-0.5">Payment window: {rent.paymentWindowLabel}</p>}
              </div>
            </div>
            <button type="button" onClick={onCancelPaying} disabled={isSubmitting} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"><X size={13} /></button>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Amount (up to {formatCurrency(remaining)})</label>
            <input
              type="number" min="0" step="0.01" max={remaining}
              value={paymentAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder={String(remaining)}
              className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-medium outline-none focus:border-[#2563EB]"
            />
            <p className="text-[10px] text-slate-400">You can pay in full or in installments — pay part now and the rest later, as long as it's within the payment window.</p>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => { onSelectFile(e.target.files?.[0]); e.target.value = ''; }} />
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
            onChange={(e) => onTransactionChange(e.target.value)}
          />

          {rent.rejection?.reason && rent.status === 'Due' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-pmedium text-amber-700">
              Previous proof was returned{rent.rejection.rejectedByName ? ` by ${rent.rejection.rejectedByName}` : ''}: {rent.rejection.reason}
            </div>
          )}

          {proofError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] font-pmedium text-red-600 flex items-start gap-1.5">
              <XCircle size={13} className="mt-0.5 shrink-0" /> {proofError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" disabled={isSubmitting} onClick={onCancelPaying}
              className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-60">Cancel</button>
            <button type="button" disabled={isSubmitting || !paymentProofFile} onClick={onSubmit}
              className="px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-70 flex items-center gap-1.5">
              {isSubmitting ? 'Submitting...' : 'Submit Proof'} {!isSubmitting && <CheckCircle2 size={13} />}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
