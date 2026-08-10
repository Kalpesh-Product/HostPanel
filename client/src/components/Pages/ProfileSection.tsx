import type { ReactNode, ComponentType } from "react";

// Shared "profile page section" shell — icon badge + eyebrow + title header,
// used by both My Profile (UserDetails.tsx) and Company Profile
// (CompanyProfile.tsx) so the two pages read as one consistent UI.
export function SectionShell({
  eyebrow,
  title,
  icon: Icon,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  icon: ComponentType<{ size?: number }>;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-pmedium uppercase tracking-[0.32em] text-blue-600">{eyebrow}</p>
            <h2 className="text-lg font-pmedium text-slate-900">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className="text-blue-600 shrink-0" />
        <p className="text-[10px] font-pmedium uppercase tracking-[0.24em] text-slate-500">{label}</p>
      </div>
      <p className="text-[13px] font-semibold text-slate-900 break-words">{String(value || "-")}</p>
    </div>
  );
}
