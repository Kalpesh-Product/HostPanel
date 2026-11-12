import { useEffect, useMemo, useState } from 'react';
import { Bed, Building2, CalendarCheck, CalendarClock, CheckCircle2, CreditCard, History, Home, Layers, TrendingUp, UtensilsCrossed, XCircle } from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';
import DashboardModuleCard from '@/components/DashboardModuleCard';
import DonutChart from '@/components/graphs/DonutChart';
import GroupedBarGraph from '@/components/graphs/GroupedBarGraph';
import { statusPillClass } from '@/lib/status-pill';
import useModuleAccessMap from '@/hooks/useModuleAccessMap';
import { getStoredUser } from '@/lib/auth-session';
import { getWorkspaceDateKey, formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { getMeetingRoomBookings } from '@/services/meeting-room-bookings';
import { getRoomBookings } from '@/services/roomStays';
import { getCafeOrders } from '@/services/cafe';
import administrationBanner from '@/assets/administration-dashboard-banner.webp';

const VERTICAL_COLORS: Record<string, string> = {
  'Meeting Rooms': '#2563EB',
  Hostel: '#0F766E',
  'Co-living': '#7C3AED',
  Cafe: '#D97706',
};

const VERTICAL_ICON: Record<string, typeof Building2> = {
  'Meeting Rooms': Building2,
  Hostel: Bed,
  'Co-living': Home,
  Cafe: UtensilsCrossed,
};

function unwrapList<T>(response: any): T[] {
  const payload = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(payload) ? payload : [];
}

function isToday(value: unknown, todayKey: string, timezone: string): boolean {
  if (!value) return false;
  return getWorkspaceDateKey(String(value), timezone) === todayKey;
}

function dateLabel(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type VerticalStat = { open: number; today: number; value: number; history: number; cancelled: number };
type RecentRecord = { vertical: string; title: string; sub: string; date: string; status: string; value: number };

export default function BookingsDashboard() {
  const { hasModuleAccess } = useModuleAccessMap();
  const workspacePreferences = useWorkspacePreferences();
  const [isLoading, setIsLoading] = useState(true);
  const [verticalStats, setVerticalStats] = useState<Record<string, VerticalStat>>({});
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);

  const showHostel = hasModuleAccess('hostel-booking');
  const showCoLiving = hasModuleAccess('room-booking');
  const showCafe = hasModuleAccess('cafe-orders');
  const activeVerticalsCount = 1 + [showHostel, showCoLiving, showCafe].filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;
    const storedUser = getStoredUser();
    const dashboardWorkspaceId = String(
      storedUser?.workspaceMembership?.workspaceId ||
        storedUser?.workspaceMembership?.workspace ||
        storedUser?.primaryWorkspace ||
        storedUser?.workspace?.id ||
        storedUser?.workspaceId ||
        '',
    );
    const todayKey = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
    const now = Date.now();

    Promise.allSettled([
      dashboardWorkspaceId ? getMeetingRoomBookings(dashboardWorkspaceId) : Promise.resolve(null),
      showHostel ? getRoomBookings({ scope: 'open', roomType: 'Dorm' }) : Promise.resolve(null),
      showHostel ? getRoomBookings({ scope: 'history', roomType: 'Dorm' }) : Promise.resolve(null),
      showCoLiving ? getRoomBookings({ scope: 'open', roomType: 'Room' }) : Promise.resolve(null),
      showCoLiving ? getRoomBookings({ scope: 'history', roomType: 'Room' }) : Promise.resolve(null),
      showCafe ? getCafeOrders({ scope: 'open' }) : Promise.resolve(null),
      showCafe ? getCafeOrders({ scope: 'history' }) : Promise.resolve(null),
    ]).then(([meetingResult, hostelOpenResult, hostelHistoryResult, coLivingOpenResult, coLivingHistoryResult, cafeOpenResult, cafeHistoryResult]) => {
      if (cancelled) return;
      const next: Record<string, VerticalStat> = {};
      const recent: RecentRecord[] = [];

      if (meetingResult.status === 'fulfilled' && meetingResult.value) {
        const bookings: any[] = (meetingResult.value as any)?.bookings ?? [];
        const openBookings = bookings.filter((b) => new Date(b.end || b.date || 0).getTime() >= now);
        next['Meeting Rooms'] = {
          open: openBookings.length,
          today: bookings.filter((b) => isToday(b.date || b.startDate || b.createdAt, todayKey, workspacePreferences.timezone)).length,
          value: openBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
          history: bookings.length - openBookings.length,
          cancelled: bookings.filter((b) => String(b.status || '').toLowerCase() === 'cancelled').length,
        };
        bookings.forEach((b) => recent.push({
          vertical: 'Meeting Rooms',
          title: b.purpose || `Meeting in ${b.roomName || 'room'}`,
          sub: b.bookedForName || b.bookedByName || b.clientCompany || 'Not recorded',
          date: b.date || b.startDate || b.createdAt || '',
          status: b.status || 'Booked',
          value: Number(b.totalAmount || 0),
        }));
      }
      if (showHostel && hostelOpenResult.status === 'fulfilled') {
        const openRows = unwrapList<any>(hostelOpenResult.value);
        const historyRows = hostelHistoryResult.status === 'fulfilled' ? unwrapList<any>(hostelHistoryResult.value) : [];
        const allRows = [...openRows, ...historyRows];
        next.Hostel = {
          open: openRows.length,
          today: openRows.filter((r) => isToday(r.checkIn, todayKey, workspacePreferences.timezone)).length,
          value: openRows.reduce((sum, r) => sum + Number(r.total || 0), 0),
          history: historyRows.length,
          cancelled: allRows.filter((r) => r.status === 'Cancelled').length,
        };
        allRows.forEach((r) => recent.push({
          vertical: 'Hostel',
          title: r.guestName || 'Guest',
          sub: r.roomLabel || r.bedLabel || 'Dorm bed',
          date: r.checkOut || r.checkIn || '',
          status: r.status || 'Booked',
          value: Number(r.total || 0),
        }));
      }
      if (showCoLiving && coLivingOpenResult.status === 'fulfilled') {
        const openRows = unwrapList<any>(coLivingOpenResult.value);
        const historyRows = coLivingHistoryResult.status === 'fulfilled' ? unwrapList<any>(coLivingHistoryResult.value) : [];
        const allRows = [...openRows, ...historyRows];
        next['Co-living'] = {
          open: openRows.length,
          today: openRows.filter((r) => isToday(r.checkIn, todayKey, workspacePreferences.timezone)).length,
          value: openRows.reduce((sum, r) => sum + Number(r.total || 0), 0),
          history: historyRows.length,
          cancelled: allRows.filter((r) => r.status === 'Cancelled').length,
        };
        allRows.forEach((r) => recent.push({
          vertical: 'Co-living',
          title: r.guestName || 'Guest',
          sub: r.roomLabel || 'Room',
          date: r.checkOut || r.checkIn || '',
          status: r.status || 'Booked',
          value: Number(r.total || 0),
        }));
      }
      if (showCafe && cafeOpenResult.status === 'fulfilled') {
        const openRows = unwrapList<any>(cafeOpenResult.value);
        const historyRows = cafeHistoryResult.status === 'fulfilled' ? unwrapList<any>(cafeHistoryResult.value) : [];
        const allRows = [...openRows, ...historyRows];
        next.Cafe = {
          open: openRows.length,
          today: openRows.filter((r) => isToday(r.createdAt, todayKey, workspacePreferences.timezone)).length,
          value: openRows.reduce((sum, r) => sum + Number(r.total || 0), 0),
          history: historyRows.length,
          cancelled: allRows.filter((r) => r.status === 'Cancelled').length,
        };
        allRows.forEach((r) => recent.push({
          vertical: 'Cafe',
          title: r.customerName || r.tableLabel || `Order #${r.orderNumber}`,
          sub: r.tableLabel || 'Walk-in',
          date: r.paidAt || r.billedAt || r.createdAt || '',
          status: r.status || 'Placed',
          value: Number(r.total || 0),
        }));
      }

      recent.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setRecentRecords(recent.slice(0, 10));
      setVerticalStats(next);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [showHostel, showCoLiving, showCafe, workspacePreferences.timezone]);

  const verticalLabels = Object.keys(verticalStats);
  const totalOpen = verticalLabels.reduce((sum, label) => sum + verticalStats[label].open, 0);
  const totalToday = verticalLabels.reduce((sum, label) => sum + verticalStats[label].today, 0);
  const totalValue = verticalLabels.reduce((sum, label) => sum + verticalStats[label].value, 0);
  const totalHistory = verticalLabels.reduce((sum, label) => sum + verticalStats[label].history, 0);
  const totalCancelled = verticalLabels.reduce((sum, label) => sum + verticalStats[label].cancelled, 0);
  const totalRecords = totalOpen + totalHistory;
  const totalCompleted = Math.max(0, totalHistory - totalCancelled);
  const completionRate = totalRecords > 0 ? Math.round((totalCompleted / totalRecords) * 100) : 0;
  const averageValue = totalOpen > 0 ? totalValue / totalOpen : 0;
  const busiestVertical = verticalLabels.length
    ? verticalLabels.reduce((a, b) => (verticalStats[a].open >= verticalStats[b].open ? a : b))
    : '—';
  const formatValue = (value: number) =>
    formatWorkspaceCurrency(value, workspacePreferences.currency, { maximumFractionDigits: 0 });

  const kpiCards = [
    { label: 'Open bookings', value: totalOpen, sub: `Across ${activeVerticalsCount} active vertical${activeVerticalsCount === 1 ? '' : 's'}`, icon: Layers, iconClass: 'border-l-blue-600 bg-blue-50 text-blue-700', cardClass: 'hover:border-l-blue-600' },
    { label: "Today's bookings", value: totalToday, sub: 'New activity recorded today', icon: CalendarClock, iconClass: 'border-l-emerald-500 bg-emerald-50 text-emerald-700', cardClass: 'hover:border-l-emerald-500' },
    { label: 'Open value', value: formatValue(totalValue), sub: `${formatValue(averageValue)} average per booking`, icon: CreditCard, iconClass: 'border-l-teal-500 bg-teal-50 text-teal-700', cardClass: 'hover:border-l-teal-500' },
    { label: 'History records', value: totalHistory, sub: `${totalRecords} total records overall`, icon: History, iconClass: 'border-l-slate-500 bg-slate-50 text-slate-700', cardClass: 'hover:border-l-slate-500' },
    { label: 'Cancelled', value: totalCancelled, sub: totalRecords ? `${Math.round((totalCancelled / totalRecords) * 100)}% of all records` : 'No records yet', icon: XCircle, iconClass: 'border-l-rose-500 bg-rose-50 text-rose-700', cardClass: 'hover:border-l-rose-500' },
    { label: 'Busiest vertical', value: busiestVertical, sub: `${verticalStats[busiestVertical]?.open ?? 0} open bookings`, icon: TrendingUp, iconClass: 'border-l-amber-500 bg-amber-50 text-amber-700', cardClass: 'hover:border-l-amber-500' },
    { label: 'Completed bookings', value: totalCompleted, sub: 'Finished without cancellation, all verticals', icon: CalendarCheck, iconClass: 'border-l-violet-500 bg-violet-50 text-violet-700', cardClass: 'hover:border-l-violet-500' },
    { label: 'Completion rate', value: `${completionRate}%`, sub: `${totalCompleted} of ${totalRecords} records completed`, icon: CheckCircle2, iconClass: 'border-l-blue-600 bg-blue-50 text-blue-700', cardClass: 'hover:border-l-blue-600' },
  ];

  const barOptions = useMemo(() => ({
    chart: { toolbar: { show: false }, fontFamily: 'Poppins-Regular' },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
    dataLabels: { enabled: true, formatter: (value: number) => String(value), style: { fontSize: '11px' } },
    colors: ['#2563EB'],
    xaxis: { categories: verticalLabels, min: 0 },
    grid: { borderColor: '#EEF2F7' },
    tooltip: { theme: 'light' },
  }), [verticalLabels]);

  const openVsHistoryOptions = useMemo(() => ({
    chart: { toolbar: { show: false }, fontFamily: 'Poppins-Regular' },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
    dataLabels: { enabled: false },
    colors: ['#2563EB', '#94A3B8'],
    xaxis: { categories: verticalLabels, min: 0 },
    grid: { borderColor: '#EEF2F7' },
    tooltip: { theme: 'light' },
    legend: { position: 'top' as const },
  }), [verticalLabels]);

  const modules = [
    {
      id: 'meeting-rooms',
      title: 'Meeting Room Bookings',
      description: 'Department, Internal, External, and Tenant bookings, plus history',
      icon: Building2,
      color: VERTICAL_COLORS['Meeting Rooms'],
      route: '/department-accesses/administration-department/bookings/meeting-rooms',
      show: true,
    },
    {
      id: 'hostel',
      title: 'Hostel Bookings',
      description: 'Dorm bookings and booking history',
      icon: Bed,
      color: VERTICAL_COLORS.Hostel,
      route: '/department-accesses/administration-department/bookings/hostel',
      show: showHostel,
    },
    {
      id: 'co-living',
      title: 'Co-living Bookings',
      description: 'Room bookings and booking history',
      icon: Home,
      color: VERTICAL_COLORS['Co-living'],
      route: '/department-accesses/administration-department/bookings/co-living',
      show: showCoLiving,
    },
    {
      id: 'cafe',
      title: 'Cafe Orders',
      description: 'Cafe orders and order history',
      icon: UtensilsCrossed,
      color: VERTICAL_COLORS.Cafe,
      route: '/department-accesses/administration-department/bookings/cafe',
      show: showCafe,
    },
    {
      id: 'all-history',
      title: 'All Booking History',
      description: 'Every vertical\'s booking history, combined in one list',
      icon: History,
      color: '#334155',
      route: '/department-accesses/administration-department/bookings/history',
      // Only worth its own card once there's more than one vertical to combine —
      // with just one, it's a duplicate of that vertical's own History tab.
      show: activeVerticalsCount >= 2,
    },
  ].filter((module) => module.show);

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={administrationBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black 76%, transparent 100%)',
                maskImage: 'linear-gradient(to right, black 0%, black 76%, transparent 100%)',
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[70%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Bookings</span>
                <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Every vertical's bookings in one place — open the one you need to see its full list and history.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, key) => (
              <div key={key} className="h-[108px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`flex min-h-[108px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:shadow-md ${card.cardClass}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-l-2 ${card.iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
                    <p className="mt-1 truncate text-[20px] font-pmedium leading-none text-slate-900">{card.value}</p>
                    <p className="mt-1 truncate text-[9px] font-pmedium text-slate-400">{card.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-pmedium text-slate-900">Manage bookings</p>
          <p className="mt-1 text-[10px] font-pmedium text-slate-500">
            Each card opens that vertical's own bookings list and history.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <DashboardModuleCard
                  key={module.id}
                  icon={<Icon size={19} />}
                  title={module.title}
                  route={module.route}
                  description={module.description}
                  color={module.color}
                />
              );
            })}
          </div>
        </div>

        {!isLoading && verticalLabels.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Bookings by vertical</h2>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">Share of open bookings across every active vertical.</p>
              </div>
              <div className="p-5">
                <DonutChart
                  centerLabel="Bookings"
                  labels={verticalLabels}
                  series={verticalLabels.map((label) => verticalStats[label].open)}
                  colors={verticalLabels.map((label) => VERTICAL_COLORS[label] || '#64748B')}
                  tooltipValue={verticalLabels.map((label) => `${verticalStats[label].open} bookings`)}
                />
              </div>
            </section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Today's bookings by vertical</h2>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">How today's activity is spread across verticals.</p>
              </div>
              <div className="p-5">
                <GroupedBarGraph
                  options={barOptions}
                  series={[{ name: 'Today', data: verticalLabels.map((label) => verticalStats[label].today) }]}
                />
              </div>
            </section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Value by vertical</h2>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">Open booking value, split by vertical.</p>
              </div>
              <div className="p-5">
                <DonutChart
                  centerLabel="Value"
                  isMonetary
                  labels={verticalLabels}
                  series={verticalLabels.map((label) => Math.round(verticalStats[label].value))}
                  colors={verticalLabels.map((label) => VERTICAL_COLORS[label] || '#64748B')}
                  tooltipValue={verticalLabels.map((label) => formatValue(verticalStats[label].value))}
                />
              </div>
            </section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Open vs history by vertical</h2>
                <p className="mt-1 text-[11px] font-pmedium text-slate-500">How much of each vertical's activity is still open.</p>
              </div>
              <div className="p-5">
                <GroupedBarGraph
                  options={openVsHistoryOptions}
                  series={[
                    { name: 'Open', data: verticalLabels.map((label) => verticalStats[label].open) },
                    { name: 'History', data: verticalLabels.map((label) => verticalStats[label].history) },
                  ]}
                />
              </div>
            </section>
          </div>
        )}

        {!isLoading && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">Recent bookings</h2>
              <p className="mt-1 text-[11px] font-pmedium text-slate-500">Latest activity combined across every active vertical.</p>
            </div>
            <div className="max-h-[390px] overflow-y-auto">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="w-[16%] px-5 py-3">Vertical</th>
                    <th className="w-[26%] px-4 py-3">Details</th>
                    <th className="w-[18%] px-4 py-3">Date</th>
                    <th className="w-[16%] px-4 py-3">Status</th>
                    <th className="w-[12%] px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {recentRecords.length ? recentRecords.map((record, index) => {
                    const Icon = VERTICAL_ICON[record.vertical] || Building2;
                    return (
                      <tr key={`${record.vertical}-${index}`} className="hover:bg-slate-50/70">
                        <td className="truncate px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 font-pmedium text-slate-900">
                            <Icon size={12} style={{ color: VERTICAL_COLORS[record.vertical] || '#64748B' }} />
                            {record.vertical}
                          </span>
                        </td>
                        <td className="truncate px-4 py-3 text-slate-600">
                          {record.title}
                          <span className="block text-[10px] text-slate-400">{record.sub}</span>
                        </td>
                        <td className="truncate px-4 py-3 text-slate-600">{dateLabel(record.date)}</td>
                        <td className="px-4 py-3"><span className={statusPillClass(record.status)}>{record.status}</span></td>
                        <td className="truncate px-4 py-3 text-right text-slate-900">{formatValue(record.value)}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-[11px] text-slate-500">No bookings are recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </PageFrame>
    </div>
  );
}
