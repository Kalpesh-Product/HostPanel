import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useWorkscape } from "./WorkscapeContext";

export const WksIcon = {
  arrow: (size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.5"/></svg>,
  close: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  check: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export const WksReveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className, delay = 0 }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .16 }} transition={{ duration: .72, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
);

export const WksImage: React.FC<{ src?: any; alt?: string; className?: string }> = ({ src, alt = "", className }) => {
  const resolvedSrc = typeof src === "string" ? src : src?.url || src?.src || "";
  return resolvedSrc
    ? <img className={className} src={resolvedSrc} alt={alt} loading="lazy"/>
    : <div className={`wks-placeholder ${className || ""}`}><span>WORKSCAPE</span></div>;
};

export const WksSectionHead: React.FC<{ label: string; title: string; body?: string; action?: React.ReactNode }> = ({ label, title, body, action }) => (
  <div className="wks-section-head"><div><p className="wks-label">{label}</p><h2>{title}</h2>{body ? <p>{body}</p> : null}</div>{action ? <div>{action}</div> : null}</div>
);

export const WksSpaceCard: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem, openLead } = useWorkscape();
  return <WksReveal delay={Math.min(index * .06, .24)} className="wks-card-wrap"><article className="wks-space-card"><button type="button" className="wks-space-photo" onClick={() => goToItem(service, item)}><WksImage src={item.image} alt={item.title}/><span>0{index + 1}</span></button><div className="wks-space-copy"><p className="wks-label">{item.category || service.profile.labels.item}</p><h3>{item.title}</h3><p>{item.description || "A bright, fully equipped room designed for focused work and useful conversations."}</p><div className="wks-space-meta"><span>{item.capacity ? `Up to ${item.capacity} people` : item.chips[0] || "Flexible setup"}</span>{item.price ? <strong>{priceWithUnit(item.price, item.priceUnit)}</strong> : null}</div><div className="wks-space-actions"><button type="button" onClick={() => goToItem(service, item)}>View room {WksIcon.arrow()}</button>{service.leadEnabled ? <button type="button" onClick={() => openLead(service, item)}>Book</button> : null}</div></div></article></WksReveal>;
};

export const WksPageHero: React.FC<{ title: string; image?: string; number?: string; body?: string; variant?: "default" | "detail" | "contact" }> = ({ title, image, number = "01", body, variant = "default" }) => (
  <section className="wks-page-hero"><div className="wks-shell"><div className={`wks-page-media wks-page-media-${variant}`}><WksImage src={image} alt={title}/><span className="wks-page-no">{number}</span><motion.h1 initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .75, ease: [0.22, 1, 0.36, 1] }}>{title}</motion.h1>{body ? <p>{body}</p> : null}<span className="wks-pause" aria-hidden="true">Ⅱ</span></div></div></section>
);
