// @ts-nocheck
import React from "react";
import ReactApexChart from "react-apexcharts";
import useResponsiveChart from "../../hooks/useResponsiveChart";

const DonutChart = ({
  centerLabel,
  labels,
  colors,
  series,
  tooltipValue,
  handleClick,
  onSliceClick,
  width,
  isMonetary = false,
  wrapLabels = false,
}) => {
  const chartData = {
    series: series,
    labels: labels,
    colors: colors,
  };
  const { chartKey, containerRef } = useResponsiveChart();

  const fullLabels = chartData.labels;

  // Wrap a long label onto multiple lines at word boundaries so legend text
  // fits without shrinking the donut itself.
  const wrapLabel = (label) => {
    const text = String(label ?? "").trim();
    if (text.length <= 12) return text;
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
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

  const truncatedLabels = fullLabels.map((label) =>
    wrapLabels ? wrapLabel(label) : label.length > 7 ? label.slice(0, 15) + "..." : label
  );

  const chartOptions = {
    chart: {
      type: "donut",
      animations : {
        enabled : false
      },
      fontFamily: "Poppins-Regular",
      events: {
        dataPointSelection: (event, chartContext, config) => {
          handleClick?.(); // trigger the click handler
          if (onSliceClick && config?.dataPointIndex !== undefined) {
            const index = config.dataPointIndex;
            onSliceClick?.(index);
          }
        },
      },
    },
    colors: chartData.colors,
    labels: truncatedLabels,
    legend: {
      position: "bottom",
      ...(wrapLabels
        ? { fontSize: "11px", itemMargin: { horizontal: 8, vertical: 2 }, markers: { size: 6 } }
        : {}),
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val.toFixed(0)}%`,
    },
    tooltip: {
      enabled: true,
        custom: function({ seriesIndex }) {
    const fullLabel = chartData.labels[seriesIndex]; // ✅ Full label only
    return `<div style="padding: 8px">
              <strong>${fullLabel}</strong>
            </div>`;
  },
      y: {
        formatter: (val, { seriesIndex }) => `${tooltipValue[seriesIndex]}`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            value: {
              show: true,
              fontSize: "14px",
              fontWeight: 500,
              formatter: function (val) {
                const numericVal = parseFloat(val);
                return isMonetary
                  ? `INR ${numericVal.toLocaleString("en-IN")}`
                  : `${numericVal.toLocaleString("en-IN")}`;
              },
            },
            total: {
              show: true,
              label: `Total ${centerLabel}`,
              fontSize: wrapLabels ? "11px" : "16px",
              fontWeight: "bold",
              formatter: function (w) {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return isMonetary
                  ? `INR ${total.toLocaleString("en-IN")}`
                  : `${total.toLocaleString("en-IN")}`;
              },
            },
          },
        },
      },
    },
    
  };

  return (
    <div className={`rounded-md ${wrapLabels ? "analytics-donut" : ""}`} ref={containerRef}>
      {wrapLabels ? (
        <style>{`
          .analytics-donut .apexcharts-legend-text {
            white-space: pre-line !important;
            word-break: break-word;
            line-height: 1.25;
            text-align: center;
          }
        `}</style>
      ) : null}
      <ReactApexChart
        key={chartKey}
        options={chartOptions}
        series={chartData.series}
        type="donut"
        height={320}
        width={width || "100%"}
      />
    </div>
  );
};

export default DonutChart;

