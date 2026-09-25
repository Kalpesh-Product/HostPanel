import React from "react";
import { Reveal } from "../motion";

/* ───────────────────────── icons ───────────────────────── */

const svg = (children: React.ReactNode, size = 18) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Icon = {
  arrow: (s = 16) => svg(<path d="M5 12h14M13 6l6 6-6 6" />, s),
  plus: (s = 16) => svg(<path d="M12 5v14M5 12h14" />, s),
  check: (s = 16) => svg(<path d="M20 6 9 17l-5-5" />, s),
  clock: (s = 16) => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, s),
  pin: (s = 16) => svg(<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>, s),
  phone: (s = 16) => svg(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />, s),
  mail: (s = 16) => svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>, s),
  search: (s = 16) => svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>, s),
  close: (s = 18) => svg(<path d="M18 6 6 18M6 6l12 12" />, s),
  menu: (s = 20) => svg(<path d="M4 7h16M4 12h16M4 17h10" />, s),
  chevron: (s = 14) => svg(<path d="m6 9 6 6 6-6" />, s),
  users: (s = 16) => svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>, s),
  star: (s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
    </svg>
  ),
  flame: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />
    </svg>
  ),
};

/* ───────────────────────── small atoms ───────────────────────── */

export const SectionHead: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  center?: boolean;
}> = ({ eyebrow, title, sub, action, center }) => (
  <Reveal className={`mb-10 flex flex-wrap items-end justify-between gap-5 md:mb-14 ${center ? "justify-center text-center" : ""}`}>
    <div className={center ? "mx-auto max-w-2xl" : "max-w-2xl"}>
      {eyebrow ? <p className="tp-eyebrow mb-3">{eyebrow}</p> : null}
      <h2 className="tp-h2">{title}</h2>
      {sub ? <p className="tp-lead mt-4">{sub}</p> : null}
    </div>
    {action}
  </Reveal>
);

export const Placeholder: React.FC<{ text: string }> = ({ text }) => (
  <div className="tp-ph" aria-hidden="true">
    {String(text || "?").trim().charAt(0).toUpperCase()}
  </div>
);

export const StarRow: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span className="inline-flex gap-0.5" style={{ color: "var(--t-accent-fg, var(--t-accent))" }} aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ opacity: n <= Math.round(value) ? 1 : 0.22 }}>
        {Icon.star(size)}
      </span>
    ))}
  </span>
);

const DIET_COLOR: Record<string, string> = { veg: "#1f9d55", vegan: "#1f9d55", "non-veg": "#c0392b", egg: "#d99a00" };

export const DietMark: React.FC<{ diet: string }> = ({ diet }) =>
  diet ? (
    <span className="tp-diet" style={{ color: DIET_COLOR[diet] || "currentColor", borderColor: DIET_COLOR[diet] || "currentColor" }} title={diet} />
  ) : null;

export const Spice: React.FC<{ level: number }> = ({ level }) =>
  level > 0 ? (
    <span className="inline-flex items-center gap-0.5" style={{ color: "#d9480f" }} title="Spice level">
      {Array.from({ length: Math.min(3, level) }).map((_, i) => (
        <span key={i}>{Icon.flame()}</span>
      ))}
    </span>
  ) : null;

