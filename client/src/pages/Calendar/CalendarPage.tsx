import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  Ticket,
  Search,
  X,
  AlertCircle
} from 'lucide-react';
import { getMyCalendar } from '@/services/calendar';
import Skeleton from '@/components/ui/Skeleton';
import PageFrame from '@/components/Pages/PageFrame';

type EventType = 'booking' | 'task' | 'ticket' | 'leave';

interface EventInvite {
  invitedName?: string;
  invitedRole?: string;
  status?: string;
}

interface EventDetails {
  roomName?: string;
  bookedByName?: string;
  department?: string;
  currentInviteStatus?: string;
  invites?: EventInvite[];
  assignee?: string;
  raisedBy?: string;
  dueDate?: string;
  priority?: string;
  assignedTo?: string;
  submittedBy?: string;
  resolutionNote?: string;
  employeeName?: string;
  leaveType?: string;
  leaveMode?: string;
  halfDaySession?: string;
  days?: number;
  approvedBy?: string;
  rejectionReason?: string;
}

interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  time?: string;
  location?: string;
  reference?: string;
  status?: string;
  priority?: string;
  attendees?: string[];
  details?: EventDetails;
}

interface CalendarSummary {
  total: number;
  tasks: number;
  tickets: number;
  leaveRequests: number;
  bookings: number;
}

interface CalendarFeed {
  events: CalendarEvent[];
  summary: CalendarSummary;
}

interface EventMeta {
  label: string;
  icon: typeof CalendarIcon;
  tone: string;
}

interface EventFieldGroup {
  label: string;
  value: any;
  renderInviteList?: boolean;
  fullWidth?: boolean;
}

const META: Record<string, EventMeta> = {
  booking: { label: 'Booking', icon: CalendarDays, tone: 'bg-blue-100 text-blue-700 border-blue-200' },
  task: { label: 'Task', icon: CheckCircle2, tone: 'bg-green-100 text-green-700 border-green-200' },
  ticket: { label: 'Ticket', icon: Ticket, tone: 'bg-purple-100 text-purple-700 border-purple-200' },
  leave: { label: 'Leave', icon: CalendarIcon, tone: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'booking': return CalendarDays;
    case 'task': return CheckCircle2;
    case 'ticket': return Ticket;
    case 'leave': return CalendarIcon;
    default: return CalendarIcon;
  }
}

