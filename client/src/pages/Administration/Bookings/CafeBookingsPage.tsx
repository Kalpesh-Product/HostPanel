import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, CreditCard, Eye, Receipt, Search, UtensilsCrossed, X } from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import BookingStatCard from '@/components/BookingStatCard';
import { BookingsSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '@/lib/status-pill';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import { getCafeOrders, type CafeOrder } from '@/services/cafe';

const STATUS_OPTIONS = ['All', 'Placed', 'Preparing', 'Ready', 'Served', 'Paid', 'Cancelled'];

function unwrapList<T>(response: any): T[] {
  const payload = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(payload) ? payload : [];
}

function dateLabel(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">{label}</p>
      <div className="break-words text-[12px] font-pmedium text-slate-900">{value ?? '-'}</div>
    </div>
  );
}

export default function CafeBookingsPage() {
  const workspacePreferences = useWorkspacePreferences();
  const [activeScope, setActiveScope] = useState<'open' | 'history'>('open');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<CafeOrder[]>([]);
  const [viewingDetails, setViewingDetails] = useState<CafeOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCafeOrders({ scope: activeScope })
      .then((response) => { if (!cancelled) setRows(unwrapList<CafeOrder>(response)); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [activeScope]);

  const formatCurrency = (value: unknown) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const totalValue = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  // Each tab gets cards that mean something for it, not the same three stuck
  // on screen regardless of whether you're looking at open or past orders.
  const statCards = activeScope === 'history'
    ? [
        { label: 'Total orders', value: rows.length, icon: UtensilsCrossed, tone: 'slate' as const },
        { label: 'Paid', value: rows.filter((row) => row.status === 'Paid').length, icon: CheckCircle2, tone: 'blue' as const },
        { label: 'Cancelled', value: rows.filter((row) => row.status === 'Cancelled').length, icon: Receipt, tone: 'rose' as const },
        { label: 'Total value', value: formatCurrency(totalValue), icon: CreditCard, tone: 'amber' as const },
      ]
    : [
        { label: 'Open orders', value: rows.length, icon: UtensilsCrossed, tone: 'slate' as const },
        { label: 'Preparing', value: rows.filter((row) => row.status === 'Preparing' || row.status === 'Placed').length, icon: Receipt, tone: 'blue' as const },
        { label: 'Ready / Served', value: rows.filter((row) => row.status === 'Ready' || row.status === 'Served').length, icon: CheckCircle2, tone: 'green' as const },
        { label: 'Open value', value: formatCurrency(totalValue), icon: CreditCard, tone: 'amber' as const },
      ];

  const displayedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
      const matchesSearch = !query
        || String(row.customerName || '').toLowerCase().includes(query)
        || String(row.tableLabel || '').toLowerCase().includes(query)
        || String(row.orderNumber || '').includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [rows, statusFilter, searchQuery]);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase">Cafe Orders</h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">View cafe orders and their history in one place.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {([
              { key: 'open' as const, label: 'Cafe Orders' },
              { key: 'history' as const, label: 'Order History' },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveScope(tab.key); setStatusFilter('All'); setSearchQuery(''); }}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${
                  activeScope === tab.key ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <BookingStatCard
                  key={stat.label}
                  icon={<Icon size={16} />}
                  label={stat.label}
                  value={stat.value}
                  tone={stat.tone}
                />
              );
            })}
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-pmedium whitespace-nowrap transition-all ${
                      statusFilter === status ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px] xl:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search order #, customer, or table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-4"><BookingsSkeleton /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="bg-slate-50 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="w-[12%] px-5 py-3">Order #</th>
                      <th className="w-[24%] px-4 py-3">Customer / Table</th>
                      <th className="w-[14%] px-4 py-3">Items</th>
                      <th className="w-[13%] px-4 py-3">Date</th>
                      <th className="w-[13%] px-4 py-3">Status</th>
                      <th className="w-[14%] px-4 py-3 text-right">Total</th>
                      <th className="w-[10%] px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length ? displayedRows.map((row) => (
                      <tr key={row._id} className="text-[11px] font-pmedium text-slate-600 hover:bg-blue-50/30">
                        <td className="truncate px-5 py-3 text-slate-900 flex items-center gap-1.5">
                          <Receipt size={11} className="text-slate-400" /> #{row.orderNumber}
                        </td>
                        <td className="truncate px-4 py-3">
                          {row.customerName || 'Walk-in'}
                          {row.tableLabel ? <span className="block text-[10px] text-slate-400">{row.tableLabel}</span> : null}
                        </td>
                        <td className="px-4 py-3">{Array.isArray(row.items) ? row.items.length : 0} item(s)</td>
                        <td className="px-4 py-3">{dateLabel(row.paidAt || row.billedAt)}</td>
                        <td className="px-4 py-3">
                          <span className={statusPillClass(row.status || 'Placed')}>{row.status || 'Placed'}</span>
                        </td>
                        <td className="truncate px-4 py-3 text-right">{formatCurrency(row.total)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingDetails(row)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center text-[11px] font-pmedium text-slate-400">
                          No {activeScope === 'history' ? 'past' : 'open'} orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageFrame>

      {/* ── View Details Modal ───────────────────────────────────────── */}
      {viewingDetails && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm" onClick={() => setViewingDetails(null)} />
          <div className="relative z-[90] flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-blue-50/30 p-5 sm:p-6 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm">
                  <UtensilsCrossed size={18} />
                </div>
                <div>
                  <h2 className="truncate text-base lg:text-lg font-pmedium tracking-tight text-slate-800">Order Details</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={statusPillClass(viewingDetails.status || 'Placed')}>{viewingDetails.status || 'Placed'}</span>
                    <span className="text-[10px] font-pmedium uppercase tracking-wider text-slate-500">Order #{viewingDetails.orderNumber}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetails(null)}
                className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              ><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white p-5 sm:p-6 space-y-5">
              <section>
                <h4 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <Receipt size={14} /> Order Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <InfoRow label="Customer" value={viewingDetails.customerName || 'Walk-in'} />
                  <InfoRow label="Table" value={viewingDetails.tableLabel} />
                  <InfoRow label="Waiter" value={viewingDetails.waiterName} />
                  <InfoRow label="Billed" value={dateLabel(viewingDetails.billedAt)} />
                  <InfoRow label="Paid" value={dateLabel(viewingDetails.paidAt)} />
                  {viewingDetails.cancelReason ? <InfoRow label="Cancel Reason" value={viewingDetails.cancelReason} /> : null}
                </div>
              </section>
              <section>
                <h4 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <UtensilsCrossed size={14} /> Items ({viewingDetails.items?.length || 0})
                </h4>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 divide-y divide-slate-200/60">
                  {(viewingDetails.items || []).map((item, index) => (
                    <div key={`${item.menuItemId}-${index}`} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-pmedium text-slate-900">{item.name}</p>
                        <p className="text-[10px] font-pmedium text-slate-500">Qty {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="shrink-0 text-[12px] font-pmedium text-slate-900">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  ))}
                  {!viewingDetails.items?.length && <p className="text-[11px] font-pmedium text-slate-400">No items recorded.</p>}
                </div>
              </section>
              <section>
                <h4 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <CreditCard size={14} /> Payment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <InfoRow label="Subtotal" value={formatCurrency(viewingDetails.subtotal)} />
                  <InfoRow label="Tax" value={formatCurrency(viewingDetails.taxAmount)} />
                  <InfoRow label="Discount" value={formatCurrency(viewingDetails.discountAmount)} />
                  <InfoRow label="Total" value={formatCurrency(viewingDetails.total)} />
                  <InfoRow label="Payment Method" value={viewingDetails.paymentMethod} />
                </div>
              </section>
              {viewingDetails.notes ? (
                <section>
                  <h4 className="mb-3 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Notes</h4>
                  <p className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-[12px] font-pmedium text-slate-900">{viewingDetails.notes}</p>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
