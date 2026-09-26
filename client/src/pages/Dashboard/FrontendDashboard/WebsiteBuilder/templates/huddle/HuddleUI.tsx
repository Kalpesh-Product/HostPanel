import React from "react";
import { Reveal } from "../motion";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import type { Service, ServiceItem } from "../serviceAdapter";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";

/** "₹600 / hour", or "" when the owner left the price empty. */
export const priceLine = (item: ServiceItem) => (item.price ? priceWithUnit(item.price, item.priceUnit) : "");

/** The first run of days that are actually open, e.g. { days: "Mon – Sat", hours: "8:00 AM – 8:00 PM" }. */
export const firstOpenHours = (openingHours: any) => groupOpeningHours(openingHours).find((group) => group.hours !== "Closed");

/** How many people a room takes: the room's capacity field, else 0. */
export const seatsOf = (item: ServiceItem) => item.capacity || (Number(item.raw?.seats) > 0 ? Number(item.raw.seats) : 0);

export interface Crumb { label: string; onClick?: () => void }

/** The trail under the navbar: Home > Section > Page. */
export const Crumbs: React.FC<{ items: Crumb[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="tp-wrap tp-muted flex flex-wrap items-center gap-2 pb-1 pt-5 text-[13px] font-medium">
    {items.map((crumb, index) => (
      <React.Fragment key={crumb.label}>
        {index > 0 ? <span aria-hidden="true" className="inline-flex opacity-60" style={{ transform: "rotate(-90deg)" }}>{Icon.chevron(12)}</span> : null}
        {crumb.onClick ? <button type="button" className="hover:underline" onClick={crumb.onClick}>{crumb.label}</button> : <span aria-current="page" style={{ color: "var(--t-text)" }}>{crumb.label}</span>}
      </React.Fragment>
    ))}
  </nav>
);

export const Check: React.FC = () => <span className="hd-check">{Icon.check(12)}</span>;

/** Cards in a grid. `cols` is the desktop column count. */
export const CardRow: React.FC<{ children: React.ReactNode[]; gap?: number; cols?: 1 | 2 | 3 | 4 | 5 }> = ({ children, gap = 20, cols = 3 }) => (
  <div className="hd-row-cards" data-cols={cols} style={{ ["--g" as any]: `${gap}px` }}>
    {React.Children.toArray(children).map((child, index) => <div key={index}>{child}</div>)}
  </div>
);

/** A left-aligned section heading: a small numbered-style eyebrow, the title, an optional line, and an optional action on the right. */
export const HdHead: React.FC<{ title: string; sub?: string; eyebrow?: string; action?: React.ReactNode; onDark?: boolean }> = ({ title, sub, eyebrow, action, onDark }) => (
  <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 md:mb-12">
    <div className="max-w-2xl">
      {eyebrow ? <p className="tp-eyebrow mb-4">{eyebrow}</p> : null}
      <h2 className="tp-h2">{title}</h2>
      {sub ? <p className={`mt-4 text-[clamp(15.5px,1.3vw,17.5px)] leading-relaxed ${onDark ? "opacity-70" : "tp-muted"}`}>{sub}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </Reveal>
);

/** The facts shown for a room: capacity, hours, category and price, from the fields the owner filled in. */
export const detailRows = (_service: Service, item: ServiceItem): [string, string][] => {
  const raw = item.raw || {};
  const seats = seatsOf(item);
  const rows: [string, string | undefined][] = [
    ["Capacity", seats ? `Up to ${seats} people` : undefined],
    ["Rate", priceLine(item) || undefined],
    ["Available", String(raw.accessHours || "").trim() || undefined],
    ["Type", item.category || undefined],
  ];
  return rows.filter(([, value]) => value) as [string, string][];
};

/* ───────────────────────── room row ───────────────────────── */

/**
 * One bookable room as a horizontal row: photo, name and what's in it, capacity, rate and a Book
 * button. This is the template's main unit, used on the home page and the rooms page. `prefill`
 * carries the finder's date / time / people into the booking form.
 */
export const RoomRow: React.FC<{
  item: ServiceItem;
  service: Service;
  prefill?: { form?: Record<string, string>; extras?: Record<string, string> };
}> = ({ item, service, prefill }) => {
  const { goToItem, openLead } = useTpl();
  const price = priceLine(item);
  const seats = seatsOf(item);
  return (
    <article className="hd-row md:grid-cols-[minmax(0,300px)_minmax(0,1fr)_auto]" style={{ display: "grid" }}>
      <button type="button" onClick={() => goToItem(service, item)} aria-label={`View ${item.title}`} className="tp-zoom tp-fill block aspect-[16/10] md:aspect-auto md:min-h-[190px]">
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? <span className="tp-chip tp-chip-accent absolute left-3 top-3">{item.badge}</span> : null}
      </button>
      <div className="flex min-w-0 flex-col gap-3 p-5 md:p-6">
        <div>
          <h3 className="tp-h3">
            <button type="button" className="text-left hover:underline" onClick={() => goToItem(service, item)}>{item.title}</button>
          </h3>
          {seats ? <p className="tp-muted mt-1.5 flex items-center gap-2 text-[14px] font-medium">{Icon.users(15)} Up to {seats} people</p> : null}
        </div>
        {item.description ? <p className="tp-muted tp-clamp2 text-[14.5px] leading-relaxed">{item.description}</p> : null}
        {item.features.length ? (
          <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5">
            {item.features.slice(0, 4).map((feature) => <li key={feature} className="flex items-center gap-2 text-[13.5px] font-medium"><Check />{feature}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-t p-5 md:min-w-[190px] md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0 md:p-6" style={{ borderColor: "var(--t-line)" }}>
        <div className="md:text-center">
          {price ? (
            <>
              <p className="tp-muted text-[11.5px] font-semibold uppercase tracking-[0.1em]">From</p>
              <p className="tp-display text-[22px] leading-tight">{price}</p>
            </>
          ) : <p className="tp-muted text-[13.5px] font-medium">Ask for a quote</p>}
        </div>
        {service.leadEnabled ? (
          <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(service, item, prefill)}>{service.profile.labels.itemCta}</button>
        ) : (
          <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToItem(service, item)}>Details</button>
        )}
      </div>
    </article>
  );
};

/* ───────────────────────── page header ───────────────────────── */

/** A left-aligned page title with the breadcrumb above it and a hairline underneath. */
export const PageHeader: React.FC<{
  title: string;
  sub?: string;
  children?: React.ReactNode;
  crumbs?: { label: string; onClick?: () => void }[];
}> = ({ title, sub, children, crumbs }) => (
  <section>
    {crumbs?.length ? <Crumbs items={crumbs} /> : null}
    <div className="tp-wrap pb-9 pt-6 md:pb-12 md:pt-8">
      <Reveal delay={0.02}><h1 className="tp-h1 max-w-4xl" style={{ fontSize: "clamp(32px, 4.4vw, 58px)" }}>{title}</h1></Reveal>
      {sub ? <Reveal delay={0.08}><p className="tp-lead mt-4 max-w-2xl">{sub}</p></Reveal> : null}
      {children ? <Reveal delay={0.12} className="mt-6">{children}</Reveal> : null}
    </div>
    <div className="tp-wrap"><div style={{ borderTop: "1px solid var(--t-line)" }} /></div>
  </section>
);

/* ───────────────────────── other services ───────────────────────── */

/** One service is a full-width row; two or more become a card grid. */
export const ServiceCards: React.FC<{ services: Service[] }> = ({ services }) => {
  const { goToService } = useTpl();
  if (!services.length) return null;

  if (services.length === 1) {
    const service = services[0];
    return (
      <Reveal>
        <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover grid w-full overflow-hidden text-left md:grid-cols-[300px_1fr_auto]">
          <div className="tp-zoom tp-fill aspect-[16/9] md:aspect-auto md:h-[180px]">{service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}</div>
          <div className="flex flex-col justify-center gap-2 p-6">
            <p className="tp-eyebrow">{service.profile.labels.tag}</p>
            <h3 className="tp-h3">{service.heading}</h3>
            {service.subText ? <p className="tp-muted tp-clamp2 text-[15px]">{service.subText}</p> : null}
          </div>
          <div className="flex items-center p-6 md:pr-8"><span className="tp-btn tp-btn-ghost tp-btn-sm">Explore {Icon.arrow(14)}</span></div>
        </button>
      </Reveal>
    );
  }

  return (
    <CardRow>
      {services.map((service, index) => (
        <Reveal key={service.key} delay={Math.min(index * 0.07, 0.3)} className="h-full">
          <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover flex h-full w-full flex-col overflow-hidden text-left">
            <div className="tp-zoom tp-fill aspect-[16/10]">{service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}</div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <p className="tp-eyebrow">{service.profile.labels.tag}</p>
              <h3 className="tp-h3">{service.heading}</h3>
              {service.subText ? <p className="tp-muted tp-clamp2 text-[14.5px]">{service.subText}</p> : null}
              <span className="tp-link mt-auto self-start">Explore <span className="tp-arrow">{Icon.arrow(15)}</span></span>
            </div>
          </button>
        </Reveal>
      ))}
    </CardRow>
  );
};
