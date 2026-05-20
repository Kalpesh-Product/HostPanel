// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import { computeOffset, getElapsedSecondsWithOffset } from "../utils/time";
import humanTime from "../utils/humanTime";
import { queryClient } from "../main";
import { useDispatch, useSelector } from "react-redux";
import {
  setClockInTime,
  setClockOutTime,
  setBreakTimings,
  setWorkHours,
  setBreakHours,
  setHasClockedIn,
  setHasTakenBreak,
  setIsToday,
  setLastUserId,
  resetAttendanceState,
} from "../redux/slices/userSlice";
import { Controller, useForm } from "react-hook-form";
import MuiModal from "./MuiModal";
import {
  TimePicker,
  LocalizationProvider,
} from "@mui/x-date-pickers";
import { TextField } from "@mui/material";
import SecondaryButton from "./SecondaryButton";
import PrimaryButton from "./PrimaryButton";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { isAlphanumeric, noOnlyWhitespace } from "../utils/validators";
import dayjs from "dayjs";

type AttendanceBreak = {
  start?: string;
  end?: string;
};

type AttendanceFormValues = {
  targetedDay: string | null;
  outTime: string | null;
  reason: string;
};

const ClockInOutAttendance = () => {
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  const dispatch = useDispatch();
  const {
    clockInTime,
    clockOutTime,
    breakTimings,
    workHours,
    breakHours,
    hasClockedIn,
    hasTakenBreak,
    isToday,
    lastUserId,
  } = useSelector((state: any) => state.user);

  const [openModal, setOpenModal] = useState(false);

  const {
    control,
    reset,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AttendanceFormValues>({
    defaultValues: {
      targetedDay: null,
      outTime: null,
      reason: "",
    },
  });

  const [startTime, setStartTime] = useState<string | null>(clockInTime);
  const [breaks, setBreaks] = useState<AttendanceBreak[]>(breakTimings || []);
  const [totalHours, setTotalHours] = useState({
    workHours,
    breakHours,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userId = auth?.user?._id;

  useEffect(() => {
    const currentUserId = auth?.user?._id;
    if (currentUserId && lastUserId && currentUserId !== lastUserId) {
      dispatch(resetAttendanceState());
    }
  }, [auth?.user?._id, lastUserId, dispatch]);

  useEffect(() => {
    const clockIn = auth?.user?.clockInDetails?.clockInTime;
    const hasClockedIn = auth?.user?.clockInDetails?.hasClockedIn;
    const clockOut = auth?.user?.clockInDetails?.clockOutTime;
    const serverNow = auth?.user?.time;
    const breaksFromServer = auth?.user?.clockInDetails?.breaks as AttendanceBreak[] | undefined;
    const todayClockIn = clockIn && new Date(clockIn);
    const todayClockOut = clockOut && new Date(clockOut);
    const startBreakTime =
      Array.isArray(breaksFromServer) &&
      breaksFromServer.length > 0 &&
      breaksFromServer[0].start &&
      new Date(breaksFromServer[0].start);
    const isTodayBreak = isSameDay(startBreakTime as Date | null);

    dispatch(setLastUserId(userId));

    if (hasClockedIn && clockIn && serverNow) {
      dispatch(setIsToday(isSameDay(clockIn)));
      dispatch(setClockInTime(clockIn));
      dispatch(setHasClockedIn(true));

      setStartTime(clockIn);
      const calculatedOffset = computeOffset(new Date());
      setOffset(calculatedOffset);
      setElapsedTime(getElapsedSecondsWithOffset(clockIn, calculatedOffset));

      setTotalHours((prev) => ({
        ...prev,
        workHours,
        breakHours,
      }));
    }

    if (
      hasClockedIn &&
      Array.isArray(breaksFromServer) &&
      breaksFromServer.length > 0 &&
      isTodayBreak
    ) {
      setBreaks(breaksFromServer);
      calculateTotalHoursServer(breaksFromServer, clockIn, clockOut);
    }

    const isTodayClockout = isSameDay(todayClockOut as Date | null);

    if (clockOut && isTodayClockout) {
      dispatch(setClockOutTime(clockOut));
      dispatch(setHasClockedIn(false));
      dispatch(setClockInTime(clockIn));

      if (isTodayBreak) {
        calculateTotalHoursServer(breaksFromServer || [], clockIn, clockOut);
      }
    }

    setIsBooting(false);
  }, [
    userId,
    auth,
    dispatch,
    lastUserId,
    workHours,
    breakHours,
  ]);

  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(getElapsedSecondsWithOffset(startTime, offset));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime, offset]);

  const { mutate: clockIn, isPending: isClockingIn } = useMutation({
    mutationFn: async (inTime: string) => {
      const res = await axios.post("/api/attendance/clock-in", {
        inTime,
        entryType: "web",
      });
      return { data: res.data, inTime };
    },
    onSuccess: ({ inTime }: { data: any; inTime: string }) => {
      toast.success("Clocked in successfully!");
      setStartTime(inTime);
      dispatch(setIsToday(isSameDay(inTime)));
      setOffset(0);
      setElapsedTime(getElapsedSecondsWithOffset(inTime, 0));
      dispatch(setClockInTime(inTime));
      dispatch(setHasClockedIn(true));
      queryClient.invalidateQueries({ queryKey: ["user-attendance"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Error"),
  });

  const { mutate: clockOut, isPending: isClockingOut } = useMutation({
    mutationFn: async (outTime: string) => {
      const res = await axios.patch("/api/attendance/clock-out", {
        outTime,
      });
      return { data: res.data, outTime };
    },
    onSuccess: ({ outTime }: { data: any; outTime: string }) => {
      toast.success("Clocked out successfully!");
      setStartTime(null);
      if (clockInTime) {
        setTotalHours((prev) => ({
          ...prev,
          workHours: calculateTotalHours(breaks, startTime, outTime, "workhours"),
        }));
        dispatch(setClockOutTime(outTime));
      }
      setElapsedTime(0);
      setOffset(0);
      dispatch(setHasClockedIn(false));
      queryClient.invalidateQueries({ queryKey: ["user-attendance"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Error"),
  });

  const { mutate: startBreak, isPending: isStartbreak } = useMutation({
    mutationFn: async (breakTime: string) => {
      const res = await axios.patch("/api/attendance/start-break", {
        startBreak: breakTime,
      });
      return { data: res.data, breakTime };
    },
    onSuccess: ({ breakTime }: { data: any; breakTime: string }) => {
      toast.success("Break started");
      setOffset(0);
      const updatedBreaks = [...breaks];
      if (!updatedBreaks.length || updatedBreaks[updatedBreaks.length - 1]?.end) {
        updatedBreaks.push({ start: breakTime });
      }
      setBreaks(updatedBreaks);
      dispatch(setBreakTimings(updatedBreaks));
      dispatch(setHasTakenBreak(true));
      dispatch(setWorkHours(calculateTotalHours(breaks, startTime, breakTime, "workhours")));
      queryClient.invalidateQueries({ queryKey: ["user-attendance"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Error"),
  });

  const { mutate: endBreak, isPending: isEndBreak } = useMutation({
    mutationFn: async (breakTime: string) => {
      const res = await axios.patch("/api/attendance/end-break", {
        endBreak: breakTime,
      });
      return { data: res.data, breakTime };
    },
    onSuccess: ({ breakTime }: { data: any; breakTime: string }) => {
      toast.success("Break ended");
      const updatedBreaks = [...breaks];
      const lastIndex = updatedBreaks.length - 1;
      if (lastIndex >= 0 && !updatedBreaks[lastIndex].end) {
        updatedBreaks[lastIndex] = {
          ...updatedBreaks[lastIndex],
          end: breakTime,
        };
      }
      setOffset(0);
      setBreaks(updatedBreaks);
      dispatch(setBreakTimings(updatedBreaks));
      dispatch(setHasTakenBreak(false));
      dispatch(setBreakHours(calculateTotalHours(updatedBreaks)));
      queryClient.invalidateQueries({ queryKey: ["user-attendance"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Error"),
  });

  const { mutate: correctionPost, isPending: correctionPending } = useMutation({
    mutationFn: async (data: AttendanceFormValues) => {
      const payload = {
        ...data,
        targetedDay: data.targetedDay ? new Date(data.targetedDay) : null,
        empId: auth?.user?.empId || "",
      };
      const response = await axios.post("/api/attendance/correct-attendance", payload);
      return response.data;
    },
    onSuccess: (data: { message?: string }) => {
      setOpenModal(false);
      toast.success(data.message || "Updated");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      reset();
      dispatch(resetAttendanceState());
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Error submitting correction");
    },
  });

  const onSubmit = (data: AttendanceFormValues) => {
    if (!auth?.user?.empId) return toast.error("User not found");
    correctionPost(data);
  };

  const handleStart = () => {
    const now = new Date().toISOString();
    clockIn(now);
  };

  const handleStop = () => {
    const now = new Date().toISOString();
    clockOut(now);
  };

  const handleStartBreak = () => {
    const now = new Date().toISOString();
    startBreak(now);
  };

  const handleEnBreak = () => {
    const now = new Date().toISOString();
    endBreak(now);
  };

  const formatElapsedTime = (seconds: number) => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const formatDisplayDate = (dateString: Date | string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (seconds: number) => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const isSameDay = (time: Date | string | null) => {
    if (!time) return false;
    const curr = new Date();
    const clockInDate = new Date(time);
    return (
      curr.getFullYear() === clockInDate.getFullYear() &&
      curr.getMonth() === clockInDate.getMonth() &&
      curr.getDate() === clockInDate.getDate()
    );
  };

  const calculateTotalHours = (
    breakTiming: AttendanceBreak[],
    start: string | null,
    end: string,
    type?: string,
  ) => {
    if (!start) return "00:00:00";
    if (type === "workhours") {
      const totalSeconds = (new Date(end) - new Date(start)) / 1000;
      const breakDuration = breakTiming.reduce((total, brk) => {
        if (brk.start && brk.end) {
          return total + (new Date(brk.end) - new Date(brk.start)) / 1000;
        }
        return total;
      }, 0);

      const netWorkSeconds = totalSeconds - breakDuration;
      return formatTime(netWorkSeconds > 0 ? netWorkSeconds : 0);
    }

    const breakDuration = breakTiming.reduce((total, brk) => {
      if (brk.start && brk.end) {
        return total + (new Date(brk.end) - new Date(brk.start)) / 1000;
      }
      return total;
    }, 0);

    return formatTime(breakDuration);
  };

  const calculateTotalHoursServer = useCallback((
    breaksFromServer: AttendanceBreak[],
    clockIn?: string | null,
    clockOut?: string | null,
  ) => {
    if (!clockIn) return;

    let calculatedWorkHours = workHours;
    let calculatedBreakHours = breakHours;
    const now = new Date();
    const clockInTime = new Date(clockIn);

    let effectiveEndTime = now;

    if (!hasClockedIn && clockOut) {
      effectiveEndTime = new Date(clockOut);
    }

    const lastBreakObj = breaksFromServer[breaksFromServer.length - 1];
    const isOngoingBreak = lastBreakObj?.start && !lastBreakObj?.end;

    if (!clockOut && isOngoingBreak) {
      effectiveEndTime = new Date(lastBreakObj.start as string);
    }

    const completedBreakDuration = breaksFromServer.reduce((total, brk) => {
      if (brk.start && brk.end) {
        return total + (new Date(brk.end) - new Date(brk.start)) / 1000;
      }
      return total;
    }, 0);

    const totalWorkSeconds = (effectiveEndTime - clockInTime) / 1000;
    const netWorkSeconds = totalWorkSeconds - completedBreakDuration;

    dispatch(setHasTakenBreak(Boolean(isOngoingBreak)));
    dispatch(setBreakTimings(breaksFromServer));
    dispatch(setBreakHours(formatTime(completedBreakDuration)));
    dispatch(setWorkHours(formatTime(netWorkSeconds > 0 ? netWorkSeconds : 0)));

    calculatedWorkHours = formatTime(netWorkSeconds > 0 ? netWorkSeconds : 0);
    calculatedBreakHours = formatTime(completedBreakDuration);

    setTotalHours({
      workHours: calculatedWorkHours,
      breakHours: calculatedBreakHours,
    });
  }, [breakHours, dispatch, hasClockedIn, workHours]);

  if (isBooting) {
    return (
      <div className="flex justify-center items-center h-40">
        <span className="text-content text-gray-600">Loading attendance...</span>
      </div>
    );
  }

  const getPrevDay = () => {
    const yesterday = dayjs().subtract(1, "day");
    return yesterday.day() === 0 ? dayjs().subtract(2, "day") : yesterday;
  };

  const timeStats = [
    {
      label: "Clock-in Time",
      value: clockInTime && isToday ? humanTime(clockInTime) : "0h:0m:0s",
    },
    {
      label: "Work Hours",
      value: isToday ? workHours : "0h:0m:0s",
    },
    {
      label: "Break Hours",
      value: isToday ? breakHours : "0h:0m:0s",
    },
    {
      label: "Clock-out Time",
      value:
        clockOutTime && isToday && clockInTime < clockOutTime
          ? humanTime(clockOutTime)
          : "0h:0m:0s",
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-0 h-80">
      <div className="grid grid-cols-1 gap-4">
        <div className="col-span-2 flex items-center flex-col h-80">
          <div className="text-subtitle text-primary font-pmedium font-medium mb-4">
            {formatDisplayDate(new Date())}
          </div>

          <div className="flex gap-12">
            <button type="button"
              onClick={() => {
                if (hasClockedIn && !isToday) {
                  setValue("targetedDay", getPrevDay().format("YYYY-MM-DD"));
                  setOpenModal(true);
                } else {
                  hasClockedIn ? isToday && handleStop() : isToday && handleStart();
                }
              }}
              className={`h-40 w-40 rounded-full ${
                hasClockedIn && !correctionPending
                  ? "bg-[#EB5C45]"
                  : "bg-wonoGreen transition-all"
              } text-white flex justify-center items-center hover:scale-105`}
              disabled={isClockingIn || isClockingOut}
            >
              {hasClockedIn && !correctionPending
                ? "Clock Out"
                : isClockingIn
                  ? "Starting..."
                  : "Clock In"}
            </button>

            {hasClockedIn && (
              <button type="button"
                onClick={hasTakenBreak ? handleEnBreak : handleStartBreak}
                className={`h-40 w-40 rounded-full ${
                  hasTakenBreak ? "bg-[#FB923C]" : "bg-[#FACC15] transition-all"
                } text-white flex justify-center items-center hover:scale-105`}
                disabled={isStartbreak || isEndBreak}
              >
                {hasTakenBreak
                  ? "End Break"
                  : isStartbreak
                    ? "Starting..."
                    : "Start Break"}
              </button>
            )}
          </div>

          <div className="text-subtitle text-primary font-pmedium font-medium mb-4 pt-4">
            {hasClockedIn && isToday
              ? `${formatElapsedTime(elapsedTime)}`
              : clockOutTime && isToday
                ? "Clocked Out"
                : "Not Clocked In"}
          </div>

          <div className="flex gap-4">
            {timeStats.map((stat, index) => (
              <div
                key={index}
                className={`flex flex-col gap-2 justify-center text-center ${
                  index !== timeStats.length - 1
                    ? "border-r-[1px] border-borderGray pr-4"
                    : ""
                }`}
              >
                <span className="text-muted">{stat.label}</span>
                <span className="font-medium text-content">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MuiModal
        title={"Correction Request"}
        open={openModal}
        onClose={() => setOpenModal(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Controller
            name="targetedDay"
            control={control}
            defaultValue={getPrevDay().format("YYYY-MM-DD")}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Selected Date"
                value={field.value ? dayjs(field.value).format("DD-MM-YYYY") : ""}
                fullWidth
                InputProps={{ readOnly: true }}
                error={!!errors?.targetedDay}
                helperText={errors?.targetedDay?.message}
              />
            )}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Controller
              name="outTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  {...field}
                  label={"Select Out-Time"}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(time) => {
                    field.onChange(time ? time.toISOString() : null);
                  }}
                />
              )}
            />
          </LocalizationProvider>

          <Controller
            name="reason"
            control={control}
            rules={{
              required: "Please specify your reason",
              validate: { noOnlyWhitespace, isAlphanumeric },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Reason"
                fullWidth
                multiline
                rows={3}
                error={!!errors?.reason}
                helperText={errors?.reason?.message}
              />
            )}
          />

          <div className="flex items-center justify-center gap-4">
            <SecondaryButton title={"Cancel"} handleSubmit={() => setOpenModal(false)} />
            <PrimaryButton
              title={"Submit"}
              type={"submit"}
              isLoading={correctionPending}
              disabled={correctionPending}
            />
          </div>
        </form>
      </MuiModal>
    </div>
  );
};

export default ClockInOutAttendance;


