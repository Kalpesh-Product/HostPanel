import { useEffect, useState } from 'react';

interface LiveBreak {
  startAt?: string | null;
  endAt?: string | null;
  duration?: number;
}

interface LiveRecord {
  checkInAt?: string | null;
  checkOutAt?: string | null;
  breaks?: LiveBreak[];
  totalSeconds?: number;
  breakSeconds?: number;
}

export interface LiveTimes {
  totalSeconds: number;
  breakSeconds: number;
  currentBreakSeconds: number;
  workedSeconds: number;
  isLive: boolean;
}

export const formatSeconds = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  if (!safeSeconds) return '0m';
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.round((safeSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const useLiveTimes = (record?: LiveRecord): LiveTimes => {
  const checkInDate = record?.checkInAt ? new Date(record.checkInAt) : null;
  const checkOutDate = record?.checkOutAt ? new Date(record.checkOutAt) : null;
  const isLive = Boolean(checkInDate && !checkOutDate);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  const end = checkOutDate || (isLive ? now : null);

  let totalSeconds = 0;
  if (checkInDate && end) {
    totalSeconds = Math.max(0, Math.floor((end.getTime() - checkInDate.getTime()) / 1000));
  } else {
    totalSeconds = Math.max(0, Number(record?.totalSeconds) || 0);
  }

  let breakSeconds = 0;
  let currentBreakSeconds = 0;
  for (const b of record?.breaks ?? []) {
    const start = b.startAt ? new Date(b.startAt) : null;
    const breakEnd = b.endAt ? new Date(b.endAt) : isLive ? now : null;
    if (start && breakEnd) {
      const seconds = Math.max(0, Math.floor((breakEnd.getTime() - start.getTime()) / 1000));
      if (isLive && !b.endAt) {
        currentBreakSeconds = seconds;
      }
      breakSeconds += seconds;
    } else if (b.duration) {
      breakSeconds += Math.max(0, b.duration * 60);
    }
  }

  const workedSeconds = Math.max(0, totalSeconds - breakSeconds);
  return { totalSeconds, breakSeconds, currentBreakSeconds, workedSeconds, isLive };
};
