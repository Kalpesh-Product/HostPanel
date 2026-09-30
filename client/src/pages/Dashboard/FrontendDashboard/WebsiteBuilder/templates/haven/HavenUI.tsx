import React from "react";
import { Reveal, motion } from "../motion";
import { formatTime12h } from "../leadForms";
import { priceValue, type Service, type ServiceItem } from "../serviceAdapter";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, Spice } from "../shared/TplUI";

/* ───────────────────────── icons ───────────────────────── */

const svg = (children: React.ReactNode, size = 20) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const HvIcon = {
  bed: (s = 20) => svg(<><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /><path d="M2 16h20" /><path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" /></>, s),
  bath: (s = 20) => svg(<><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3z" /><path d="M6 12V6a2 2 0 0 1 2-2h1" /><path d="m7 19-1 2M17 19l1 2" /></>, s),
  snow: (s = 20) => svg(<path d="M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7" />, s),
  sofa: (s = 20) => svg(<><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2v-5z" /><path d="M5 18v2M19 18v2" /></>, s),
  calendar: (s = 20) => svg(<><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>, s),
  wallet: (s = 20) => svg(<><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15V7" /><circle cx="16.5" cy="14" r="1" /></>, s),
  moon: (s = 20) => svg(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />, s),
  key: (s = 20) => svg(<><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 9.2-9.2M16 7l3 3" /></>, s),
};

/* ───────────────────────── small helpers ───────────────────────── */

/** "per month" / "/ month" -> "month". */
export const unitText = (unit: string) => String(unit || "").replace(/^per\s+/i, "").replace(/^\/\s*/, "").trim();

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** The item with the lowest parsable price, for "from" figures. */
export const cheapestItem = (service: Service | null | undefined): ServiceItem | null => {
  const priced = (service?.items || []).filter((item) => priceValue(item) !== Infinity);
  if (!priced.length) return null;
  return priced.reduce((best, item) => (priceValue(item) < priceValue(best) ? item : best));
};

export interface Spec {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const OCCUPANCY: Record<string, string> = { single: "Private room", double: "Double sharing", triple: "Triple sharing" };
const GENDER: Record<string, string> = { mixed: "Mixed", female: "Female only", male: "Male only" };

/** The hard facts about one offering, read from its vertical-specific fields. */
export const specsFor = (service: Service, item: ServiceItem): Spec[] => {
  const r = item.raw || {};
  const out: Spec[] = [];
  const add = (icon: React.ReactNode, label: string, value: unknown) => {
    const text = String(value ?? "").trim();
    if (text) out.push({ icon, label, value: text });
  };
  if (service.kind === "coLiving") {
    add(HvIcon.bed(), "Sharing", OCCUPANCY[r.occupancy]);
    add(HvIcon.bath(), "Bathroom", r.bathroom === "ensuite" ? "Attached" : r.bathroom === "shared" ? "Shared" : "");
    add(HvIcon.snow(), "Air conditioning", r.ac ? "Yes" : "");
    add(HvIcon.sofa(), "Furnished", r.furnished ? "Yes" : "");
    add(HvIcon.moon(), "Minimum stay", Number(r.minStayMonths) > 0 ? `${Number(r.minStayMonths)} month${Number(r.minStayMonths) > 1 ? "s" : ""}` : "");
    add(HvIcon.wallet(), "Deposit", r.deposit);
    add(HvIcon.calendar(), "Available from", r.availableFrom ? formatDate(String(r.availableFrom)) : "");
  } else if (service.kind === "hostel") {
    add(HvIcon.bed(), "Type", r.roomKind === "private" ? "Private room" : r.roomKind === "dorm" ? "Shared dorm" : "");
    add(Icon.users(20), "Beds", Number(r.capacity) > 0 ? `${Number(r.capacity)}` : "");
    add(Icon.users(20), "Who can book", GENDER[r.genderPolicy]);
    add(HvIcon.bed(), "Bed style", r.bedType === "bunk" ? "Bunk beds" : r.bedType === "single" ? "Single beds" : "");
    add(HvIcon.bath(), "Bathroom", r.bathroom === "ensuite" ? "Attached" : r.bathroom === "shared" ? "Shared" : "");
  } else if (service.kind === "workation") {
    add(HvIcon.calendar(), "Duration", r.duration);
    add(Icon.users(20), "Pricing", r.perPerson ? "Per person" : "");
  } else if (service.kind === "meeting") {
    add(Icon.users(20), "Capacity", Number(r.capacity) > 0 ? `Up to ${Number(r.capacity)} people` : "");
  }
  return out;
};

/* ───────────────────────── atoms ───────────────────────── */

export const Price: React.FC<{ item: ServiceItem; size?: number; align?: "left" | "right" }> = ({ item, size = 24, align = "right" }) => {
  if (!item.price) return <p className="tp-muted text-[13px]">Ask for pricing</p>;
  const unit = unitText(item.priceUnit);
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="tp-display leading-none" style={{ fontSize: size }}>{item.price}</p>
      {unit ? <p className="tp-muted mt-1 text-[12px]">per {unit}</p> : null}
    </div>
  );
};

export const SpecRow: React.FC<{ spec: Spec }> = ({ spec }) => (
  <div className="hv-spec">
    <span className="hv-spec-icon">{spec.icon}</span>
    <div className="min-w-0">
      <p className="tp-muted text-[12px] font-semibold">{spec.label}</p>
      <p className="text-[15px] font-semibold leading-snug">{spec.value}</p>
    </div>
  </div>
);

export const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 15 }) => (
  <span className="inline-flex gap-0.5" style={{ color: "var(--hv-ink-accent)" }} aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ opacity: n <= Math.round(value) ? 1 : 0.22 }}>{Icon.star(size)}</span>
    ))}
  </span>
);

