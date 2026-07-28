function toMinutes(value: string): number {
  const [h, m] = String(value || "00:00").split(":").map(Number);
  return ((h || 0) % 24) * 60 + (m || 0);
}

function to12hParts(value: string) {
  const minutesTotal = toMinutes(value);
  const hour24 = Math.floor(minutesTotal / 60);
  const minute = minutesTotal % 60;
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute, period };
}

function from12hParts(hour12: number, minute: number, period: "AM" | "PM"): string {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTime12hLabel(value: string): string {
  if (!value) return "--";
  const { hour12, minute, period } = to12hParts(value);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type TimePicker12hProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function TimePicker12h({ value, onChange, disabled, className = "" }: TimePicker12hProps) {
  const { hour12, minute, period } = to12hParts(value || "00:00");
  const nearestMinute = MINUTES.reduce((closest, candidate) =>
    Math.abs(candidate - minute) < Math.abs(closest - minute) ? candidate : closest, MINUTES[0]);

  const selectClass =
    "px-2 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        aria-label="Hour"
        disabled={disabled}
        value={hour12}
        onChange={(e) => onChange(from12hParts(Number(e.target.value), nearestMinute, period))}
        className={selectClass}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-slate-400 font-pmedium">:</span>
      <select
        aria-label="Minute"
        disabled={disabled}
        value={nearestMinute}
        onChange={(e) => onChange(from12hParts(hour12, Number(e.target.value), period))}
        className={selectClass}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <select
        aria-label="AM or PM"
        disabled={disabled}
        value={period}
        onChange={(e) => onChange(from12hParts(hour12, nearestMinute, e.target.value as "AM" | "PM"))}
        className={selectClass}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
