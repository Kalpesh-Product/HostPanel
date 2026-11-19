/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import PageFrame from "@/components/Pages/PageFrame";
import { DEFAULT_FISCAL_YEAR } from "@/features/finance/utils/fiscalYear";
import {
  getFinanceIncomeLedger,
  getFinanceRevenueEntries,
  getFinanceSnapshot,
  getPayrollSnapshot,
  getTenantBillingSnapshot,
  getTenantRentRecords,
  getVirtualOfficeRentRecords,
} from "@/services/finance";
import { getMeetingRoomBookings } from "@/services/meeting-room-bookings";
import { getTenantCompanies } from "@/services/tenant-companies";

export type FinanceRow = Record<string, any>;

export type FinanceModuleDashboardData = {
  snapshot: FinanceRow;
  billing: FinanceRow[];
  rents: FinanceRow[];
  virtualOffice: FinanceRow[];
  income: FinanceRow[];
  revenue: FinanceRow[];
  payroll: FinanceRow[];
  bookings: FinanceRow[];
  creditRequests: FinanceRow[];
};

const EMPTY: FinanceModuleDashboardData = {
  snapshot: {},
  billing: [],
  rents: [],
  virtualOffice: [],
  income: [],
  revenue: [],
  payroll: [],
  bookings: [],
  creditRequests: [],
};

export const rows = (value: unknown): FinanceRow[] =>
  Array.isArray(value) ? value : [];
export const numeric = (value: unknown): number =>
  Number(String(value ?? "0").replace(/,/g, "")) || 0;
export const prettyLabel = (value: unknown, fallback = "Pending"): string =>
  String(value || fallback)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const financeStatus = (row: FinanceRow): string =>
  String(
    row.status ||
      row.paymentStatus ||
      row.paidStatus ||
      row.securityDepositPaidStatus ||
      row.currentPeriod?.status ||
      row.payment?.status ||
      row.financials?.paymentStatus ||
      "Pending",
  );
export const financeAmount = (row: FinanceRow): number =>
  numeric(
    row.amount ??
      row.totalAmount ??
      row.receivedAmount ??
      row.paidAmount ??
      row.rentAmount ??
      row.monthlyRent ??
      row.securityDepositAmount ??
      row.netAmount ??
      row.financials?.netSalary ??
      row.netSalary ??
      row.netPayable,
  );
export const financeDate = (row: FinanceRow): string =>
  String(
    row.paymentDate ||
      row.paidAt ||
      row.receivedAt ||
      row.postedAt ||
      row.invoiceDate ||
      row.dueDate ||
      row.createdAt ||
      row.updatedAt ||
      "",
  );
export const isSettled = (value: unknown): boolean =>
  /paid|confirmed|received|processed|complete|approved/i.test(
    String(value || ""),
  );

const normalize = (payload: any, ...keys: string[]): FinanceRow[] => {
  const base = payload?.data?.data ?? payload?.data ?? payload ?? {};
  if (Array.isArray(base)) return base;
  for (const key of keys) if (Array.isArray(base?.[key])) return base[key];
  return [];
};

export function useFinanceModuleDashboardData() {
  const [data, setData] = useState<FinanceModuleDashboardData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError("");
    Promise.allSettled([
      getFinanceSnapshot(DEFAULT_FISCAL_YEAR),
      getTenantBillingSnapshot({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getTenantRentRecords({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getVirtualOfficeRentRecords({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getFinanceIncomeLedger({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getFinanceRevenueEntries({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getPayrollSnapshot(),
      getMeetingRoomBookings({ fiscalYear: DEFAULT_FISCAL_YEAR }),
      getTenantCompanies({ fiscalYear: DEFAULT_FISCAL_YEAR }),
    ]).then((results) => {
      if (cancelled) return;
      const value = (index: number) =>
        results[index].status === "fulfilled"
          ? (results[index] as PromiseFulfilledResult<any>).value
          : {};
      const payrollPayload =
        value(6)?.data?.data ?? value(6)?.data ?? value(6) ?? {};
      const companies = normalize(value(8), "tenants", "companies");
      setData({
        snapshot: value(0) || {},
        billing: normalize(value(1), "tenantBills", "records", "billing"),
        rents: normalize(value(2), "records", "rents"),
        virtualOffice: normalize(value(3), "records", "rents"),
        income: normalize(value(4), "entries", "records"),
        revenue: normalize(value(5), "entries", "records"),
        payroll: rows(
          payrollPayload?.currentCycle?.employees || payrollPayload?.employees,
        ),
        bookings: normalize(value(7), "bookings", "records"),
        creditRequests: companies.flatMap((company) =>
          rows(company.creditRequests).map((request) => ({
            ...request,
            tenantCompanyName: company.companyName || company.name,
          })),
        ),
      });
      if (results.some((result) => result.status === "rejected")) {
        setLoadError(
          "Some finance records could not be refreshed. Available values are shown below.",
        );
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  return { data, isLoading, loadError, refresh };
}

export function FinanceDashboardFrame({
  children,
  loadError,
  onRefresh,
}: {
  children: ReactNode;
  loadError: string;
  onRefresh: () => void;
}) {
  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        {/* <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] uppercase tracking-[0.06em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div> */}
        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <AlertTriangle size={15} /> {loadError}
          </div>
        ) : null}
        {children}
      </PageFrame>
    </div>
  );
}

export function FinanceDashboardLoading() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="h-[112px] animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

export function FinanceDashboardEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[300px] items-center justify-center px-6 text-center text-[11px] text-slate-500">
      {children}
    </div>
  );
}

export const chartBase = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: "Poppins, sans-serif",
  },
  dataLabels: { enabled: false },
  grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
  legend: { position: "top" as const, horizontalAlign: "right" as const },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: "#64748B", fontSize: "10px" } },
  },
  yaxis: { labels: { style: { colors: "#64748B", fontSize: "10px" } } },
};

export function recentRows(source: FinanceRow[], limit = 8): FinanceRow[] {
  return [...source]
    .sort(
      (left, right) =>
        new Date(financeDate(right) || 0).getTime() -
        new Date(financeDate(left) || 0).getTime(),
    )
    .slice(0, limit);
}

export function formatDashboardDate(value: unknown): string {
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not recorded";
}
