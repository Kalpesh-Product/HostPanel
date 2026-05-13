import { useState } from "react";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import dayjs from "dayjs";
import MuiModal from "../MuiModal";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import humanDate from "../../utils/humanDateForamt";
import DetalisFormatted from "../DetalisFormatted";
import usePageDepartment from "../../hooks/usePageDepartment";
import { inrFormat } from "../../utils/currencyFormat";

const PaymentScheduleCommon = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const department = usePageDepartment();

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedEvent(null);
  };
  const axios = useAxiosPrivate();

  const { data: financePayment = [] } = useQuery({
    queryKey: ["paymentSchedule"],
    queryFn: async () => {
      try {
        const response = await axios.get(`/api/budget/company-budget?departmentId=${department?._id}`);
        const budgets = response.data.allBudgets;

        return Array.isArray(budgets)
          ? budgets.map((item: any) => ({
              title: item.expanseName || "Untitled",
              date: item.dueDate,
              actualAmount: item.actualAmount,
              projectedAmount: item.projectedAmount,
              status: item.status === "Approved" ? "paid" : "unpaid",
              expanseType: item.expanseType,
              invoiceAttached: item.invoiceAttached,
              unitName: item.unit?.unitName,
              unitNo: item.unit?.unitNo,
              buildingName: item.unit?.building?.buildingName,
              department: item.department?.name,
              unit: item.unit,
            }))
          : [];
      } catch (error) {
        console.error("Error fetching budget:", error);
        return [];
      }
    },
  });

  const statusColorMap: Record<string, string> = {
    paid: "#28a745",
    unpaid: "#dc3545",
  };

  const [statusFilters, setStatusFilters] = useState(["paid", "unpaid"]);

  const events = financePayment.map((payment: any) => ({
    title: payment.title,
    start: payment.date,
    backgroundColor: statusColorMap[payment.status],
    borderColor: statusColorMap[payment.status],
    extendedProps: {
      amount: payment.projectedAmount,
      status: payment.status,
      expanseName: payment.expanseName,
      dueDate: payment.dueDate,
      projectedAmount: payment.projectedAmount,
      expanseType: payment.expanseType,
      invoiceAttached: payment.invoiceAttached,
      unitName: payment.unit?.unitName,
      unitNo: payment.unit?.unitNo,
      buildingName: payment.unit?.building?.buildingName,
      department: payment.department,
      unit: payment.unit,
    },
  }));

  const filteredEvents = events.filter((event: any) =>
    statusFilters.includes(event.extendedProps.status),
  );

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex flex-col bg-white">
      <div className="flex gap-4">
        <div className="flex flex-col gap-4 w-[25%]">
          <div className="border-2 border-gray-300 rounded-md">
            <div className="w-full flex justify-start border-b-default border-borderGray p-2">
              <span className="text-content font-bold uppercase">Payment Status</span>
            </div>
            <div className="flex justify-start text-content px-2">
              <FormGroup column>
                {(["paid", "unpaid"] as const).map((status) => (
                  <FormControlLabel
                    key={status}
                    control={
                      <Checkbox
                        sx={{
                          fontSize: "0.75rem",
                          transform: "scale(0.8)",
                          color: statusColorMap[status],
                          "&.Mui-checked": { color: statusColorMap[status] },
                        }}
                        checked={statusFilters.includes(status)}
                        onChange={(e) => {
                          const selectedStatus = e.target.value;
                          setStatusFilters((prev) =>
                            e.target.checked
                              ? [...prev, selectedStatus]
                              : prev.filter((s) => s !== selectedStatus),
                          );
                        }}
                        value={status}
                      />
                    }
                    label={
                      <span style={{ fontSize: "0.875rem", fontWeight: "bold", textTransform: "capitalize" }}>
                        {status}
                      </span>
                    }
                  />
                ))}
              </FormGroup>
            </div>
          </div>

          <div className="border-2 border-gray-300 rounded-md">
            <div className="mb-2 text-content font-bold uppercase border-b-default border-borderGray p-2">
              <span>Today's Payments</span>
            </div>

            <div className="px-2 max-h-[33.5vh] overflow-y-auto">
              {filteredEvents.filter((e: any) => dayjs(e.start).isSame(dayjs(), "day")).length > 0 ? (
                filteredEvents
                  .filter((e: any) => dayjs(e.start).isSame(dayjs(), "day"))
                  .map((event: any, index: number) => (
                    <div key={index} className="flex gap-2 items-start mb-2">
                      <div className="w-3 h-3 rounded-full mt-[0.3rem]" style={{ backgroundColor: event.backgroundColor }} />
                      <div className="flex flex-col">
                        <span className="text-content font-medium">{event.title}</span>
                        <span className="text-small text-gray-500">
                          {event.start ? dayjs(event.start).format("h:mm A") : "All Day"}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">No payments today.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full h-full overflow-y-auto">{/* calendar omitted in this TSX skeleton? */}</div>
      </div>

      <MuiModal
        open={isDrawerOpen}
        onClose={closeDrawer}
        title="Payment Details"
        headerBackground={selectedEvent ? statusColorMap[selectedEvent.extendedProps.status] : ""}
      >
        {selectedEvent && (
          <div className="flex flex-col gap-3">
            <div className="font-bold">General Information</div>
            <DetalisFormatted title="Title" detail={selectedEvent.title} />
            <DetalisFormatted title="Date" detail={humanDate(selectedEvent.start)} />
            <DetalisFormatted title="Status" detail={selectedEvent.extendedProps.status} upperCase />
            <br />
            <div className="font-bold">Financials</div>
            <DetalisFormatted
              title="Projected Amount"
              detail={selectedEvent.extendedProps.projectedAmount ? `INR ${inrFormat(selectedEvent.extendedProps.projectedAmount)}` : "Not Available"}
            />
            <DetalisFormatted
              title="Actual Amount"
              detail={selectedEvent.extendedProps.amount ? `INR ${inrFormat(selectedEvent.extendedProps.amount)}` : "Not Available"}
            />
            <DetalisFormatted title="Expense Type" detail={selectedEvent.extendedProps.expanseType || "Not Available"} />
            <br />
            <div className="font-bold">Location & Department</div>
            <DetalisFormatted title="Unit No" detail={selectedEvent.extendedProps.unit?.unitNo || selectedEvent.extendedProps.unitNo || "Not Available"} />
            <DetalisFormatted title="Department" detail={selectedEvent.extendedProps.department?.name || selectedEvent.extendedProps.department || "Not Available"} />
            <DetalisFormatted title="Building" detail={selectedEvent.extendedProps.unit?.building?.buildingName || "Not Available"} />
          </div>
        )}
      </MuiModal>
    </div>
  );
};

export default PaymentScheduleCommon;