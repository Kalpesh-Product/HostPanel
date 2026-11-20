import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bed, Calendar, CheckCircle2, Clock, Eye, LogIn, LogOut, Search, Users, X } from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import BookingStatCard from '@/components/BookingStatCard';
import { BookingsSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '@/lib/status-pill';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency, getWorkspaceDateKey } from '@/lib/workspaceLocalization';
import { getRoomBookings, type GuestRoomType, type RoomStayBooking } from '@/services/roomStays';

const STATUS_OPTIONS = ['All', 'Booked', 'Checked-in', 'Checked-out', 'Cancelled'];

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

export default function VerticalRoomBookingsPage({
  roomType,
  title,
  noun,
}: {
  roomType: GuestRoomType;
  title: string;
  noun: string;
}) {
  const workspacePreferences = useWorkspacePreferences();
  const [activeScope, setActiveScope] = useState<'open' | 'history'>('open');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<RoomStayBooking[]>([]);
  const [viewingDetails, setViewingDetails] = useState<RoomStayBooking | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getRoomBookings({ scope: activeScope, roomType })
      .then((response) => { if (!cancelled) setRows(unwrapList<RoomStayBooking>(response)); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [activeScope, roomType]);

  const formatCurrency = (value: unknown) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const todayKey = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
  const totalValue = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  // Each tab gets cards that actually mean something for it — "today's
  // check-ins" is meaningless once you're looking at history.
  const statCards = activeScope === 'history'
    ? [
        { label: 'Total records', value: rows.length, icon: Bed, tone: 'slate' as const },
        { label: 'Checked out', value: rows.filter((row) => row.status === 'Checked-out').length, icon: LogOut, tone: 'blue' as const },
        { label: 'Cancelled', value: rows.filter((row) => row.status === 'Cancelled').length, icon: LogIn, tone: 'rose' as const },
        { label: 'Total value', value: formatCurrency(totalValue), icon: Users, tone: 'amber' as const },
      ]
    : [
        { label: 'Open bookings', value: rows.length, icon: Bed, tone: 'slate' as const },
        { label: "Today's check-ins", value: rows.filter((row) => getWorkspaceDateKey(row.checkIn, workspacePreferences.timezone) === todayKey).length, icon: LogIn, tone: 'blue' as const },
        { label: "Today's check-outs", value: rows.filter((row) => getWorkspaceDateKey(row.checkOut, workspacePreferences.timezone) === todayKey).length, icon: LogOut, tone: 'green' as const },
        { label: 'Open value', value: formatCurrency(totalValue), icon: Users, tone: 'amber' as const },
      ];

  const displayedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
      const matchesSearch = !query || String(row.guestName || '').toLowerCase().includes(query) || String(row.guestPhone || '').includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [rows, statusFilter, searchQuery]);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase">{title}</h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">View {noun.toLowerCase()} bookings and their history in one place.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
            {([
              { key: 'open' as const, label: `${title}` },
              { key: 'history' as const, label: 'Booking History' },
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
                  placeholder="Search by guest name or phone..."
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
                      <th className="w-[20%] px-5 py-3">Guest</th>
                      <th className="w-[15%] px-4 py-3">Check-in</th>
                      <th className="w-[15%] px-4 py-3">Check-out</th>
                      <th className="w-[9%] px-4 py-3">Nights</th>
                      <th className="w-[13%] px-4 py-3">Status</th>
                      <th className="w-[12%] px-4 py-3 text-right">Total</th>
                      <th className="w-[10%] px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length ? displayedRows.map((row) => (
                      <tr key={row._id} className="text-[11px] font-pmedium text-slate-600 hover:bg-blue-50/30">
                        <td className="truncate px-5 py-3 text-slate-900">
                          {row.guestName || 'Guest'}
                          {row.guestPhone ? <span className="block text-[10px] text-slate-400">{row.guestPhone}</span> : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> {dateLabel(row.checkIn)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1"><Clock size={11} className="text-slate-400" /> {dateLabel(row.checkOut)}</span>
                        </td>
                        <td className="px-4 py-3">{row.nights ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={statusPillClass(row.status || 'Booked')}>{row.status || 'Booked'}</span>
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
                          <CheckCircle2 size={22} className="mx-auto mb-2 text-slate-300" />
                          No {activeScope === 'history' ? 'past' : 'open'} {noun.toLowerCase()} bookings found.
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
                  <Bed size={18} />
                </div>
                <div>
                  <h2 className="truncate text-base lg:text-lg font-pmedium tracking-tight text-slate-800">Booking Details</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={statusPillClass(viewingDetails.status || 'Booked')}>{viewingDetails.status || 'Booked'}</span>
                    <span className="text-[10px] font-pmedium uppercase tracking-wider text-slate-500">{noun} #{viewingDetails.bookingNumber}</span>
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
                  <Users size={14} /> Guest Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <InfoRow label="Guest Name" value={viewingDetails.guestName} />
                  <InfoRow label="Phone" value={viewingDetails.guestPhone} />
                  <InfoRow label="Email" value={viewingDetails.guestEmail} />
                  <InfoRow label="Gender" value={viewingDetails.guestGender} />
                  <InfoRow label="Nationality" value={viewingDetails.guestNationality} />
                  <InfoRow label="Location" value={[viewingDetails.guestCity, viewingDetails.guestState, viewingDetails.guestCountry].filter(Boolean).join(', ')} />
                  {viewingDetails.additionalGuests?.length ? (
                    <InfoRow label="Additional Guests" value={viewingDetails.additionalGuests.length} />
                  ) : null}
                </div>
              </section>
              <section>
                <h4 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <Calendar size={14} /> Stay Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <InfoRow label="Check-in" value={dateLabel(viewingDetails.checkIn)} />
                  <InfoRow label="Check-out" value={dateLabel(viewingDetails.checkOut)} />
                  <InfoRow label="Nights" value={viewingDetails.nights} />
                  <InfoRow label="Beds" value={viewingDetails.bedCount} />
                  <InfoRow label="Booking Source" value={viewingDetails.bookingSource} />
                  {viewingDetails.cancelReason ? <InfoRow label="Cancel Reason" value={viewingDetails.cancelReason} /> : null}
                </div>
              </section>
              <section>
                <h4 className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                  <Bed size={14} /> Payment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <InfoRow label="Rate / Night" value={formatCurrency(viewingDetails.ratePerNight)} />
                  <InfoRow label="Total" value={formatCurrency(viewingDetails.total)} />
                  <InfoRow label="Amount Paid" value={formatCurrency(viewingDetails.amountPaid)} />
                  <InfoRow label="Payment Method" value={viewingDetails.paymentMethod} />
                  {viewingDetails.securityDepositRequired ? (
                    <InfoRow label="Security Deposit" value={formatCurrency(viewingDetails.securityDepositAmount)} />
                  ) : null}
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
