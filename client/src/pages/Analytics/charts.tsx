// Ported from Master Panel's client/src/pages/Dashboard/MainDashboard/charts/charts.jsx
// (WoNoMasterPanel repo) so this Analytics page's tiles read as the same
// bespoke chart system Master Panel's own Dashboard uses, instead of the
// ApexCharts-based BarGraph/DonutChart wrappers used elsewhere in this app.
import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";

export interface ChartRow {
  label: string;
  value: number;
  color?: string;
}

const CHART_COLORS = [
  "#2563EB",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
];

const percentOf = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

export const ChartCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-full">
    <p className="text-[11px] font-pmedium text-slate-400 uppercase tracking-widest mb-5">{title}</p>
    {children}
  </div>
);

const Tooltip = ({
  x,
  y,
  label,
  value,
  total,
}: {
  x: number;
  y: number;
  label?: string;
  value?: number | string;
  total: number;
}) => {
  if (label == null) return null;
  return (
    <div
      className="absolute z-20 pointer-events-none rounded-xl bg-slate-900 text-white text-[11px] font-pmedium px-3 py-1.5 shadow-lg whitespace-nowrap"
      style={{ left: x, top: y, transform: "translate(-50%, -135%)" }}
    >
      <span className="text-slate-400">{label}: </span>
      <span>{typeof value === "number" ? value.toLocaleString("en-US") : value}</span>
      {total > 0 && typeof value === "number" ? (
        <span className="text-blue-300"> ({percentOf(value, total)}%)</span>
      ) : null}
    </div>
  );
};

const ChartFooter = ({ total, detail }: { total: number; detail: ChartRow | null }) => (
  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] font-pmedium">
    <span className="text-[10px] text-slate-400 uppercase tracking-widest shrink-0">
      Total {total.toLocaleString("en-US")}
    </span>
    {detail ? (
      <span className="text-slate-600 text-right">
        <span className="text-slate-400">{detail.label}: </span>
        <span className="text-[#2563EB]">{detail.value.toLocaleString("en-US")}</span>
        <span className="text-slate-400"> ({percentOf(detail.value, total)}%)</span>
      </span>
    ) : (
      <span className="text-slate-300">Click a segment to see its share</span>
    )}
  </div>
);

