import type { ReactNode } from "react";

export type DashboardTone =
  "blue" | "green" | "amber" | "violet" | "rose" | "cyan" | "slate";

export function DashboardBanner({
  title,
  description,
  tags,
  image,
}: {
  title: string;
  description: string;
  tags: string[];
  image: string;
  moduleCount?: number;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,0.1)]">
      <div className="relative h-44 w-full sm:h-[12rem]">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/45 via-[#3b82f6]/25 to-[#60a5fa]/15"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full bg-white/90 sm:w-[66%]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, black 0%, black 76%, transparent 100%)",
          }}
        />
        <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center gap-2.5 px-6 py-6 sm:w-[76%]">
          <h1 className="flex flex-wrap items-center gap-x-2 text-[22px] font-pbold uppercase leading-[0.95] tracking-tight sm:text-[28px]">
            <span className="text-primary">{title}</span>
            <span className="text-accent">Dashboard</span>
          </h1>
          <p className="max-w-lg text-[11px] font-pmedium leading-5 text-slate-500">
            {description}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-[0.06em] text-blue-600"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardStatTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
  tone: DashboardTone;
}) {
  const styles = {
    blue: {
      hover: "hover:border-blue-200 hover:border-l-blue-600",
      icon: "bg-blue-50 text-blue-700",
    },
    green: {
      hover: "hover:border-emerald-200 hover:border-l-emerald-500",
      icon: "bg-emerald-50 text-emerald-700",
    },
    amber: {
      hover: "hover:border-amber-200 hover:border-l-amber-500",
      icon: "bg-amber-50 text-amber-700",
    },
    violet: {
      hover: "hover:border-violet-200 hover:border-l-violet-500",
      icon: "bg-violet-50 text-violet-700",
    },
    rose: {
      hover: "hover:border-rose-200 hover:border-l-rose-500",
      icon: "bg-rose-50 text-rose-700",
    },
    cyan: {
      hover: "hover:border-cyan-200 hover:border-l-cyan-500",
      icon: "bg-cyan-50 text-cyan-700",
    },
    slate: {
      hover: "hover:border-slate-300 hover:border-l-slate-500",
      icon: "bg-slate-100 text-slate-700",
    },
  }[tone];
  return (
    <div
      className={`flex min-h-[112px] items-center gap-4 rounded-xl border border-slate-200 border-l-4 border-l-transparent bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md ${styles.hover}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[22px] font-pmedium leading-none text-slate-900">
          {value}
        </p>
        <p className="mt-2 truncate text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

export function DashboardSection({
  title,
  subtitle,
  children,
  bodyClassName = "p-5",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
          {title}
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

