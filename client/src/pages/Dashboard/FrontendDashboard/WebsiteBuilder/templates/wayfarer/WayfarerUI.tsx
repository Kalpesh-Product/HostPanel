import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, Reveal, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { todayISO } from "../leadForms";
import { estimateTotal } from "../shared/TplLead";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, Spice } from "../shared/TplUI";

/* ───────────────────────── stay search params (?in=&out=&guests=) ───────────────────────── */

export interface StayParams {
  checkIn: string;
  checkOut: string;
  guests: string;
}

export const useStayParams = (): StayParams => {
  const { search } = useLocation();
  const q = new URLSearchParams(search);
  return { checkIn: q.get("in") || "", checkOut: q.get("out") || "", guests: q.get("guests") || "" };
};

/** Nightly-priced stays: dates + guests turn into a per-room total. (Packages are priced per stay.) */
export const isStayKind = (service: Service) => service.kind === "hostel";

/* ───────────────────────── booking bar ───────────────────────── */

const BarField: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1">
    <span className="tp-muted flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
      {icon}
      {label}
    </span>
    {children}
  </label>
);

/**
 * The search box that opens Wayfarer's hero. What it asks depends on the service:
 * dates + guests for stays, a date + party size for a café table, nothing for the rest.
 */
export const BookingBar: React.FC<{ service: Service | null }> = ({ service }) => {
  const { openLead, goToService } = useTpl();
  const params = useStayParams();
  const [checkIn, setCheckIn] = useState(params.checkIn);
  const [checkOut, setCheckOut] = useState(params.checkOut);
  const [guests, setGuests] = useState(params.guests || "2");
  const today = todayISO();

  if (!service || !service.leadEnabled) return null;
  const kind = service.kind;
  if (kind !== "hostel" && kind !== "workation" && kind !== "coLiving" && kind !== "menu") return null;

  const twoDates = kind === "hostel" || kind === "workation";
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // A table or a workation package is requested straight away; rooms are searched first.
    if (kind === "menu" || kind === "workation") {
      openLead(service, null, { form: { startDate: checkIn, endDate: twoDates ? checkOut : "", people: guests } });
      return;
    }
    goToService(service, {
      search: { ...(checkIn ? { in: checkIn } : {}), ...(twoDates && checkOut ? { out: checkOut } : {}), guests },
    });
  };

  return (
    <form onSubmit={submit} className="wf-bar flex flex-col gap-3 p-3 md:flex-row md:items-end md:gap-2 md:p-3" aria-label="Search stays">
      <div className="grid flex-1 gap-3 sm:grid-cols-2 md:flex md:gap-2 md:divide-x md:divide-[var(--t-line)]">
        <div className="md:flex-1 md:px-3">
          <BarField label={kind === "coLiving" ? "Move-in" : kind === "menu" ? "Date" : "Check-in"} icon={Icon.clock(13)}>
            <input
              type="date"
              className="tp-input !border-0 !bg-transparent !px-0 !py-1 !shadow-none font-semibold"
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut && e.target.value > checkOut) setCheckOut("");
              }}
            />
          </BarField>
        </div>
        {twoDates ? (
          <div className="md:flex-1 md:px-3">
            <BarField label="Check-out" icon={Icon.clock(13)}>
              <input
                type="date"
                className="tp-input !border-0 !bg-transparent !px-0 !py-1 !shadow-none font-semibold"
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </BarField>
          </div>
        ) : null}
        <div className="md:flex-1 md:px-3">
          <BarField label={kind === "menu" ? "Guests" : kind === "coLiving" ? "Occupants" : "Guests"} icon={Icon.users(13)}>
            <input
              type="number"
              min={1}
              className="tp-input !border-0 !bg-transparent !px-0 !py-1 !shadow-none font-semibold"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
          </BarField>
        </div>
      </div>
      <button type="submit" className="tp-btn tp-btn-primary md:h-[52px] md:px-7">
        {kind === "menu" ? "Find a table" : kind === "coLiving" ? "Find a room" : kind === "workation" ? "Plan your workation" : "Search stays"} {Icon.arrow()}
      </button>
    </form>
  );
};