/** A row that centres its last, shorter line: 1 card fills the width, 2 sit centred, 4 puts the 4th in the middle. */
export const CardRow: React.FC<{ children: React.ReactNode[]; gap?: number }> = ({ children, gap = 20 }) => (
  <div className="flex flex-wrap justify-center" style={{ gap }}>
    {React.Children.toArray(children).map((child, index) => (
      <div key={index} className="w-full sm:w-[calc(50%-10px)] lg:w-[calc((100%-40px)/3)]">{child}</div>
    ))}
  </div>
);

/* ───────────────────────── room card ───────────────────────── */

export const RoomCard: React.FC<{ item: ServiceItem; service: Service; index?: number }> = ({ item, service, index = 0 }) => {
  const { goToItem, openLead } = useTpl();
  const specs = specsFor(service, item);
  const availability = service.kind === "coLiving" ? specs.find((s) => s.label === "Available from") : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="tp-card tp-card-hover flex h-full flex-col p-2.5"
      onClick={() => goToItem(service, item)}
    >
      <div className="tp-zoom tp-fill aspect-[4/4.2]" style={{ borderRadius: 22 }}>
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? <span className="tp-chip absolute left-3 top-3" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{item.badge}</span> : null}
        {availability ? (
          <span className="tp-chip absolute bottom-3 left-3" style={{ background: "color-mix(in srgb, var(--t-raised) 92%, transparent)", backdropFilter: "blur(6px)" }}>
            <span className="hv-dot" style={{ background: "var(--t-accent)" }} /> Available {availability.value}
          </span>
        ) : null}
        {item.images.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-white" style={{ background: "rgba(0,0,0,.5)" }}>{item.images.length} photos</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 px-3.5 pb-3.5 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="tp-h3 !text-[22px] leading-tight">{item.title}</h3>
            <DietMark diet={item.dietary} />
          </div>
          <div className="shrink-0"><Price item={item} size={22} /></div>
        </div>
        {item.chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            <Spice level={item.spiceLevel} />
            {item.chips.filter((chip) => !chip.startsWith("Available")).slice(0, 4).map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
          </div>
        ) : null}
        {item.description ? <p className="tp-muted tp-clamp2 text-[14.5px] leading-relaxed">{item.description}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <button type="button" className="tp-link" onClick={(e) => { e.stopPropagation(); goToItem(service, item); }}>Details <span className="tp-arrow">{Icon.arrow(15)}</span></button>
          {service.leadEnabled ? (
            <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={(e) => { e.stopPropagation(); openLead(service, item); }}>
              {service.profile.labels.itemCta}
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

/* ───────────────────────── page header ───────────────────────── */

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
  image?: string;
  children?: React.ReactNode;
  crumbs?: { label: string; onClick?: () => void }[];
}> = ({ eyebrow, title, sub, image, children, crumbs }) => (
  <section className="relative overflow-hidden pt-[100px] md:pt-[124px]">
    <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--t-accent) 22%, transparent), transparent 68%)" }} />
    <div className={`tp-wrap relative grid items-end gap-8 pb-10 md:pb-14 ${image ? "md:grid-cols-[1fr_auto] md:gap-14" : ""}`}>
      <div className="max-w-3xl">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="tp-muted mb-5 flex flex-wrap items-center gap-2 text-[13.5px]">
            {crumbs.map((crumb, index) => (
              <React.Fragment key={crumb.label}>
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.onClick ? <button type="button" className="hover:underline" onClick={crumb.onClick}>{crumb.label}</button> : <span aria-current="page" style={{ color: "var(--t-text)" }}>{crumb.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <Reveal y={8}><p className="tp-eyebrow mb-4">{eyebrow}</p></Reveal> : null}
        <Reveal delay={0.05}><h1 className="tp-h1" style={{ fontSize: "clamp(36px, 5vw, 64px)" }}>{title}</h1></Reveal>
        {sub ? <Reveal delay={0.1}><p className="tp-lead mt-5 max-w-2xl">{sub}</p></Reveal> : null}
        {children ? <Reveal delay={0.15} className="mt-7">{children}</Reveal> : null}
      </div>
      {image ? (
        <Reveal delay={0.1} className="hidden md:block">
          <div className="hv-arch tp-zoom h-[280px] w-[224px]"><img src={image} alt="" /></div>
        </Reveal>
      ) : null}
    </div>
    <div className="tp-wrap"><div className="hv-rule" /></div>
  </section>
);

/* ───────────────────────── other services ───────────────────────── */

/**
 * The other services a business offers. One service is a full-width row; two or more become
 * three-column-width cards, centred, so a last row of one or two cards sits in the middle.
 */
export const ServiceCards: React.FC<{ services: Service[] }> = ({ services }) => {
  const { goToService } = useTpl();
  if (!services.length) return null;

  if (services.length === 1) {
    const service = services[0];
    return (
      <Reveal>
        <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover grid w-full items-center gap-2 p-2.5 text-left md:grid-cols-[280px_1fr_auto]">
          <div className="tp-zoom tp-fill aspect-[16/9] md:aspect-auto md:h-[170px]" style={{ borderRadius: 22 }}>
            {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
          </div>
          <div className="flex flex-col justify-center gap-2 p-4 md:px-6">
            <p className="tp-eyebrow">{service.profile.labels.tag}</p>
            <h3 className="tp-h3">{service.heading}</h3>
            {service.subText ? <p className="tp-muted tp-clamp2 text-[15px]">{service.subText}</p> : null}
          </div>
          <div className="p-4 md:pr-8"><span className="tp-btn tp-btn-ghost tp-btn-sm">Explore {Icon.arrow(14)}</span></div>
        </button>
      </Reveal>
    );
  }

  return (
    <CardRow>
      {services.map((service, index) => (
        <Reveal key={service.key} delay={Math.min(index * 0.07, 0.3)} className="h-full">
          <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover flex h-full w-full flex-col p-2.5 text-left">
            <div className="tp-zoom tp-fill aspect-[16/11]" style={{ borderRadius: 22 }}>
              {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="tp-eyebrow">{service.profile.labels.tag}</p>
              <h3 className="tp-h3">{service.heading}</h3>
              {service.subText ? <p className="tp-muted tp-clamp2 text-[14.5px]">{service.subText}</p> : null}
              <span className="tp-link mt-auto pt-2">Explore <span className="tp-arrow">{Icon.arrow(15)}</span></span>
            </div>
          </button>
        </Reveal>
      ))}
    </CardRow>
  );
};

/* ───────────────────────── how it works ───────────────────────── */

export interface Step { title: string; body: string }

export const Steps: React.FC<{ steps: Step[] }> = ({ steps }) => (
  <div className="relative grid gap-10 md:grid-cols-3 md:gap-12">
    <div aria-hidden="true" className="absolute left-7 right-0 top-7 hidden h-px md:block" style={{ background: "var(--t-line)" }} />
    {steps.map((step, index) => (
      <Reveal key={step.title} delay={index * 0.12}>
        <div className="relative">
          <span className="hv-num relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-full text-[22px]" style={{ background: "var(--t-bg)", border: "1.5px solid var(--t-line)" }}>{index + 1}</span>
          <h3 className="tp-h3 mb-2">{step.title}</h3>
          <p className="tp-muted text-[15.5px] leading-relaxed">{step.body}</p>
        </div>
      </Reveal>
    ))}
  </div>
);

/** What the visit / booking flow looks like, in words that fit each kind of service. */
export const stepsFor = (service: Service | null, tours: boolean): Step[] => {
  switch (service?.kind) {
    case "coLiving":
      return [
        { title: "Tell us what you need", body: "Share your move-in date and the kind of room you have in mind." },
        tours
          ? { title: "Come and see it", body: "Book a visit, walk through the rooms and meet the people who run the place." }
          : { title: "We get back to you", body: "Our team answers your questions and shares what's available." },
        { title: "Move in", body: "Confirm your room, settle the paperwork and unpack. We handle the rest." },
      ];
    case "workation":
      return [
        { title: "Pick a package", body: "Choose the length and the extras that suit how you like to work." },
        { title: "We confirm", body: "We check availability and send you the details and next steps." },
        { title: "Arrive and settle in", body: "Your desk, your room and everything else are ready when you are." },
      ];
    case "hostel":
      return [
        { title: "Send a request", body: "Tell us your dates and how many beds you need." },
        { title: "We confirm", body: "Our team checks availability and replies with the details." },
        { title: "Check in", body: "Arrive, drop your bags and meet your fellow travellers." },
      ];
    default:
      return [];
  }
};

export const timeOrNull = (value?: string) => (value ? formatTime12h(value) : "");
