// Small motion toolkit shared by the new templates. Built on framer-motion, and every
// primitive collapses to a plain static element when the visitor prefers reduced motion.
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its children into view the first time they scroll on screen. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}> = ({ children, delay = 0, y = 28, className, as = "div" }) => {
  const reduce = useReducedMotion();
  const Tag: any = motion[as];
  if (reduce) return React.createElement(as, { className }, children);
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
};

/** Reveals each direct child in turn. */
export const Stagger: React.FC<{
  children: React.ReactNode;
  className?: string;
  step?: number;
}> = ({ children, className, step = 0.07 }) => (
  <div className={className}>
    {React.Children.map(children, (child, index) =>
      child == null ? null : <Reveal delay={Math.min(index * step, 0.5)}>{child}</Reveal>,
    )}
  </div>
);

/** Counts up to `value` when scrolled into view. Non-numeric values render as-is. */
export const CountUp: React.FC<{ value: string | number; className?: string; duration?: number }> = ({
  value,
  className,
  duration = 1.4,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const raw = String(value);
  const match = raw.match(/^(\D*)([\d,.]+)(.*)$/);
  const [display, setDisplay] = useState(match && !reduce ? `${match[1]}0${match[3]}` : raw);

  useEffect(() => {
    if (!match || reduce || !inView) return;
    const target = Number(match[2].replace(/,/g, ""));
    if (!Number.isFinite(target)) {
      setDisplay(raw);
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(`${match[1]}${Math.round(v).toLocaleString()}${match[3]}`),
      onComplete: () => setDisplay(raw),
    });
    return () => controls.stop();
  }, [inView]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
};

/** True once the page has scrolled past `threshold` px — for shrinking sticky headers. */
export const useScrolled = (threshold = 24) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroller = document.getElementById("scrollable-content");
    const read = () => setScrolled((scroller ? scroller.scrollTop : window.scrollY) > threshold);
    read();
    const target: any = scroller || window;
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, [threshold]);
  return scrolled;
};

/** Infinite horizontal ticker. Pauses on hover; static when reduced motion is on. */
export const Marquee: React.FC<{ children: React.ReactNode; className?: string; speed?: number }> = ({
  children,
  className,
  speed = 40,
}) => {
  const reduce = useReducedMotion();
  if (reduce) return <div className={`flex flex-wrap gap-x-10 gap-y-3 ${className || ""}`}>{children}</div>;
  return (
    <div className={`group flex overflow-hidden ${className || ""}`}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className="flex shrink-0 items-center gap-10 pr-10 group-hover:[animation-play-state:paused]"
          style={{ animation: `tpl-marquee ${speed}s linear infinite` }}
        >
          {children}
        </div>
      ))}
      <style>{`@keyframes tpl-marquee { from { transform: translateX(0) } to { transform: translateX(-100%) } }`}</style>
    </div>
  );
};

export { AnimatePresence, motion, useReducedMotion };
