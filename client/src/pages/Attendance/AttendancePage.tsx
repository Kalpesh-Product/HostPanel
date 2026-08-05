import { useState, useMemo, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Eye, X, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  Camera, User, Building2, ChevronDown, Coffee, LogIn, LogOut,
  RefreshCw, Edit3, Check, AlertTriangle, Circle, Users, Send, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageFrame from '@/components/Pages/PageFrame';
import {
  checkInAttendance,
  checkOutAttendance,
  startBreakAttendance,
  endBreakAttendance,
  getMyAttendance,
  getTeamAttendance,
  requestAttendanceCorrection,
  getEmployeeAttendanceHistory,
  getAttendanceGeofence,
  getAttendanceSettings,
} from '@/services/attendance';
import {
  canAccessAdminDashboard,
  canAccessFinanceDashboard,
  canAccessTechDashboard,
  canAccessITDashboard,
  canAccessMaintenanceDashboard,
  canAccessSalesDashboard,
  getStoredActingManagerContext,
  getStoredUser,
} from '@/lib/auth-session';
import { extractDepartmentLabel, normalizeDepartmentKey, normalizeRoleValue } from '@/utils/user-helpers';
import { formatTime12h } from '@/utils/time';
import { AttendanceSkeleton } from '@/components/ui/Skeleton';
import AttendanceDayTimeline from '@/components/attendance/AttendanceDayTimeline';
import { useLiveTimes, formatSeconds } from '@/components/attendance/useLiveTimes';
import { statusPillClass } from '../../lib/status-pill';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { getWorkspaceDateKey, getWorkspaceTime } from '@/lib/workspaceLocalization';

/* ── Types ── */
interface AttendanceRecord {
  recordId?: string;
  id?: string;
  userId?: string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  source?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInSelfie?: string;
  checkOutSelfie?: string;
  workingHours?: string;
  totalHours?: number;
  overtime?: number;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  isInProgress?: boolean;
  isActiveBreak?: boolean;
  activeBreakStartedAt?: string | null;
  totalSeconds?: number;
  breakSeconds?: number;
  totalTime?: string;
  breakTime?: string;
  isPresent?: boolean;
  isLate?: boolean;
  isEarlyDeparture?: boolean;
  lateMinutes?: number;
  earlyMinutes?: number;
  breaks?: BreakEntry[];
  correction?: CorrectionEntry;
}

interface BreakEntry {
  startTime?: string;
  endTime?: string;
  startAt?: string | null;
  endAt?: string | null;
  duration?: number;
  type?: string;
}

interface CorrectionBreakAdjustment {
  breakIndex: number;
  originalStart?: string;
  originalEnd?: string;
  requestedStart?: string;
  requestedEnd?: string;
}

interface CorrectionEntry {
  requestedAt?: string;
  status?: string;
  reason?: string;
  type?: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  breaks?: CorrectionBreakAdjustment[];
  actionedBy?: string;
  rejectionReason?: string;
}

interface WeeklyHoursSummary {
  workedHours: number;
  targetHours: number | null;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  total: number;
  workingDays: number;
  attendancePercentage: number;
  weeklyHours?: WeeklyHoursSummary;
}

interface CorrectionBreakForm {
  breakIndex: number;
  originalStart: string;
  originalEnd: string;
  requestedStart: string;
  requestedEnd: string;
  include: boolean;
}

interface CorrectionForm {
  recordId: string;
  type: string;
  reason: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  breaks: CorrectionBreakForm[];
}

interface TeamMemberAttendance {
  userId: string;
  employeeName: string;
  employeeId?: string;
  employeeRole?: string;
  department: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  totalHours?: number;
}

/* ── Helpers ── */
const getLocalDateString = (date: Date = new Date(), timeZone?: string) =>
  getWorkspaceDateKey(date, timeZone);

// Role names come back lowercase from the API (e.g. "super_admin") — display
// them Title_Cased ("Super_Admin") without touching acronyms that are
// already uppercase (e.g. "HR").
const formatRoleLabel = (role?: string): string => {
  const value = String(role || '').trim();
  if (!value) return '--';
  return value.replace(/(^|[_\s])([a-z])/g, (_match, sep, letter) => `${sep}${letter.toUpperCase()}`);
};

// Every date shown to the user renders as DD-MM-YYYY, regardless of the
// underlying "YYYY-MM-DD" dateKey/ISO format it arrives in.
const formatDateDMY = (value?: string): string => {
  if (!value) return '--';
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

const getLocalMonthKey = (date: Date = new Date(), timeZone?: string) =>
  getWorkspaceDateKey(date, timeZone).slice(0, 7);

const monthOptions = () => {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ label, value: `${year}-${month}` });
  }
  return options;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const getMonthDateRange = (monthKey: string) => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const days = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= days; d++) {
    dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
};

const formatDuration = (hours?: number): string => {
  if (hours == null || isNaN(hours)) return '--';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const getStatusColor = (status?: string) => {
  switch (String(status || '').toLowerCase()) {
    case 'present': case 'approved': return 'emerald';
    case 'late': return 'amber';
    case 'absent': case 'rejected': return 'rose';
    case 'half-day': case 'half_day': return 'orange';
    case 'pending': return 'blue';
    default: return 'slate';
  }
};

const getStatusBadge = (status?: string) => {
  const color = getStatusColor(status);
  const label = String(status || 'Unknown').replace(/_/g, ' ');
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={statusPillClass(label)}>
      {label}
    </span>
  );
};

const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true },
    );
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read captured image.'));
    reader.readAsDataURL(blob);
  });
};

const normalizeRole = (role?: string) =>
  String(role || '').trim().toLowerCase().replace(/[_\s]+/g, '-');

