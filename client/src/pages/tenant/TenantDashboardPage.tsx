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
  Hand,
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
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-8 flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          {/* <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-pbold text-white shadow-md ${canManageTenant ? 'bg-linear-to-br from-purple-600 to-indigo-800' : 'bg-linear-to-br from-[#2563EB] to-indigo-600'}`}>
            {normalizeText(currentUser?.fullName || tenantCompanyName || 'T').charAt(0).toUpperCase()}
          </div> */}
          <div>
            <h1 className="text-title font-pmedium text-primary uppercase flex items-center gap-2">
              Welcome back, {currentUser?.fullName || currentUser?.name || currentUserName || 'User'}.
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-pmedium text-slate-600">
                {tenantCompanyName}
              </span>
              <span className={`rounded-md px-2.5 py-1 text-xs font-pmedium ${canManageTenant ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/70 text-slate-500'}`}>
                {canManageTenant ? 'Tenant Manager' : 'Tenant Employee'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/tenant/meeting-room-booking" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-pbold uppercase tracking-widest text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Calendar size={16} className="text-[#2563EB]" /> Book Room
          </Link>
          <Link to="/dashboard/tenant/tickets" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-pbold uppercase tracking-widest text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <Ticket size={16} className="text-green-600" /> Raise Ticket
          </Link>
          <Link to="/dashboard/tenant/booking-history" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-pbold uppercase tracking-widest text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            <History size={16} className="text-purple-600"/> Booking History
          </Link>
        </div>
      </div>

      {/* Load error banner — uncomment error setter above to activate */}
      {/* loadError && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-pregular text-amber-800">
          {loadError}
        </div>
      ) */}

      {showCreditAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-amber-100 bg-amber-50 px-6 py-5">
              <div>
                <p className="text-[10px] font-pbold uppercase tracking-widest text-amber-600">Credits alert</p>
                <h2 className="mt-2 text-xl font-pbold text-slate-950">Credits are low / exhausted.</h2>
              </div>
              <button type="button" onClick={dismissCreditAlert} className="rounded-xl bg-white p-2 text-slate-500 shadow-sm hover:text-slate-900">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-5 px-6 py-6">
              <p className="text-sm font-semibold leading-relaxed text-slate-600">
                Buy new credits for this month. Your current tenant balance is {companyCreditsRemaining} credits.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={dismissCreditAlert} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-pbold uppercase tracking-widest text-slate-600 hover:bg-slate-50">
                  Later
                </button>
                <Link to="/dashboard/tenant/buy-credits" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-xs font-pbold uppercase tracking-widest text-white shadow-sm hover:bg-blue-700">
                  Buy new credits <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Total Meeting Rooms</p>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Building2 size={16} />
              </div>
            </div>
            <p className="text-xl font-pbold text-slate-900">{availableRoomsCount}</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Upcoming Bookings</p>
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <CalendarCheck size={16} />
              </div>
            </div>
            <p className="text-xl font-pbold text-slate-900">{upcomingBookings.length}</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Open Tickets</p>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Ticket size={16} />
              </div>
            </div>
            <p className="text-xl font-pbold text-slate-900">{openTicketCount}</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Credits Remaining</p>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-pbold text-slate-900">{companyCreditsRemaining > 0 ? companyCreditsRemaining : 0}</p>
              <span className="text-xs font-pmedium text-slate-400">/ {companyCreditsDisplay > 0 ? companyCreditsDisplay : 0}</span>
            </div>
            
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-8 lg:grid-cols-3">
        {/* Row 1: Upcoming Bookings + Room Pool */}
        <div className="flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/60 px-6 py-5">
            <h2 className="flex items-center gap-2 text-lg font-pbold text-slate-900">
              <Clock size={20} className="text-[#2563EB]" /> {canManageTenant ? 'Company Upcoming Bookings' : 'My Upcoming Bookings'}
            </h2>
            <Link to="/dashboard/tenant/booking-history" className="flex items-center gap-1 text-xs font-pbold uppercase tracking-widest text-[#2563EB]">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-50 overflow-y-auto">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <div key={booking.recordId || booking.id} className="group flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <span className="text-[10px] font-pbold uppercase">{String(booking?.date || '').split('-')[1] || '--'}</span>
                      <span className="text-sm font-pbold">{String(booking?.date || '').split('-')[2] || '--'}</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-pbold text-slate-900 transition-colors group-hover:text-[#2563EB]">{booking.roomName}</h3>
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest text-slate-500">
                          {normalizeText(booking.bookingType || 'Tenant')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-pmedium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} /> {formatBookingWindow(booking)}
                        </span>
                        {booking.clientCompany && (
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-pbold uppercase tracking-widest text-slate-500">
                            {booking.clientCompany}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Status</p>
                      <p className="text-sm font-pmedium text-[#2563EB]">{normalizeText(booking.status || booking.bookingStatus || 'Booked')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Host</p>
                      <p className="text-sm font-pmedium text-slate-700">{booking.bookedByName || companyContact}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Calendar size={24} />
                </div>
                <h3 className="text-lg font-pbold text-slate-900">No upcoming bookings</h3>
                <p className="mt-1 text-sm font-pregular text-slate-500">Use the booking page to reserve a room for your team.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-pbold uppercase tracking-widest text-slate-900">
              <MapPin size={16} className="text-[#2563EB]" /> Room Pool
            </h2>
            <span className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">{availableRooms.length} available</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto">
            {availableRooms.slice(0, 5).map((room) => (
              <div key={room.id || room.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-pmedium text-slate-900">{room.name || 'Meeting room'}</p>
                    <p className="mt-1 text-[10px] font-pbold uppercase tracking-widest text-slate-400">
                      {normalizeText(room.type || 'Room')} {room.floor ? `\u2022 Floor ${room.floor}` : ''} {room.wing ? `\u2022 Wing ${room.wing}` : ''}
                    </p>
                  </div>
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest text-blue-700">
                    Ready
                  </span>
                </div>
              </div>
            ))}

            {availableRooms.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <div className="mb-3 rounded-full bg-white p-3 text-slate-400 shadow-sm">
                  <MapPin size={20} />
                </div>
                <p className="text-sm font-pmedium text-slate-800">No meeting rooms are currently available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Tickets + Team Snapshot + Tenant Summary */}
        <div className="flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-pbold uppercase tracking-widest text-slate-900">
              <Ticket size={16} className="text-purple-600" /> {canManageTenant ? 'Company Tickets' : 'My Tickets'}
            </h2>
            <Link to="/dashboard/tenant/tickets" className="text-[10px] font-pbold uppercase tracking-widest text-purple-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {visibleTickets.slice(0, 4).map((ticket) => (
              <Link key={ticket.recordId || ticket.id} to="/dashboard/tenant/tickets" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-purple-200 hover:bg-white">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="text-[10px] font-pbold text-slate-500">{ticket.id}</span>
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest ${isOpenTicket(ticket) ? 'border-amber-200 bg-amber-100 text-amber-700' : 'border-emerald-200 bg-emerald-100 text-emerald-700'}`}>
                    {normalizeText(ticket.status || 'Open')}
                  </span>
                </div>
                <p className="mb-2 text-sm font-pmedium text-slate-800">{ticket.title}</p>
                <div className="flex items-center justify-between gap-3 text-[10px] font-pmedium text-slate-400">
                  <span>{ticket.department || 'Administration'}</span>
                  <span>{ticket.assignedTo || ticket.submittedBy || 'Unassigned'}</span>
                </div>
              </Link>
            ))}

            {visibleTickets.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Ticket size={22} />
                </div>
                <h3 className="text-base font-pbold text-slate-900">No support tickets yet</h3>
                <p className="mt-1 text-sm font-pregular text-slate-500">Raise a ticket when something needs admin attention.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-pbold uppercase tracking-widest text-slate-900">
              <UserCheck size={16} className="text-emerald-600" /> Team Snapshot
            </h2>
            <span className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">{employeeCount} Members</span>
          </div>

          <div className="space-y-4 overflow-y-auto">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Plan</p>
                  <p className="mt-1 text-sm font-pmedium text-slate-900">{companyPlan}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <Building2 size={18} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Contact</p>
                  <p className="mt-1 font-pmedium text-slate-800">{companyContact}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Credits Used</p>
                  <p className="mt-1 font-pmedium text-slate-800">{companyCreditsUsed}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Company Credit Usage</p>
                <span className="text-[10px] font-pbold uppercase tracking-widest text-slate-500">{creditUsagePercent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${isCreditLow ? 'bg-amber-500' : 'bg-[#2563EB]'}`} style={{ width: `${creditUsagePercent}%` }} />
              </div>
            </div>

            {companyManager && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Manager</p>
                <p className="mt-1 text-sm font-pmedium text-slate-900">{companyManager.name || companyManager.fullName || 'Assigned manager'}</p>
                <p className="mt-1 text-xs font-pregular text-slate-500">{companyManager.email || 'No email on file'}</p>
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Recent Team Members</p>
                <Users size={14} className="text-slate-400" />
              </div>
              {companyEmployees.slice(0, 4).map((employee: Record<string, any>, index: number) => (
                <div key={employee?.id || employee?.email || `${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-pmedium text-slate-800">{employee?.name || employee?.fullName || employee?.email || 'Employee'}</p>
                    <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">{employee?.designation || employee?.role || 'Staff'}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-pbold uppercase tracking-widest ${normalizeId(employee?.status || 'active') === 'active' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                    {normalizeText(employee?.status || 'Active')}
                  </span>
                </div>
              ))}

              {companyEmployees.length === 0 && (
                <div className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm font-pregular text-slate-500">
                  No embedded team members are available on this tenant record yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-pbold uppercase tracking-widest text-slate-900">
              <CheckCircle2 size={16} className="text-emerald-600" /> Tenant Summary
            </h2>
          </div>

          <div className="mt-4 space-y-3 text-sm font-pregular text-slate-600">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span>Visible bookings</span>
              <span className="font-pbold text-slate-900">{bookingCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span>Open support tickets</span>
              <span className="font-pbold text-slate-900">{openTicketCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span>Tenant credits remaining</span>
              <span className="font-pbold text-slate-900">{companyCreditsRemaining}</span>
            </div>
            {tenantSummary && canViewWorkspaceSummary && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-pbold uppercase tracking-widest text-slate-400">Unit Summary</p>
                <p className="mt-1 text-sm font-pmedium text-slate-800">
                  {tenantSummary.totalTenants || 0} tenant companies, {tenantSummary.activeContracts || 0} active contracts.
                </p>
              </div>
            )}
          </div>

          {canManageTenant && (
            <Link to="/dashboard/tenant/buy-credits" className="mt-6 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 transition-colors hover:bg-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                  <Plus size={18} />
                </div>
                <div>
                  <p className="text-sm font-pbold text-slate-900">Request Credits</p>
                  <p className="text-xs font-pregular text-slate-500">Ask Sales to add more credits for your team.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </Link>
          )}
        </div>
      </div>
      </PageFrame>
    </div>
  );
}
