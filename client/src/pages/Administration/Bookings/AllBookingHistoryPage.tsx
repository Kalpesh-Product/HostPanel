import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bed, Building2, Eye, History, Home, Search, UtensilsCrossed, X } from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import BookingStatCard, { type BookingStatTone } from '@/components/BookingStatCard';
import { BookingsSkeleton } from '@/components/ui/Skeleton';
import { statusPillClass } from '@/lib/status-pill';
import useModuleAccessMap from '@/hooks/useModuleAccessMap';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import { getStoredUser } from '@/lib/auth-session';
import { getMeetingRoomBookings } from '@/services/meeting-room-bookings';
import { getRoomBookings } from '@/services/roomStays';
import { getCafeOrders } from '@/services/cafe';

type HistoryRow = {
  id: string;
  vertical: 'Meeting Rooms' | 'Hostel' | 'Co-living' | 'Cafe';
  title: string;
  date: string;
  status: string;
  total: number;
};

const VERTICAL_ICON: Record<HistoryRow['vertical'], typeof Building2> = {
  'Meeting Rooms': Building2,
  Hostel: Bed,
  'Co-living': Home,
  Cafe: UtensilsCrossed,
};

const VERTICAL_TONE: Record<HistoryRow['vertical'], BookingStatTone> = {
  'Meeting Rooms': 'blue',
  Hostel: 'teal',
  'Co-living': 'violet',
  Cafe: 'amber',
};

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

