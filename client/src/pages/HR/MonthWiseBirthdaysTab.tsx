import React, { useMemo, useState } from "react";
import {
  Cake, CalendarDays, Gift, Search, Users, Sparkles, Clock, UserCheck,
} from "lucide-react";

/* ───────────────────────────── Types ───────────────────────────── */

export interface BirthdayEmployee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  dateOfBirth: string;
  statusKey: string;
}

interface MonthWiseBirthdaysTabProps {
  employees: BirthdayEmployee[];
}

/* ───────────────────────────── Constants ───────────────────────────── */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_TABS = [
  { key: "all", label: "All Months" },
  ...MONTH_NAMES.map((name, index) => ({ key: String(index + 1), label: name })),
];

/* ───────────────────────────── Helpers ───────────────────────────── */

interface ParsedBirthday {
  employee: BirthdayEmployee;
  month: number;
  day: number;
  year: number;
  age: number;
  status: "today" | "upcoming" | "completed";
}

function parseBirthday(employee: BirthdayEmployee, now: Date): ParsedBirthday | null {
  const dob = String(employee.dateOfBirth || "").trim();
  if (!dob) return null;
  const date = new Date(dob.length <= 10 ? `${dob}T00:00:00` : dob);
  if (Number.isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();
  const nowYear = now.getFullYear();

  let age = nowYear - year;
  if (nowMonth < month || (nowMonth === month && nowDay < day)) age -= 1;

  let status: ParsedBirthday["status"] = "completed";
  if (nowMonth === month && nowDay === day) status = "today";
  else if (month > nowMonth || (month === nowMonth && day > nowDay)) status = "upcoming";

  return { employee, month, day, year, age, status };
}

function formatDateLabel(month: number, day: number, year: number): string {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonthLabel(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${day}`;
}

function getRoleBadgeClass(role: string): string {
  if (role === "Founder" || role === "Super Admin" || role === "Admin") return "bg-purple-100 text-purple-700";
  if (role === "Manager") return "bg-blue-100 text-blue-600";
  return "bg-slate-100 text-slate-500";
}

function getStatusBadge(status: ParsedBirthday["status"]): React.ReactNode {
  switch (status) {
    case "today":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200">
          <Gift size={12} /> Today
        </span>
      );
    case "upcoming":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200">
          <Sparkles size={12} /> Upcoming
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-pmedium uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200">
          <Clock size={12} /> Completed
        </span>
      );
  }
}

/* ───────────────────────────── Component ───────────────────────────── */

export default function MonthWiseBirthdaysTab({ employees }: MonthWiseBirthdaysTabProps): React.ReactElement {
  const currentMonthKey = useMemo(() => String(new Date().getMonth() + 1), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [searchQuery, setSearchQuery] = useState("");

  const now = useMemo(() => new Date(), []);

  const parsed = useMemo(() => {
    return employees
      .map((employee) => parseBirthday(employee, now))
      .filter((item): item is ParsedBirthday => item !== null);
  }, [employees, now]);

  const stats = useMemo(() => {
    const todayMonth = now.getMonth() + 1;
    const total = parsed.length;
    const thisMonth = parsed.filter((item) => item.month === todayMonth).length;
    const today = parsed.filter((item) => item.status === "today").length;
    const upcoming = parsed.filter((item) => item.status === "upcoming").length;
    return { total, thisMonth, today, upcoming };
  }, [parsed, now]);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return parsed
      .filter((item) => selectedMonth === "all" || String(item.month) === selectedMonth)
      .filter((item) => {
        if (!query) return true;
        return (
          item.employee.name.toLowerCase().includes(query) ||
          item.employee.email.toLowerCase().includes(query) ||
          item.employee.employeeId.toLowerCase().includes(query) ||
          item.employee.department.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const dateKey = (x: ParsedBirthday) => `${String(x.month).padStart(2, "0")}${String(x.day).padStart(2, "0")}`;
        return dateKey(a).localeCompare(dateKey(b));
      });
  }, [parsed, selectedMonth, searchQuery]);

  const statCards: Array<{ label: string; value: number; icon: React.ComponentType<{ size?: number }>; toneClass: string; borderClass: string }> = [
    { label: "Total Birthdays", value: stats.total, icon: Users, toneClass: "bg-blue-50 text-[#2563EB]", borderClass: "" },
    { label: "This Month", value: stats.thisMonth, icon: CalendarDays, toneClass: "bg-violet-50 text-violet-600", borderClass: "border-l-4 border-l-violet-500" },
    { label: "Today", value: stats.today, icon: Cake, toneClass: "bg-emerald-50 text-emerald-600", borderClass: "border-l-4 border-l-emerald-500" },
    { label: "Upcoming", value: stats.upcoming, icon: Gift, toneClass: "bg-amber-50 text-amber-600", borderClass: "border-l-4 border-l-amber-500" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ STAT CARDS ═══ */}
      <div data-tour="hr-birthdays-summary" className="mb-1 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.borderClass}`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-2xl ${card.toneClass} shrink-0`}>
                <CardIcon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ DATA PANEL ═══ */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Data Panel Header Row: month pills on the left, search on the right */}
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:gap-4 sm:p-4 xl:flex-row xl:items-center lg:p-5">
          <div data-tour="hr-birthdays-month-filter" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {MONTH_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedMonth(tab.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-pmedium transition-all sm:text-[12px] ${
                  selectedMonth === tab.key
                    ? "bg-[#2563EB] text-white shadow-sm shadow-blue-200"
                    : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap xl:w-auto">
            <div data-tour="hr-birthdays-search" className="relative min-w-[180px] flex-1 xl:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email or employee ID..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Table (as per employee management) */}
        <div className="overflow-x-auto">
          <table data-tour="hr-birthdays-table" className="w-full border-collapse">
            <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4 text-left">Employee ID</th>
                <th className="px-5 py-4 text-left">Employee</th>
                <th className="px-5 py-4 text-left">Role</th>
                <th className="px-5 py-4 text-left">Department</th>
                <th className="px-5 py-4 text-left">Date of Birth</th>
                <th className="px-5 py-4 text-center">Age</th>
                <th className="px-5 py-4 text-left">Birthday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400 font-semibold">
                    <Cake size={32} className="mx-auto text-slate-300 mb-3" />
                    No birthdays found for this selection.
                  </td>
                </tr>
              ) : (
                visible.map((item) => {
                  const emp = item.employee;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800 text-[12px]">{emp.employeeId || emp.id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-pmedium text-slate-900">
                          <UserCheck size={14} className="text-slate-400" />
                          <span className="text-[12px] text-slate-800">{emp.name}</span>
                        </div>
                        {emp.email ? <p className="mt-0.5 text-[10px] font-pmedium text-slate-400">{emp.email}</p> : null}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[9px] font-pmedium uppercase tracking-wider ${getRoleBadgeClass(emp.role)}`}>
                          {emp.role || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-pmedium text-slate-600">{emp.department || "-"}</td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-pmedium text-slate-500">
                          {formatDateLabel(item.month, item.day, item.year)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-[11px] font-pmedium text-slate-600">{item.age}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-pmedium text-slate-500 w-[72px]">
                            {formatMonthLabel(item.month, item.day)}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
