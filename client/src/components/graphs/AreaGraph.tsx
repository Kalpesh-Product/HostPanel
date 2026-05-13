import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import SecondaryButton from "../SecondaryButton";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type TimeFilter = "Yearly" | "Monthly" | "Weekly";

interface TicketRecord {
  createdAt: string;
  status: string;
}

interface GraphSeriesItem {
  name: string;
  data: number[];
}

interface GraphState {
  series: GraphSeriesItem[];
  categories: string[];
}

interface AreaGraphProps {
  responseData: TicketRecord[];
  onTotalChange?: (total: number) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  onDateLabelChange?: (label: string) => void;
}

const chartColors = ["#007bff", "#28a745", "#ff4d4d"];

const createEmptySeries = (length: number): GraphSeriesItem[] => [
  { name: "Total Tickets", data: Array(length).fill(0) },
  { name: "Closed Tickets", data: Array(length).fill(0) },
  { name: "Open Tickets", data: Array(length).fill(0) },
];

const AreaGraph = ({
  responseData,
  onTotalChange,
  timeFilter,
  setTimeFilter,
  onDateLabelChange,
}: AreaGraphProps) => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<GraphState>({
    series: createEmptySeries(3),
    categories: [],
  });

  const transformData = (
    tickets: TicketRecord[],
    filter: TimeFilter,
    selectedDate: Dayjs
  ): GraphState => {
    const isBeforeApril = selectedDate.month() < 3;
    const fyStartYear = isBeforeApril ? selectedDate.year() - 1 : selectedDate.year();
    const fyStart = dayjs(`${fyStartYear}-04-01`);
    const fyEnd = fyStart.add(1, "year").subtract(1, "day");
    const daysInMonth = selectedDate.daysInMonth();
    const monthlySeriesTemplate: GraphSeriesItem[] = createEmptySeries(daysInMonth);
    const monthlyCategories = Array.from({ length: daysInMonth }, (_, index) =>
      String(index + 1).padStart(2, "0")
    );

    const transformed: Record<TimeFilter, GraphState> = {
      Yearly: {
        series: createEmptySeries(12),
        categories: [
          "Apr-25",
          "May-25",
          "Jun-25",
          "Jul-25",
          "Aug-25",
          "Sep-25",
          "Oct-25",
          "Nov-25",
          "Dec-25",
          "Jan-26",
          "Feb-26",
          "Mar-26",
        ],
      },
      Monthly: {
        series: monthlySeriesTemplate,
        categories: monthlyCategories,
      },
      Weekly: {
        series: createEmptySeries(7),
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
    };

    tickets.forEach((ticket) => {
      const createdAt = dayjs(ticket.createdAt);

      if (filter === "Yearly") {
        if (!(createdAt.isSameOrAfter(fyStart) && createdAt.isSameOrBefore(fyEnd))) {
          return;
        }
      }

      if (filter === "Monthly") {
        if (
          createdAt.year() !== selectedDate.year() ||
          createdAt.month() !== selectedDate.month()
        ) {
          return;
        }
      }

      if (filter === "Weekly") {
        const startOfWeek = selectedDate.startOf("week");
        const endOfWeek = selectedDate.endOf("week");
        if (!(createdAt.isSameOrAfter(startOfWeek) && createdAt.isSameOrBefore(endOfWeek))) {
          return;
        }
      }

      let categoryIndex: number | null = null;

      if (filter === "Yearly") {
        const month = createdAt.month();
        categoryIndex = (month + 12 - 3) % 12;
      } else if (filter === "Monthly") {
        categoryIndex = createdAt.date() - 1;
      } else if (filter === "Weekly") {
        categoryIndex = (createdAt.day() + 6) % 7;
      }

      if (categoryIndex !== null) {
        transformed[filter].series[0].data[categoryIndex] += 1;
        if (ticket.status === "Closed") {
          transformed[filter].series[1].data[categoryIndex] += 1;
        } else if (ticket.status === "Open") {
          transformed[filter].series[2].data[categoryIndex] += 1;
        }
      }
    });

    return transformed[filter];
  };

  useEffect(() => {
    const transformedData = transformData(responseData, timeFilter, currentDate);
    setData(transformedData);

    if (onTotalChange && transformedData?.series?.[0]?.data) {
      const total = transformedData.series[0].data.reduce((sum, val) => sum + val, 0);
      onTotalChange(total);
    }
  }, [responseData, timeFilter, currentDate, onTotalChange]);

  useEffect(() => {
    const transformedData = transformData(responseData, timeFilter, currentDate);
    setData(transformedData);

    if (onTotalChange && transformedData?.series?.[0]?.data) {
      const total = transformedData.series[0].data.reduce((sum, val) => sum + val, 0);
      onTotalChange(total);
    }

    let label = "";
    if (timeFilter === "Yearly") {
      const fyStart = currentDate.month() < 3 ? currentDate.year() - 1 : currentDate.year();
      const fyEnd = fyStart + 1;
      label = `FY ${fyStart}-${String(fyEnd).slice(-2)}`;
    } else if (timeFilter === "Monthly") {
      label = currentDate.format("MMMM YYYY");
    } else if (timeFilter === "Weekly") {
      label = `Week ${Math.ceil(currentDate.date() / 7)} - ${currentDate.format("MMMM")}`;
    }

    if (onDateLabelChange) {
      onDateLabelChange(label);
    }
  }, [responseData, timeFilter, currentDate, onDateLabelChange, onTotalChange]);

  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 350,
      fontFamily: "Poppins-Regular",
      zoom: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      scrollable: false,
    },
    colors: chartColors,
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: data.categories,
    },
    yaxis: {
      min: 0,
      tickAmount: timeFilter === "Yearly" ? 3 : 5,
      labels: {
        formatter: (val: number) => val.toFixed(0),
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor: "#f1f1f1",
    },
  };

  return (
    <div className="rounded-md p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-title font-pregular"></h2>

        <div className="flex gap-2">
          {(["Yearly", "Monthly", "Weekly"] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              className={`rounded px-4 py-2 text-sm font-medium ${
                timeFilter === filter ? "bg-primary text-white" : "bg-gray-200 text-black"
              }`}
              onClick={() => setTimeFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <Chart options={chartOptions} series={data.series} type="area" height={350} />

      <div className="flex w-full items-center justify-center gap-2">
        <SecondaryButton
          title={<MdNavigateBefore />}
          handleSubmit={() => {
            if (timeFilter === "Yearly") {
              setCurrentDate((prev) => prev.subtract(1, "year"));
            } else if (timeFilter === "Monthly") {
              setCurrentDate((prev) => prev.subtract(1, "month"));
            } else if (timeFilter === "Weekly") {
              setCurrentDate((prev) => prev.subtract(1, "week"));
            }
          }}
        />

        <span className="text-sm font-medium text-gray-700">
          {timeFilter === "Yearly" &&
            `FY ${
              currentDate.month() < 3 ? currentDate.year() - 1 : currentDate.year()
            }-${(currentDate.month() < 3 ? currentDate.year() : currentDate.year() + 1)
              .toString()
              .slice(-2)}`}

          {timeFilter === "Monthly" && currentDate.format("MMMM YYYY")}
          {timeFilter === "Weekly" &&
            `Week ${Math.ceil(currentDate.date() / 7)} - ${currentDate.format("MMMM")}`}
        </span>

        <SecondaryButton
          title={<MdNavigateNext />}
          handleSubmit={() => {
            if (timeFilter === "Yearly") {
              setCurrentDate((prev) => prev.add(1, "year"));
            } else if (timeFilter === "Monthly") {
              setCurrentDate((prev) => prev.add(1, "month"));
            } else if (timeFilter === "Weekly") {
              setCurrentDate((prev) => prev.add(1, "week"));
            }
          }}
        />
      </div>
    </div>
  );
};

export default AreaGraph;