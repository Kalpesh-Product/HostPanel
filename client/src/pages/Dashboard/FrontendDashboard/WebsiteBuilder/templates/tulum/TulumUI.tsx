import React from "react";
import { motion, useReducedMotion } from "../motion";

// The reference's scroll-in curve: one second, easing out quartic.
const OUT_QUART = [0.25, 1, 0.5, 1] as const;

type Direction = "bottom" | "left" | "right" | "grow";

const hidden: Record<Direction, any> = {
  bottom: { opacity: 0, x: 0, y: 100 },
  left: { opacity: 0, x: -100, y: 0 },
  right: { opacity: 0, x: 100, y: 0 },
  grow: { opacity: 0, x: 0, y: 0, scale: 0.75 },
};

/**
 * Animates its children in once they are a quarter of the way on screen. The reference uses four
 * variants: rising from below, sliding in from the left or right, and growing from 75%.
 */
export const Reveal: React.FC<{ children: React.ReactNode; from?: Direction; delay?: number; className?: string }> = ({ children, from = "bottom", delay = 0, className }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={hidden[from]}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1, delay, ease: OUT_QUART }}
    >
      {children}
    </motion.div>
  );
};

/** A capacity line that fits the kind of service: sleeps for co-living, seats for co-working, guests otherwise. */
export const capacityLine = (kind: string | undefined, count: number | undefined): string => {
  if (!count || count < 1) return "";
  if (kind === "coLiving") return `Sleeps ${count}`;
  if (kind === "workspace") return `${count} ${count === 1 ? "seat" : "seats"}`;
  return `Up to ${count} guests`;
};

/** The small uppercase label above a heading ("Welcome to paradise"). */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`tk-eyebrow ${className}`}>{children}</p>
);

/** The outlined "Learn more" pill used under intro columns and unit cards. */
export const OutlinePill: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" className="tk-pill" onClick={onClick}>{children}</button>
);

/** A thin line icon in the reference's hand-drawn style, used for the intro columns. */
export const LineIcon: React.FC<{ name: "building" | "sofa" | "sparkle"; className?: string }> = ({ name, className }) => {
  const paths: Record<string, React.ReactNode> = {
    building: <><path d="M6 40V12l14-6 14 6v28" /><path d="M14 22h4M26 22h4M14 30h4M26 30h4M18 40v-6h8v6" /><path d="M4 40h40" /></>,
    sofa: <><path d="M8 26v-6a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v6" /><path d="M4 26h40v8H4z" /><path d="M8 34v5M40 34v5" /></>,
    sparkle: <><path d="M24 6l3 12 12 3-12 3-3 12-3-12-12-3 12-3z" /><path d="M38 34l1.5 4.5L44 40l-4.5 1.5L38 46l-1.5-4.5L32 40l4.5-1.5z" /></>,
  };
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

/** A small tick in a ring, used on the pricing include lists. */
export const Tick: React.FC = () => (
  <span className="tk-check" aria-hidden="true">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </span>
);
