import { type ReactNode } from 'react';
import { LogIn, LogOut, Coffee, MapPin } from 'lucide-react';
import { useLiveTimes, formatSeconds } from './useLiveTimes';

interface BreakEntry {
  startTime?: string;
  endTime?: string;
  startAt?: string | null;
  endAt?: string | null;
  duration?: number;
  type?: string;
}

interface DayRecord {
  checkIn?: string;
  checkOut?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  checkInLocation?: string;
  checkOutLocation?: string;
  breaks?: BreakEntry[];
  status?: string;
  source?: string;
  isInProgress?: boolean;
  isActiveBreak?: boolean;
  totalSeconds?: number;
  breakSeconds?: number;
  totalTime?: string;
  breakTime?: string;
  workingHours?: string;
}

interface Props {
  record?: DayRecord;
  compact?: boolean;
  hideSummary?: boolean;
}

const SummaryBox = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{label}</p>
    <p className={`mt-1 text-lg font-pbold ${accent}`}>{value}</p>
  </div>
);

const TimelineRow = ({
  icon,
  iconClass,
  label,
  time,
  detail,
  isLast,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  time: string;
  detail?: string;
  isLast?: boolean;
}) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full ${iconClass} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      {!isLast && <div className="w-px flex-1 bg-slate-200 my-1 min-h-[14px]" />}
    </div>
    <div className={`${isLast ? '' : 'pb-5'} min-w-0 flex-1`}>
      <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-pbold text-slate-900">{time || '--'}</p>
      {/* {detail && (
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
          <MapPin size={9} className="inline" /> {detail}
        </p>
      )} */}
    </div>
  </div>
);

export default function AttendanceDayTimeline({ record, compact, hideSummary }: Props) {
  const { totalSeconds, breakSeconds, workedSeconds, isLive } = useLiveTimes(record);
  const now = new Date();
  const checkInDate = record?.checkInAt ? new Date(record.checkInAt) : null;
  const checkOutDate = record?.checkOutAt ? new Date(record.checkOutAt) : null;
  const hasAnyActivity = Boolean(checkInDate || checkOutDate || (record?.breaks?.length ?? 0) > 0);

  return (
    <div className={compact ? '' : 'mt-4'}>
      {/* Calculations — skippable when the caller already shows these totals elsewhere */}
      {!hideSummary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <SummaryBox label="Total Time" value={formatSeconds(totalSeconds)} accent="text-slate-900" />
          <SummaryBox label="Break Time" value={formatSeconds(breakSeconds)} accent="text-amber-600" />
          <SummaryBox label="Working Hours" value={formatSeconds(workedSeconds)} accent="text-emerald-600" />
        </div>
      )}

      {/* Timeline — no top margin needed when the summary grid above it is hidden, there's nothing to space away from */}
      <div className={`${hideSummary ? '' : compact ? 'mt-3' : 'mt-4'} rounded-2xl border border-slate-100 bg-white px-4 py-3`}>
        <p className="text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-400">Timeline</p>
        {!hasAnyActivity ? (
          <div className="py-8 text-center text-slate-400 font-pmedium text-xs">
            No activity recorded for this day.
          </div>
        ) : (
          <div className="mt-3">
            {checkInDate && (
              <TimelineRow
                icon={<LogIn size={14} />}
                iconClass="bg-emerald-100 text-emerald-600"
                label="Check In"
                time={record?.checkIn || '--'}
                detail={record?.checkInLocation}
              />
            )}
            {(record?.breaks ?? []).map((b, index) => {
              const isActiveBreak = isLive && !b.endAt;
              const liveBreakSeconds = isActiveBreak && b.startAt
                ? Math.max(0, Math.floor((now.getTime() - new Date(b.startAt).getTime()) / 1000))
                : 0;
              return (
                <TimelineRow
                  key={index}
                  icon={<Coffee size={14} />}
                  iconClass={isActiveBreak ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}
                  label={`Break ${index + 1}`}
                  time={isActiveBreak ? `Started at ${b.startTime || '--'} · In Progress` : `${b.startTime || '--'} - ${b.endTime || '--'}`}
                  detail={isActiveBreak ? `${formatSeconds(liveBreakSeconds)} So Far` : b.duration ? `${b.duration}m` : undefined}
                />
              );
            })}
            {checkOutDate && (
              <TimelineRow
                icon={<LogOut size={14} />}
                iconClass="bg-rose-100 text-rose-600"
                label="Check Out"
                time={record?.checkOut || '--'}
                detail={record?.checkOutLocation}
                isLast
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