function normalizeDateKey(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatEventDateLabel(event: CalendarEvent): string {
  if (!event?.date) return '';
  if (event.endDate && event.endDate !== event.date) {
    return `${formatDateLabel(event.date)} to ${formatDateLabel(event.endDate)}`;
  }
  return formatDateLabel(event.date);
}

function formatEventCardDateLabel(event: CalendarEvent): string {
  if (!event?.date) return '';
  const startLabel = new Date(`${event.date}T12:00:00`);
  if (Number.isNaN(startLabel.getTime())) return '';
  const shortStart = startLabel.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (event.endDate && event.endDate !== event.date) {
    const endLabel = new Date(`${event.endDate}T12:00:00`);
    if (!Number.isNaN(endLabel.getTime())) {
      return `${shortStart} - ${endLabel.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  }
  return shortStart;
}

function formatValue(value: unknown, fallback = '—'): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function formatInviteStatusLabel(status?: string): string {
  if (!status) return 'Pending';
  const normalized = String(status).toLowerCase().replace(/[\s_]+/g, '-');
  switch (normalized) {
    case 'accepted': return 'Accepted';
    case 'declined':
    case 'rejected': return 'Declined';
    case 'maybe': return 'Maybe';
    case 'cancelled': return 'Cancelled';
    case 'pending':
    default: return 'Pending';
  }
}

function getEventFieldGroups(event: CalendarEvent): EventFieldGroup[] {
  const details = event?.details || {};
  switch (event?.type) {
    case 'booking':
      return [
        { label: 'Room', value: details.roomName || event.location },
        { label: 'Booked By', value: details.bookedByName },
        { label: 'Department', value: details.department },
        { label: 'Invite Status', value: details.currentInviteStatus ? formatInviteStatusLabel(details.currentInviteStatus) : 'Pending' },
        { label: 'Invites', value: Array.isArray(details.invites) ? details.invites : [], renderInviteList: true },
      ];
    case 'task':
      return [
        { label: 'Department', value: details.department || event.location },
        { label: 'Assignee', value: details.assignee },
        { label: 'Raised By', value: details.raisedBy },
        { label: 'Due Date', value: formatDateLabel(details.dueDate || event.date) },
        { label: 'Priority', value: event.priority || details.priority },
        { label: 'Status', value: event.status },
      ];
    case 'ticket':
      return [
        { label: 'Department', value: details.department || event.location },
        { label: 'Assigned To', value: details.assignedTo },
        { label: 'Submitted By', value: details.submittedBy },
        { label: 'Priority', value: event.priority || details.priority },
        { label: 'Status', value: event.status },
        { label: 'Resolution Note', value: details.resolutionNote },
      ];
    case 'leave':
      return [
        { label: 'Employee', value: details.employeeName },
        { label: 'Leave Type', value: details.leaveType },
        { label: 'Department', value: details.department },
        { label: 'Duration', value: details.leaveMode === 'half_day' ? `Half day - ${formatValue(details.halfDaySession)}` : `${formatValue(details.days, '1')} day(s)` },
        { label: 'Approved By', value: details.approvedBy || (event.status === 'pending' ? 'Awaiting approval' : 'Not available') },
        { label: 'Status', value: event.status },
        ...(details.rejectionReason ? [{ label: 'Reason', value: details.rejectionReason, fullWidth: true } as EventFieldGroup] : []),
      ];
    default:
      return [{ label: 'Details', value: event?.description || '-' }];
  }
}

function getEventSearchText(event: CalendarEvent): string {
  const details = event?.details || {};
  const inviteNames = Array.isArray(details.invites)
    ? details.invites.map((invite) => invite?.invitedName).filter(Boolean)
    : [];
  return [
    event?.title, event?.description, event?.location, event?.reference,
    event?.status, event?.priority,
    ...(Array.isArray(event?.attendees) ? event.attendees : []),
    details.roomName, details.department, details.assignee, details.raisedBy,
    details.assignedTo, details.submittedBy, details.employeeName,
    details.approvedBy, details.leaveType, ...inviteNames,
  ].filter(Boolean).join(' ').toLowerCase();
}

function sortCalendarEvents(left: CalendarEvent, right: CalendarEvent): number {
  const leftDate = left?.date || left?.endDate || '';
  const rightDate = right?.date || right?.endDate || '';
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);
  const leftStart = typeof left?.startTime === 'string' ? left.startTime : '';
  const rightStart = typeof right?.startTime === 'string' ? right.startTime : '';
  if (leftStart && rightStart && leftStart !== rightStart) return leftStart.localeCompare(rightStart);
  return String(left?.title || '').localeCompare(String(right?.title || ''));
}

function isUpcomingInVisibleMonth(event: CalendarEvent, visibleDate: Date, today: Date = new Date()): boolean {
  if (!event?.date || !visibleDate) return false;
  const eventStartKey = normalizeDateKey(event.date);
  const eventEndKey = normalizeDateKey(event.endDate || event.date);
  if (!eventStartKey || !eventEndKey) return false;
  const monthStart = normalizeDateKey(new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1));
  const monthEnd = normalizeDateKey(new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 0));
  const visibleMonthKey = `${visibleDate.getFullYear()}-${String(visibleDate.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = normalizeDateKey(today);
  const todayMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (!monthStart || !monthEnd || !todayKey) return false;
  if (visibleMonthKey < todayMonthKey) return false;
  if (visibleMonthKey === todayMonthKey) return eventEndKey >= todayKey && eventStartKey <= monthEnd;
  return eventStartKey <= monthEnd && eventEndKey >= monthStart;
}

function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-4 text-center text-xs font-black text-slate-400 uppercase tracking-wider">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="min-h-[108px] border-b border-r border-slate-100 p-2">
            <Skeleton className="h-6 w-6 rounded-full mb-2" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-4/5 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const summaryCards = [
  { label: 'Total', key: 'total', tone: 'text-slate-400' },
  { label: 'Bookings', key: 'bookings', tone: 'text-sky-500' },
  { label: 'Tasks', key: 'tasks', tone: 'text-emerald-500' },
  { label: 'Tickets', key: 'tickets', tone: 'text-violet-500' },
  { label: 'Leave', key: 'leaveRequests', tone: 'text-amber-500' },
] as const;

function UnifiedCalendar() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [calendarFeed, setCalendarFeed] = useState<CalendarFeed>({
    events: [],
    summary: { total: 0, tasks: 0, tickets: 0, leaveRequests: 0, bookings: 0 }
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadCalendar() {
      try {
        setIsLoading(true);
        const response = await getMyCalendar();
        if (!isMounted) return;
        setCalendarFeed(response?.data || response || { events: [], summary: { total: 0, tasks: 0, tickets: 0, leaveRequests: 0, bookings: 0 } });
        setLoadError('');
      } catch (error: any) {
        if (isMounted) setLoadError(error.message || 'Unable to load calendar right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCalendar();
    return () => { isMounted = false; };
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay() };
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'task': return 'bg-green-100 text-green-700 border-green-200';
      case 'ticket': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'leave': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    switch (priority) {
      case 'high': return <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-black uppercase">High</span>;
      case 'medium': return <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[9px] font-black uppercase">Medium</span>;
      case 'low': return <span className="px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded text-[9px] font-black uppercase">Low</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const normalized = String(status).toLowerCase().replace(/[\s_]+/g, '-');
    switch (normalized) {
      case 'completed': return <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded text-[9px] font-black uppercase">Completed</span>;
      case 'in-progress': return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[9px] font-black uppercase">In Progress</span>;
      case 'pending': return <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[9px] font-black uppercase">Pending</span>;
      case 'cancelled': return <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-black uppercase">Cancelled</span>;
      case 'approved': return <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded text-[9px] font-black uppercase">Approved</span>;
      case 'rejected': return <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-black uppercase">Rejected</span>;
      case 'open': return <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[9px] font-black uppercase">Open</span>;
      case 'resolved': return <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded text-[9px] font-black uppercase">Resolved</span>;
      case 'booked': return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[9px] font-black uppercase">Booked</span>;
      case 'rescheduled': return <span className="px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded text-[9px] font-black uppercase">Rescheduled</span>;
      default: return null;
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return (calendarFeed?.events || []).filter(event => {
      const matchesDate = event.date && dateStr >= event.date && dateStr <= (event.endDate || event.date);
      const matchesFilter = filterType === 'all' || event.type === filterType;
      const matchesSearch = searchQuery === '' || getEventSearchText(event).includes(searchQuery.toLowerCase());
      return matchesDate && matchesFilter && matchesSearch;
    }).sort(sortCalendarEvents);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      direction === 'prev' ? newDate.setMonth(newDate.getMonth() - 1) : newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
    setSelectedDate(null);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const filteredEvents = (calendarFeed?.events || []).filter(event => {
    const matchesFilter = filterType === 'all' || event.type === filterType;
    const matchesSearch = searchQuery === '' || getEventSearchText(event).includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort(sortCalendarEvents);

  const monthAgendaEvents = filteredEvents.filter((event) => isUpcomingInVisibleMonth(event, currentDate));
  const sidebarEvents = selectedDate ? getEventsForDate(selectedDate) : monthAgendaEvents;
  const sidebarHeading = selectedDate
    ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : `Upcoming in ${monthName}`;

  const showLoadingState = isLoading && (calendarFeed?.events || []).length === 0;
  const summary = calendarFeed?.summary;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Calendar
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Unified view of all your bookings, tasks, tickets, and leave requests
              </p>
            </div>
          </div>

          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
              {loadError}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 lg:grid-cols-5 gap-3">
            {summaryCards.map((card) => (
              <div key={card.key} className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                {showLoadingState ? (
                  <Skeleton className="h-6 w-10 rounded-lg" />
                ) : (
                  <p className="text-[15px] font-black text-slate-900">{summary?.[card.key as keyof CalendarSummary] || 0}</p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-1 shadow-sm mb-3">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronLeft size={18} className="text-slate-500" />
                </button>
                <h2 className="text-sm font-pmedium text-primary min-w-[180px] text-center">{monthName}</h2>
                <button onClick={() => changeMonth('next')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronRight size={18} className="text-slate-500" />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition-colors">
                  Today
                </button>
              </div>

              <div className="flex items-center gap-5 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all w-44"
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                  {['all', 'booking', 'task', 'ticket', 'leave'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filterType === type
                          ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-950'
                        }`}
                    >
                      {type === 'all' ? 'All' : type === 'booking' ? 'Bookings' : type === 'task' ? 'Tasks' : type === 'ticket' ? 'Tickets' : 'Leave'}
                    </button>
                  ))}
                </div>


              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              {showLoadingState ? (
                <CalendarSkeleton />
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                      <div key={`empty-${index}`} className="min-h-[110px] bg-slate-50/50 border-b border-r border-slate-100" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const events = getEventsForDate(date);
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                        <div
                          key={day}
                          className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 hover:bg-blue-50/30 transition-colors cursor-pointer ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className={`text-[11px] font-black mb-1 ${isToday ? 'bg-[#2563EB] text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-950'}`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {events.slice(0, 2).map(event => {
                              const Icon = getEventTypeIcon(event.type);
                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowEventModal(true); }}
                                  className={`${getEventTypeColor(event.type)} px-1.5 py-0.5 rounded-lg border text-[8px] font-bold truncate hover:scale-105 transition-transform cursor-pointer`}
                                >
                                  <div className="flex items-center gap-1">
                                    <Icon size={10} />
                                    <span className="truncate">{event.title}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {events.length > 2 && (
                              <div className="text-[8px] font-bold text-slate-400 px-1">+{events.length - 2} more</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="xl:col-span-1">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sticky top-8">
                <h3 className="text-sm font-black text-slate-950 mb-4 flex items-center gap-2">
                  <CalendarIcon size={16} className="text-[#2563EB]" />
                  {sidebarHeading}
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {showLoadingState ? (
                    <>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-start justify-between mb-2">
                            <Skeleton className="h-4 w-20 rounded-lg" />
                            <Skeleton className="h-4 w-12 rounded" />
                          </div>
                          <Skeleton className="h-3 w-4/5 mb-2" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {sidebarEvents.map(event => {
                        const Icon = getEventTypeIcon(event.type);
                        const invites = Array.isArray(event?.details?.invites) ? event.details.invites : [];
                        return (
                          <div
                            key={event.id}
                            onClick={() => { setSelectedEvent(event); setShowEventModal(true); }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 cursor-pointer transition-all group"
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <div className={`${getEventTypeColor(event.type)} px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase flex items-center gap-1`}>
                                <Icon size={10} />
                                {event.type}
                              </div>
                              {getPriorityBadge(event.priority)}
                            </div>
                            <h4 className="font-bold text-slate-950 text-[12px] mb-1 group-hover:text-[#2563EB] transition-colors">{event.title}</h4>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                              <Clock size={11} />
                              {event.time || 'All day'}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                              <CalendarDays size={11} />
                              {formatEventCardDateLabel(event)}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mt-0.5">
                                <MapPin size={11} />
                                {event.location}
                              </div>
                            )}
                            {event.type === 'booking' && invites.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {invites.slice(0, 3).map((invite, i) => (
                                  <span
                                    key={`${event.id}-invite-${i}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-700"
                                  >
                                    <span className="max-w-[8rem] truncate">{invite.invitedName || 'Guest'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span>{formatInviteStatusLabel(invite.status)}</span>
                                  </span>
                                ))}
                                {invites.length > 3 && (
                                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                    +{invites.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {sidebarEvents.length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle size={28} className="text-slate-200 mx-auto mb-2" />
                          <p className="text-[12px] font-bold text-slate-400">No events found</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageFrame>

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden">
            <div className={`${getEventTypeColor(selectedEvent.type)} p-6 border-b border-opacity-20`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/50 rounded-xl">
                    {(() => { const Icon = getEventTypeIcon(selectedEvent.type); return <Icon size={20} />; })()}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider opacity-70 mb-1">
                      {META[selectedEvent.type]?.label || selectedEvent.type}
                    </div>
                    <h2 className="text-2xl font-black">{selectedEvent.title}</h2>
                  </div>
                </div>
                <button onClick={() => { setShowEventModal(false); setSelectedEvent(null); }} className="p-2 hover:bg-white/50 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="p-3 bg-white rounded-xl">
                    <Clock size={20} className="text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                    <p className="font-bold text-slate-950">{formatEventDateLabel(selectedEvent)}</p>
                    <p className="text-sm font-medium text-slate-500">{selectedEvent.time || 'All day'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="p-3 bg-white rounded-xl">
                    <CalendarIcon size={20} className="text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Module</p>
                    <p className="font-bold text-slate-950">{META[selectedEvent.type]?.label || selectedEvent.type}</p>
                    <p className="text-sm font-medium text-slate-500 capitalize">{selectedEvent.type}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {getEventFieldGroups(selectedEvent).map((field) => {
                  if (field.renderInviteList) {
                    return (
                      <div key={field.label} className="lg:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white rounded-xl">
                            <Users size={20} className="text-[#2563EB]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">{field.label}</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {(field.value as EventInvite[]).length ? (field.value as EventInvite[]).map((invite, index) => (
                                <div key={`${field.label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-950">{invite.invitedName || 'Guest'}</p>
                                    {invite.invitedRole && <p className="truncate text-[11px] font-medium text-slate-500">{invite.invitedRole}</p>}
                                  </div>
                                  <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                                    {formatInviteStatusLabel(invite.status)}
                                  </span>
                                </div>
                              )) : (
                                <span className="text-sm font-medium text-slate-500">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const isFullWidth = Boolean(field.fullWidth);
                  return (
                    <div key={field.label} className={`${isFullWidth ? 'lg:col-span-2' : ''} rounded-2xl border border-slate-100 bg-slate-50/80 p-4`}>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl">
                          <MapPin size={20} className="text-[#2563EB]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{field.label}</p>
                          <p className="font-bold text-slate-950">{formatValue(field.value)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                {selectedEvent.priority && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Priority</p>
                    {getPriorityBadge(selectedEvent.priority)}
                  </div>
                )}
                {selectedEvent.status && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Status</p>
                    {getStatusBadge(selectedEvent.status)}
                  </div>
                )}
              </div>

              {selectedEvent.description && selectedEvent.type !== 'leave' && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Description
                  </p>
                  <p className="text-sm font-medium text-slate-950 bg-slate-50 p-4 rounded-xl">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CalendarPage() {
  return <UnifiedCalendar />;
}
