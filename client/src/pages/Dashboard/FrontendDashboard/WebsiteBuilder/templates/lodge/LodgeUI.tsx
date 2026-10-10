import React, { useRef } from "react";
import { useInView } from "framer-motion";
import { motion, useReducedMotion } from "../motion";

// The reference's scroll-in: a fade with a short rise, easing out quartic over one second.
const OUT_QUART = [0.25, 1, 0.5, 1] as const;

/** Slides its children up 100px and fades them in once they are a quarter of the way on screen. */
export const SlideIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1, delay, ease: OUT_QUART }}
    >
      {children}
    </motion.div>
  );
};

/** The outlined pill label above a heading ("Intro", "Numbers"). */
export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="ld-label">{children}</span>;

/** A row that centres its last, shorter line: 1 card fills the width, 2 sit centred, 4 puts the 4th in the middle. */
export const CardRow: React.FC<{ children: React.ReactNode[]; gap?: number }> = ({ children, gap = 28 }) => (
  <div className="flex flex-wrap justify-center" style={{ gap }}>
    {React.Children.toArray(children).map((child, index) => (
      <div key={index} className="w-full sm:w-[calc(50%-14px)] lg:w-[calc((100%-56px)/3)]">{child}</div>
    ))}
  </div>
);

/**
 * Digits roll up like a counter when scrolled into view (2.5s, the reference's easing). Each digit
 * is its own column of 0-9; anything that is not a digit (a decimal point, a plus sign) stays put.
 */
export const RollingNumber: React.FC<{ value: string }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const show = inView || reduce;
  return (
    <span ref={ref} className="ld-roll" aria-label={value}>
      {String(value).split("").map((ch, index) => {
        if (!/\d/.test(ch)) return <span key={index} className="ld-roll-static" aria-hidden="true">{ch}</span>;
        const digit = Number(ch);
        return (
          <span key={index} className="ld-roll-col" aria-hidden="true">
            <span className="ld-roll-col-track" style={{ transform: show ? `translateY(-${digit * 10}%)` : "translateY(0)", transitionDuration: reduce ? "0s" : undefined }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

/** Small horizontal line icon used on the intro tabs and checklists. */
export const Tick: React.FC = () => (
  <span className="ld-check" aria-hidden="true">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </span>
);
