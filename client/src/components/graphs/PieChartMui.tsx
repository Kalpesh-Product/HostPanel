import { useMemo, type ReactNode } from "react";
import ReactApexChart from "react-apexcharts";
import useResponsiveChart from "../../hooks/useResponsiveChart";

interface PieChartItem {
  value: string | number;
  [key: string]: any;
}

interface PieChartMuiProps {
  data: PieChartItem[];
  options: any;
  width?: number;
  height?: number;
  customLegend?: ReactNode;
}

const PieChartMui = ({
  data,
  options,
  width = 320,
  height = 320,
  customLegend,
}: PieChartMuiProps) => {
  const chartData = useMemo(() => data.map((item) => parseFloat(String(item.value))), [data]);
  const { containerRef, chartKey } = useResponsiveChart();

  const updatedOptions = {
    ...options,
    chart: {
      ...options.chart,
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    legend: {
      ...options.legend,
      position: "bottom",
    },
  };

  return (
    <div className="w-full flex flex-col justify-between " style={{ height, width }}>
      <div
        ref={containerRef}
        style={{ flex: 1 }}
        className={customLegend ? "flex gap-20 overflow-x-scroll" : ""}
      >
        <ReactApexChart
          key={chartKey}
          options={updatedOptions}
          series={chartData}
          type="pie"
          height={height - 20}
        />
        {customLegend && (
          <div>
            <div className="w-full flex justify-between">{customLegend}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PieChartMui;