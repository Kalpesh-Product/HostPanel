import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  ShieldCheck,
  Users,
} from "lucide-react";
import PageFrame from "../../../components/Pages/PageFrame";
import DashboardModuleCard from "../../../components/DashboardModuleCard";
import DonutChart from "../../../components/graphs/DonutChart";
import GroupedBarGraph from "../../../components/graphs/GroupedBarGraph";
import virtualOfficeBannerImage from "../../../assets/coworking-banner.jpg";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import { getVirtualOffices } from "../../../services/virtual-offices";

type PaymentRecord = {
  amount?: number;
  status?: string;
  paymentDate?: string;
  periodStart?: string;
};

type VirtualOfficeRecord = {
  _id?: string;
  recordId?: string;
  recordCode?: string;
  clientName?: string;
  brandName?: string;
  status?: string;
  rentStatus?: string;
  monthlyRent?: number;
  termEnd?: string;
  paymentRecords?: PaymentRecord[];
};

type SummaryRecord = { total?: number; active?: number; overdue?: number; pending?: number };

const DONUT_PALETTE = ["#1E3D73", "#2563EB", "#3b82f6", "#60a5fa", "#93c5fd", "#64748B"];

const dateLabel = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const companyName = (record: VirtualOfficeRecord) => record.clientName || record.brandName || "Unnamed company";

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-6 text-center text-[11px] text-[#7B89A6]">
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  status = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  status?: "default" | "success" | "attention";
}) {
  const statuses = {
    default: "border-l-blue-600 bg-blue-50 text-blue-700",
    success: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
    attention: "border-l-amber-500 bg-amber-50 text-amber-700",
  };
  return (
    <div className="flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200 hover:border-l-blue-600 hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-l-2 ${statuses[status]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">{value}</p>
        {sub ? <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function VirtualOfficesDashboard() {
  const workspacePreferences = useWorkspacePreferences();
  const currency = (value: number) =>
    formatWorkspaceCurrency(Math.round(Number(value || 0)), workspacePreferences.currency, { maximumFractionDigits: 0 });

  const [records, setRecords] = useState<VirtualOfficeRecord[]>([]);
  const [summary, setSummary] = useState<SummaryRecord>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getVirtualOffices({ page: 1, limit: 200 })
      .then((response) => {
        if (cancelled) return;
        const payload = response?.data || {};
        setRecords(Array.isArray(payload.records) ? payload.records : []);
        setSummary(payload.summary || {});
        setLoadError("");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Virtual office records could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const paymentLedger = useMemo(
    () =>
      records.flatMap((record) =>
        (Array.isArray(record.paymentRecords) ? record.paymentRecords : []).map((payment) => ({
          ...payment,
          companyName: companyName(record),
        })),
      ),
    [records],
  );

  const collectionStats = useMemo(() => {
    const paid = paymentLedger.filter((payment) => payment.status === "Paid");
    const pendingOrOverdue = paymentLedger.filter((payment) => payment.status === "Pending" || payment.status === "Overdue");
    return {
      totalCollected: paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      paidCount: paid.length,
      pendingCount: pendingOrOverdue.length,
    };
  }, [paymentLedger]);

  const monthLabels = useMemo(() => {
    const anchor = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - (11 - index), 1);
      return date.toLocaleDateString("en-US", { month: "short" });
    });
  }, []);

  const monthlyCollected = useMemo(() => {
    const anchor = new Date();
    const counts = new Array(12).fill(0);
    paymentLedger.forEach((payment) => {
      if (payment.status !== "Paid") return;
      const date = new Date(String(payment.paymentDate || payment.periodStart || ""));
      if (Number.isNaN(date.getTime())) return;
      const difference = (anchor.getFullYear() - date.getFullYear()) * 12 + anchor.getMonth() - date.getMonth();
      const index = 11 - difference;
      if (index >= 0 && index < 12) counts[index] += Number(payment.amount || 0);
    });
    return counts;
  }, [paymentLedger]);

  const rentStatusBreakdown = useMemo(() => {
    const buckets = { Active: 0, Overdue: 0, Pending: 0, Cancelled: 0 };
    records.forEach((record) => {
      const status = record.rentStatus as keyof typeof buckets;
      if (status && status in buckets) buckets[status] += 1;
    });
    return Object.entries(buckets).filter(([, value]) => value > 0);
  }, [records]);

  const recordStatusBreakdown = useMemo(() => {
    const buckets = { Onboarding: 0, Onboarded: 0, Active: 0, "Expiring Soon": 0, Expired: 0, Cancelled: 0 };
    records.forEach((record) => {
      const status = record.status as keyof typeof buckets;
      if (status && status in buckets) buckets[status] += 1;
    });
    return Object.entries(buckets).filter(([, value]) => value > 0);
  }, [records]);

  const upcomingRenewals = useMemo(
    () =>
      records
        .filter((record) => record.status === "Expiring Soon" || record.status === "Expired")
        .sort((left, right) => new Date(left.termEnd || 0).getTime() - new Date(right.termEnd || 0).getTime())
        .slice(0, 8),
    [records],
  );

  const trendChartOptions = {
    chart: { toolbar: { show: false }, fontFamily: "Poppins-Regular" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "44%" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#EEF2F7" },
    xaxis: { categories: monthLabels },
    colors: ["#1E3D73"],
    stroke: { show: true, width: 2, colors: ["transparent"] },
    tooltip: { theme: "light", y: { formatter: (value: number) => currency(value) } },
    yaxis: { labels: { formatter: (value: number) => currency(value) } },
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-2 font-pmedium text-[12px] text-slate-900 lg:p-2.5">
      <PageFrame>
        <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
          <div className="relative h-44 w-full sm:h-[12rem]">
            <img
              src={virtualOfficeBannerImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-full overflow-hidden bg-gradient-to-br from-[#2563EB]/55 via-[#3b82f6]/35 to-[#60a5fa]/20 sm:w-[64%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
              }}
            >
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
              style={{
                WebkitMaskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
                maskImage: "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
              }}
            />
            <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[58%]">
              <h1 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
                <span className="text-primary">Virtual Offices</span> <span className="text-accent">Dashboard</span>
              </h1>
              <p className="max-w-sm text-[11px] font-pmedium leading-5 text-slate-500">
                Onboarding, rent status, and collections across every virtual-office company.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {["Companies", "Rent", "Collections", "Renewals"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-6 top-5 z-10 rounded-lg border border-white/25 bg-white/15 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-white/75">Total companies</p>
              <p className="mt-0.5 text-[15px] font-pmedium text-white">{summary.total ?? records.length}</p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-pmedium text-amber-800">
            <AlertTriangle size={16} />
            {loadError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, key) => (
              <div key={key} className="h-[112px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile icon={<Building2 size={20} />} label="Total companies" value={summary.total ?? records.length} sub="Every onboarded virtual-office company" />
            <StatTile icon={<ShieldCheck size={20} />} label="Active rents" value={summary.active ?? 0} sub="Companies currently on an active rent" status="success" />
            <StatTile icon={<AlertTriangle size={20} />} label="Overdue rents" value={summary.overdue ?? 0} sub="Rent cycles past due" status={summary.overdue ? "attention" : "success"} />
            <StatTile icon={<Users size={20} />} label="Pending onboarding" value={summary.pending ?? 0} sub="Companies yet to complete onboarding" status={summary.pending ? "attention" : "success"} />
            <StatTile icon={<CheckCircle2 size={20} />} label="Rent collected" value={currency(collectionStats.totalCollected)} sub={`${collectionStats.paidCount} payment records marked paid`} status="success" />
            <StatTile icon={<Clock size={20} />} label="Pending / overdue payments" value={collectionStats.pendingCount} sub="Payment records awaiting collection" status={collectionStats.pendingCount ? "attention" : "success"} />
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3">
            <p className="text-sm font-pmedium text-slate-900">Manage virtual offices</p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">Open the full company list or the rent collections ledger.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DashboardModuleCard
              icon={<Building2 size={19} />}
              title="Virtual Office Companies"
              route="/department-accesses/sales-department/virtual-offices/list"
              state={{ tab: "companies" }}
              description="Onboard and manage companies"
              color="#2563EB"
            />
            <DashboardModuleCard
              icon={<CreditCard size={19} />}
              title="Rent Collections & Payments"
              route="/department-accesses/sales-department/virtual-offices/list"
              state={{ tab: "collections" }}
              description="Record and track rent payments"
              color="#7C3AED"
            />
          </div>
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <ChartCard title="Monthly Rent Collected" subtitle="Payments marked Paid over the last 12 calendar months.">
                <GroupedBarGraph options={trendChartOptions} series={[{ name: "Collected rent", data: monthlyCollected }]} />
              </ChartCard>
              <ChartCard title="Rent Status" subtitle="Every company grouped by current rent status.">
                {rentStatusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Companies"
                    labels={rentStatusBreakdown.map(([label]) => label)}
                    series={rentStatusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, rentStatusBreakdown.length)}
                    tooltipValue={rentStatusBreakdown.map(([, value]) => `${value} companies`)}
                  />
                ) : (
                  <Empty>No rent-status data is available yet.</Empty>
                )}
              </ChartCard>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <ChartCard title="Record Status" subtitle="Every company grouped by onboarding/lifecycle status.">
                {recordStatusBreakdown.length ? (
                  <DonutChart
                    centerLabel="Companies"
                    labels={recordStatusBreakdown.map(([label]) => label)}
                    series={recordStatusBreakdown.map(([, value]) => value)}
                    colors={DONUT_PALETTE.slice(0, recordStatusBreakdown.length)}
                    tooltipValue={recordStatusBreakdown.map(([, value]) => `${value} companies`)}
                    wrapLabels
                  />
                ) : (
                  <Empty>No record-status data is available yet.</Empty>
                )}
              </ChartCard>
              <ChartCard title="Upcoming Renewals" subtitle="Companies expiring soon or already expired, soonest first." bodyClassName="">
                {upcomingRenewals.length ? (
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-pmedium uppercase tracking-[0.06em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Company</th>
                          <th className="px-4 py-3">Term end</th>
                          <th className="px-4 py-3">Monthly rent</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {upcomingRenewals.map((record, index) => (
                          <tr key={record._id || record.recordId || index} className="text-[11px] font-pmedium text-slate-600 transition hover:bg-blue-50/30">
                            <td className="px-5 py-3 text-slate-900">{companyName(record)}</td>
                            <td className="px-4 py-3">{dateLabel(record.termEnd)}</td>
                            <td className="px-4 py-3">{currency(record.monthlyRent || 0)}</td>
                            <td className="px-5 py-3">
                              <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-pmedium text-amber-700">{record.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center text-[11px] font-pmedium text-slate-500">No renewals are due right now.</div>
                )}
              </ChartCard>
            </div>
          </>
        ) : null}
      </PageFrame>
    </div>
  );
}
