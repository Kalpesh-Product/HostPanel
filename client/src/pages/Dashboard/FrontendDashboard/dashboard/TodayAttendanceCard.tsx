import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  Coffee,
  LogIn,
  LogOut,
  List,
  RefreshCw,
  X,
} from "lucide-react";
import {
  checkInAttendance,
  checkOutAttendance,
  endBreakAttendance,
  getMyAttendance,
  startBreakAttendance,
} from "../../../../services/attendance";
import {
  getWorkspaceDateKey,
  getWorkspaceTime,
} from "../../../../lib/workspaceLocalization";
import { formatTime12h } from "../../../../utils/time";
import useWorkspacePreferences from "../../../../hooks/useWorkspacePreferences";
import useDashboardAccess from "../../../../hooks/useDashboardAccess";
import {
  formatSeconds,
  useLiveTimes,
} from "../../../../components/attendance/useLiveTimes";
import { useShouldShowDashboardAttendance } from "./useDashboardAttendanceVisibility";

type ClockMode = "in" | "out";
type TodayAttendanceCardProps = {
  variant?: "default" | "hero";
};

const formatDurationClock = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true },
    );
  });

export const DashboardAttendanceCard = () => {
  const shouldShow = useShouldShowDashboardAttendance();
  return shouldShow ? <TodayAttendanceCard /> : null;
};

