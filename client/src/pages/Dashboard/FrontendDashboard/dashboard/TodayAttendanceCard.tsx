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
import { getWorkspaceDateKey } from "../../../../lib/workspaceLocalization";
import useWorkspacePreferences from "../../../../hooks/useWorkspacePreferences";
import useDashboardAccess from "../../../../hooks/useDashboardAccess";
import { formatSeconds, useLiveTimes } from "../../../../components/attendance/useLiveTimes";
import { useShouldShowDashboardAttendance } from "./useDashboardAttendanceVisibility";

type ClockMode = "in" | "out";

const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true },
    );
  });


export const DashboardAttendanceCard = () => {
  const shouldShow = useShouldShowDashboardAttendance();
  return shouldShow ? <TodayAttendanceCard /> : null;
};

const TodayAttendanceCard = () => {
  const workspacePreferences = useWorkspacePreferences();
  const access = useDashboardAccess();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [clockMode, setClockMode] = useState<ClockMode>("in");
  const [showClockModal, setShowClockModal] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [capturedSelfieBlob, setCapturedSelfieBlob] = useState<Blob | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const todayKey = getWorkspaceDateKey(new Date(), workspacePreferences.timezone);
  const todayRecord = useMemo(
    () => (Array.isArray(data) ? data : []).find((record: any) => record?.date === todayKey) || null,
    [data, todayKey],
  );
  const isCompleted = Boolean(todayRecord?.checkOut);
  const status: "checked_out" | "checked_in" | "on_break" = isCompleted
    ? "checked_out"
    : todayRecord?.checkIn
      ? (todayRecord?.isActiveBreak ? "on_break" : "checked_in")
      : "checked_out";
  const liveTimes = useLiveTimes(todayRecord || undefined);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const closeClockModal = useCallback(() => {
    if (isActionLoading) return;
    stopCamera();
    setShowClockModal(false);
  }, [isActionLoading, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const openClockModal = async (mode: ClockMode) => {
    setClockMode(mode);
    setShowClockModal(true);
    setCapturedSelfie(null);
    setCapturedSelfieBlob(null);
    setCapturedLocation(null);
    setErrorMessage("");
    setCameraReady(false);
    setIsCapturing(true);
    try {
      const [location, stream] = await Promise.all([
        getCurrentLocation(),
        navigator.mediaDevices?.getUserMedia
          ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
          : Promise.reject(new Error("Camera access is not available on this device.")),
      ]);
      if (!location) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Location access is required to record attendance.");
      }
      setCapturedLocation(location);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch (error) {
      setErrorMessage((error as Error)?.message || "Unable to access the camera or location.");
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
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return setErrorMessage("Unable to capture selfie.");
    setCapturedSelfieBlob(blob);
    setCapturedSelfie(URL.createObjectURL(blob));
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
      setShowClockModal(false);
      await refetch();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || "Failed to record attendance.");
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
      setErrorMessage(error?.response?.data?.message || error?.message || "Failed to update break.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const statusConfig = {
    checked_in: { label: "Clocked In", icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-100" },
    on_break: { label: "On Break", icon: Coffee, color: "text-amber-600", bg: "bg-amber-100" },
    checked_out: {
      label: todayRecord?.checkIn ? "Clocked Out" : "Not Clocked In",
      icon: todayRecord?.checkIn ? LogOut : Clock,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
  }[status];
  const StatusIcon = statusConfig.icon;

  if (isLoading) return <div className="h-36 animate-pulse rounded-2xl border border-borderGray bg-white" />;

  return (
    <>
      <section className="rounded-2xl border-default p-4 shadow-sm lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${statusConfig.bg} ${statusConfig.color}`}><StatusIcon size={21} /></div>
            <div>
              <p className="text-small font-pmedium uppercase tracking-widest text-slate-400">Today's Attendance</p>
              <p className="text-subtitle font-pmedium text-slate-900">{statusConfig.label}</p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-2 xl:max-w-2xl">
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <p className="text-small text-slate-400">Total Time</p>
              <p className="text-content font-pmedium text-slate-900">{formatSeconds(liveTimes.totalSeconds)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <p className="text-small text-slate-400">Total Break</p>
              <p className="text-content font-pmedium text-amber-600">{formatSeconds(liveTimes.breakSeconds)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <p className="text-small text-slate-400">Working Hours</p>
              <p className="text-content font-pmedium text-emerald-600">{formatSeconds(liveTimes.workedSeconds)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!todayRecord?.checkIn && (
              <button type="button" onClick={() => void openClockModal("in")} disabled={isActionLoading} className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-pmedium uppercase text-white hover:bg-blue-700 disabled:opacity-50">
                <LogIn size={14} /> Clock In
              </button>
            )}
            {status === "checked_in" && (
              <>
                <button type="button" onClick={() => void runBreakAction()} disabled={isActionLoading} className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-xs font-pmedium uppercase text-amber-700 hover:bg-amber-200 disabled:opacity-50">
                  {isActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Coffee size={14} />} Start Break
                </button>
                <button type="button" onClick={() => void openClockModal("out")} disabled={isActionLoading} className="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-2.5 text-xs font-pmedium uppercase text-rose-700 hover:bg-rose-200 disabled:opacity-50">
                  <LogOut size={14} /> Clock Out
                </button>
              </>
            )}
            {status === "on_break" && (
              <button type="button" onClick={() => void runBreakAction()} disabled={isActionLoading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-xs font-pmedium uppercase text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">
                {isActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} End Break
              </button>
            )}
            {isCompleted && <span className="text-small font-pmedium text-slate-500">Attendance completed for today</span>}
            {access.hasModule("attendance") && <a href="/extra-common-modules/attendance" className="inline-flex items-center gap-1 text-small font-pmedium text-[#2563EB] hover:underline">Details <ArrowRight size={13} /></a>}
          </div>
        </div>
        {errorMessage && !showClockModal && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-small font-pmedium text-rose-700">{errorMessage}</p>}
      </section>

      {showClockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-md" onClick={closeClockModal}>
          <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[420px] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-pmedium text-primary"><Camera size={18} className="text-[#2563EB]" /> Capture Selfie</h2>
                <p className="mt-1 text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-400">{clockMode === "in" ? "Clock In" : "Clock Out"} verification</p>
              </div>
              <button type="button" onClick={closeClockModal} disabled={isActionLoading} className="rounded-full bg-white p-2 shadow-sm disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950">
                <div className="relative min-h-[360px] overflow-hidden">
                  {capturedSelfie ? <img src={capturedSelfie} alt="Captured selfie" className="absolute inset-0 h-full w-full object-cover" /> : <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />}
                  {!cameraReady && !capturedSelfie && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-300"><Camera size={28} /><p className="mt-3 text-xs font-pmedium">{isCapturing ? "Requesting camera and location..." : "Camera preview unavailable"}</p></div>}
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {errorMessage && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-small font-pmedium text-rose-700">{errorMessage}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button type="button" onClick={closeClockModal} disabled={isActionLoading} className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-pmedium uppercase text-slate-700 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void (capturedSelfie ? submitClock() : captureSelfie())} disabled={isActionLoading || !cameraReady || !capturedLocation} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-3 text-xs font-pmedium uppercase text-white hover:bg-blue-700 disabled:opacity-50">
                {isActionLoading ? <><RefreshCw size={14} className="animate-spin" /> Processing...</> : capturedSelfie ? <><Check size={14} /> Proceed</> : <><Camera size={14} /> Capture</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodayAttendanceCard;
