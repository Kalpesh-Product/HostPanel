import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useFlowspace } from "./FlowspaceContext";

export const Icon = {
  arrow: (size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  close: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  people: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  map: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  check: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  star: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.4 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.21l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.4Z"/></svg>,
};

export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ duration: .72, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
);

export const SectionHead: React.FC<{ eyebrow?: string; title: string; body?: string; action?: React.ReactNode; light?: boolean }> = ({ eyebrow, title, body, action, light }) => (
  <div className={`fs-section-head ${light ? "fs-light" : ""}`}>
    <div><p className="fs-kicker">{eyebrow}</p><h2 className="fs-h2">{title}</h2>{body ? <p className="fs-copy">{body}</p> : null}</div>
    {action ? <div className="fs-section-action">{action}</div> : null}
  </div>
);

export const Placeholder: React.FC<{ text?: string }> = ({ text }) => <div className="fs-placeholder"><span>{text || "Lumen Rooms"}</span></div>;

export const RoomCard: React.FC<{ service: Service; item: ServiceItem; index?: number }> = ({ service, item, index = 0 }) => {
  const { goToItem, openLead } = useFlowspace();
  return <Reveal delay={Math.min(index * .06, .24)}><article className="fs-room-card">
    <button type="button" className="fs-room-media" onClick={() => goToItem(service, item)}>{item.image ? <img src={item.image} alt={item.title} loading="lazy"/> : <Placeholder text={item.title}/>}<span className="fs-room-index">0{index + 1}</span></button>
    <div className="fs-room-body"><div><p className="fs-kicker">{item.category || service.profile.labels.item}</p><h3>{item.title}</h3></div><p>{item.description || "A polished, fully equipped room designed for productive conversations."}</p>
      <div className="fs-room-meta">{item.capacity ? <span>{Icon.people()} Up to {item.capacity}</span> : null}{item.price ? <strong>{priceWithUnit(item.price, item.priceUnit)}</strong> : null}</div>
      <div className="fs-room-actions"><button type="button" className="fs-text-link" onClick={() => goToItem(service, item)}>View space {Icon.arrow()}</button>{service.leadEnabled ? <button type="button" className="fs-mini-btn" onClick={() => openLead(service, item)}>Book</button> : null}</div>
    </div>
  </article></Reveal>;
};

export const PageHero: React.FC<{ eyebrow?: string; title: string; body?: string; image?: string; children?: React.ReactNode }> = ({ eyebrow, title, body, image, children }) => (
  <section className="fs-page-hero"><div className="fs-shell fs-page-hero-grid"><div><p className="fs-kicker">{eyebrow}</p><h1>{title}</h1>{body ? <p className="fs-copy">{body}</p> : null}{children ? <div className="fs-page-actions">{children}</div> : null}</div><div className="fs-page-photo">{image ? <img src={image} alt=""/> : <Placeholder text={title}/>}<span className="fs-orbit"/></div></div></section>
);