const TodayAttendanceCard = ({
  variant = "default",
}: TodayAttendanceCardProps) => {
  const workspacePreferences = useWorkspacePreferences();
  const access = useDashboardAccess();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [clockMode, setClockMode] = useState<ClockMode>("in");
  const [showClockModal, setShowClockModal] = useState(false);
  const [captureOpenedAt, setCaptureOpenedAt] = useState<Date | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [capturedSelfieBlob, setCapturedSelfieBlob] = useState<Blob | null>(
    null,
  );
  const [capturedLocation, setCapturedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-today-attendance"],
    queryFn: async () => {
      const response = await getMyAttendance();
      return Array.isArray(response?.data?.records)
        ? response.data.records
        : Array.isArray(response?.records)
          ? response.records
          : [];
    },
    staleTime: 60 * 1000,
  });

  const todayKey = getWorkspaceDateKey(
    new Date(),
    workspacePreferences.timezone,
  );
  const todayRecord = useMemo(
    () =>
      (Array.isArray(data) ? data : []).find(
        (record: any) => record?.date === todayKey,
      ) || null,
    [data, todayKey],
  );
  const isCompleted = Boolean(todayRecord?.checkOut);
  const status: "checked_out" | "checked_in" | "on_break" = isCompleted
    ? "checked_out"
    : todayRecord?.checkIn
      ? todayRecord?.isActiveBreak
        ? "on_break"
        : "checked_in"
      : "checked_out";
  const liveTimes = useLiveTimes(todayRecord || undefined);

  const stopCamera = useCallback(() => {
    const stream =
      cameraStreamRef.current ||
      (videoRef.current?.srcObject as MediaStream | null);
    stream?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const clearCapturedSelfie = useCallback(() => {
    setCapturedSelfie((currentSelfie) => {
      if (currentSelfie) URL.revokeObjectURL(currentSelfie);
      return null;
    });
    setCapturedSelfieBlob(null);
  }, []);

  const closeClockModal = useCallback(() => {
    if (isActionLoading) return;
    clearCapturedSelfie();
    setCapturedLocation(null);
    setCaptureOpenedAt(null);
    stopCamera();
    setShowClockModal(false);
  }, [clearCapturedSelfie, isActionLoading, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (variant !== "hero") return;
    const timer = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [variant]);

  const openClockModal = async (mode: ClockMode) => {
    setClockMode(mode);
    setShowClockModal(true);
    setCaptureOpenedAt(new Date());
    clearCapturedSelfie();
    setCapturedLocation(null);
    setErrorMessage("");
    setCameraReady(false);
    setIsCapturing(true);
    try {
      const [location, stream] = await Promise.all([
        getCurrentLocation(),
        navigator.mediaDevices?.getUserMedia
          ? navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: false,
            })
          : Promise.reject(
              new Error("Camera access is not available on this device."),
            ),
      ]);
      if (!location) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Location access is required to record attendance.");
      }
      setCapturedLocation(location);
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch (error) {
      setErrorMessage(
        (error as Error)?.message || "Unable to access the camera or location.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return setErrorMessage("Camera is not ready.");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const context = canvas.getContext("2d");
    if (!context) return setErrorMessage("Unable to capture selfie.");
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) return setErrorMessage("Unable to capture selfie.");
    setCapturedSelfieBlob(blob);
    setCapturedSelfie(URL.createObjectURL(blob));
    setErrorMessage("");
  };

  const retakeSelfie = () => {
    clearCapturedSelfie();
    setErrorMessage("");
  };

  const submitClock = async () => {
    if (!capturedSelfieBlob || !capturedLocation) return;
    setIsActionLoading(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("selfie", capturedSelfieBlob, "selfie.jpg");
      formData.append("latitude", String(capturedLocation.lat));
      formData.append("longitude", String(capturedLocation.lng));
      formData.append("date", todayKey);
      formData.append("timestamp", new Date().toISOString());
      if (clockMode === "in") await checkInAttendance(formData);
      else await checkOutAttendance(formData);
      stopCamera();
      setCaptureOpenedAt(null);
      setShowClockModal(false);
      await refetch();
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to record attendance.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const runBreakAction = async () => {
    setIsActionLoading(true);
    setErrorMessage("");
    try {
      if (status === "on_break") await endBreakAttendance();
      else await startBreakAttendance();
      await refetch();
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update break.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const statusConfig = {
    checked_in: {
      label: "Clocked In",
      icon: LogIn,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    on_break: {
      label: "On Break",
      icon: Coffee,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    checked_out: {
      label: todayRecord?.checkIn ? "Clocked Out" : "Not Clocked In",
      icon: todayRecord?.checkIn ? LogOut : Clock,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  }[status];
  const StatusIcon = statusConfig.icon;
  const isHero = variant === "hero";
  const liveClockLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: workspacePreferences.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(clockNow);
    } catch {
      return clockNow.toLocaleTimeString("en-US");
    }
  }, [clockNow, workspacePreferences.timezone]);
  const liveDateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: workspacePreferences.timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(clockNow);
    } catch {
      return clockNow.toLocaleDateString("en-IN");
    }
  }, [clockNow, workspacePreferences.timezone]);
  const checkInLabel = todayRecord?.checkIn
    ? formatTime12h(String(todayRecord.checkIn))
    : todayRecord?.checkInAt
      ? formatTime12h(
          getWorkspaceTime(
            todayRecord.checkInAt,
            workspacePreferences.timezone,
          ),
        )
      : "--";
  const checkOutLabel = todayRecord?.checkOut
    ? formatTime12h(String(todayRecord.checkOut))
    : todayRecord?.checkOutAt
      ? formatTime12h(
          getWorkspaceTime(
            todayRecord.checkOutAt,
            workspacePreferences.timezone,
          ),
        )
      : "--";
  const timelineEvents: Array<{
    id: string;
    type: "clock_in" | "break_start" | "break_end" | "clock_out";
    label: string;
    detail: string;
    time: string;
    active?: boolean;
  }> = [];

  if (todayRecord?.checkIn || todayRecord?.checkInAt) {
    timelineEvents.push({
      id: "clock-in",
      type: "clock_in",
      label: "Clock In",
      detail: "Workday started",
      time: checkInLabel,
    });
  }

  (Array.isArray(todayRecord?.breaks) ? todayRecord.breaks : []).forEach(
    (entry: any, index: number) => {
      const startTime = entry?.startTime
        ? formatTime12h(String(entry.startTime))
        : entry?.startAt
          ? formatTime12h(
              getWorkspaceTime(entry.startAt, workspacePreferences.timezone),
            )
          : "--";
      timelineEvents.push({
        id: `break-${index}-start`,
        type: "break_start",
        label: `Break ${index + 1} Started`,
        detail: entry?.endAt
          ? "Break recorded"
          : `In progress · ${formatDurationClock(liveTimes.currentBreakSeconds)}`,
        time: startTime,
        active: !entry?.endAt,
      });

      if (entry?.endAt) {
        timelineEvents.push({
          id: `break-${index}-end`,
          type: "break_end",
          label: `Break ${index + 1} Ended`,
          detail: "Work resumed",
          time: formatTime12h(
            getWorkspaceTime(entry.endAt, workspacePreferences.timezone),
          ),
        });
      }
    },
  );

  if (todayRecord?.checkOut || todayRecord?.checkOutAt) {
    timelineEvents.push({
      id: "clock-out",
      type: "clock_out",
      label: "Clock Out",
      detail: "Workday completed",
      time: checkOutLabel,
    });
  }

  if (isLoading)
    return (
      <div className="h-36 animate-pulse rounded-2xl border border-borderGray bg-white" />
    );

  const attendanceActions = (
    <div className="flex flex-wrap items-center gap-2">
      {!todayRecord?.checkIn && (
        <button
          type="button"
          onClick={() => void openClockModal("in")}
          disabled={isActionLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-xs font-pmedium uppercase tracking-wider text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:opacity-50"
        >
          <LogIn size={15} /> Clock In
        </button>
      )}
      {status === "checked_in" && (
        <>
          <button
            type="button"
            onClick={() => void runBreakAction()}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-3 text-xs font-pmedium uppercase tracking-wider text-amber-700 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {isActionLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Coffee size={14} />
            )}
            Start Break
          </button>
          <button
            type="button"
            onClick={() => void openClockModal("out")}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-3 text-xs font-pmedium uppercase tracking-wider text-rose-700 transition hover:bg-rose-200 disabled:opacity-50"
          >
            <LogOut size={14} /> Clock Out
          </button>
        </>
      )}
      {status === "on_break" && (
        <button
          type="button"
          onClick={() => void runBreakAction()}
          disabled={isActionLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-xs font-pmedium uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50"
        >
          {isActionLoading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          End Break
        </button>
      )}
      {isCompleted && (
        <span className="text-small font-pmedium text-slate-500">
          Attendance completed for today
        </span>
      )}
      {access.hasModule("attendance") && !isHero && (
        <a
          href="/common-modules/attendance"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-2 text-small font-pmedium text-[#2563EB] transition hover:bg-blue-50"
        >
          View attendance <ArrowRight size={13} />
        </a>
      )}
    </div>
  );

  return (
    <>
      {isHero ? (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-[0_12px_34px_rgba(30,61,115,0.07)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                    Today's Attendance
                  </p>
                  <h2 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                    Clock In / Out
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {access.hasModule("attendance") && (
                  <a
                    href="/common-modules/attendance"
                    className="inline-flex items-center gap-1 text-[9px] font-pmedium uppercase tracking-widest text-[#2563EB] hover:underline"
                  >
                    View details <ArrowRight size={12} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex min-h-[250px] flex-col items-center justify-center px-5 py-7 text-center sm:px-6">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-pmedium uppercase tracking-widest ${statusConfig.bg} ${statusConfig.color}`}
              >
                <StatusIcon size={12} /> {statusConfig.label}
              </span>
              <p className="mt-5 text-4xl font-pmedium tabular-nums tracking-[0.08em] text-[#1E3D73] sm:text-5xl">
                {formatDurationClock(liveTimes.totalSeconds)}
              </p>
              <p className="mt-2 text-[10px] font-pmedium uppercase tracking-[0.18em] text-slate-400">
                Total time since clock in
              </p>
              <div className="mt-6 flex justify-center">
                {attendanceActions}
              </div>
              <p className="mt-3 text-[10px] font-pmedium text-slate-500">
                {status === "on_break"
                  ? "Total time continues while worked time is paused."
                  : status === "checked_in"
                    ? "Your workday is currently in progress."
                    : isCompleted
                      ? "Your attendance is complete for today."
                      : "Clock in to begin tracking your workday."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
              {[
                {
                  label: "Clock-in Time",
                  value: checkInLabel,
                  icon: LogIn,
                  color: "text-emerald-600",
                  iconBg: "bg-emerald-50",
                },
                {
                  label: "Worked Hours",
                  value: formatDurationClock(liveTimes.workedSeconds),
                  icon: Clock,
                  color: "text-[#2563EB]",
                  iconBg: "bg-blue-50",
                },
                {
                  label: "Break Hours",
                  value: formatDurationClock(liveTimes.breakSeconds),
                  icon: Coffee,
                  color: "text-amber-600",
                  iconBg: "bg-amber-50",
                },
                {
                  label: "Clock-out Time",
                  value: checkOutLabel,
                  icon: LogOut,
                  color: "text-rose-600",
                  iconBg: "bg-rose-50",
                },
              ].map((item) => {
                const SummaryIcon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 bg-[#F8FAFD] px-5 py-6"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconBg} ${item.color}`}
                    >
                      <SummaryIcon size={18} />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-[10px] font-pmedium text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 truncate text-[15px] font-pmedium tabular-nums text-[#1E3D73]">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {errorMessage && !showClockModal && (
              <p className="mx-5 mb-4 rounded-lg bg-rose-50 px-3 py-2 text-small font-pmedium text-rose-700 sm:mx-6">
                {errorMessage}
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-[0_12px_34px_rgba(30,61,115,0.07)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                <List size={18} />
              </div>
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-[0.2em] text-[#2563EB]">
                  Activity log
                </p>
                <h2 className="mt-0.5 text-lg font-pmedium text-[#1E3D73]">
                  Today's Timeline
                </h2>
              </div>
            </div>

            <div className="h-[350px] overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {timelineEvents.length > 0 ? (
                <div>
                  {timelineEvents.map((event, index) => {
                    const isLast = index === timelineEvents.length - 1;
                    const eventStyle =
                      event.type === "clock_in"
                        ? "bg-emerald-50 text-emerald-600"
                        : event.type === "clock_out"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-amber-50 text-amber-600";
                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${eventStyle}`}
                          >
                            {event.type === "clock_in" ? (
                              <LogIn size={16} />
                            ) : event.type === "clock_out" ? (
                              <LogOut size={16} />
                            ) : event.type === "break_end" ? (
                              <Check size={16} />
                            ) : (
                              <Coffee size={16} />
                            )}
                          </div>
                          {!isLast && (
                            <div className="my-1 min-h-6 w-px flex-1 bg-slate-200" />
                          )}
                        </div>
                        <div
                          className={`${isLast ? "" : "pb-5"} min-w-0 flex-1 pt-0.5`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-pmedium text-[#1E3D73]">
                                {event.label}
                              </p>
                              <p className="mt-1 text-[10px] font-pmedium text-slate-500">
                                {event.detail}
                              </p>
                            </div>
                            <p className="shrink-0 text-[11px] font-pmedium text-[#1E3D73]">
                              {event.time}
                            </p>
                          </div>
                          {event.active && (
                            <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[8px] font-pmedium uppercase tracking-widest text-amber-700">
                              Active break
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB]">
                    <Clock size={20} />
                  </div>
                  <p className="mt-3 text-sm font-pmedium text-[#1E3D73]">
                    No attendance activity yet
                  </p>
                  <p className="mt-1 max-w-xs text-[10px] font-pmedium leading-5 text-slate-500">
                    Clock in to start today&apos;s timeline. Breaks and clock
                    out will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-2xl border-default p-4 shadow-sm lg:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-2xl p-3 ${statusConfig.bg} ${statusConfig.color}`}
              >
                <StatusIcon size={21} />
              </div>
              <div>
                <p className="text-xs font-pmedium uppercase text-slate-500">
                  Today's Attendance
                </p>
                <p className="text-subtitle font-pmedium text-slate-900">
                  {statusConfig.label}
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-3 gap-2 xl:max-w-2xl">
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                <p className="text-small font-pmedium uppercase text-slate-400">
                  Total Time
                </p>
                <p className="text-content font-pmedium text-slate-900">
                  {formatSeconds(liveTimes.totalSeconds)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                <p className="text-small font-pmedium uppercase text-slate-400">
                  Total Break
                </p>
                <p className="text-content font-pmedium text-amber-600">
                  {formatSeconds(liveTimes.breakSeconds)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                <p className="text-small font-pmedium uppercase text-slate-400">
                  Working Hours
                </p>
                <p className="text-content font-pmedium text-emerald-600">
                  {formatSeconds(liveTimes.workedSeconds)}
                </p>
              </div>
            </div>

            {attendanceActions}
          </div>
          {errorMessage && !showClockModal && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-small font-pmedium text-rose-700">
              {errorMessage}
            </p>
          )}
        </section>
      )}

      {showClockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md">
          <div
            className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[420px] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-pmedium text-primary">
                  <Camera size={18} className="text-[#2563EB]" /> Capture Selfie
                </h2>
                <p className="mt-1 text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-400">
                  {clockMode === "in" ? "Clock In" : "Clock Out"} verification
                </p>
              </div>
              <button
                type="button"
                onClick={closeClockModal}
                disabled={isActionLoading}
                className="rounded-full bg-white p-2 shadow-sm disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950">
                <div className="relative min-h-[360px] overflow-hidden">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                    playsInline
                    muted
                    autoPlay
                  />
                  {capturedSelfie && (
                    <img
                      src={capturedSelfie}
                      alt="Captured selfie"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {!cameraReady && !capturedSelfie && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-300">
                      <Camera size={28} />
                      <p className="mt-3 text-sm font-pmedium">
                        {isCapturing
                          ? "Requesting camera and location..."
                          : "Camera preview unavailable"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-pmedium uppercase text-slate-500">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-pmedium text-slate-700">
                    {(captureOpenedAt || new Date()).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-pmedium uppercase text-slate-500">
                    Time
                  </p>
                  <p className="mt-1 text-sm font-pmedium text-slate-700">
                    {(captureOpenedAt || new Date()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {errorMessage && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-small font-pmedium text-rose-700">
                  {errorMessage}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={capturedSelfie ? retakeSelfie : closeClockModal}
                disabled={isActionLoading}
                className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-pmedium uppercase text-slate-700 disabled:opacity-50"
              >
                {capturedSelfie ? "Retake" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() =>
                  void (capturedSelfie ? submitClock() : captureSelfie())
                }
                disabled={isActionLoading || !cameraReady || !capturedLocation}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3 text-xs font-pmedium uppercase text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isActionLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />{" "}
                    Processing...
                  </>
                ) : capturedSelfie ? (
                  <>
                    <Check size={14} /> Proceed
                  </>
                ) : (
                  <>
                    <Camera size={14} /> Capture
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodayAttendanceCard;
