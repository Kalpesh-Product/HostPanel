import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarPlus,
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
import { getMyCalendar, createCalendarEvent as createCalendarEventRequest, respondToCalendarEvent } from '@/services/calendar';
import { respondToMeetingRoomInvite } from '@/services/meeting-room-bookings';
import { getWorkspaceMembers } from '@/services/auth';
import { getStoredUser } from '@/lib/auth-session';
import Skeleton from '@/components/ui/Skeleton';
import PageFrame from '@/components/Pages/PageFrame';
import useModuleAccessMap from '@/hooks/useModuleAccessMap';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { getWorkspaceDateKey, getWorkspaceTime } from '@/lib/workspaceLocalization';
import { statusPillClass } from '../../lib/status-pill';

type EventType = 'booking' | 'task' | 'ticket' | 'leave' | 'holiday' | 'event' | 'personal';

interface EventInvite {
  invitedUserId?: string;
  invitedName?: string;
  invitedEmail?: string;
  invitedRole?: string;
  status?: string;
}

interface EventDetails {
  roomName?: string;
  bookedByName?: string;
  bookedForName?: string;
  department?: string;
  status?: string;
  scheduleChangeType?: string;
  previousDate?: string;
  previousStartTime?: string;
  previousEndTime?: string;
  cancelReason?: string;
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
  organizerName?: string;
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
  holidays: number;
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
  holiday: { label: 'Holiday', icon: CalendarIcon, tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  event: { label: 'Event', icon: CalendarDays, tone: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  personal: { label: 'My Events', icon: CalendarPlus, tone: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

const ALL_EVENT_FILTERS: Array<'all' | EventType> = ['all', 'booking', 'task', 'ticket', 'holiday', 'event', 'personal'];
const PROFESSIONAL_EVENT_FILTERS: Array<'all' | EventType> = ['all', 'booking', 'ticket', 'personal'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEGEND_DOT_CLASS: Record<string, string> = {
  booking: 'bg-blue-500',
  task: 'bg-green-500',
  ticket: 'bg-purple-500',
  leave: 'bg-amber-500',
  holiday: 'bg-rose-500',
  event: 'bg-cyan-500',
  personal: 'bg-indigo-500',
};

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'booking': return CalendarDays;
    case 'task': return CheckCircle2;
    case 'ticket': return Ticket;
    case 'leave': return CalendarIcon;
    case 'holiday': return CalendarIcon;
    case 'event': return CalendarDays;
    case 'personal': return CalendarPlus;
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

function formatCalendarTime(value?: string): string {
  if (!value?.trim()) return 'All day';

  const formatTimePart = (part: string) => {
    const match = part.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return part.trim();

    const rawHour = Number(match[1]);
    const minute = Number(match[2]);
    const existingPeriod = match[3]?.toUpperCase();
    if (minute > 59 || rawHour > (existingPeriod ? 12 : 23)) return part.trim();

    const period = existingPeriod || (rawHour >= 12 ? 'PM' : 'AM');
    const hour = rawHour % 12 || 12;
    return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
  };

  return value.split(/\s+-\s+/).map(formatTimePart).join(' - ');
}

function formatValue(value: unknown, fallback = '—'): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

// 15-minute slots for the clicked day — slots already passed are dropped
// when the day is today, same as Google Calendar, using the workspace's
// own timezone (not the browser's) for "today" and "now" so a backdated
// slot can never be booked regardless of where the member is logged in from.
const TIME_SLOT_STEP_MINUTES = 15;
function buildTimeSlotOptions(forDate: Date | null, timezone: string): string[] {
  if (!forDate) return [];
  const todayKey = getWorkspaceDateKey(new Date(), timezone);
  const dateKey = normalizeDateKey(forDate);
  if (dateKey < todayKey) return []; // a past date can never be booked
  const isToday = dateKey === todayKey;
  const nowLabel = getWorkspaceTime(new Date(), timezone);
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += TIME_SLOT_STEP_MINUTES) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (isToday && label < nowLabel) continue;
    options.push(label);
  }
  return options;
}

function isPastWorkspaceDate(forDate: Date, timezone: string): boolean {
  return normalizeDateKey(forDate) < getWorkspaceDateKey(new Date(), timezone);
}

// End time stays a slot picker too, but in 5-minute steps after the chosen
// start time so a meeting can be as short as 5 minutes.
const END_TIME_STEP_MINUTES = 5;
function buildEndTimeOptions(startTime: string): string[] {
  if (!startTime) return [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMinute;
  const options: string[] = [];
  for (let minutes = startTotal + END_TIME_STEP_MINUTES; minutes < 24 * 60; minutes += END_TIME_STEP_MINUTES) {
    options.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return options;
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
        ...(details.bookedForName ? [{ label: 'Host', value: details.bookedForName }] : []),
        { label: 'Department', value: details.department },
        { label: 'Status', value: event.status || details.status },
        ...(details.scheduleChangeType ? [{ label: 'Change Type', value: details.scheduleChangeType }] : []),
        ...(details.previousDate ? [{ label: 'Previous Slot', value: `${formatDateLabel(details.previousDate)}${details.previousStartTime ? ` ${formatCalendarTime(details.previousStartTime)}${details.previousEndTime ? ` - ${formatCalendarTime(details.previousEndTime)}` : ''}` : ''}` }] : []),
        ...(details.cancelReason ? [{ label: 'Cancellation Reason', value: details.cancelReason, fullWidth: true } as EventFieldGroup] : []),
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
    case 'personal':
      return [
        { label: 'Organizer', value: details.organizerName },
        { label: 'Agenda', value: event?.description || '-', fullWidth: true },
        { label: 'Invitees', value: Array.isArray(details.invites) ? details.invites : [], renderInviteList: true },
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
          <div key={day} className="p-4 text-center text-xs font-pmedium text-slate-400 uppercase tracking-wider">{day}</div>
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

function CalendarPageSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading calendar">
      <div className="mb-3 space-y-2">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-3 w-full max-w-md rounded-md bg-gray-100" />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-md" />
            </div>
            <Skeleton className="h-8 w-8 rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-16 rounded-2xl" />
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <Skeleton className="h-10 min-w-[160px] flex-1 rounded-lg sm:w-60" />
            <div className="flex gap-1.5 overflow-hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-16 flex-shrink-0 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CalendarSkeleton />
        </div>
        <div className="xl:col-span-1">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-5 w-44 rounded-md" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-2 flex items-start justify-between">
                    <Skeleton className="h-4 w-20 rounded-lg" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <Skeleton className="mb-2 h-4 w-4/5 rounded-md" />
                  <Skeleton className="mb-2 h-3 w-24 rounded-md bg-gray-100" />
                  <Skeleton className="h-3 w-32 rounded-md bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const summaryCards = [
  { label: 'Holidays', key: 'holidays', icon: CalendarIcon, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-rose-500', iconClass: 'bg-rose-50 text-rose-600', labelClass: 'text-rose-600' },
  { label: 'Bookings', key: 'bookings', icon: CalendarDays, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500', iconClass: 'bg-blue-50 text-blue-600', labelClass: 'text-blue-600' },
  { label: 'Tasks', key: 'tasks', icon: CheckCircle2, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', iconClass: 'bg-emerald-50 text-emerald-600', labelClass: 'text-emerald-600' },
  { label: 'Tickets', key: 'tickets', icon: Ticket, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-purple-500', iconClass: 'bg-purple-50 text-purple-600', labelClass: 'text-purple-600' },
  { label: 'Events', key: 'events', icon: CalendarDays, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-cyan-500', iconClass: 'bg-cyan-50 text-cyan-600', labelClass: 'text-cyan-600' },
] as const;

function UnifiedCalendar() {
  const { workspacePlan, isLoading: isWorkspacePlanLoading } = useModuleAccessMap();
  const workspacePreferences = useWorkspacePreferences();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [calendarFeed, setCalendarFeed] = useState<CalendarFeed>({
    events: [],
    summary: { total: 0, tasks: 0, tickets: 0, leaveRequests: 0, bookings: 0, holidays: 0, events: 0 }
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [overflowDate, setOverflowDate] = useState<Date | null>(null);

  // Quick-create ("book a slot") — opened directly by clicking a day.
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', startTime: '', endTime: '', description: '', inviteeUserIds: [] as string[], guestEmails: [] as string[] });
  const [guestEmailInput, setGuestEmailInput] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ userId: string; name: string; email: string }>>([]);
  const currentUserId = String(getStoredUser()?.id || getStoredUser()?._id || '');
  const [isRespondingToInvite, setIsRespondingToInvite] = useState(false);

  useEffect(() => {
    getWorkspaceMembers()
      .then((data: any) => {
        const members = Array.isArray(data?.members) ? data.members : [];
        setWorkspaceMembers(members.filter((member: any) => member.userId && member.userId !== currentUserId));
      })
      .catch(() => setWorkspaceMembers([]));
  }, []);

  const timeOptions = useMemo(
    () => buildTimeSlotOptions(createEventDate, workspacePreferences.timezone),
    [createEventDate, workspacePreferences.timezone],
  );
  const endTimeOptions = useMemo(
    () => buildEndTimeOptions(eventForm.startTime),
    [eventForm.startTime],
  );

  const bumpEndTime = (startTime: string) => {
    if (!startTime) return '';
    const [hour, minute] = startTime.split(':').map(Number);
    const total = Math.min(23 * 60 + 59, hour * 60 + minute + TIME_SLOT_STEP_MINUTES);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const openCreateEventModal = (date: Date) => {
    const slots = buildTimeSlotOptions(date, workspacePreferences.timezone);
    const defaultStart = slots[0] || '';
    setCreateEventDate(date);
    setEventForm({ title: '', startTime: defaultStart, endTime: bumpEndTime(defaultStart), description: '', inviteeUserIds: [], guestEmails: [] });
  };

  const closeCreateEventModal = () => {
    setCreateEventDate(null);
    setEventForm({ title: '', startTime: '', endTime: '', description: '', inviteeUserIds: [], guestEmails: [] });
    setGuestEmailInput('');
    setEventFormError('');
  };

  const addGuestEmail = () => {
    const email = guestEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEventFormError('Enter a valid guest email address.'); return; }
    if (eventForm.guestEmails.includes(email)) { setGuestEmailInput(''); return; }
    setEventForm((prev) => ({ ...prev, guestEmails: [...prev.guestEmails, email] }));
    setGuestEmailInput('');
    setEventFormError('');
  };

  const submitCreateEvent = async () => {
    if (!createEventDate) return;
    if (!eventForm.title.trim()) { setEventFormError('Title is required.'); return; }
    if (!eventForm.startTime) { setEventFormError('Start time is required.'); return; }
    if (eventForm.endTime && eventForm.endTime <= eventForm.startTime) { setEventFormError('End time must be after start time.'); return; }
    setIsSavingEvent(true);
    setEventFormError('');
    try {
      await createCalendarEventRequest({
        title: eventForm.title.trim(),
        date: normalizeDateKey(createEventDate),
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        description: eventForm.description.trim(),
        inviteeUserIds: eventForm.inviteeUserIds,
        guestEmails: eventForm.guestEmails,
      });
      closeCreateEventModal();
      refreshCalendar(true);
    } catch (error: any) {
      setEventFormError(error?.response?.data?.message || error?.message || 'Failed to create event.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const respondToInvite = async (event: CalendarEvent, status: 'accepted' | 'rejected') => {
    setIsRespondingToInvite(true);
    try {
      if (event.type === 'personal') {
        const rawId = event.id.replace(/^calendar-event-/, '');
        await respondToCalendarEvent(rawId, status);
      } else {
        await respondToMeetingRoomInvite(event.id, { status });
      }
      setShowEventModal(false);
      setSelectedEvent(null);
      refreshCalendar(true);
    } catch (error: any) {
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to respond to the invite.');
    } finally {
      setIsRespondingToInvite(false);
    }
  };

  const visibleEventFilters = workspacePlan === 'custom' ? ALL_EVENT_FILTERS : PROFESSIONAL_EVENT_FILTERS;
  const isEventTypeVisible = (type: EventType) => visibleEventFilters.includes(type);

  useEffect(() => {
    if (workspacePlan !== 'custom' && (filterType === 'task' || filterType === 'leave' || filterType === 'holiday' || filterType === 'event')) {
      setFilterType('all');
    }
  }, [filterType, workspacePlan]);

  const refreshCalendar = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await getMyCalendar();
      setCalendarFeed(response?.data || response || { events: [], summary: { total: 0, tasks: 0, tickets: 0, leaveRequests: 0, bookings: 0, holidays: 0, events: 0 } });
      setLoadError('');
    } catch (error: any) {
      setLoadError(error.message || 'Unable to load calendar right now.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCalendar();
  }, [refreshCalendar]);


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
      case 'holiday': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'event': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'personal': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    switch (priority) {
      case 'high': return <span className={statusPillClass("High")}>High</span>;
      case 'medium': return <span className={statusPillClass("Medium")}>Medium</span>;
      case 'low': return <span className={statusPillClass("Low")}>Low</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const normalized = String(status).toLowerCase().replace(/[\s_]+/g, '-');
    switch (normalized) {
      case 'completed': return <span className={statusPillClass("Completed")}>Completed</span>;
      case 'in-progress': return <span className={statusPillClass("In Progress")}>In Progress</span>;
      case 'pending': return <span className={statusPillClass("Pending")}>Pending</span>;
      case 'cancelled': return <span className={statusPillClass("Cancelled")}>Cancelled</span>;
      case 'approved': return <span className={statusPillClass("Approved")}>Approved</span>;
      case 'rejected': return <span className={statusPillClass("Rejected")}>Rejected</span>;
      case 'open': return <span className={statusPillClass("Open")}>Open</span>;
      case 'resolved': return <span className={statusPillClass("Resolved")}>Resolved</span>;
      case 'booked': return <span className={statusPillClass("Booked")}>Booked</span>;
      case 'rescheduled': return <span className={statusPillClass("Rescheduled")}>Rescheduled</span>;
      default: return null;
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const allForDate = [...(calendarFeed?.events || [])].filter((event) => isEventTypeVisible(event.type));
    return allForDate.filter(event => {
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
    setOverflowDate(null);
  };

  const jumpToMonth = (month: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), month, 1));
    setOverflowDate(null);
  };

  const jumpToYear = (year: number) => {
    setCurrentDate(prev => new Date(year, prev.getMonth(), 1));
    setOverflowDate(null);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const allEvents = [...(calendarFeed?.events || [])].filter((event) => isEventTypeVisible(event.type));
  const filteredEvents = allEvents.filter(event => {
    const matchesFilter = filterType === 'all' || event.type === filterType;
    const matchesSearch = searchQuery === '' || getEventSearchText(event).includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort(sortCalendarEvents);

  const monthAgendaEvents = filteredEvents.filter((event) => isUpcomingInVisibleMonth(event, currentDate));
  const sidebarEvents = monthAgendaEvents;
  const sidebarHeading = `Upcoming in ${monthName}`;

  const showLoadingState = isLoading || isWorkspacePlanLoading;
  const summary = calendarFeed?.summary;
  const visibleSummaryCards = summaryCards.filter((card) => {
    if (workspacePlan === 'custom') return true;
    return card.key === 'bookings' || card.key === 'tickets';
  });

  if (showLoadingState) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <CalendarPageSkeleton />
        </PageFrame>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Calendar
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {workspacePlan === 'custom'
                  ? 'Unified view of your bookings, tasks, tickets, holidays, and company events'
                  : 'Unified view of your bookings and tickets'}
              </p>
            </div>
          </div>

          {loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
              {loadError}
            </div>
          )}

          <div className={`grid grid-cols-2 gap-3 mb-3 shrink-0 ${workspacePlan === 'custom' ? 'md:grid-cols-5' : 'md:grid-cols-2'}`}>
            {visibleSummaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className={card.cardClass}>
                  <div className="min-w-0">
                    <p className={`text-[10px] font-pmedium uppercase tracking-widest mb-1 ${card.labelClass}`}>{card.label}</p>
                    {showLoadingState ? (
                      <Skeleton className="h-5 w-10 rounded-lg" />
                    ) : (
                      <p className="text-[15px] font-pmedium text-slate-900">
                        {summary?.[card.key as keyof CalendarSummary] || 0}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-3">
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

              <div className="flex items-center gap-3">
                <button onClick={() => changeMonth('prev')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronLeft size={18} className="text-slate-500" />
                </button>
                <div className="flex items-center gap-1.5">
                  <select
                    value={currentDate.getMonth()}
                    onChange={(e) => jumpToMonth(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-pmedium text-primary outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={currentDate.getFullYear()}
                    onChange={(e) => jumpToYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-pmedium text-primary outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                  >
                    {Array.from({ length: 11 }, (_, index) => currentDate.getFullYear() - 5 + index).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => changeMonth('next')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronRight size={18} className="text-slate-500" />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-[#2563EB] text-white rounded-2xl text-[10px] font-pmedium hover:bg-blue-700 transition-colors">
                  Today
                </button>
              </div>

              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text" placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {visibleEventFilters.map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${filterType === type
                          ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                          : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                        }`}
                    >
                      {type === 'all' ? 'All' : type === 'booking' ? 'Bookings' : type === 'task' ? 'Tasks' : type === 'ticket' ? 'Tickets' : type === 'event' ? 'Events' : type === 'personal' ? 'My Events' : 'Holiday'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3 -mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {visibleEventFilters.filter((type) => type !== 'all').map((type) => {
              const meta = META[type];
              if (!meta) return null;
              return (
                <div key={type} className="flex items-center gap-1.5 text-[10px] font-pmedium text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${LEGEND_DOT_CLASS[type] || 'bg-slate-400'}`} />
                  {meta.label}
                </div>
              );
            })}
          </div>

          {overflowDate && (
            <div className="fixed inset-0 z-20" onClick={() => setOverflowDate(null)} />
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              {showLoadingState ? (
                <CalendarSkeleton />
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center text-[10px] font-pmedium text-slate-400 uppercase tracking-wider">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                      <div key={`empty-${index}`} className="min-h-[110px] bg-slate-50/50 border-b border-r border-slate-100" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const dateKey = normalizeDateKey(date);
                      const events = getEventsForDate(date);
                      // Multi-day events are sorted first so they're less likely to be
                      // bumped out of the visible slots, keeping their bar look continuous
                      // across the days they span.
                      const displayEvents = [...events].sort((left, right) => {
                        const leftMulti = Boolean(left.endDate && left.endDate !== left.date);
                        const rightMulti = Boolean(right.endDate && right.endDate !== right.date);
                        if (leftMulti === rightMulti) return 0;
                        return leftMulti ? -1 : 1;
                      });
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isPopoverOpen = overflowDate ? normalizeDateKey(overflowDate) === dateKey : false;
                      const isPast = isPastWorkspaceDate(date, workspacePreferences.timezone);
                      return (
                        <div
                          key={day}
                          className={`relative min-h-[110px] border-b border-r border-slate-100 p-1.5 transition-colors ${isPast ? 'cursor-default bg-slate-50/60' : 'cursor-pointer hover:bg-blue-50/30'} ${isToday ? 'bg-blue-50/50' : !isPast ? 'bg-white' : ''}`}
                          onClick={() => { if (!isPast) openCreateEventModal(date); }}
                        >
                          <div className={`text-[11px] font-pmedium mb-1 ${isToday ? 'bg-[#2563EB] text-white w-6 h-6 rounded-full flex items-center justify-center' : isPast ? 'text-slate-400' : 'text-slate-800'}`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {displayEvents.slice(0, 2).map(event => {
                              const Icon = getEventTypeIcon(event.type);
                              const isMultiDay = Boolean(event.endDate && event.endDate !== event.date);
                              const isStart = !isMultiDay || dateKey === normalizeDateKey(event.date);
                              const isEnd = !isMultiDay || dateKey === normalizeDateKey(event.endDate || event.date);
                              return (
                                <div
                                  key={event.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowEventModal(true); }}
                                  className={`${getEventTypeColor(event.type)} px-1.5 py-0.5 border-y text-[8px] font-bold truncate hover:scale-105 transition-transform cursor-pointer ${isStart ? 'rounded-l-lg border-l' : '-ml-1.5'} ${isEnd ? 'rounded-r-lg border-r' : '-mr-1.5'}`}
                                >
                                  <div className={`flex items-center gap-1 ${isStart ? '' : 'opacity-0'}`}>
                                    <Icon size={10} />
                                    <span className="truncate">{event.title}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {displayEvents.length > 2 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setOverflowDate(isPopoverOpen ? null : date); }}
                                className="px-1 text-[8px] font-bold text-slate-400 hover:text-[#2563EB] hover:underline"
                              >
                                +{displayEvents.length - 2} more
                              </button>
                            )}
                          </div>

                          {isPopoverOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-1 top-full z-30 mt-1 w-56 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                            >
                              <p className="mb-1.5 px-1 text-[9px] font-pmedium uppercase tracking-wider text-slate-400">
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                              <div className="space-y-1">
                                {displayEvents.map(event => {
                                  const Icon = getEventTypeIcon(event.type);
                                  return (
                                    <div
                                      key={event.id}
                                      onClick={() => { setSelectedEvent(event); setShowEventModal(true); setOverflowDate(null); }}
                                      className={`${getEventTypeColor(event.type)} flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold cursor-pointer hover:scale-[1.02] transition-transform`}
                                    >
                                      <Icon size={11} className="shrink-0" />
                                      <span className="truncate">{event.title}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="xl:col-span-1">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sticky top-8">
                <h3 className="text-sm font-pmedium text-primary mb-4 flex items-center gap-2">
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
                              <div className="text-[10px] font-pmedium uppercase tracking-wider text-slate-600">
                                <Icon size={10} />
                                {event.type}
                              </div>
                              {getPriorityBadge(event.priority)}
                            </div>
                            <h4 className="font-bold text-slate-950 text-[12px] mb-1 group-hover:text-[#2563EB] transition-colors">{event.title}</h4>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                              <Clock size={11} />
                              {formatCalendarTime(event.time)}
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
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[8px] font-pmedium uppercase tracking-wider text-slate-700"
                                  >
                                    <span className="max-w-[8rem] truncate">{invite.invitedName || 'Guest'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span>{formatInviteStatusLabel(invite.status)}</span>
                                  </span>
                                ))}
                                {invites.length > 3 && (
                                  <span className={statusPillClass("+")}>
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
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/40 p-3 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`${getEventTypeColor(selectedEvent.type)} border-b border-opacity-20 p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 shadow-sm">
                    {(() => { const Icon = getEventTypeIcon(selectedEvent.type); return <Icon size={16} />; })()}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 text-[9px] font-pmedium uppercase tracking-widest opacity-70">
                      {META[selectedEvent.type]?.label || selectedEvent.type}
                    </div>
                    <h2 id="calendar-event-title" className="truncate text-base font-pmedium">{selectedEvent.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close event details"
                  onClick={() => { setShowEventModal(false); setSelectedEvent(null); }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/40 transition-colors hover:bg-white/70"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4 font-pmedium">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Clock size={14} className="text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Date & Time</p>
                    <p className="text-[12px] font-pmedium text-slate-950">{formatEventDateLabel(selectedEvent)}</p>
                    <p className="text-[11px] font-pmedium text-slate-500">{formatCalendarTime(selectedEvent.time)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                    <CalendarIcon size={14} className="text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Module</p>
                    <p className="text-[12px] font-pmedium capitalize text-slate-950">{META[selectedEvent.type]?.label || selectedEvent.type}</p>
                    {/* {selectedEvent.reference && <p className="truncate text-[11px] font-pmedium text-slate-500">{selectedEvent.reference}</p>} */}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {getEventFieldGroups(selectedEvent).map((field) => {
                  if (field.renderInviteList) {
                    return (
                      <div key={field.label} className="sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <div className="mb-2 flex items-center gap-2 border-b border-slate-200/70 pb-2">
                          <Users size={13} className="text-[#2563EB]" />
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-500">{field.label}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(field.value as EventInvite[]).length ? (field.value as EventInvite[]).map((invite, index) => (
                            <div key={`${field.label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-pmedium text-slate-950">{invite.invitedName || 'Guest'}</p>
                                {invite.invitedEmail ? (
                                  <p className="truncate text-[10px] font-pmedium text-slate-500">{invite.invitedEmail}</p>
                                ) : invite.invitedRole ? (
                                  <p className="truncate text-[10px] font-pmedium text-slate-500">{invite.invitedRole}</p>
                                ) : null}
                              </div>
                              <span className={statusPillClass(formatInviteStatusLabel(invite.status))}>
                                {formatInviteStatusLabel(invite.status)}
                              </span>
                            </div>
                          )) : (
                            <span className="text-[11px] font-pmedium text-slate-500">-</span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  const isFullWidth = Boolean(field.fullWidth);
                  return (
                    <div key={field.label} className={`${isFullWidth ? 'sm:col-span-2' : ''} rounded-2xl border border-slate-100 bg-slate-50/60 p-3`}>
                      <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">{field.label}</p>
                      <p className="break-words text-[12px] font-pmedium text-slate-950">{formatValue(field.value)}</p>
                    </div>
                  );
                })}
              </div>

              {(selectedEvent.priority || (selectedEvent.status && selectedEvent.type !== 'holiday' && selectedEvent.type !== 'event')) && (
                <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  {selectedEvent.priority && (
                    <div>
                      <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Priority</p>
                      {getPriorityBadge(selectedEvent.priority)}
                    </div>
                  )}
                  {selectedEvent.status && selectedEvent.type !== 'holiday' && selectedEvent.type !== 'event' && (
                    <div>
                      <p className="mb-1.5 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">Status</p>
                      {getStatusBadge(selectedEvent.status)}
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.description && selectedEvent.type !== 'leave' && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="mb-2 border-b border-slate-200/70 pb-2 text-[9px] font-pmedium uppercase tracking-widest text-slate-500">
                    Description
                  </p>
                  <p className="whitespace-pre-wrap text-[12px] font-pmedium leading-relaxed text-slate-950">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            {(() => {
              if (selectedEvent.type !== 'booking' && selectedEvent.type !== 'personal') return null;
              const invites = selectedEvent.details?.invites || [];
              const myInvite = invites.find((invite: any) => String(invite.invitedUserId || '') === currentUserId);
              if (!myInvite || String(myInvite.status || 'pending').toLowerCase() !== 'pending') return null;
              return (
                <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
                  <button
                    type="button"
                    disabled={isRespondingToInvite}
                    onClick={() => respondToInvite(selectedEvent, 'rejected')}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={isRespondingToInvite}
                    onClick={() => respondToInvite(selectedEvent, 'accepted')}
                    className="flex-1 rounded-2xl bg-[#2563EB] py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Accept
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {createEventDate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/40 p-3 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[#2563EB] p-5 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-[9px] font-pmedium uppercase tracking-widest opacity-70">New Event</p>
                  <h2 className="text-base font-pmedium">
                    {createEventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h2>
                </div>
                <button type="button" aria-label="Close" onClick={closeCreateEventModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/20 hover:bg-white/30">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 font-pmedium">
              <div>
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  autoFocus
                  value={eventForm.title}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. 1:1 with the team"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Start Time</label>
                  <select
                    value={eventForm.startTime}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setEventForm((prev) => ({
                        ...prev,
                        startTime: nextStart,
                        endTime: prev.endTime > nextStart ? prev.endTime : bumpEndTime(nextStart),
                      }));
                    }}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  >
                    {timeOptions.length === 0 && <option value="">No times left today</option>}
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{formatCalendarTime(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">End Time</label>
                  <select
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  >
                    {endTimeOptions.length === 0 && <option value="">—</option>}
                    {endTimeOptions.map((t) => (
                      <option key={t} value={t}>{formatCalendarTime(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Agenda</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional"
                  className="mt-1.5 min-h-[60px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Invite Members</label>
                <div className="mt-1.5 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {workspaceMembers.length === 0 && (
                    <p className="px-1.5 py-1 text-[11px] font-pmedium text-slate-400">No other members found.</p>
                  )}
                  {workspaceMembers.map((member) => {
                    const checked = eventForm.inviteeUserIds.includes(member.userId);
                    return (
                      <label key={member.userId} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setEventForm((prev) => ({
                            ...prev,
                            inviteeUserIds: checked
                              ? prev.inviteeUserIds.filter((id) => id !== member.userId)
                              : [...prev.inviteeUserIds, member.userId],
                          }))}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span className="truncate text-[12px] font-pmedium text-[#0F172A]">{member.name || member.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* <div>
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Invite Guests by Email</label>
                <input
                  type="email"
                  value={guestEmailInput}
                  onChange={(e) => setGuestEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuestEmail(); } }}
                  placeholder="guest@example.com — press Enter to add"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
                {eventForm.guestEmails.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {eventForm.guestEmails.map((email) => (
                      <span key={email} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-pmedium text-slate-700">
                        {email}
                        <button type="button" onClick={() => setEventForm((prev) => ({ ...prev, guestEmails: prev.guestEmails.filter((e) => e !== email) }))} className="text-slate-400 hover:text-rose-500">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-[10px] font-pmedium text-slate-400">Members and guests both get an email invite.</p>
              </div> */}

              {eventFormError && (
                <p className="text-[11px] font-pmedium text-rose-500">{eventFormError}</p>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
              <button
                type="button"
                onClick={closeCreateEventModal}
                disabled={isSavingEvent}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCreateEvent}
                disabled={isSavingEvent}
                className="flex-1 rounded-2xl bg-[#2563EB] py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSavingEvent ? 'Saving…' : 'Create Event'}
              </button>
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
