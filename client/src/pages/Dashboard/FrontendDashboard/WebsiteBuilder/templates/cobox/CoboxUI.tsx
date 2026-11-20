import React from "react";
import { motion as Motion } from "../motion";

const svg = (children: React.ReactNode, size = 18) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const CIcon = {
  arrow: (size = 18) => svg(<path d="M5 12h13m-5-6 6 6-6 6" />, size),
  arrowUp: (size = 18) => svg(<path d="M7 17 17 7M8 7h9v9" />, size),
  menu: (size = 22) => svg(<path d="M4 7h16M4 12h16M4 17h16" />, size),
  close: (size = 20) => svg(<path d="m6 6 12 12M18 6 6 18" />, size),
  check: (size = 14) => svg(<path d="m5 12 4 4L19 6" />, size),
  play: (size = 22) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  ),
  quote: (size = 38) => (
    <svg width={size} height={size * 0.8} viewBox="0 0 44 34" fill="currentColor" aria-hidden="true">
      <path d="M0 34V20.7C0 7.8 6.2 1.1 18.6 0v7.2c-5.8.7-8.8 3.6-9 8.7H18V34H0Zm25.4 0V20.7C25.4 7.8 31.6 1.1 44 0v7.2c-5.8.7-8.8 3.6-9 8.7h8.4V34h-18Z" />
    </svg>
  ),
  desk: (size = 22) => svg(<><path d="M3 9h18M5 9V6h14v3M4 9v10M20 9v10M7 19v2M17 19v2" /><path d="M9 13h6" /></>, size),
  office: (size = 22) => svg(<><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M2 21h20M9 8h2M9 12h2M13 8h1M13 12h1M15 21v-6h4v6" /></>, size),
  users: (size = 22) => svg(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16.5 5.4a3.2 3.2 0 0 1 0 5.2M18 14.6a6 6 0 0 1 3.5 5.4" /></>, size),
  room: (size = 22) => svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 9h.01M16 13h.01" /></>, size),
  wifi: (size = 22) => svg(<><path d="M2.5 8.5a15 15 0 0 1 19 0M5.5 12.5a10.5 10.5 0 0 1 13 0M9 16.5a5.5 5.5 0 0 1 6 0" /><circle cx="12" cy="20" r="1" /></>, size),
  spark: (size = 22) => svg(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />, size),
  phone: (size = 17) => svg(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />, size),
  mail: (size = 17) => svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>, size),
  pin: (size = 17) => svg(<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.7" /></>, size),
  send: (size = 16) => svg(<><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></>, size),
  chevronLeft: (size = 18) => svg(<path d="m14 6-6 6 6 6" />, size),
  chevronRight: (size = 18) => svg(<path d="m10 6 6 6-6 6" />, size),
};

export const CReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => (
  <Motion.div
    className={className}
    initial={{ opacity: 0, y: 26 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </Motion.div>
);

export const CEyebrow: React.FC<{
  children: React.ReactNode;
  light?: boolean;
}> = ({ children, light }) => (
  <p className={`cbx-eyebrow ${light ? "is-light" : ""}`}>{children}</p>
);

export const CPlaceholder: React.FC<{ text?: string }> = ({ text = "Cobox" }) => (
  <div className="cbx-placeholder">{text}</div>
);

export const CStars: React.FC<{ value: number }> = ({ value }) => {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="cbx-stars" aria-label={`${value} out of 5`}>
      {"★".repeat(filled)}
      <span aria-hidden="true" style={{ opacity: 0.25 }}>
        {"★".repeat(5 - filled)}
      </span>
    </span>
  );
};

export const CPageHero: React.FC<{
  title: string;
  eyebrow?: string;
  image?: string;
  children?: React.ReactNode;
}> = ({ title, eyebrow, image, children }) => (
  <section className="cbx-page-hero">
    {image ? <img className="cbx-page-hero-bg" src={image} alt="" /> : null}
    <div className="cbx-shell">
      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {eyebrow ? <CEyebrow light>{eyebrow}</CEyebrow> : null}
        <h1>{title}</h1>
        {children}
      </Motion.div>
    </div>
  </section>
);

export const CCtaButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "accent" | "ghost" | "light";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}> = ({
  children,
  onClick,
  type = "button",
  variant = "accent",
  className = "",
  disabled,
  ariaLabel,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`cbx-btn ${variant === "ghost" ? "is-ghost" : ""} ${
      variant === "light" ? "is-light" : ""
    } ${className}`.trim()}
  >
    {children}
    <i aria-hidden="true">{CIcon.arrow(16)}</i>
  </button>
);