/* ───────────────────────── stay card (results-style row) ───────────────────────── */

export const StayCard: React.FC<{ item: ServiceItem; service: Service; index?: number; dates?: StayParams }> = ({
  item,
  service,
  index = 0,
  dates,
}) => {
  const { goToItem, openLead } = useTpl();
  const priceLine = priceWithUnit(item.price, item.priceUnit);
  const estimate = dates && isStayKind(service) ? estimateTotal(item, dates.checkIn, dates.checkOut, dates.guests || "1") : null;
  const prefill = dates ? { form: { startDate: dates.checkIn, endDate: dates.checkOut, people: dates.guests } } : undefined;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25), ease: [0.22, 1, 0.36, 1] }}
      className="tp-card tp-card-hover grid overflow-hidden md:grid-cols-[minmax(0,240px)_1fr] xl:grid-cols-[minmax(0,300px)_1fr_210px]"
      onClick={() => goToItem(service, item)}
    >
      <div className="tp-zoom tp-fill aspect-[16/10] md:aspect-auto md:min-h-[210px]">
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? (
          <span className="tp-chip absolute left-3 top-3" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{item.badge}</span>
        ) : null}
        {item.images.length > 1 ? (
          <span className="absolute bottom-3 left-3 rounded-md px-2 py-1 text-[11px] font-semibold text-white" style={{ background: "rgba(0,0,0,.55)" }}>
            {item.images.length} photos
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3 p-5">
        <div className="flex items-start gap-2">
          <h3 className="tp-h3 !text-[20px] leading-snug">{item.title}</h3>
          <DietMark diet={item.dietary} />
        </div>
        {item.chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            <Spice level={item.spiceLevel} />
            {item.chips.slice(0, 5).map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
          </div>
        ) : null}
        {item.description ? <p className="tp-muted tp-clamp2 text-[14px] leading-relaxed">{item.description}</p> : null}
        {item.features.length ? (
          <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5">
            {item.features.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-center gap-1.5 text-[13px] font-medium">
                <span style={{ color: "var(--t-secondary-fg, var(--t-accent-fg, var(--t-accent)))" }}>{Icon.check(14)}</span>{feature}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3 border-t p-5 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end xl:border-l xl:border-t-0" style={{ borderColor: "var(--t-line)" }}>
        <div className="xl:text-right">
          {priceLine ? (
            <>
              {isStayKind(service) ? <p className="tp-muted text-[11px] font-semibold uppercase tracking-wider">From</p> : null}
              <p className="tp-display text-[22px]" style={{ color: "var(--t-text)" }}>{priceLine}</p>
            </>
          ) : (
            <p className="tp-muted text-[13px]">Ask for pricing</p>
          )}
          {estimate ? (
            <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>
              {estimate.text} · {estimate.nights} night{estimate.nights > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
        {service.leadEnabled ? (
          <button
            type="button"
            className="tp-btn tp-btn-primary tp-btn-sm"
            onClick={(event) => {
              event.stopPropagation();
              openLead(service, item, prefill);
            }}
          >
            {service.profile.labels.itemCta}
          </button>
        ) : null}
      </div>
    </motion.article>
  );
};

/* ───────────────────────── service cards ───────────────────────── */

/**
 * The other services a business offers. One service is a full-width row. Two or more become
 * cards at three-column width, centred, so a last row of one or two cards sits in the middle.
 */
export const ServiceCards: React.FC<{ services: Service[] }> = ({ services }) => {
  const { goToService } = useTpl();
  if (!services.length) return null;

  if (services.length === 1) {
    const service = services[0];
    return (
      <Reveal>
        <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover grid w-full overflow-hidden text-left md:grid-cols-[300px_1fr_auto]">
          <div className="tp-zoom tp-fill aspect-[16/9] md:aspect-auto md:h-[180px]">
            {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
          </div>
          <div className="flex flex-col justify-center gap-2 p-5 md:p-6">
            <p className="tp-eyebrow">{service.profile.labels.tag}</p>
            <h3 className="tp-h3">{service.heading}</h3>
            {service.subText ? <p className="tp-muted tp-clamp2 text-[14px]">{service.subText}</p> : null}
          </div>
          <div className="flex items-center p-6 md:pr-8"><span className="tp-btn tp-btn-ghost tp-btn-sm">Explore {Icon.arrow(14)}</span></div>
        </button>
      </Reveal>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {services.map((service, index) => (
        <Reveal key={service.key} delay={Math.min(index * 0.06, 0.3)} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)]">
          <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover flex h-full w-full flex-col overflow-hidden text-left">
            <div className="tp-zoom tp-fill aspect-[16/10]">
              {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <p className="tp-eyebrow">{service.profile.labels.tag}</p>
              <h3 className="tp-h3">{service.heading}</h3>
              {service.subText ? <p className="tp-muted tp-clamp2 text-[14px]">{service.subText}</p> : null}
              <span className="tp-link mt-auto pt-2">Explore <span className="tp-arrow">{Icon.arrow(14)}</span></span>
            </div>
          </button>
        </Reveal>
      ))}
    </div>
  );
};

/* ───────────────────────── banners, facts, mosaic ───────────────────────── */

export const WfBanner: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
  image?: string;
  children?: React.ReactNode;
  crumbs?: { label: string; onClick?: () => void }[];
}> = ({ eyebrow, title, sub, image, children, crumbs }) => (
  <section className="relative overflow-hidden pt-[68px]" style={{ background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
    {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" /> : null}
    <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--t-ink) 88%, transparent), transparent)" }} />
    <div className="tp-wrap relative py-10 md:py-14">
      {crumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-[13px] opacity-80">
          {crumbs.map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.onClick ? <button type="button" className="hover:underline" onClick={crumb.onClick}>{crumb.label}</button> : <span aria-current="page">{crumb.label}</span>}
            </React.Fragment>
          ))}
        </nav>
      ) : null}
      {eyebrow ? <Reveal y={8}><p className="tp-eyebrow mb-2" style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{eyebrow}</p></Reveal> : null}
      <Reveal delay={0.05}><h1 className="tp-h1" style={{ fontSize: "clamp(30px, 4.4vw, 52px)" }}>{title}</h1></Reveal>
      {sub ? <Reveal delay={0.1}><p className="mt-3 max-w-2xl text-[16px] leading-relaxed opacity-85">{sub}</p></Reveal> : null}
      {children ? <Reveal delay={0.15} className="mt-6">{children}</Reveal> : null}
    </div>
  </section>
);

export const Fact: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="wf-fact">
    <span className="wf-fact-icon">{icon}</span>
    <div>
      <p className="tp-muted text-[11px] font-bold uppercase tracking-wider">{label}</p>
      <p className="text-[15px] font-semibold">{value}</p>
    </div>
  </div>
);

/** One big photo plus up to four smaller ones, like a travel-site gallery header. */
export const Mosaic: React.FC<{ images: string[]; onOpen: (index: number) => void; alt?: string; rounded?: number }> = ({
  images,
  onOpen,
  alt = "",
  rounded = 16,
}) => {
  const shown = images.slice(0, 5);
  if (!shown.length) return null;
  const cell = (src: string, index: number, className: string) => (
    <button
      key={`${src}-${index}`}
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Open photo ${index + 1}`}
      className={`tp-zoom relative block overflow-hidden ${className}`}
      style={{ borderRadius: rounded }}
    >
      <img src={src} alt={alt} loading="lazy" />
      {index === 4 && images.length > 5 ? (
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-white" style={{ background: "rgba(0,0,0,.5)" }}>
          +{images.length - 5} more
        </span>
      ) : null}
    </button>
  );
  if (shown.length === 1) return <div className="aspect-[16/8]">{cell(shown[0], 0, "h-full w-full")}</div>;
  return (
    <div className="grid h-[260px] gap-2 sm:h-[380px] md:h-[440px] md:grid-cols-4 md:grid-rows-2">
      {cell(shown[0], 0, "h-full w-full md:col-span-2 md:row-span-2")}
      {shown.slice(1).map((src, i) => cell(src, i + 1, "hidden h-full w-full md:block"))}
    </div>
  );
};

export { PhotoViewer } from "../shared/TplParts";
