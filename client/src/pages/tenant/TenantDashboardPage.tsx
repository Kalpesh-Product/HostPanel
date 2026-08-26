import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  History,
  MapPin,
  Plus,
  Ticket,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import PageFrame from '@/components/Pages/PageFrame';
import { getStoredTenantCompanyId, getStoredTenantCompanyName, getStoredUser } from '@/lib/auth-session';
import { getStoredTenantRole, isTenantAdminRole, isTenantManagerRole } from '@/lib/tenant-session';
import { getMeetingRoomBookings } from '@/services/meeting-room-bookings';
import { getResources } from '@/services/resources';
import { getMyTenantCompany } from '@/services/tenant-companies';
import { getTickets } from '@/services/tickets';

const LOW_CREDIT_WARNING_THRESHOLD = 10;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeId(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function extractList(payload: any, keys: string[] = []): any[] {
  if (!payload) return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  if (payload.data && typeof payload.data === 'object') {
    for (const key of keys) {
      if (Array.isArray(payload.data[key])) return payload.data[key];
    }
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function formatDateLabel(value: string): string {
  if (!value) return 'N/A';
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(parsedDate);
}

function formatBookingWindow(booking: Record<string, any>): string {
  const dateLabel = formatDateLabel(booking?.date);
  const startTime = booking?.checkIn || booking?.startTime || '';
  const endTime = booking?.checkOut || booking?.endTime || '';
  return `${dateLabel} \u2022 ${startTime}${endTime ? ` - ${endTime}` : ''}`;
}

function toBookingSortKey(booking: Record<string, any>): number {
  const dateValue = booking?.date || '';
  const startTime = booking?.startTime || booking?.checkIn || '00:00';
  const parsedValue = new Date(`${dateValue}T${startTime}:00`);
  return Number.isNaN(parsedValue.getTime()) ? 0 : parsedValue.getTime();
}

function isFutureBooking(booking: Record<string, any>): boolean {
  const sortKey = toBookingSortKey(booking);
  if (!sortKey) return false;
  const status = normalizeId(booking?.status);
  return status !== 'cancelled' && status !== 'completed' && sortKey >= Date.now();
}

function isOpenTicket(ticket: Record<string, any>): boolean {
  const status = normalizeId(ticket?.status);
  return ['open', 'new', 'pending', 'in progress', 'assigned', 'progress'].includes(status);
}

function getInviteForUser(booking: Record<string, any>, currentUserId: string, currentUserEmail = ''): Record<string, any> | null {
  const invites = Array.isArray(booking?.invites) ? booking.invites : [];
  return invites.find((invite: Record<string, any>) =>
    normalizeId(invite?.invitedUserId || '') === currentUserId ||
    normalizeId(invite?.invitedEmail || '') === currentUserEmail
  ) || null;
}

function isHostedByUser(booking: Record<string, any>, currentUserId: string, currentUserName: string): boolean {
  return Boolean(
    booking?.isMe ||
    normalizeId(booking?.bookedByUserId || '') === currentUserId ||
    normalizeId(booking?.bookedByName || '') === currentUserName,
  );
}

function isPersonalBooking(booking: Record<string, any>, currentUserId: string, currentUserName: string, currentUserEmail = ''): boolean {
  const invite = getInviteForUser(booking, currentUserId, currentUserEmail);
  return isHostedByUser(booking, currentUserId, currentUserName) || Boolean(invite && normalizeId(invite.status) === 'accepted');
}

function normalizeRoom(resource: Record<string, any>) {
  const rawType = resource?.type || resource?.resourceType || resource?.category || resource?.resourceCategory || '';
  const name = resource?.name || resource?.roomName || resource?.resourceName || '';
  const floor = resource?.floor || resource?.locationFloor || resource?.metadata?.floor || '';
  const wing = resource?.wing || resource?.locationWing || resource?.metadata?.wing || '';
  const status = resource?.status || resource?.resourceStatus || (resource?.isActive === false ? 'Inactive' : 'Active');

  return {
    id: resource?.recordId || resource?.id || name,
    name,
    type: rawType,
    floor,
    wing,
    status,
    isBooked: Boolean(resource?.isBooked || resource?.occupied || resource?.currentlyBooked),
    isActive: resource?.isActive !== false,
    raw: resource,
  };
}

function isMeetingRoomResource(resource: Record<string, any>): boolean {
  const typeText = `${resource?.type || ''} ${resource?.resourceType || ''} ${resource?.category || ''} ${resource?.resourceCategory || ''} ${resource?.name || ''}`.toLowerCase();
  return typeText.includes('meeting') || typeText.includes('conference');
}

function isAvailableRoom(resource: Record<string, any>): boolean {
  const status = normalizeId(resource?.status || resource?.resourceStatus || 'active');
  return isMeetingRoomResource(resource) && resource?.isActive !== false && !resource?.isBooked && status !== 'inactive' && status !== 'disabled';
}

function getCurrentUserId(user: Record<string, any>): string {
  return normalizeId(user?.id || user?._id || user?.recordId || '');
}

function getCurrentUserName(user: Record<string, any>): string {
  return normalizeId(user?.fullName || user?.name || user?.email || '');
}

function isEmployeeRaisedTicket(ticket: Record<string, any>): boolean {
  const submittedBy = normalizeId(ticket?.submittedBy || '');
  return Boolean(submittedBy) && !submittedBy.includes('manager');
}

export default function TenantDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsRefreshing] = useState(false);
  const [, setLoadError] = useState('');
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [tickets, setTickets] = useState<Record<string, any>[]>([]);
  const [rooms, setRooms] = useState<Record<string, any>[]>([]);
  const [tenantCompanies, setTenantCompanies] = useState<Record<string, any>[]>([]);
  const [tenantSummary, setTenantSummary] = useState<Record<string, any> | null>(null);

  const currentUser = getStoredUser() || {};
  const userRole = getStoredTenantRole() || 'tenant-employee';
  const canManageTenant = isTenantAdminRole(userRole) || isTenantManagerRole(userRole);
  const canViewWorkspaceSummary = isTenantAdminRole(userRole);
  const workspaceId = currentUser?.primaryWorkspace || '';

  const tenantCompanyName =
    currentUser?.tenantCompanyName ||
    currentUser?.workspaceMembership?.tenantCompanyName ||
    getStoredTenantCompanyName() ||
    'Tenant Workspace';
  const tenantCompanyId = normalizeId(currentUser?.tenantCompanyId || currentUser?.workspaceMembership?.tenantCompanyId || getStoredTenantCompanyId() || '');
  const normalizedTenantCompanyName = normalizeId(tenantCompanyName);

  const currentUserId = getCurrentUserId(currentUser);
  const currentUserName = getCurrentUserName(currentUser);

  const currentCompany = useMemo(() => {
    if (!Array.isArray(tenantCompanies) || tenantCompanies.length === 0) return null;
    const matched = tenantCompanies.find((company) => {
      const recordId = normalizeId(company?.recordId || company?.id || '');
      const companyName = normalizeId(company?.companyName || '');
      const companyId = normalizeId(company?.tenantCompanyId || company?.tenantId || '');
      return (
        (currentUser?.tenantCompanyId && recordId === normalizeId(currentUser.tenantCompanyId)) ||
        (currentUser?.tenantCompanyId && companyId === normalizeId(currentUser.tenantCompanyId)) ||
        companyName === normalizeId(tenantCompanyName)
      );
    });
    if (matched) return matched;
    if (tenantCompanies.length === 1) return tenantCompanies[0];
    return null;
  }, [currentUser?.tenantCompanyId, tenantCompanies, tenantCompanyName]);

  const companyEmployees = Array.isArray(currentCompany?.employees) ? currentCompany.employees : [];
  const companyCreditsAllocated = Number(currentCompany?.creditsAllocated || currentCompany?.creditsTotal || 0);
  const companyCreditsRemaining = Number(
    currentCompany?.creditsRemaining ??
    currentCompany?.addOnCredits?.remainingCredits ??
    currentCompany?.packageDetails?.monthlyTotalCredits ??
    0,
  );
  const companyCreditsUsed = Math.max(0, companyCreditsAllocated - companyCreditsRemaining);
  const companyCreditsDisplay = companyCreditsAllocated > 0 ? companyCreditsAllocated : companyCreditsRemaining;
  const companyPlan = currentCompany?.planType || currentCompany?.packageDetails?.name || 'Tenant Plan';
  const companyStatus = currentCompany?.status || 'Active';
  const companyContact = currentCompany?.contactName || currentUser?.fullName || 'Company contact';
  const companyManager = currentCompany?.managerEmployee
    || currentCompany?.employees?.find((employee: Record<string, any>) => normalizeId(employee?.id) === normalizeId(currentCompany?.managerEmployeeId))
    || currentCompany?.employees?.find((employee: Record<string, any>) => normalizeId(employee?.role) === 'manager' || normalizeId(employee?.role) === 'tenant-manager')
    || null;

  const visibleBookings = useMemo(() => {
    const tenantScopeBookings = bookings.filter((booking) => {
      const isTenantBooking = normalizeId(booking?.bookingType) === 'tenant';
      const bookingCompanyId = normalizeId(booking?.bookedByTenantCompanyId || '');
      const bookingCompanyName = normalizeId(booking?.bookedByTenantCompanyName || booking?.clientCompany || '');
      const mine = isPersonalBooking(booking, currentUserId, currentUserName, currentUser?.email || '');
      return isTenantBooking && (
        (tenantCompanyId && bookingCompanyId === tenantCompanyId) ||
        (normalizedTenantCompanyName && bookingCompanyName === normalizedTenantCompanyName) ||
        mine
      );
    });
    if (canManageTenant) return tenantScopeBookings;
    return tenantScopeBookings.filter((booking) => isPersonalBooking(booking, currentUserId, currentUserName, currentUser?.email || ''));
  }, [bookings, canManageTenant, currentUser, currentUserId, currentUserName, normalizedTenantCompanyName, tenantCompanyId]);

  const upcomingBookings = useMemo(
    () => visibleBookings.filter(isFutureBooking).sort((left, right) => toBookingSortKey(left) - toBookingSortKey(right)).slice(0, 4),
    [visibleBookings],
  );

  const visibleTickets = useMemo(() => {
    const tenantScopeTickets = tickets.filter((ticket) => {
      const ticketCompanyId = normalizeId(ticket?.tenantCompanyId || '');
      const ticketCompanyName = normalizeId(ticket?.tenantCompanyName || '');
      const matchesCompany = Boolean(
        (tenantCompanyId && ticketCompanyId === tenantCompanyId) ||
        (normalizedTenantCompanyName && ticketCompanyName === normalizedTenantCompanyName),
      );
      const mine = Boolean(
        normalizeId(ticket?.requesterUserId || '') === currentUserId ||
        normalizeId(ticket?.submittedBy || '') === currentUserName ||
        normalizeId(ticket?.assignedTo || '') === currentUserName,
      );
      return matchesCompany && (canManageTenant ? isEmployeeRaisedTicket(ticket) : mine);
    });
    if (canManageTenant) return tenantScopeTickets;
    if (tenantScopeTickets.length > 0) return tenantScopeTickets;
    return tickets.filter((ticket) => {
      const requesterId = normalizeId(ticket?.requesterUserId || '');
      const submittedBy = normalizeId(ticket?.submittedBy || '');
      const assignedTo = normalizeId(ticket?.assignedTo || '');
      return requesterId === currentUserId || submittedBy === currentUserName || assignedTo === currentUserName;
    }).slice(0, 4);
  }, [canManageTenant, currentUserId, currentUserName, normalizedTenantCompanyName, tenantCompanyId, tickets]);

  const openTicketCount = visibleTickets.filter(isOpenTicket).length;
  const availableRooms = rooms.filter(isAvailableRoom);
  const availableRoomsCount = availableRooms.length;
  const employeeCount = companyEmployees.length || Number(currentCompany?.employeesCount || 0);
  const bookingCount = visibleBookings.length;
  const creditUsagePercent = companyCreditsDisplay > 0 ? Math.min(100, Math.round((companyCreditsUsed / companyCreditsDisplay) * 100)) : 0;
  const isCreditLow = companyCreditsRemaining <= LOW_CREDIT_WARNING_THRESHOLD;

  const summaryCards = [
    {
      label: 'Available Rooms',
      value: availableRoomsCount,
      icon: <Building2 size={16} />,
      iconClass: 'bg-blue-50 text-blue-600',
      labelClass: 'text-blue-600',
      borderClass: 'border-l-4 border-l-blue-500',
    },
    {
      label: 'Upcoming Bookings',
      value: upcomingBookings.length,
      icon: <CalendarCheck size={16} />,
      iconClass: 'bg-violet-50 text-violet-600',
      labelClass: 'text-violet-600',
      borderClass: 'border-l-4 border-l-violet-500',
    },
    {
      label: 'Open Tickets',
      value: openTicketCount,
      icon: <Ticket size={16} />,
      iconClass: 'bg-amber-50 text-amber-600',
      labelClass: 'text-amber-600',
      borderClass: 'border-l-4 border-l-amber-500',
    },
    {
      label: 'Credits Remaining',
      value: `${companyCreditsRemaining > 0 ? companyCreditsRemaining : 0} / ${companyCreditsDisplay > 0 ? companyCreditsDisplay : 0}`,
      icon: <CreditCard size={16} />,
      iconClass: isCreditLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
      labelClass: isCreditLow ? 'text-red-600' : 'text-emerald-600',
      borderClass: isCreditLow ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500',
    },
  ];

  const [showCreditAlert, setShowCreditAlert] = useState(false);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsRefreshing(true);
      setLoadError('');

      try {
        const [bookingsResult, ticketsResult, resourcesResult, companiesResult] = await Promise.allSettled([
          workspaceId ? getMeetingRoomBookings(workspaceId) : Promise.reject('No workspace'),
          getTickets({ page: 1, limit: 20 }),
          getResources(),
          getMyTenantCompany(),
        ]);
        const bookingPayload = bookingsResult.status === 'fulfilled' ? bookingsResult.value : null;
        const ticketPayload = ticketsResult.status === 'fulfilled' ? ticketsResult.value : null;
        const resourcePayload = resourcesResult.status === 'fulfilled' ? resourcesResult.value?.data : null;
        const companiesPayload = companiesResult.status === 'fulfilled' ? companiesResult.value?.data?.tenant : null;
        if (!active) return;
        setBookings(extractList(bookingPayload, ['bookings', 'items']));
        setTickets(extractList(ticketPayload, ['tickets', 'items']));
        setRooms(extractList(resourcePayload, ['resources', 'items']).map(normalizeRoom));
        const companyArray = companiesPayload ? [companiesPayload] : [];
        setTenantCompanies(companyArray);
        setTenantSummary(null);

      } catch (error: any) {
        if (!active) return;
        setLoadError(error?.message || 'Unable to load tenant dashboard.');
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadDashboard();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (canManageTenant && companyCreditsRemaining <= LOW_CREDIT_WARNING_THRESHOLD) {
      const alertKey = `tenant-credit-alert:${tenantCompanyId || tenantCompanyName}:${companyCreditsRemaining}`;
      if (sessionStorage.getItem(alertKey) !== 'dismissed') {
        setShowCreditAlert(true);
      }
    } else {
      setShowCreditAlert(false);
    }
  }, [canManageTenant, companyCreditsRemaining, tenantCompanyId, tenantCompanyName]);

  const dismissCreditAlert = () => {
    const alertKey = `tenant-credit-alert:${tenantCompanyId || tenantCompanyName}:${companyCreditsRemaining}`;
    sessionStorage.setItem(alertKey, 'dismissed');
    setShowCreditAlert(false);
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* ── Header ── */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Welcome back, {currentUser?.fullName || currentUser?.name || currentUserName || 'User'}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider text-blue-700 border border-blue-100">
                  {tenantCompanyName}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider border ${canManageTenant ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {canManageTenant ? 'Tenant Manager' : 'Tenant Employee'}
                </span>
                <p className="text-xs font-pmedium text-slate-500">
                  Your tenant workspace at a glance — rooms, bookings, tickets and credits.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/dashboard/tenant/meeting-room-booking" className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/60 px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB] active:scale-95">
                <Calendar size={14} /> Book Room
              </Link>
              <Link to="/dashboard/tenant/tickets" className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/60 px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 active:scale-95">
                <Ticket size={14} /> Raise Ticket
              </Link>
              <Link to="/dashboard/tenant/booking-history" className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200/60 px-3.5 py-2.5 text-[10px] font-pmedium uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 active:scale-95">
                <History size={14} /> Booking History
              </Link>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {summaryCards.map((card) => (
              <div key={card.label} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${card.labelClass}`}>{card.label}</p>
                  <p className="text-[15px] font-pmedium text-slate-900 truncate">{card.value}</p>
                </div>
                <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>{card.icon}</div>
              </div>
            ))}
          </div>

          {/* ── Upcoming Bookings + Room Pool ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[320px] xl:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5">
                <h2 className="flex items-center gap-2 text-[12px] font-pmedium uppercase tracking-widest text-primary">
                  <Clock size={15} className="text-[#2563EB]" />
                  {canManageTenant ? 'Company Upcoming Bookings' : 'My Upcoming Bookings'}
                </h2>
                <Link to="/dashboard/tenant/booking-history" className="flex items-center gap-1 text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] hover:underline">
                  View All <ChevronRight size={13} />
                </Link>
              </div>

              <div className="flex-1 divide-y divide-slate-100/60 overflow-y-auto bg-white/20">
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.map((booking) => (
                    <div key={booking.recordId || booking.id} className="group flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                          <span className="text-[9px] font-pmedium uppercase">{formatDateLabel(booking?.date).split(' ')[0]}</span>
                          <span className="text-sm font-pmedium leading-none">{String(booking?.date || '').split('-')[2] || '--'}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[13px] font-pmedium text-slate-900 truncate group-hover:text-[#2563EB] transition-colors">{booking.roomName}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider ${normalizeId(booking.bookingType) === 'guest' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                              {normalizeText(booking.bookingType || 'Tenant')}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-pmedium text-slate-500">
                            <span className="flex items-center gap-1.5"><Clock size={11} /> {formatBookingWindow(booking)}</span>
                            {booking.clientCompany && (
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider text-slate-500">
                                {booking.clientCompany}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Host</p>
                          <p className="text-[12px] font-pmedium text-slate-700">{booking.bookedByName || companyContact}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider text-blue-700">
                          {normalizeText(booking.status || booking.bookingStatus || 'Booked')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                      <Calendar size={22} />
                    </div>
                    <p className="font-pmedium text-slate-700">No upcoming bookings</p>
                    <p className="mt-1 text-[12px] font-pregular text-slate-400">Use the booking page to reserve a room for your team.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col min-h-[320px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-pmedium uppercase tracking-widest text-primary">
                  <MapPin size={15} className="text-[#2563EB]" /> Room Pool
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider text-emerald-700">{availableRooms.length} ready</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {availableRooms.slice(0, 5).map((room) => (
                  <div key={room.id || room.name} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 flex items-start justify-between gap-3 transition-colors hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-[12px] font-pmedium text-slate-900 truncate">{room.name || 'Meeting room'}</p>
                      <p className="mt-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                        {normalizeText(room.type || 'Room')}{room.floor ? ` \u2022 Floor ${room.floor}` : ''}{room.wing ? ` \u2022 Wing ${room.wing}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider text-emerald-700">Ready</span>
                  </div>
                ))}

                {availableRooms.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <div className="mb-3 rounded-full bg-white p-3 text-slate-400 shadow-sm border border-slate-100">
                      <MapPin size={18} />
                    </div>
                    <p className="text-[12px] font-pmedium text-slate-600">No meeting rooms are currently available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Tickets + Team Snapshot + Tenant Summary ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col min-h-[360px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-pmedium uppercase tracking-widest text-primary">
                  <Ticket size={15} className="text-amber-500" /> {canManageTenant ? 'Company Tickets' : 'My Tickets'}
                </h2>
                <Link to="/dashboard/tenant/tickets" className="text-[10px] font-pmedium uppercase tracking-widest text-[#2563EB] hover:underline">View All</Link>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                {visibleTickets.slice(0, 4).map((ticket) => (
                  <Link key={ticket.recordId || ticket.id} to="/dashboard/tenant/tickets" className="block rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="text-[10px] font-pmedium text-slate-500">{ticket.id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider ${isOpenTicket(ticket) ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {normalizeText(ticket.status || 'Open')}
                      </span>
                    </div>
                    <p className="mb-2 text-[12px] font-pmedium text-slate-800 line-clamp-1">{ticket.title}</p>
                    <div className="flex items-center justify-between gap-3 text-[10px] font-pmedium text-slate-400">
                      <span>{ticket.department || 'Administration'}</span>
                      <span>{ticket.assignedTo || ticket.submittedBy || 'Unassigned'}</span>
                    </div>
                  </Link>
                ))}

                {visibleTickets.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                      <Ticket size={20} />
                    </div>
                    <p className="font-pmedium text-slate-700">No support tickets yet</p>
                    <p className="mt-1 text-[12px] font-pregular text-slate-400">Raise a ticket when something needs admin attention.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col min-h-[360px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-pmedium uppercase tracking-widest text-primary">
                  <UserCheck size={15} className="text-emerald-600" /> Team Snapshot
                </h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider text-blue-700">{employeeCount} Members</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Plan</p>
                      <p className="mt-1 text-[12px] font-pmedium text-slate-900 truncate">{companyPlan}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 shrink-0"><Building2 size={16} /></div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3 border border-slate-100">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Contact</p>
                      <p className="mt-1 text-[11px] font-pmedium text-slate-800 truncate">{companyContact}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-slate-100">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Credits Used</p>
                      <p className="mt-1 text-[11px] font-pmedium text-slate-800">{companyCreditsUsed}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Company Credit Usage</p>
                    <span className={`text-[10px] font-pmedium uppercase tracking-widest ${isCreditLow ? 'text-red-600' : 'text-slate-500'}`}>{creditUsagePercent}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full transition-all ${isCreditLow ? 'bg-red-500' : 'bg-[#2563EB]'}`} style={{ width: `${creditUsagePercent}%` }} />
                  </div>
                </div>

                {companyManager && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Manager</p>
                    <div className="mt-1 flex items-center gap-2 font-pmedium text-slate-900">
                      <UserCheck size={13} className="text-slate-400" />
                      <span className="text-[12px]">{companyManager.name || companyManager.fullName || 'Assigned manager'}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{companyManager.email || 'No email on file'}</p>
                  </div>
                )}

                <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Recent Team Members</p>
                    <Users size={13} className="text-slate-400" />
                  </div>
                  {companyEmployees.slice(0, 4).map((employee: Record<string, any>, index: number) => (
                    <div key={employee?.id || employee?.email || `${index}`} className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-pmedium text-slate-800 truncate">{employee?.name || employee?.fullName || employee?.email || 'Employee'}</p>
                        <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{employee?.designation || employee?.role || 'Staff'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wider ${normalizeId(employee?.status || 'active') === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {normalizeText(employee?.status || 'Active')}
                      </span>
                    </div>
                  ))}

                  {companyEmployees.length === 0 && (
                    <div className="rounded-xl bg-slate-50/70 px-3 py-4 text-center text-[11px] font-pregular text-slate-500">
                      No embedded team members are available on this tenant record yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col min-h-[360px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-pmedium uppercase tracking-widest text-primary">
                  <CheckCircle2 size={15} className="text-emerald-600" /> Tenant Summary
                </h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wider ${normalizeId(companyStatus) === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{normalizeText(companyStatus)}</span>
              </div>

              <div className="flex-1 space-y-3 text-[12px] font-pregular text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50/70 px-4 py-3">
                  <span className="font-pmedium">Visible bookings</span>
                  <span className="font-pmedium text-slate-900">{bookingCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50/70 px-4 py-3">
                  <span className="font-pmedium">Open support tickets</span>
                  <span className="font-pmedium text-slate-900">{openTicketCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50/70 px-4 py-3">
                  <span className="font-pmedium">Tenant credits remaining</span>
                  <span className={`font-pmedium ${isCreditLow ? 'text-red-600' : 'text-slate-900'}`}>{companyCreditsRemaining}</span>
                </div>
                {tenantSummary && canViewWorkspaceSummary && (
                  <div className="rounded-xl bg-slate-50/70 px-4 py-3">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Unit Summary</p>
                    <p className="mt-1 text-[12px] font-pmedium text-slate-800">
                      {tenantSummary.totalTenants || 0} tenant companies, {tenantSummary.activeContracts || 0} active contracts.
                    </p>
                  </div>
                )}
              </div>

              {canManageTenant && (
                <Link to="/dashboard/tenant/buy-credits" className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Plus size={16} /></div>
                    <div>
                      <p className="text-[12px] font-pmedium text-slate-900">Request Credits</p>
                      <p className="text-[10px] font-pregular text-slate-500">Ask Sales to add more credits for your team.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Credits alert modal */}
        {showCreditAlert && (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={dismissCreditAlert}>
            <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/70" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-amber-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm shrink-0 bg-amber-500 text-white">
                    <CreditCard size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-amber-600">Credits alert</p>
                    <h2 className="text-base lg:text-lg font-pmedium tracking-tight text-slate-800">Credits are low / exhausted.</h2>
                  </div>
                </div>
                <button onClick={dismissCreditAlert} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"><X size={16} /></button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 bg-white">
                <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[12px] font-pmedium leading-relaxed text-slate-600">
                    Buy new credits for this month. Your current tenant balance is{' '}
                    <span className="font-pmedium text-slate-900">{companyCreditsRemaining} credits</span>.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex justify-end gap-2">
                <button type="button" onClick={dismissCreditAlert} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest">
                  Later
                </button>
                <Link to="/dashboard/tenant/buy-credits" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] uppercase tracking-widest shadow-sm hover:bg-primary/95 active:scale-95 transition-all">
                  Buy new credits <ChevronRight size={13} strokeWidth={3} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </PageFrame>
    </div>
  );
}
