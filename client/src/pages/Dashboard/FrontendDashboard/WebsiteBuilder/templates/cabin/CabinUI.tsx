import { useEffect, useState, type ReactNode } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { groupOpeningHours } from "../templateKit";
import { useCabin } from "./CabinContext";
import { CABIN_FALLBACK_IMAGES, cabinSrc } from "./cabinMedia";

export function CabinReveal({ children, className = "" }: { children: ReactNode; className?: string; }) {
  const reducedMotion = useReducedMotion();
  return <Motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}
    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>{children}</Motion.div>;
}

export function CabinImage({ src, alt = "", eager = true, fallback = CABIN_FALLBACK_IMAGES[0] }: {
  src?: unknown; alt?: string; eager?: boolean; fallback?: string;
}) {
  const requested = cabinSrc(src) || fallback || CABIN_FALLBACK_IMAGES[0];
  const [current, setCurrent] = useState(requested);
  useEffect(() => setCurrent(requested), [requested]);
  return <img src={current} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => {
    if (current !== CABIN_FALLBACK_IMAGES[0]) setCurrent(CABIN_FALLBACK_IMAGES[0]);
  }} />;
}

export function CabinPageHero({ title, label, image, body }: {
  title: string; label?: string; image?: string; body?: string;
}) {
  return (
    <section className="cabin-page-hero">
      <CabinImage src={image} eager />
      <div className="cabin-shell">
        {label ? <p className="cabin-kicker">{label}</p> : null}
        <h1>{title}</h1>
        {body ? <p className="cabin-page-intro">{body}</p> : null}
      </div>
    </section>
  );
}

export function CabinHours() {
  const { draft } = useCabin();
  const hours = groupOpeningHours(Array.isArray(draft.openingHours) ? draft.openingHours : []);
  if (!hours.length) return null;
  return (
    <dl className="cabin-hours-list">
      {hours.map((row) => <div key={row.days}>
        <dt>{row.days}</dt>
        <dd>{row.hours}</dd>
      </div>)}
    </dl>
  );
}
