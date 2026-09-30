import React from "react";
import { Reveal, motion } from "../motion";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import type { Service, ServiceItem } from "../serviceAdapter";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, Spice } from "../shared/TplUI";

/** "₹8,000 / month", or "" when the owner left the price empty (co-working is enquiry-led). */
export const priceLine = (item: ServiceItem) => (item.price ? priceWithUnit(item.price, item.priceUnit) : "");

/** The first run of days that are actually open, e.g. { days: "Tue – Sun", hours: "9:00 AM – 9:00 PM" }. */
export const firstOpenHours = (openingHours: any) => groupOpeningHours(openingHours).find((group) => group.hours !== "Closed");

export interface Crumb { label: string; onClick?: () => void }

/** The trail under the navbar: Home > Section > Page. Sits right under the header on every page. */
export const Crumbs: React.FC<{ items: Crumb[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="tp-wrap tp-muted flex flex-wrap items-center gap-2 pb-1 pt-4 text-[13px] font-medium">
    {items.map((crumb, index) => (
      <React.Fragment key={crumb.label}>
        {index > 0 ? <span aria-hidden="true" className="inline-flex opacity-60" style={{ transform: "rotate(-90deg)" }}>{Icon.chevron(12)}</span> : null}
        {crumb.onClick ? <button type="button" className="hover:underline" onClick={crumb.onClick}>{crumb.label}</button> : <span aria-current="page" style={{ color: "var(--t-text)" }}>{crumb.label}</span>}
      </React.Fragment>
    ))}
  </nav>
);

export const Check: React.FC = () => <span className="cw-check">{Icon.check(13)}</span>;

/** Cards in a centred row: a short last line sits in the middle. `cols` is the desktop column count. */
export const CardRow: React.FC<{ children: React.ReactNode[]; gap?: number; cols?: 1 | 2 | 3 | 4 | 5 }> = ({ children, gap = 20, cols = 3 }) => (
  <div className="cw-row" data-cols={cols} style={{ ["--g" as any]: `${gap}px` }}>
    {React.Children.toArray(children).map((child, index) => <div key={index}>{child}</div>)}
  </div>
);

/** A centred section title: a short yellow bar, the title, an optional line and an optional action underneath. */
export const CwHead: React.FC<{ title: string; sub?: string; action?: React.ReactNode; onDark?: boolean }> = ({ title, sub, action, onDark }) => (
  <Reveal className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
    <span aria-hidden="true" className="mx-auto mb-5 block h-1.5 w-14 rounded-full" style={{ background: "var(--t-accent)" }} />
    <h2 className="tp-h2">{title}</h2>
    {sub ? <p className={`mt-4 text-[clamp(16px,1.4vw,18px)] leading-relaxed ${onDark ? "opacity-70" : "tp-muted"}`}>{sub}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </Reveal>
);

/** The details shown for a space: seats, access hours and category, from the fields the owner filled in. */
export const detailRows = (service: Service, item: ServiceItem): [string, string][] => {
  const raw = item.raw || {};
  const seats = Number(raw.seats) > 0 ? Number(raw.seats) : Number(raw.capacity) > 0 ? Number(raw.capacity) : 0;
  const rows: [string, string | undefined][] = [
    [service.kind === "meeting" ? "Capacity" : "Seats", seats ? `${seats}` : undefined],
    ["Access", String(raw.accessHours || "").trim() || undefined],
    ["Category", item.category || undefined],
    ["Price", priceLine(item) || undefined],
  ];
  return rows.filter(([, value]) => value) as [string, string][];
};

/* ───────────────────────── space card ───────────────────────── */

export const SpaceCard: React.FC<{ item: ServiceItem; service: Service; index?: number }> = ({ item, service, index = 0 }) => {
  const { goToItem, openLead } = useTpl();
  const price = priceLine(item);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="tp-card tp-card-hover flex h-full flex-col overflow-hidden"
      onClick={() => goToItem(service, item)}
    >
      <div className="tp-zoom tp-fill aspect-[4/3]">
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? <span className="tp-chip tp-chip-accent absolute left-3 top-3">{item.badge}</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start gap-2">
          <h3 className="tp-h3 !text-[21px] leading-tight">{item.title}</h3>
          <DietMark diet={item.dietary} />
        </div>
        {price ? <p className="tp-muted text-[13.5px]">Starting at <strong style={{ color: "var(--t-text)" }}>{price}</strong></p> : null}
        {item.chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            <Spice level={item.spiceLevel} />
            {item.chips.slice(0, 4).map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
          </div>
        ) : null}
        {item.description ? <p className="tp-muted tp-clamp2 text-[14.5px] leading-relaxed">{item.description}</p> : null}
        {item.features.length ? (
          <ul className="space-y-1.5">
            {item.features.slice(0, 3).map((feature) => <li key={feature} className="flex items-center gap-2.5 text-[14px] font-medium"><Check />{feature}</li>)}
          </ul>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--t-line)" }}>
          <button type="button" className="tp-link" onClick={(e) => { e.stopPropagation(); goToItem(service, item); }}>Details <span className="tp-arrow">{Icon.arrow(15)}</span></button>
          {service.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={(e) => { e.stopPropagation(); openLead(service, item); }}>{service.profile.labels.itemCta}</button> : null}
        </div>
      </div>
    </motion.article>
  );
};

/* ───────────────────────── page header ───────────────────────── */

export const PageHeader: React.FC<{
  title: string;
  sub?: string;
  children?: React.ReactNode;
  crumbs?: { label: string; onClick?: () => void }[];
}> = ({ title, sub, children, crumbs }) => (
  <section>
    {crumbs?.length ? <Crumbs items={crumbs} /> : null}
    <div className="tp-wrap pb-10 pt-8 text-center md:pb-14 md:pt-10">
      <Reveal y={8}><span aria-hidden="true" className="mx-auto mb-5 block h-1.5 w-14 rounded-full" style={{ background: "var(--t-accent)" }} /></Reveal>
      <Reveal delay={0.05}><h1 className="tp-h1" style={{ fontSize: "clamp(30px, 4.2vw, 56px)" }}>{title}</h1></Reveal>
      {sub ? <Reveal delay={0.1}><p className="tp-lead mx-auto mt-4 max-w-2xl">{sub}</p></Reveal> : null}
      {children ? <Reveal delay={0.15} className="mt-6">{children}</Reveal> : null}
    </div>
    <div className="tp-wrap"><div style={{ borderTop: "1px solid var(--t-line)" }} /></div>
  </section>
);

/* ───────────────────────── other services ───────────────────────── */

/** One service is a full-width row; two or more become centred, three-column-width cards. */
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