const getManagedDepartments = (currentUser: any): string[] => {
  const currentUserId = String(currentUser?.id || currentUser?._id || '').trim();
  const currentUserName = String(
    currentUser?.fullName ||
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
      currentUser?.name || '',
  ).trim().toLowerCase().replace(/[\s_]+/g, '-');

  const orgDepartments = Array.isArray(currentUser?.workspace?.organizationDepartments)
    ? currentUser.workspace.organizationDepartments
    : [];

  return orgDepartments
    .filter((dept: any) => {
      const managerUserId = String(dept?.managerUserId || '').trim();
      const managerName = String(dept?.managerName || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
      return (
        (currentUserId && managerUserId && currentUserId === managerUserId) ||
        (currentUserName && managerName && currentUserName === managerName)
      );
    })
    .map((dept: any) => dept?.name)
    .filter(Boolean);
};

const INITIAL_CORRECTION_FORM: CorrectionForm = {
  recordId: '',
  type: 'check_in',
  reason: '',
  requestedCheckIn: '',
  requestedCheckOut: '',
  breaks: [],
};

/* ── Default stats ── */
const DEFAULT_STATS: AttendanceStats = {
  present: 0, absent: 0, late: 0, halfDay: 0,
  total: 0, workingDays: 0, attendancePercentage: 0,
  weeklyHours: { workedHours: 0, targetHours: null },
};

/* ── Component ── */
export function AttendancePage() {
  const navigate = useNavigate();
  const workspacePreferences = useWorkspacePreferences();
  const currentUser = getStoredUser();
  const actingContext = getStoredActingManagerContext(currentUser);
  const isActingManagerView = Boolean(actingContext?.departmentName);
  const currentUserId = currentUser?.id || currentUser?._id || null;
  const membershipRole = normalizeRole(currentUser?.workspaceMembership?.role || currentUser?.role || '');
  const isOwnerProfile = membershipRole === 'owner' || membershipRole === 'founder';
  const isSuperAdminProfile = membershipRole === 'super-admin';
  const isAdminProfile = canAccessAdminDashboard(currentUser) || membershipRole === 'admin' || membershipRole === 'admin-manager';

  const managedDepartments = getManagedDepartments(currentUser);

  const currentUserDepartments: any[] = [
    ...(Array.isArray(currentUser?.workspaceMembership?.departments) ? currentUser.workspaceMembership.departments : []),
    currentUser?.workspaceMembership?.department,
    currentUser?.department,
    currentUser?.workspace?.department,
    ...managedDepartments,
    actingContext?.departmentName,
  ].filter(Boolean);

  const assignedDepartmentNames = useMemo<string[]>(
    () => Array.from(new Set(currentUserDepartments.map((department: any) => extractDepartmentLabel(department)).filter(Boolean))) as string[],
    [currentUserDepartments],
  );

  const assignedDepartmentKeys = useMemo<Set<string>>(
    () => new Set(assignedDepartmentNames.map((d: string) => normalizeRole(d)).filter(Boolean)),
    [assignedDepartmentNames],
  );

  const profile = {
    name: currentUser?.fullName || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.name || 'User',
    role: currentUser?.role || currentUser?.designation || (isOwnerProfile ? 'Founder' : 'Super-Admin'),
  };

  /* ── Clock State ── */
  const [todayDate, setTodayDate] = useState(() => getLocalDateString(new Date(), workspacePreferences.timezone));
  const [captureOpenedAt, setCaptureOpenedAt] = useState<Date | null>(null);
  const [isClockLoading, setIsClockLoading] = useState(false);
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockMode, setClockMode] = useState<'in' | 'out'>('in');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [capturedSelfieBlob, setCapturedSelfieBlob] = useState<Blob | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [clockErrorMessage, setClockErrorMessage] = useState('');
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ── Data State ── */
  const [activeTab, setActiveTab] = useState('my-attendance');
  const [subTab, setSubTab] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => getLocalMonthKey(new Date(), workspacePreferences.timezone));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [myStats, setMyStats] = useState<AttendanceStats>(DEFAULT_STATS);
  const [teamRecords, setTeamRecords] = useState<TeamMemberAttendance[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);

  /* ── Attendance configuration (HR-set working hours, break, geofence) ── */
  const [isAttendanceConfigured, setIsAttendanceConfigured] = useState(true);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState<{
    weeklyWorkingHours: number | null;
    workingHoursStart: string;
    workingHoursEnd: string;
    breakDurationMinutes: number | null;
  }>({ weeklyWorkingHours: null, workingHoursStart: '', workingHoursEnd: '', breakDurationMinutes: null });

  /* ── Modal State ── */
  const [viewingEmployee, setViewingEmployee] = useState<any>(null);
  const [employeeHistory, setEmployeeHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewingMonth, setViewingMonth] = useState<string | null>(null);
  const [viewingDay, setViewingDay] = useState<string | null>(null);
  const [dayRecords, setDayRecords] = useState<AttendanceRecord[]>([]);

  const [viewingCorrection, setViewingCorrection] = useState<any>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionForm, setCorrectionForm] = useState<CorrectionForm>(INITIAL_CORRECTION_FORM);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const [isSavingDecision, setIsSavingDecision] = useState(false);

  const todayKey = todayDate;

  useEffect(() => {
    return () => {
      if (cameraStreamActive && videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStreamActive]);

  useEffect(() => {
    if (showClockModal) return;
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStreamActive(false);
  }, [showClockModal]);

  /* ── Derived ── */
  const monthDates = useMemo(() => getMonthDateRange(selectedMonth), [selectedMonth]);

  const filteredTeamRecords = useMemo(() => {
    return teamRecords.filter((r) => {
      const matchesSearch = searchQuery === '' ||
        r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'All' || r.department === departmentFilter;
      const matchesSub = subTab === 'all' || r.status?.toLowerCase() === subTab;
      return matchesSearch && matchesDept && matchesSub;
    });
  }, [teamRecords, searchQuery, departmentFilter, subTab]);

  const teamStats = useMemo(() => {
    if (teamRecords.length === 0) return DEFAULT_STATS;
    const present = teamRecords.filter((r) => r.status === 'present').length;
    const absent = teamRecords.filter((r) => r.status === 'absent').length;
    const late = teamRecords.filter((r) => r.status === 'late').length;
    const halfDay = teamRecords.filter((r) => r.status === 'half-day' || r.status === 'half_day').length;
    return {
      present, absent, late, halfDay,
      total: teamRecords.length,
      workingDays: teamRecords.length,
      attendancePercentage: teamRecords.length > 0 ? Math.round((present / teamRecords.length) * 100) : 0,
    };
  }, [teamRecords]);

  const todayRecord = useMemo(() => {
    const records = activeTab === 'my-attendance' ? myRecords : allRecords;
    return records.find((record) => record.date === todayDate) || null;
  }, [activeTab, myRecords, allRecords, todayDate]);

  const isTodayCompleted = Boolean(todayRecord?.checkOut);
  const isTodayInProgress = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);

  // Derived directly from the fetched record (not local state) so the clock
  // card can never show a stale status after a reload/refetch — there is no
  // separate "clockStatus" state to fall out of sync with todayRecord.
  const clockStatus: 'checked_out' | 'checked_in' | 'on_break' = isTodayCompleted
    ? 'checked_out'
    : isTodayInProgress
      ? (todayRecord?.isActiveBreak ? 'on_break' : 'checked_in')
      : 'checked_out';

  // Only completed clock-ins belong in the history table — a day with no
  // check-in never happened, and today stays in the live clock-in card
  // (above) until the user clocks out, at which point it moves down here.
  const visibleMyRecords = useMemo(() => {
    return myRecords
      .filter((record) => {
        if (!record.checkIn) return false;
        if (record.date === todayDate && !record.checkOut) return false;
        if (subTab !== 'all' && record.status?.toLowerCase() !== subTab) return false;
        return true;
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 10);
  }, [myRecords, todayDate, subTab]);

  const allDepartments = useMemo<string[]>(() => {
    if (assignedDepartmentNames.length > 0) return assignedDepartmentNames;
    return ['HR', 'Administration', 'Sales', 'IT', 'Tech', 'Finance', 'Maintenance'];
  }, [assignedDepartmentNames]);

  // Only people who actually manage a department (or are HR by role/department
  // assignment) get the Team Attendance tab - being merely assigned to a
  // department as a regular member should not grant it.
  const isDeptManager = managedDepartments.length > 0;
  const isHrProfile = membershipRole.includes('hr') ||
    assignedDepartmentNames.some((d) => normalizeRole(d) === 'hr' || normalizeRole(d).includes('human-resources'));
  const canManageAttendance = isAdminProfile || isSuperAdminProfile || isOwnerProfile || isDeptManager || isHrProfile;
  const isClockDisabledByConfig = isConfigLoaded && !isAttendanceConfigured;

  /* ── Effects ── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const [myRes, teamRes] = await Promise.all([
          getMyAttendance({ month: selectedMonth }),
          getTeamAttendance({ month: selectedMonth }),
        ]);
        if (!mounted) return;
        const myData = myRes || {};
        const teamData = teamRes || {};
        setMyRecords(Array.isArray(myData.records) ? myData.records : []);
        if (myData.stats) setMyStats(myData.stats);
        setTeamRecords(Array.isArray(teamData.records) ? teamData.records : []);
        setAllRecords(Array.isArray(teamData.allRecords) ? teamData.allRecords : (Array.isArray(teamData.records) ? teamData.records : []));
      } catch (err: any) {
        if (mounted) setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to load attendance data.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedMonth]);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const [geofenceRes, settingsRes] = await Promise.all([
          getAttendanceGeofence().catch(() => null),
          getAttendanceSettings().catch(() => null),
        ]);
        if (!mounted) return;
        const geofence = geofenceRes?.geofence || null;
        const settings = settingsRes?.settings || null;
        if (settings) {
          setAttendanceSettings({
            weeklyWorkingHours: settings?.weeklyWorkingHours ?? null,
            workingHoursStart: settings?.workingHoursStart || '',
            workingHoursEnd: settings?.workingHoursEnd || '',
            breakDurationMinutes: settings?.breakDurationMinutes ?? null,
          });
        }
        const geofenceReady = Boolean(geofence?.enabled) && geofence?.latitude != null && geofence?.longitude != null;
        const settingsReady = Boolean(
          settings?.weeklyWorkingHours != null &&
          settings?.workingHoursStart &&
          settings?.workingHoursEnd &&
          settings?.breakDurationMinutes != null,
        );
        setIsAttendanceConfigured(geofenceReady && settingsReady);
      } catch {
        if (mounted) setIsAttendanceConfigured(true);
      } finally {
        if (mounted) setIsConfigLoaded(true);
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const syncWorkspaceCalendar = () => {
      const nextDate = getLocalDateString(new Date(), workspacePreferences.timezone);
      setTodayDate(nextDate);
    };
    syncWorkspaceCalendar();
    const intervalId = window.setInterval(syncWorkspaceCalendar, 60_000);
    return () => window.clearInterval(intervalId);
  }, [workspacePreferences.timezone]);

  useEffect(() => {
    setSelectedMonth(getLocalMonthKey(new Date(), workspacePreferences.timezone));
  }, [workspacePreferences.timezone]);

  /* ── Clock Handlers ── */
  const reloadMyAttendance = async () => {
    try {
      const res = await getMyAttendance({ month: selectedMonth });
      const data = res || {};
      if (Array.isArray(data.records)) setMyRecords(data.records);
      if (data.stats) setMyStats(data.stats);
    } catch {
      // Keep the current view; refresh will be retried on the next interval.
    }
  };

  useEffect(() => {
    if (activeTab !== 'my-attendance') return;
    const id = window.setInterval(() => { reloadMyAttendance(); }, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedMonth]);

  const handleClockAction = async (mode: 'in' | 'out') => {
    if (isClockDisabledByConfig) {
      setClockErrorMessage('Attendance is not configured for this workspace yet. Ask HR to set working hours and the geofence.');
      return;
    }
    setClockMode(mode);
    setShowClockModal(true);
    setCaptureOpenedAt(new Date());
    setCapturedSelfie(null);
    setCapturedSelfieBlob(null);
    setCapturedLocation(null);
    setClockErrorMessage('');
    setCameraReady(false);

    setIsCapturing(true);
    try {
      const [location, stream] = await Promise.all([
        getCurrentLocation(),
        navigator.mediaDevices?.getUserMedia
          ? navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
            },
            audio: false,
          })
          : Promise.reject(new Error('Camera access is not available on this device.')),
      ]);

      if (location) {
        setCapturedLocation(location);
      } else {
        setClockErrorMessage('Location access is required. You can still capture the selfie and try proceed.');
      }
      setCameraStreamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch {
      setClockErrorMessage('Failed to capture selfie or location. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setClockErrorMessage('Camera is not ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const context = canvas.getContext('2d');
    if (!context) {
      setClockErrorMessage('Unable to capture selfie.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const selfieBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });

    if (!selfieBlob) {
      setClockErrorMessage('Unable to capture selfie.');
      return;
    }

    const dataUrl = await blobToDataUrl(selfieBlob);
    setCapturedSelfieBlob(selfieBlob);
    setCapturedSelfie(dataUrl);
  };

  const handleSubmitClock = async () => {
    setIsClockLoading(true);
    setClockErrorMessage('');
    try {
      const formData = new FormData();
      const selfieBlob = capturedSelfieBlob || await (async () => {
        if (!videoRef.current || !canvasRef.current) {
          throw new Error('Camera is not ready.');
        }
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Unable to capture selfie.');
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blobValue) => resolve(blobValue), 'image/jpeg', 0.92);
        });
        if (!blob) {
          throw new Error('Unable to capture selfie.');
        }
        const dataUrl = await blobToDataUrl(blob);
        setCapturedSelfieBlob(blob);
        setCapturedSelfie(dataUrl);
        return blob;
      })();
      formData.append('selfie', selfieBlob, 'selfie.jpg');
      if (capturedLocation) {
        formData.append('latitude', String(capturedLocation.lat));
        formData.append('longitude', String(capturedLocation.lng));
      }
      formData.append('date', todayDate);
      formData.append('timestamp', new Date().toISOString());

      if (clockMode === 'in') {
        await checkInAttendance(formData);
      } else {
        await checkOutAttendance(formData);
      }
      setCaptureOpenedAt(null);
      setShowClockModal(false);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraStreamActive(false);
      await reloadMyAttendance();
    } catch (err: any) {
      setClockErrorMessage(err?.response?.data?.message || err?.message || 'Failed to record attendance.');
    } finally {
      setIsClockLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setIsClockLoading(true);
    setClockErrorMessage('');
    try {
      await startBreakAttendance();
      await reloadMyAttendance();
    } catch (err: any) {
      setClockErrorMessage(err?.response?.data?.message || err?.message || 'Failed to start break.');
    } finally {
      setIsClockLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setIsClockLoading(true);
    setClockErrorMessage('');
    try {
      await endBreakAttendance();
      await reloadMyAttendance();
    } catch (err: any) {
      setClockErrorMessage(err?.response?.data?.message || err?.message || 'Failed to end break.');
    } finally {
      setIsClockLoading(false);
    }
  };

  /* ── Correction Handlers ── */
  const handleOpenCorrectionForm = (record: AttendanceRecord) => {
    // <input type="time"> requires a bare 24-hour "HH:MM" value — record.checkIn/
    // checkOut are already formatted as 12-hour labels (e.g. "10:30 AM") for
    // display, so re-derive from the ISO timestamps here instead.
    setCorrectionForm({
      recordId: record.recordId || record.id || '',
      type: 'check_in',
      reason: '',
      requestedCheckIn: record.checkInAt ? getWorkspaceTime(record.checkInAt, workspacePreferences.timezone) : '',
      requestedCheckOut: record.checkOutAt ? getWorkspaceTime(record.checkOutAt, workspacePreferences.timezone) : '',
      breaks: (record.breaks || []).map((entry, index) => {
        const start = entry.startAt ? getWorkspaceTime(entry.startAt, workspacePreferences.timezone) : '';
        const end = entry.endAt ? getWorkspaceTime(entry.endAt, workspacePreferences.timezone) : '';
        return {
          breakIndex: index,
          originalStart: start,
          originalEnd: end,
          requestedStart: start,
          requestedEnd: end,
          include: false,
        };
      }),
    });
    setShowCorrectionForm(true);
  };

  const handleSubmitCorrection = async (e: FormEvent) => {
    e.preventDefault();
    if (!correctionForm.recordId || !correctionForm.reason.trim()) return;
    setIsSubmittingCorrection(true);
    setErrorMessage('');
    try {
      await requestAttendanceCorrection(correctionForm.recordId, {
        type: correctionForm.type,
        reason: correctionForm.reason,
        requestedCheckIn: correctionForm.requestedCheckIn || undefined,
        requestedCheckOut: correctionForm.requestedCheckOut || undefined,
        breaks: correctionForm.breaks
          .filter((b) => b.include && (b.requestedStart || b.requestedEnd))
          .map((b) => ({ breakIndex: b.breakIndex, requestedStart: b.requestedStart, requestedEnd: b.requestedEnd })),
      });
      setShowCorrectionForm(false);
      setCorrectionForm(INITIAL_CORRECTION_FORM);
      const res = await getMyAttendance({ month: selectedMonth });
      setMyRecords(Array.isArray(res?.records) ? res.records : []);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to submit correction request.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  /* ── Employee Detail Handlers ── */
  const handleViewEmployee = async (userId: string, name: string, dept: string) => {
    setViewingEmployee({ userId, employeeName: name, department: dept });
    setIsLoadingHistory(true);
    try {
      const res = await getEmployeeAttendanceHistory(userId, { month: selectedMonth });
      setEmployeeHistory(Array.isArray(res?.records) ? res.records : []);
    } catch {
      setEmployeeHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /* ── Month/Day View Handlers ── */
  const handleViewMonth = (monthKey: string) => {
    setViewingMonth(monthKey);
    const records = activeTab === 'my-attendance' ? myRecords : allRecords;
    const filtered = records.filter((r) => {
      const recordMonth = (r.date || '').slice(0, 7);
      return recordMonth === monthKey;
    });
    setDayRecords(filtered);
  };

  const handleViewDay = (date: string) => {
    setViewingDay(date);
    const records = activeTab === 'my-attendance' ? myRecords : allRecords;
    const filtered = records.filter((r) => r.date === date);
    setDayRecords(filtered);
  };

  // getTeamAttendance (allRecords) deliberately excludes the signed-in user
  // from their own "team" roster, so a correction request the user filed for
  // themself never showed up there. The Corrections tab needs to see both.
  const correctionRecords = useMemo(() => {
    const seen = new Set<string>();
    const merged: AttendanceRecord[] = [];
    for (const record of [...myRecords, ...allRecords]) {
      if (!record.correction) continue;
      const key = record.recordId || record.id || `${record.userId}-${record.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(record);
    }
    return merged;
  }, [myRecords, allRecords]);

  /* ── Stats for tabs ── */
  const tabCards = useMemo(() => {
    if (activeTab === 'my-attendance') {
      const weeklyHours = myStats.weeklyHours;
      const weeklyHoursValue = weeklyHours?.targetHours != null
        ? `${weeklyHours.workedHours}/${weeklyHours.targetHours} hrs`
        : `${weeklyHours?.workedHours ?? 0} hrs`;
      return [
        { key: 'present', label: 'Present', value: myStats.present, color: 'emerald', icon: CheckCircle2 },
        { key: 'absent', label: 'Absent', value: myStats.absent, color: 'rose', icon: XCircle },
        { key: 'late', label: 'Late', value: myStats.late, color: 'amber', icon: AlertCircle },
        { key: 'weekly-hours', label: 'Weekly Hours', value: weeklyHoursValue, color: 'blue', icon: Clock },
      ];
    }
    if (activeTab === 'team-attendance') {
      return [
        { key: 'present', label: 'Present Today', value: teamStats.present, color: 'emerald', icon: Users },
        { key: 'absent', label: 'Absent', value: teamStats.absent, color: 'rose', icon: Users },
        { key: 'late', label: 'Late', value: teamStats.late, color: 'amber', icon: AlertCircle },
        { key: 'percentage', label: 'Attendance %', value: `${teamStats.attendancePercentage}%`, color: 'blue', icon: Calendar },
      ];
    }
    if (activeTab === 'corrections') {
      const pending = correctionRecords.filter((r) => r.correction?.status === 'pending').length;
      const approved = correctionRecords.filter((r) => r.correction?.status === 'approved').length;
      const rejected = correctionRecords.filter((r) => r.correction?.status === 'rejected').length;
      return [
        { key: 'total', label: 'Total Requests', value: correctionRecords.length, color: 'slate', icon: Calendar },
        { key: 'pending', label: 'Pending Corrections', value: pending, color: 'amber', icon: Clock },
        { key: 'approved', label: 'Approved', value: approved, color: 'emerald', icon: CheckCircle2 },
        { key: 'rejected', label: 'Rejected', value: rejected, color: 'rose', icon: XCircle },
      ];
    }
    return [
      { key: 'total', label: 'Total', value: allRecords.length, color: 'slate', icon: Calendar },
      { key: 'present', label: 'Present', value: teamStats.present, color: 'emerald', icon: CheckCircle2 },
      { key: 'absent', label: 'Absent', value: teamStats.absent, color: 'rose', icon: XCircle },
      { key: 'late', label: 'Late', value: teamStats.late, color: 'amber', icon: AlertCircle },
    ];
  }, [activeTab, myStats, teamStats, allRecords, correctionRecords]);

  const mainTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    tabs.push({ id: 'my-attendance', label: 'My Attendance' });
    if (canManageAttendance) tabs.push({ id: 'team-attendance', label: 'Team Attendance' });
    tabs.push({ id: 'corrections', label: 'Corrections' });
    return tabs;
  }, [canManageAttendance]);

  const subTabs = ['all', 'present', 'absent', 'late'];

  const getTimeDisplay = (time?: string) => time ? formatTime12b(time) : '--';

  const formatTime12b = (time?: string) => {
    if (!time) return '--';
    return formatTime12h(time) || time;
  };

  const clockStatusLabel = clockStatus === 'checked_in'
    ? 'Clocked In'
    : clockStatus === 'on_break'
      ? 'On Break'
      : isTodayCompleted
        ? 'Clocked Out'
        : 'Not Clocked In';

  const activeBreakEntry = useMemo(
    () => (Array.isArray(todayRecord?.breaks) ? todayRecord.breaks.find((b) => !b.endAt) : undefined),
    [todayRecord],
  );

  const clockStatusTime = clockStatus === 'checked_in'
    ? `Since ${getTimeDisplay(todayRecord?.checkIn)}`
    : clockStatus === 'on_break'
      ? `Since ${activeBreakEntry?.startTime ? formatTime12b(activeBreakEntry.startTime) : '--'}`
      : isTodayCompleted
        ? `At ${getTimeDisplay(todayRecord?.checkOut)}`
        : 'Clock in to start tracking your day.';

  const parseHHMM = (value?: string): number | null => {
    if (!value) return null;
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const dailyTargetSeconds = useMemo(() => {
    const start = parseHHMM(attendanceSettings.workingHoursStart);
    const end = parseHHMM(attendanceSettings.workingHoursEnd);
    const breakMinutes = Number(attendanceSettings.breakDurationMinutes) || 0;
    if (start != null && end != null && end > start) {
      return Math.max(0, (end - start - breakMinutes) * 60);
    }
    return 8 * 3600;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceSettings]);

  const liveTimes = useLiveTimes(todayRecord || undefined);
  const { totalSeconds, breakSeconds, currentBreakSeconds, workedSeconds } = liveTimes;
  const targetPercentage = Math.min(100, Math.round((workedSeconds / Math.max(1, dailyTargetSeconds)) * 100));
  const targetReached = workedSeconds >= dailyTargetSeconds;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <AttendanceSkeleton />
        </PageFrame>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Attendance Management
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Track attendance, manage corrections, and view team availability.
              </p>
            </div>
          </div>

          {errorMessage || clockErrorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600 flex items-center gap-2">
              <AlertTriangle size={14} />
              {errorMessage || clockErrorMessage}
            </div>
          ) : null}

          {isClockDisabledByConfig ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-pmedium text-amber-700 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                Attendance isn't configured for this workspace yet. Working hours, break duration, and the geofence must be set by HR before clock in/out will work.
              </div>
              {canManageAttendance && (
                <button
                  type="button"
                  onClick={() => navigate('/hr/attendance-review')}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest text-white hover:bg-amber-700 transition-colors"
                >
                  <Settings size={12} /> Open Attendance Settings
                </button>
              )}
            </div>
          ) : null}

          {/* MAIN TABS */}
          {mainTabs.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setSubTab('all'); }}
                  className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {tabCards.map((card) => {
              const Icon = card.icon;
              const colorMap: Record<string, string> = {
                emerald: 'border-l-emerald-500 bg-emerald-50 text-emerald-600',
                rose: 'border-l-rose-500 bg-rose-50 text-rose-600',
                amber: 'border-l-amber-500 bg-amber-50 text-amber-600',
                blue: 'border-l-blue-500 bg-blue-50 text-blue-600',
                slate: 'border-l-slate-500 bg-slate-50 text-slate-600',
              };
              const iconBg = colorMap[card.color]?.split('bg-')[1]?.split(' ')[0] ? `bg-${colorMap[card.color].split('bg-')[1].split(' ')[0]}` : 'bg-slate-50';
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-${card.color}-500`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconBg}`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

          {/* CLOCK IN/OUT CARD — my attendance only; team/corrections don't clock anyone in */}
          {activeTab === 'my-attendance' && (
          <div className="bg-gradient-to-r from-[#2563EB]/5 to-blue-50/50 border border-blue-100 rounded-2xl p-4 lg:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {(clockStatus === 'checked_in' || clockStatus === 'on_break') && (
                    <span className={`absolute inset-0 rounded-2xl animate-ping opacity-40 ${clockStatus === 'checked_in' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  )}
                  <div className={`relative p-3 rounded-2xl ${clockStatus === 'checked_in' ? 'bg-emerald-100 text-emerald-600' : clockStatus === 'on_break' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                    {clockStatus === 'checked_in' ? <LogIn size={22} /> : clockStatus === 'on_break' ? <Coffee size={22} /> : isTodayCompleted ? <LogOut size={22} /> : <Clock size={22} />}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Current Status</p>
                  <p className="text-lg font-pbold text-slate-900 flex items-center gap-2">
                    {clockStatusLabel}
                    {(clockStatus === 'checked_in' || clockStatus === 'on_break') && (
                      <span className={`inline-flex h-2 w-2 rounded-full ${clockStatus === 'checked_in' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                    )}
                  </p>
                  <p className="text-xs font-pmedium text-slate-500 mt-0.5">{clockStatusTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {clockStatus === 'checked_out' && (
                  <button
                    onClick={() => handleClockAction('in')}
                    disabled={isClockLoading || isCapturing || isTodayCompleted || isClockDisabledByConfig}
                    className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-xs uppercase hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                  {isCapturing ? <><Camera size={14} className="animate-pulse" /> Opening camera...</> : isClockLoading ? <><RefreshCw size={14} className="animate-spin" /> Processing...</> : <><LogIn size={14} /> Clock In</>}
                  </button>
                )}
                {clockStatus === 'checked_in' && (
                  <>
                    <button
                      onClick={handleStartBreak}
                      disabled={isClockLoading || isTodayCompleted || isClockDisabledByConfig}
                      className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-pmedium text-xs uppercase hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isClockLoading ? <RefreshCw size={14} className="animate-spin" /> : <Coffee size={14} />}
                      Start Break
                    </button>
                    <button
                      onClick={() => handleClockAction('out')}
                      disabled={isClockLoading || isCapturing || isTodayCompleted || isClockDisabledByConfig}
                      className="px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-pmedium text-xs uppercase hover:bg-rose-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCapturing ? <Camera size={14} className="animate-pulse" /> : isClockLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
                      Clock Out
                    </button>
                  </>
                )}
                {clockStatus === 'on_break' && (
                  <button
                    onClick={handleEndBreak}
                    disabled={isClockLoading || isTodayCompleted || isClockDisabledByConfig}
                    className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-pmedium text-xs uppercase hover:bg-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isClockLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    End Break
                  </button>
                )}
              </div>
            </div>

            {/* Live calculations */}
            <div className="mt-4 pt-4 border-t border-blue-100/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-pmedium uppercase tracking-[0.18em] text-slate-500">Today's Calculations</p>
                {clockStatus === 'on_break' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Current Break Running
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Total Time</p>
                  <p className="mt-1 text-lg font-pbold text-slate-900">{formatSeconds(totalSeconds)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Total Break</p>
                  <p className="mt-1 text-lg font-pbold text-amber-600">{formatSeconds(breakSeconds)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Current Break</p>
                  <p className="mt-1 text-lg font-pbold text-amber-600">
                    {!isTodayInProgress && !isTodayCompleted ? '--' : clockStatus === 'on_break' ? formatSeconds(currentBreakSeconds) : '0m'}
                  </p>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${targetReached ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Working Hours</p>
                  <p className={`mt-1 text-lg font-pbold ${targetReached ? 'text-emerald-600' : 'text-emerald-600'}`}>
                    {formatSeconds(workedSeconds)}
                    {targetReached && <span className="ml-1.5 align-middle text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">Done</span>}
                  </p>
                </div>
              </div>

              {/* Daily target */}
              <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                    Daily Target <span className="text-slate-700 font-pbold normal-case tracking-normal">{formatSeconds(dailyTargetSeconds)}</span>
                  </p>
                  <p className={`text-[10px] font-pmedium uppercase tracking-widest ${targetReached ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {targetReached ? 'Target completed' : `${targetPercentage}% complete`}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${targetReached ? 'bg-emerald-500' : 'bg-[#2563EB]'}`}
                    style={{ width: `${targetPercentage}%` }}
                  />
                </div>
              </div>

              {/* Today's timeline — folded into this card instead of a separate one below, since everything here is already scoped to today */}
              {(isTodayInProgress || isTodayCompleted) && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  {/* <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Today's Timeline</p>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-pmedium uppercase tracking-[0.24em] ${clockStatus === 'on_break' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {clockStatusLabel}
                    </span>
                  </div> */}
                  <AttendanceDayTimeline record={todayRecord || undefined} hideSummary compact />
                  {isTodayCompleted && (
                    <p className="mt-3 text-[11px] font-pmedium text-emerald-700">
                      Attendance is locked for today. The summary will reset after midnight.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">

            {/* Toolbar */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4">
                {/* LEFT: sub-tabs, standard across every tab */}
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {subTabs.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSubTab(status)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${subTab === status ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200' : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'}`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                  {activeTab === 'my-attendance' && (
                    <button
                      onClick={() => handleViewMonth(selectedMonth)}
                      className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-pmedium uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Calendar size={13} /> View Month
                    </button>
                  )}
                </div>

                {/* RIGHT: month dropdown, always immediately before search */}
                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[140px]"
                    >
                      {monthOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={11} />
                  </div>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text" placeholder="Search employee..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {activeTab === 'team-attendance' && allDepartments.length > 0 && (
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                      <select
                        className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[120px]"
                        value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}
                      >
                        <option value="All">All Depts</option>
                        {allDepartments.map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-x-auto">

              {/* TAB: My Attendance */}
              {activeTab === 'my-attendance' && (
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Check In</th>
                      <th className="px-5 py-4">Check Out</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Working Hours</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {visibleMyRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-slate-400 font-pmedium">
                          No completed clock-ins for this month yet.
                        </td>
                      </tr>
                    ) : (
                      visibleMyRecords.map((record, idx) => (
                        <tr key={record.recordId || record.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 font-pmedium text-slate-900">{formatDateDMY(record.date)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{getTimeDisplay(record.checkIn)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{getTimeDisplay(record.checkOut)}</td>
                          <td className="px-5 py-4">{getStatusBadge(record.status)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{formatDuration(record.totalHours || record.workingHours ? Number(record.totalHours || record.workingHours) : undefined)}</td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleViewDay(record.date || '')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all text-[10px] font-pmedium uppercase tracking-wider"
                                title="View Timeline & Calculations"
                              >
                                <Eye size={13} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => handleOpenCorrectionForm(record)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all"
                                title="Request Correction"
                              >
                                <Edit3 size={15} strokeWidth={2.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB: Team Attendance */}
              {activeTab === 'team-attendance' && (
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Emp ID</th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Department</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Check In</th>
                      <th className="px-5 py-4">Check Out</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {filteredTeamRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-16 text-slate-400 font-pmedium">
                          No team records found.
                        </td>
                      </tr>
                    ) : (
                      filteredTeamRecords.map((record, idx) => (
                        <tr key={record.userId || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 text-[11px] font-pmedium text-slate-700">{record.employeeId || '--'}</td>
                          <td className="px-5 py-4">
                            <div className="font-pmedium text-slate-900 flex items-center gap-2">
                              <User size={14} className="text-slate-400" />
                              {record.employeeName || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-pmedium text-slate-600">{formatRoleLabel(record.employeeRole)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-600">{record.department || '--'}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{formatDateDMY(record.date)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{getTimeDisplay(record.checkIn)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">{getTimeDisplay(record.checkOut)}</td>
                          <td className="px-5 py-4 font-pmedium">{getStatusBadge(record.status)}</td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleViewEmployee(record.userId, record.employeeName, record.department)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all mx-auto block"
                              title="View Details"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB: Corrections */}
              {activeTab === 'corrections' && (
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Current</th>
                      <th className="px-5 py-4">Requested</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {correctionRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-slate-400 font-pmedium">
                          No correction requests found.
                        </td>
                      </tr>
                    ) : (
                      correctionRecords.map((record, idx) => (
                        <tr key={record.recordId || record.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 font-pmedium text-slate-900">{record.employeeName || profile.name}</td>
                          <td className="px-5 py-4 text-slate-700 font-pmedium">{formatDateDMY(record.date)}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700 capitalize">{record.correction?.type?.replace(/_/g, ' ') || '--'}</td>
                          <td className="px-5 py-4 font-pmedium text-slate-700">
                            <span className="text-slate-500 text-[11px]">
                              {record.correction?.originalCheckIn ? `In: ${formatTime12b(record.correction.originalCheckIn)}` : ''}
                              {record.correction?.originalCheckOut ? ` Out: ${formatTime12b(record.correction.originalCheckOut)}` : ''}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-[#2563EB] font-pmedium text-[11px]">
                              {record.correction?.requestedCheckIn ? `In: ${formatTime12b(record.correction.requestedCheckIn)}` : ''}
                              {record.correction?.requestedCheckOut ? ` Out: ${formatTime12b(record.correction.requestedCheckOut)}` : ''}
                            </span>
                          </td>
                          <td className="px-5 py-4">{getStatusBadge(record.correction?.status)}</td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => setViewingCorrection(record)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all mx-auto block"
                              title="View Correction"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

            </div>
          </div>

        </div>
      </PageFrame>

      {/* ── MODALS ── */}

      {/* Clock Modal */}
      <AnimatePresence>
        {showClockModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => !isClockLoading && setShowClockModal(false)}
          >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[1.75rem] w-full max-w-[420px] shadow-2xl overflow-hidden max-h-[calc(100vh-1.5rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-pmedium text-primary flex items-center gap-2">
                  <Camera size={18} className="text-[#2563EB]" />
                  Capture Selfie
                </h2>
                <p className="mt-1 text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-400">
                  {clockMode === 'in' ? 'Check In' : 'Check Out'} verification
                </p>
              </div>
              <button onClick={() => setShowClockModal(false)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.28em] text-slate-300">Selfie Preview</p>
                  <div className="text-[10px] font-pmedium text-slate-400">
                    {cameraReady ? "Ready to capture" : isCapturing ? "Requesting access..." : "Waiting for access"}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="relative min-h-[380px] overflow-hidden rounded-[1.35rem] bg-black">
                    {capturedSelfie ? (
                      <img src={capturedSelfie} alt="Captured selfie" className="absolute inset-0 h-full w-full object-cover object-center" />
                    ) : (
                      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover object-center" playsInline muted autoPlay />
                    )}
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                        <div className="text-center">
                          <Camera size={28} className="mx-auto text-slate-400" />
                          <p className="mt-3 text-xs font-pmedium text-slate-300">Camera preview will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Date</p>
                  <p className="mt-1 text-[18px] font-pbold text-slate-700">{captureOpenedAt ? captureOpenedAt.toLocaleDateString() : new Date().toLocaleDateString()}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Time</p>
                  <p className="mt-1 text-[12px] font-pbold text-slate-700">{captureOpenedAt ? captureOpenedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowClockModal(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-pmedium uppercase text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturedSelfie ? handleSubmitClock : handleCaptureSelfie}
                  disabled={isClockLoading || !cameraReady || !capturedLocation}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3 text-xs font-pmedium uppercase text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isClockLoading
                    ? <><RefreshCw size={14} className="animate-spin" /> Processing...</>
                    : capturedSelfie
                      ? <><Check size={14} /> Proceed</>
                      : <><Camera size={14} /> Capture</>}
                </button>
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correction Form Modal */}
      <AnimatePresence>
        {showCorrectionForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-pmedium text-primary flex items-center gap-2">
                  <Edit3 size={18} className="text-amber-500" />
                  Request Attendance Correction
                </h2>
                <button onClick={() => setShowCorrectionForm(false)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmitCorrection}>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Correction Type</p>
                    <div className="flex gap-2">
                      {['check_in', 'check_out', 'both'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCorrectionForm((prev) => ({ ...prev, type }))}
                          className={`px-4 py-2 rounded-lg text-[11px] font-pmedium uppercase tracking-wider transition-all ${correctionForm.type === type ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {type.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(correctionForm.type === 'check_in' || correctionForm.type === 'both') && (
                    <div>
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest block mb-1">Requested Check In Time</label>
                      <input
                        type="time"
                        value={correctionForm.requestedCheckIn}
                        onChange={(e) => setCorrectionForm((prev) => ({ ...prev, requestedCheckIn: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                      />
                    </div>
                  )}
                  {(correctionForm.type === 'check_out' || correctionForm.type === 'both') && (
                    <div>
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest block mb-1">Requested Check Out Time</label>
                      <input
                        type="time"
                        value={correctionForm.requestedCheckOut}
                        onChange={(e) => setCorrectionForm((prev) => ({ ...prev, requestedCheckOut: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                      />
                    </div>
                  )}
                  {correctionForm.breaks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mb-2">Break Adjustments</p>
                      <div className="space-y-2">
                        {correctionForm.breaks.map((breakForm, idx) => (
                          <div key={breakForm.breakIndex} className="rounded-lg border border-slate-200/60 p-3 bg-slate-50/60">
                            <label className="flex items-center gap-2 mb-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={breakForm.include}
                                onChange={(e) => setCorrectionForm((prev) => ({
                                  ...prev,
                                  breaks: prev.breaks.map((b, i) => (i === idx ? { ...b, include: e.target.checked } : b)),
                                }))}
                                className="rounded border-slate-300"
                              />
                              <span className="text-[11px] font-pmedium text-slate-700">
                                Correct Break {idx + 1} ({breakForm.originalStart ? formatTime12h(breakForm.originalStart) : '--'} – {breakForm.originalEnd ? formatTime12h(breakForm.originalEnd) : '--'})
                              </span>
                            </label>
                            {breakForm.include && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest block mb-1">Start</label>
                                  <input
                                    type="time"
                                    value={breakForm.requestedStart}
                                    onChange={(e) => setCorrectionForm((prev) => ({
                                      ...prev,
                                      breaks: prev.breaks.map((b, i) => (i === idx ? { ...b, requestedStart: e.target.value } : b)),
                                    }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest block mb-1">End</label>
                                  <input
                                    type="time"
                                    value={breakForm.requestedEnd}
                                    onChange={(e) => setCorrectionForm((prev) => ({
                                      ...prev,
                                      breaks: prev.breaks.map((b, i) => (i === idx ? { ...b, requestedEnd: e.target.value } : b)),
                                    }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest block mb-1">Reason</label>
                    <textarea
                      value={correctionForm.reason}
                      onChange={(e) => setCorrectionForm((prev) => ({ ...prev, reason: e.target.value }))}
                      placeholder="Explain why this correction is needed..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none resize-none min-h-[80px] placeholder:text-slate-400"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowCorrectionForm(false)} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-2xl font-pmedium text-xs uppercase hover:bg-slate-300 transition-colors">Cancel</button>
                  <button
                    type="submit"
                    disabled={isSubmittingCorrection || !correctionForm.reason.trim()}
                    className="px-5 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-xs uppercase hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmittingCorrection ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee Detail Modal */}
      <AnimatePresence>
        {viewingEmployee && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setViewingEmployee(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-pbold text-slate-900">{viewingEmployee.employeeName}</h2>
                    <p className="text-xs font-pmedium text-slate-500">{viewingEmployee.department}</p>
                  </div>
                </div>
                <button onClick={() => setViewingEmployee(null)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : employeeHistory.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-pmedium">No attendance history found.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Check In</th>
                        <th className="px-4 py-3">Check Out</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                      {employeeHistory.map((record, idx) => (
                        <tr key={record.recordId || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-pmedium text-slate-900">{formatDateDMY(record.date)}</td>
                          <td className="px-4 py-3 font-pmedium text-slate-700">{getTimeDisplay(record.checkIn)}</td>
                          <td className="px-4 py-3 font-pmedium text-slate-700">{getTimeDisplay(record.checkOut)}</td>
                          <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                          <td className="px-4 py-3 font-pmedium text-slate-700">{formatDuration(record.totalHours ? Number(record.totalHours) : undefined)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly View Modal */}
      <AnimatePresence>
        {viewingMonth && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setViewingMonth(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h2 className="text-lg font-pmedium text-primary flex items-center gap-2">
                  <Calendar size={18} className="text-[#2563EB]" />
                  Monthly Overview - {monthOptions().find((m) => m.value === viewingMonth)?.label || viewingMonth}
                </h2>
                <button onClick={() => setViewingMonth(null)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest text-center py-2">{day}</div>
                  ))}
                  {(() => {
                    const [y, m] = viewingMonth.split('-').map(Number);
                    const firstDay = new Date(y, m - 1, 1).getDay();
                    const daysInMonth = getDaysInMonth(y, m - 1);
                    const blanks = Array(firstDay).fill(null);
                    const recordMap = new Map<string, AttendanceRecord>();
                    dayRecords.forEach((r) => {
                      if (r.date) recordMap.set(r.date, r);
                    });
                    return [...blanks, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)].map((day, idx) => {
                      if (day === null) return <div key={`blank-${idx}`} />;
                      const dateStr = `${viewingMonth}-${String(day).padStart(2, '0')}`;
                      const record = recordMap.get(dateStr);
                      const isToday = dateStr === todayDate;
                      // Green only means a full 8h day was completed; any other
                      // clocked-in day (late arrival, half day, short day) is
                      // orange. Absent stays red; days that haven't happened
                      // yet (or Sundays) stay neutral instead of looking absent.
                      const isAbsent = record?.status === 'absent';
                      const hasClockIn = Boolean(record?.checkIn);
                      const completedFullDay = hasClockIn && Number(record?.totalHours || 0) >= 8;
                      const bgColor = isAbsent
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : hasClockIn
                          ? (completedFullDay
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-orange-100 text-orange-700 border-orange-300')
                          : 'bg-slate-50/50 text-slate-400';
                      return (
                        <button
                          key={dateStr}
                          onClick={() => handleViewDay(dateStr)}
                          className={`aspect-square rounded-xl border ${isToday ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20' : 'border-slate-100'} ${bgColor} flex flex-col items-center justify-center text-xs font-pbold hover:shadow-md transition-all`}
                        >
                          <span>{day}</span>
                          {(hasClockIn || isAbsent) && <Circle size={6} className="mt-0.5" fill="currentColor" />}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {viewingDay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setViewingDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h2 className="text-lg font-pbold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-[#2563EB]" />
                  {formatDateDMY(viewingDay)}
                </h2>
                <button onClick={() => setViewingDay(null)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {dayRecords.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-pmedium">No records for this day.</div>
                ) : (
                  <div className="space-y-3">
                    {dayRecords.map((record, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-[18px] font-pbold text-slate-700">{record.employeeName || profile.name}</p>
                            <p className="text-[12px] font-pmedium text-slate-500">{record.department || '--'}</p>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                        {/* {record.source && (
                          <div className="mb-3 -mt-1 text-right">
                            <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Source</p>
                            <p className="text-xs font-pbold text-slate-600">{record.source}</p>
                          </div>
                        )} */}
                        <AttendanceDayTimeline record={record} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correction Detail Modal */}
      <AnimatePresence>
        {viewingCorrection && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setViewingCorrection(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-pbold text-slate-900 flex items-center gap-2">
                  <Edit3 size={18} className="text-amber-500" />
                  Correction Details
                </h2>
                <button onClick={() => setViewingCorrection(null)} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[15px] font-pbold text-slate-700">{viewingCorrection.employeeName || profile.name}</p>
                    {getStatusBadge(viewingCorrection.correction?.status)}
                  </div>
                  <p className="text-[10px] font-pmedium text-slate-500">{formatDateDMY(viewingCorrection.date)} &middot; {viewingCorrection.department || '--'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original Check In</p>
                    <p className="text-sm font-pbold text-slate-900">{formatTime12b(viewingCorrection.correction?.originalCheckIn)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Requested Check In</p>
                    <p className="text-sm font-pbold text-[#2563EB]">{formatTime12b(viewingCorrection.correction?.requestedCheckIn)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original Check Out</p>
                    <p className="text-sm font-pbold text-slate-900">{formatTime12b(viewingCorrection.correction?.originalCheckOut)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Requested Check Out</p>
                    <p className="text-sm font-pbold text-[#2563EB]">{formatTime12b(viewingCorrection.correction?.requestedCheckOut)}</p>
                  </div>
                </div>
                {(viewingCorrection.correction?.breaks || []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Break Adjustments</p>
                    {viewingCorrection.correction.breaks.map((breakAdjustment: CorrectionBreakAdjustment) => (
                      <div key={breakAdjustment.breakIndex} className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Original Break {breakAdjustment.breakIndex + 1}</p>
                          <p className="text-sm font-pbold text-slate-900">{formatTime12b(breakAdjustment.originalStart)} – {formatTime12b(breakAdjustment.originalEnd)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Requested Break {breakAdjustment.breakIndex + 1}</p>
                          <p className="text-sm font-pbold text-[#2563EB]">{formatTime12b(breakAdjustment.requestedStart)} – {formatTime12b(breakAdjustment.requestedEnd)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <p className="text-[9px] font-pmedium text-amber-600 uppercase tracking-widest mb-1">Reason</p>
                  <p className="text-xs font-pbold text-amber-800">{viewingCorrection.correction?.reason || 'No reason provided.'}</p>
                </div>
                {viewingCorrection.correction?.rejectionReason && (
                  <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                    <p className="text-[9px] font-pmedium text-rose-600 uppercase tracking-widest mb-1">Rejection Reason</p>
                    <p className="text-xs font-pbold text-rose-800">{viewingCorrection.correction.rejectionReason}</p>
                  </div>
                )}
                {viewingCorrection.correction?.actionedBy && (
                  <p className="text-[10px] font-pmedium text-slate-500 text-right">Actioned by: <span className="font-pbold">{viewingCorrection.correction.actionedBy}</span></p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