export const BarDiagram = ({ bars, title = "Bar Diagram" }: { bars: ChartRow[]; title?: string }) => {
  const items = Array.isArray(bars) ? bars : [];
  const total = items.reduce((sum, b) => sum + (Number(b.value) || 0), 0);
  const max = Math.max(...items.map((b) => b.value), 1);
  const [active, setActive] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const selectedItem = selected != null ? items[selected] : null;

  return (
    <ChartCard title={title}>
      <div className="relative flex-1 min-h-[10rem]" onMouseMove={handleMove} onMouseLeave={() => setActive(null)}>
        <div className="flex h-full items-end gap-3">
          {items.map((bar, i) => {
            const isActive = active === i;
            const isSelected = selected === i;
            const isTop = bar.value === max && max > 0;
            const heightPct = Math.max(3, Math.round((bar.value / max) * 100));
            return (
              <div
                key={`${bar.label}-${i}`}
                className="flex h-full flex-1 flex-col items-center cursor-pointer"
                onMouseEnter={() => setActive(i)}
                onClick={() => setSelected((prev) => (prev === i ? null : i))}
              >
                <div className="relative flex-1 w-full flex items-end justify-center">
                  <span
                    className={`absolute text-[10px] font-pmedium transition-colors ${
                      isActive || isSelected ? "text-slate-700" : "text-slate-400"
                    }`}
                    style={{ bottom: `calc(${heightPct}% + 4px)` }}
                  >
                    {bar.value}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isActive || isSelected ? "bg-[#2563EB]" : isTop ? "bg-primary" : "bg-[#2563EB]/70"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-pmedium text-slate-400 truncate max-w-full shrink-0" title={bar.label}>
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
        {active != null && items[active] && <Tooltip x={pos.x} y={pos.y} label={items[active].label} value={items[active].value} total={total} />}
      </div>
      <ChartFooter total={total} detail={selectedItem} />
    </ChartCard>
  );
};

const polarPoint = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.sin(angle),
  y: cy - radius * Math.cos(angle),
});

const donutSlice = (cx: number, cy: number, outer: number, inner: number, startAngle: number, endAngle: number) => {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p0o = polarPoint(cx, cy, outer, startAngle);
  const p0i = polarPoint(cx, cy, inner, startAngle);
  const p1i = polarPoint(cx, cy, inner, endAngle);
  const p1o = polarPoint(cx, cy, outer, endAngle);
  return [
    `M ${p0o.x} ${p0o.y}`,
    `L ${p0i.x} ${p0i.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 1 ${p1i.x} ${p1i.y}`,
    `L ${p1o.x} ${p1o.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 0 ${p0o.x} ${p0o.y}`,
    "Z",
  ].join(" ");
};

export const DistributionDonut = ({ data, title = "Distribution" }: { data: ChartRow[]; title?: string }) => {
  const items = (Array.isArray(data) ? data : []).map((d, i) => ({
    ...d,
    color: d.color || CHART_COLORS[i % CHART_COLORS.length],
  }));
  const total = items.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const cx = 120;
  const cy = 120;
  const outerR = 100;
  const innerR = 62;

  const segments: { item: (typeof items)[number]; start: number; end: number }[] = [];
  let acc = 0;
  items.forEach((item) => {
    const start = acc;
    const sweep = total ? (Number(item.value) || 0) / total : 0;
    acc += sweep * Math.PI * 2;
    segments.push({ item, start, end: acc });
  });

  const selectedItem = selected != null ? items[selected] : null;

  return (
    <ChartCard title={title}>
      <div
        className="relative flex-1 min-h-[12rem] flex flex-col justify-center"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <div className="flex justify-center">
          <svg viewBox="0 0 240 240" className="w-full max-w-[230px]">
            {items.length === 1 ? (
              <g>
                <circle cx={cx} cy={cy} r={outerR} fill={items[0].color} stroke="#fff" strokeWidth={3} />
                <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
              </g>
            ) : (
              segments.map(({ item, start, end }, i) => {
                const isHover = hover === i;
                const isSelected = selected === i;
                const dimmed = hover != null && !isHover;
                const emphasis = isHover || isSelected;
                return (
                  <path
                    key={`${item.label}-${i}`}
                    d={donutSlice(cx, cy, emphasis ? outerR + 6 : outerR, emphasis ? innerR + 4 : innerR, start, end)}
                    fill={item.color}
                    fillOpacity={dimmed ? 0.4 : 1}
                    stroke="#fff"
                    strokeWidth={2}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setSelected((prev) => (prev === i ? null : i))}
                  />
                );
              })
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {selectedItem ? (
              <>
                <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest max-w-[110px] text-center">
                  {selectedItem.label}
                </span>
                <span className="text-xl font-pmedium text-slate-900">{percentOf(selectedItem.value, total)}%</span>
                <span className="text-[10px] font-pmedium text-slate-400">{selectedItem.value.toLocaleString("en-US")}</span>
              </>
            ) : (
              <>
                <span className="text-xl font-pmedium text-slate-900">{total.toLocaleString("en-US")}</span>
                <span className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Total</span>
              </>
            )}
          </div>
        </div>
        {hover != null && segments[hover] && (
          <Tooltip x={pos.x} y={pos.y} label={segments[hover].item.label} value={segments[hover].item.value} total={total} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
        {items.map((d, i) => (
          <button
            key={d.label}
            type="button"
            onClick={() => setSelected((prev) => (prev === i ? null : i))}
            className={`flex items-center gap-1.5 text-[11px] font-pmedium rounded-full px-2 py-1 transition-colors ${
              selected === i ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
            <span className="text-slate-400">
              {d.value.toLocaleString("en-US")} ({percentOf(d.value, total)}%)
            </span>
          </button>
        ))}
      </div>
    </ChartCard>
  );
};