export default function AllBookingHistoryPage() {
  const { hasModuleAccess } = useModuleAccessMap();
  const workspacePreferences = useWorkspacePreferences();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [verticalFilter, setVerticalFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDetails, setViewingDetails] = useState<HistoryRow | null>(null);

  const showHostel = hasModuleAccess('hostel-booking');
  const showCoLiving = hasModuleAccess('room-booking');
  const showCafe = hasModuleAccess('cafe-orders');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const storedUser = getStoredUser();
    const dashboardWorkspaceId = String(
      storedUser?.workspaceMembership?.workspaceId ||
        storedUser?.workspaceMembership?.workspace ||
        storedUser?.primaryWorkspace ||
        storedUser?.workspace?.id ||
        storedUser?.workspaceId ||
        '',
    );
    const now = Date.now();

    Promise.allSettled([
      dashboardWorkspaceId ? getMeetingRoomBookings(dashboardWorkspaceId) : Promise.resolve(null),
      showHostel ? getRoomBookings({ scope: 'history', roomType: 'Dorm' }) : Promise.resolve(null),
      showCoLiving ? getRoomBookings({ scope: 'history', roomType: 'Room' }) : Promise.resolve(null),
      showCafe ? getCafeOrders({ scope: 'history' }) : Promise.resolve(null),
    ]).then(([meetingResult, hostelResult, coLivingResult, cafeResult]) => {
      if (cancelled) return;
      const combined: HistoryRow[] = [];

      if (meetingResult.status === 'fulfilled' && meetingResult.value) {
        const bookings: any[] = (meetingResult.value as any)?.bookings ?? [];
        bookings
          .filter((b) => new Date(b.end || b.date || 0).getTime() < now || ['completed', 'cancelled'].includes(String(b.status || '').toLowerCase()))
          .forEach((b) => combined.push({
            id: String(b._id || b.id),
            vertical: 'Meeting Rooms',
            title: b.purpose || `Meeting in ${b.roomName || 'room'}`,
            date: b.date || b.startDate || b.createdAt || '',
            status: b.status || 'Completed',
            total: Number(b.totalAmount || 0),
          }));
      }
      if (showHostel && hostelResult.status === 'fulfilled') {
        unwrapList<any>(hostelResult.value).forEach((row) => combined.push({
          id: String(row._id), vertical: 'Hostel', title: row.guestName || 'Guest', date: row.checkOut || row.checkIn || '', status: row.status || 'Checked-out', total: Number(row.total || 0),
        }));
      }
      if (showCoLiving && coLivingResult.status === 'fulfilled') {
        unwrapList<any>(coLivingResult.value).forEach((row) => combined.push({
          id: String(row._id), vertical: 'Co-living', title: row.guestName || 'Guest', date: row.checkOut || row.checkIn || '', status: row.status || 'Checked-out', total: Number(row.total || 0),
        }));
      }
      if (showCafe && cafeResult.status === 'fulfilled') {
        unwrapList<any>(cafeResult.value).forEach((row) => combined.push({
          id: String(row._id), vertical: 'Cafe', title: row.customerName || row.tableLabel || `Order #${row.orderNumber}`, date: row.paidAt || row.billedAt || row.createdAt || '', status: row.status || 'Paid', total: Number(row.total || 0),
        }));
      }

      combined.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setRows(combined);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [showHostel, showCoLiving, showCafe]);

  const formatCurrency = (value: unknown) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const verticalOptions = ['All', 'Meeting Rooms', ...(showHostel ? ['Hostel'] : []), ...(showCoLiving ? ['Co-living'] : []), ...(showCafe ? ['Cafe'] : [])];

  const displayedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesVertical = verticalFilter === 'All' || row.vertical === verticalFilter;
      const matchesSearch = !query || row.title.toLowerCase().includes(query);
      return matchesVertical && matchesSearch;
    });
  }, [rows, verticalFilter, searchQuery]);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase">All Booking History</h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">Every vertical's completed, checked-out, or paid records in one list.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {verticalOptions.filter((v) => v !== 'All').map((vertical) => {
              const key = vertical as HistoryRow['vertical'];
              const Icon = VERTICAL_ICON[key];
              const count = rows.filter((row) => row.vertical === vertical).length;
              return (
                <BookingStatCard
                  key={vertical}
                  icon={<Icon size={16} />}
                  label={vertical}
                  value={count}
                  tone={VERTICAL_TONE[key]}
                />
              );
            })}
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {verticalOptions.map((vertical) => (
                  <button
                    key={vertical}
                    onClick={() => setVerticalFilter(vertical)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-pmedium whitespace-nowrap transition-all ${
                      verticalFilter === vertical ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {vertical}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px] xl:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search by name..."
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
                      <th className="w-[16%] px-5 py-3">Vertical</th>
                      <th className="w-[30%] px-4 py-3">Details</th>
                      <th className="w-[16%] px-4 py-3">Date</th>
                      <th className="w-[14%] px-4 py-3">Status</th>
                      <th className="w-[11%] px-4 py-3 text-right">Total</th>
                      <th className="w-[10%] px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.length ? displayedRows.slice(0, 200).map((row) => {
                      const Icon = VERTICAL_ICON[row.vertical];
                      return (
                        <tr key={`${row.vertical}-${row.id}`} className="text-[11px] font-pmedium text-slate-600 hover:bg-blue-50/30">
                          <td className="truncate px-5 py-3">
                            <span className="inline-flex items-center gap-1.5"><Icon size={12} className="text-slate-400" /> {row.vertical}</span>
                          </td>
                          <td className="truncate px-4 py-3 text-slate-900">{row.title}</td>
                          <td className="px-4 py-3">{dateLabel(row.date)}</td>
                          <td className="px-4 py-3">
                            <span className={statusPillClass(row.status)}>{row.status}</span>
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
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center text-[11px] font-pmedium text-slate-400">
                          <History size={22} className="mx-auto mb-2 text-slate-300" />
                          No booking history found.
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
                  {(() => { const Icon = VERTICAL_ICON[viewingDetails.vertical]; return <Icon size={18} />; })()}
                </div>
                <div>
                  <h2 className="truncate text-base lg:text-lg font-pmedium tracking-tight text-slate-800">Record Details</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={statusPillClass(viewingDetails.status)}>{viewingDetails.status}</span>
                    <span className="text-[10px] font-pmedium uppercase tracking-wider text-slate-500">{viewingDetails.vertical}</span>
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
                <h4 className="mb-3 border-b border-slate-100 pb-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Record Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <InfoRow label="Vertical" value={viewingDetails.vertical} />
                  <InfoRow label="Details" value={viewingDetails.title} />
                  <InfoRow label="Date" value={dateLabel(viewingDetails.date)} />
                  <InfoRow label="Status" value={viewingDetails.status} />
                  <InfoRow label="Total" value={formatCurrency(viewingDetails.total)} />
                </div>
              </section>
              <p className="text-[11px] font-pmedium text-slate-400">
                Open {viewingDetails.vertical} Bookings for the complete record with all fields.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
