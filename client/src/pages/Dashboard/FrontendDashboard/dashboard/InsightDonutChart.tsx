// @ts-nocheck
/**
 * InsightDonutChart — the donut (pie) chart used across the manager dashboards,
 * built with the same ApexCharts configuration as the master panel's destination
 * analytics: 67% hole, no separators, data labels, a labelled centre total and
 * a legend that shows each segment's value and share.
 *
 * The prop contract mirrors the original `DonutChart` component exactly, so any
 * dashboard or shared widget can switch to this renderer by changing only its
 * import — including the `wrapLabels`, `isMonetary`, `width` and click props.
 */
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import useResponsiveChart from "@/hooks/useResponsiveChart";

type InsightDonutChartProps = {
  centerLabel?: string;
  labels?: string[];
  colors?: string[];
  series?: number[];
  tooltipValue?: string[];
  handleClick?: () => void;
  onSliceClick?: (index: number) => void;
  width?: number | string;
  isMonetary?: boolean;
  wrapLabels?: boolean;
};

const DEFAULT_COLORS = [
  "#2563EB",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
];

const InsightDonutChart = ({
  centerLabel = "Total",
  labels = [],
  colors = [],
  series = [],
  tooltipValue,
  handleClick,
  onSliceClick,
  width,
  isMonetary = false,
  wrapLabels = false,
}: InsightDonutChartProps) => {
  const { chartKey, containerRef } = useResponsiveChart();

  const formatNumber = (value: number) =>
    isMonetary
      ? `INR ${value.toLocaleString("en-IN")}`
      : value.toLocaleString("en-IN");

  const wrapLabel = (label: string) => {
    const text = String(label ?? "").trim();
    if (!wrapLabels || text.length <= 12) return text;
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= 12) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.join("\n");
  };

  const options = useMemo(() => {
    const palette = colors.length ? colors : DEFAULT_COLORS;
    const displayLabels = labels.map((label) => wrapLabel(String(label)));

    return {
      chart: {
        type: "donut",
        fontFamily: "Poppins-SemiBold, sans-serif",
        toolbar: { show: false },
        animations: { enabled: false },
        events: {
          dataPointSelection: (_event: unknown, _ctx: unknown, config: any) => {
            handleClick?.();
            if (onSliceClick && config?.dataPointIndex !== undefined) {
              onSliceClick(config.dataPointIndex);
            }
          },
        },
      },
      labels: displayLabels,
      colors: palette,
      stroke: { width: 0 },
      dataLabels: {
        enabled: true,
        style: { fontFamily: "Poppins-SemiBold, sans-serif", fontSize: "10px" },
        dropShadow: { enabled: false },
      },
      legend: {
        position: "bottom",
        fontFamily: "Poppins-SemiBold, sans-serif",
        fontSize: wrapLabels ? "10px" : "10px",
        itemMargin: wrapLabels
          ? { horizontal: 8, vertical: 3 }
          : { horizontal: 6, vertical: 2 },
        markers: { size: 6 },
        formatter: (seriesName: string, opts: any) => {
          const index = opts?.seriesIndex ?? labels.findIndex(
            (label) => wrapLabel(String(label)) === seriesName,
          );
          const fromGlobals = Number(opts?.w?.globals?.series?.[index] ?? 0);
          const value = fromGlobals || Number(series[index] ?? 0);
          const grandTotal = series.reduce(
            (sum, entry) => sum + Number(entry || 0),
            0,
          );
          const share = grandTotal ? Math.round((value / grandTotal) * 100) : 0;
          return `${seriesName.replace(/\n/g, " ")}  ${formatNumber(value)} (${share}%)`;
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "67%",
            labels: {
              show: true,
              name: {
                fontSize: "11px",
                fontFamily: "Poppins-SemiBold, sans-serif",
              },
              value: {
                fontSize: "15px",
                fontFamily: "Poppins-SemiBold, sans-serif",
                formatter: (value: string) => formatNumber(Number(value || 0)),
              },
              total: {
                show: true,
                label: `Total ${centerLabel}`,
                fontSize: "11px",
                fontFamily: "Poppins-SemiBold, sans-serif",
                formatter: (w: any) =>
                  formatNumber(
                    Number(
                      (w?.globals?.seriesTotals ?? []).reduce(
                        (sum: number, entry: number) => sum + Number(entry || 0),
                        0,
                      ),
                    ),
                  ),
              },
            },
          },
        },
      },
      tooltip: {
        theme: "light",
        y: {
          formatter: (value: number, ctx: { seriesIndex?: number }) => {
            const index = ctx?.seriesIndex ?? 0;
            return tooltipValue?.[index] ?? formatNumber(value);
          },
        },
      },
      noData: { text: `No ${centerLabel} yet` },
    };
  }, [
    labels,
    colors,
    centerLabel,
    tooltipValue,
    wrapLabels,
    isMonetary,
    handleClick,
    onSliceClick,
    series,
  ]);

  return (
    <div
      className={`w-full ${wrapLabels ? "insight-donut-wrap" : ""}`}
      ref={containerRef}
    >
      {wrapLabels ? (
        <style>{`
          .insight-donut-wrap .apexcharts-legend-text {
            white-space: pre-line !important;
            line-height: 1.25;
            text-align: center;
          }
        `}</style>
      ) : null}
      <ReactApexChart
        key={chartKey}
        options={options}
        series={series}
        type="donut"
        height={290}
        width={width || "100%"}
      />
    </div>
  );
};

export default InsightDonutChart;
