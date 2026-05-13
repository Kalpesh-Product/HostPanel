// @ts-nocheck
import { useState } from "react";
import { TextField, Select, MenuItem, FormControl } from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import AllocatedBudget from "./Tables/AllocatedBudget";
import { inrFormat } from "../utils/currencyFormat";
import DataCard from "./DataCard";
import BudgetGraph from "./graphs/BudgetGraph";
import WidgetSection from "../components/WidgetSection";
import PrimaryButton from "../components/PrimaryButton";
import MuiModal from "../components/MuiModal";

interface BudgetDisplayProps {
  budgetData?: Array<any>;
}

const BudgetDisplay = ({ budgetData = [] }: BudgetDisplayProps) => {
  const [openModal, setOpenModal] = useState(false);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      expanseName: "",
      expanseType: "",
      amount: "",
      dueDate: null,
    },
  });

  const onSubmit = () => {
    setOpenModal(false);
    reset();
  };

  const groupedData = budgetData.reduce((acc: Record<string, any>, item: any) => {
    const month = dayjs(item.dueDate).format("MMMM YYYY");

    if (!acc[month]) {
      acc[month] = {
        month,
        latestDueDate: item.dueDate,
        projectedAmount: 0,
        amount: 0,
        tableData: {
          rows: [],
          columns: [
            { field: "expanseName", headerName: "Expense Name", flex: 1 },
            { field: "expanseType", headerName: "Expense Type", flex: 1 },
            { field: "projectedAmount", headerName: "Amount", flex: 1 },
            { field: "dueDate", headerName: "Due Date", flex: 1 },
            { field: "status", headerName: "Status", flex: 1 },
          ],
        },
      };
    }

    acc[month].projectedAmount += item.projectedAmount;
    acc[month].amount += item.projectedAmount;
    acc[month].tableData.rows.push({
      id: item._id,
      expanseName: item.expanseName,
      department: item.department,
      expanseType: item.expanseType,
      projectedAmount: item.projectedAmount.toFixed(2),
      dueDate: dayjs(item.dueDate).format("DD-MM-YYYY"),
      status: item.status,
    });

    return acc;
  }, {});

  const financialData = Object.values(groupedData)
    .map((data: any) => {
      const transoformedRows = data.tableData.rows.map((row: any, index: number) => ({
        ...row,
        srNo: index + 1,
        projectedAmount: Number(
          row.projectedAmount.toLocaleString("en-IN").replace(/,/g, ""),
        ).toLocaleString("en-IN", { maximumFractionDigits: 0 }),
      }));
      const transformedCols = [
        { field: "srNo", headerName: "SR NO", flex: 1 },
        ...data.tableData.columns,
      ];

      return {
        ...data,
        projectedAmount: data.projectedAmount.toLocaleString("en-IN"),
        amount: data.amount.toLocaleString("en-IN"),
        tableData: {
          ...data.tableData,
          rows: transoformedRows,
          columns: transformedCols,
        },
      };
    })
    .sort((a: any, b: any) => dayjs(b.latestDueDate).diff(dayjs(a.latestDueDate)));

  const utilisedData = [
    125000, 150000, 99000, 85000, 70000, 50000, 80000, 95000, 100000, 65000,
    50000, 120000,
  ];

  const maxBudget = [
    100000, 120000, 100000, 100000, 80000, 60000, 85000, 95000, 100000, 70000,
    60000, 110000,
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <WidgetSection border layout={1} title={"BUDGET 2024-25"}>
          <BudgetGraph utilisedData={utilisedData} maxBudget={maxBudget} />
        </WidgetSection>
      </div>
      <WidgetSection layout={3} padding>
        <DataCard
          data={"INR " + inrFormat("4000000")}
          title={"Projected"}
          route={"/app/dashboard/it-dashboard/finance/budget"}
          description={`Current Month: ${new Date().toLocaleString("default", {
            month: "short",
          })}-25`}
        />
        <DataCard
          data={"INR " + inrFormat("3500000")}
          title={"Actual"}
          route={"/app/dashboard/it-dashboard/finance/budget"}
          description={`Current Month: ${new Date().toLocaleString("default", {
            month: "short",
          })}-25`}
        />
        <DataCard
          data={"INR " + inrFormat(60000)}
          title={"Requested"}
          route={"/app/dashboard/it-dashboard/finance/budget"}
          description={`Current Month: ${new Date().toLocaleString("default", {
            month: "short",
          })}-25`}
        />
      </WidgetSection>

      <div className="flex justify-end">
        <PrimaryButton
          title={"Request Budget"}
          padding="px-5 py-2"
          fontSize="text-base"
          handleSubmit={() => setOpenModal(true)}
        />
      </div>

      <AllocatedBudget financialData={financialData} />
      <MuiModal
        title="Request Budget"
        open={openModal}
        onClose={() => setOpenModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="expanseName"
            control={control}
            rules={{ required: "Expense name is required" }}
            render={({ field, fieldState }: any) => (
              <TextField
                {...field}
                label="Expense Name"
                fullWidth
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="expanseType"
            control={control}
            rules={{ required: "Expense type is required" }}
            render={({ field, fieldState }: any) => (
              <FormControl fullWidth error={!!fieldState.error}>
                <Select {...field} size="small" displayEmpty>
                  <MenuItem value="" disabled>
                    Select Expense Type
                  </MenuItem>
                  <MenuItem value="Internal">Internal</MenuItem>
                  <MenuItem value="External">External</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="amount"
            control={control}
            rules={{
              required: "Amount is required",
              pattern: {
                value: /^[0-9]+(\.[0-9]{1,2})?$/,
                message: "Enter a valid amount",
              },
            }}
            render={({ field, fieldState }: any) => (
              <TextField
                {...field}
                label="Amount"
                fullWidth
                size="small"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="dueDate"
            control={control}
            rules={{ required: "Due date is required" }}
            render={({ field, fieldState }: any) => (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  {...field}
                  label="Due Date"
                  format="DD-MM-YYYY"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date: any) =>
                    field.onChange(date ? date.toISOString() : null)
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message,
                    },
                  }}
                />
              </LocalizationProvider>
            )}
          />
          <div className="flex justify-center items-center">
            <PrimaryButton type={"submit"} title={"Submit"} />
          </div>
        </form>
      </MuiModal>
    </div>
  );
};

export default BudgetDisplay;
