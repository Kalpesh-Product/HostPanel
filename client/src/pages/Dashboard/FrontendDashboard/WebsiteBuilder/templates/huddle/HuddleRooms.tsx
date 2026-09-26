import React, { useMemo, useState } from "react";
import { Reveal, Stagger } from "../motion";
import { formatTime12h } from "../leadForms";
import { uniqueCategories, type Service, type ServiceItem } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, Spice } from "../shared/TplUI";
import { Check, Crumbs, HdHead, PageHeader, RoomRow, ServiceCards, detailRows, priceLine, seatsOf } from "./HuddleUI";

const isStay = (kind: string) => kind === "hostel" || kind === "coLiving" || kind === "workation";

/** Check-in times and house rules, for the stay-type services a business may also offer. */
const HouseInfo: React.FC<{ kind: string }> = ({ kind }) => {
  const { draft } = useTpl();
  const policy = draft?.stayPolicy || {};
  const rules: string[] = policy.houseRules || [];
  const facts: [string, string][] = [
    policy.checkInTime && ["Check-in", `From ${formatTime12h(policy.checkInTime)}`],
    policy.checkOutTime && ["Check-out", `Until ${formatTime12h(policy.checkOutTime)}`],
    policy.minStayNights && kind !== "coLiving" && ["Minimum stay", `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}`],
  ].filter(Boolean) as [string, string][];
  if (!facts.length && !rules.length && !policy.cancellationNote) return null;
  return (
    <Reveal>
      <div className="tp-soft grid gap-8 p-6 md:p-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
        <div>
          <h2 className="tp-h3 mb-5">House rules & info</h2>
          {facts.length ? (
            <dl className="space-y-3">
              {facts.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-4 border-b pb-3 text-[15px]" style={{ borderColor: "var(--t-line)" }}><dt className="tp-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
            </dl>
          ) : null}
          {policy.cancellationNote ? <p className="tp-muted mt-5 text-[14.5px] leading-relaxed"><strong style={{ color: "var(--t-text)" }}>Cancellation.</strong> {policy.cancellationNote}</p> : null}
        </div>
        {rules.length ? <ul className="grid content-start gap-x-8 gap-y-3.5 sm:grid-cols-2">{rules.map((rule) => <li key={rule} className="flex items-start gap-3 text-[15px] leading-snug"><Check />{rule}</li>)}</ul> : null}
      </div>
    </Reveal>
  );
};

const Included: React.FC<{ inclusions?: any[] }> = ({ inclusions }) => {
  const enabled = (inclusions || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <div>
      <h2 className="tp-h3 mb-6">What's in every room</h2>
      <Stagger className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
        {enabled.map((item, index) => {
          const { label, icon } = getInclusionMeta(item);
          return <div key={item?.key || index} className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "color-mix(in srgb, var(--t-accent) 14%, transparent)", color: "var(--t-accent-fg, var(--t-accent))" }}>{icon}</span><span className="text-[14.5px] font-semibold leading-snug">{label}</span></div>;
        })}
      </Stagger>
    </div>
  );
};

/** Links to the business's other services, so a visitor on one page can still find the rest. */
const OtherServices: React.FC<{ current: Service }> = ({ current }) => {
  const { services, c } = useTpl();
  const others = services.filter((s) => s.key !== current.key);
  if (!others.length) return null;
  return (
    <section className="tp-wrap py-14">
      <HdHead title={c("services.other.title", "More under one roof")} />
      <ServiceCards services={others} />
    </section>
  );
};

/* ───────────────────────── rooms page ───────────────────────── */

const SIZES: { label: string; min: number; max: number }[] = [
  { label: "1–4 people", min: 1, max: 4 },
  { label: "5–8 people", min: 5, max: 8 },
  { label: "9–12 people", min: 9, max: 12 },
  { label: "13+ people", min: 13, max: Infinity },
];

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, openLead, c } = useTpl();
  const [tab, setTab] = useState("");
  const [size, setSize] = useState("");
  const page = service.page || {};
  const categories = useMemo(() => uniqueCategories(service.items), [service.items]);
  const sizes = useMemo(() => SIZES.filter((option) => service.items.some((item) => seatsOf(item) >= option.min && seatsOf(item) <= option.max)), [service.items]);
  const chosen = SIZES.find((option) => option.label === size);
  const filtered = service.items.filter((item) => (!tab || item.category === tab) && (!chosen || (seatsOf(item) >= chosen.min && seatsOf(item) <= chosen.max)));
  const booking = service.kind === "meeting" && service.leadEnabled;

  return (
    <>
      <PageHeader title={service.heroHeading} sub={service.heroSubHeading} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: service.name }]}>
        {booking ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(service)}>{service.profile.labels.cta} {Icon.arrow()}</button> : null}
      </PageHeader>

      {service.heroImage ? (
        <div className="tp-wrap pt-8 md:pt-10">
          <Reveal><div className="hd-tile aspect-[16/6] min-h-[180px]" style={{ background: "var(--t-surface)" }}><img src={service.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /></div></Reveal>
        </div>
      ) : null}

      <section className="tp-wrap py-10 md:py-14">
        {categories.length > 1 || sizes.length > 1 ? (
          <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {categories.length > 1 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
                <button type="button" className="tp-tab" aria-pressed={tab === ""} onClick={() => setTab("")}>All</button>
                {categories.map((category) => <button key={category} type="button" className="tp-tab" aria-pressed={tab === category} onClick={() => setTab(tab === category ? "" : category)}>{category}</button>)}
              </div>
            ) : null}
            {sizes.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by size">
                <span className="tp-muted text-[13px] font-semibold">Size</span>
                {sizes.map((option) => <button key={option.label} type="button" className="tp-tab" aria-pressed={size === option.label} onClick={() => setSize(size === option.label ? "" : option.label)}>{option.label}</button>)}
              </div>
            ) : null}
          </div>
        ) : service.items.length > 1 ? (
          <p className="tp-muted mb-8 text-[15px]"><strong style={{ color: "var(--t-text)" }}>{service.items.length}</strong> {service.profile.labels.items}</p>
        ) : null}

        {!service.items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">We're getting this ready. Check back soon.</p>
        ) : !filtered.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">No rooms match that filter.</p>
        ) : (
          <div className="flex flex-col gap-4">{filtered.map((item, index) => <Reveal key={item.key} delay={Math.min(index * 0.04, 0.2)}><RoomRow item={item} service={service} /></Reveal>)}</div>
        )}
      </section>

      <div className="tp-wrap flex flex-col gap-10 pb-6 md:gap-14">
        {isStay(service.kind) ? <HouseInfo kind={service.kind} /> : null}
        {page.inclusionsEnabled !== false ? <Included inclusions={page.inclusions} /> : null}
        {service.leadEnabled ? (
          <Reveal>
            <div className="tp-accent-panel flex flex-wrap items-center justify-between gap-5 p-7 md:p-10">
              <div>
                <h2 className="tp-h3" style={{ color: "inherit" }}>{c("services.cta.title", service.kind === "meeting" ? "Not sure which room you need?" : "Can't find the right fit?")}</h2>
                <p className="mt-1.5 text-[15.5px] opacity-85">{c("services.cta.sub", service.kind === "meeting" ? "Tell us the number of people and what the meeting is for. We'll suggest a room." : "Tell us what you need and we'll help.")}</p>
              </div>
              <button type="button" className="tp-btn tp-btn-light" onClick={() => openLead(service)}>{service.profile.labels.cta}</button>
            </div>
          </Reveal>
        ) : null}
      </div>
      <OtherServices current={service} />
      {page.faqEnabled !== false ? <FaqSection faqs={page.faqs} /> : null}
    </>
  );
};

/* ───────────────────────── room detail ───────────────────────── */

/** Long descriptions collapse behind "Read more" past ~7 lines. */
const Prose: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const long = text.length > 480;
  return (
    <>
      <p className="tp-lead whitespace-pre-line" style={long && !open ? { display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>{text}</p>
      {long ? <button type="button" className="tp-link mt-3" onClick={() => setOpen((v) => !v)}>{open ? "Show less" : "Read more"}</button> : null}
    </>
  );
};

/** One large photo with up to four smaller ones beside it; the rest open in the viewer. */
const Mosaic: React.FC<{ item: ServiceItem; onOpen: (index: number) => void }> = ({ item, onOpen }) => {
  const images = item.images;
  if (!images.length) return <div className="hd-tile flex aspect-[16/8] items-center justify-center" style={{ background: "var(--t-surface)" }}><Placeholder text={item.title} /></div>;
  const rest = images.slice(1, 5);
  const hidden = images.length - 5;
  const tile = (src: string, index: number, className: string) => (
    <button key={`${src}-${index}`} type="button" onClick={() => onOpen(index)} aria-label={`Open photo ${index + 1}`} className={`hd-tile block ${className}`} style={{ background: "var(--t-surface)" }}>
      <img src={src} alt={index === 0 ? item.title : ""} className="absolute inset-0 h-full w-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
      {index === 4 && hidden > 0 ? <span className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold text-white" style={{ background: "rgba(8,12,20,.55)" }}>+{hidden}</span> : null}
    </button>
  );
  if (!rest.length) return tile(images[0], 0, "aspect-[16/8] w-full min-h-[220px]");
  return (
    <div className="grid gap-3 md:grid-cols-[1.5fr_1fr] md:gap-4">
      {tile(images[0], 0, "aspect-[4/3] md:aspect-auto md:min-h-[420px]")}
      <div className={`grid gap-3 md:gap-4 ${rest.length > 1 ? "grid-cols-2" : ""}`}>
        {rest.map((src, i) => tile(src, i + 1, "aspect-[4/3]"))}
      </div>
    </div>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService, c } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const rows = detailRows(service, item);
  const related = service.items.filter((o) => o.key !== item.key && (item.category ? o.category === item.category : true)).slice(0, 3);
  const includes: string[] = Array.isArray(item.raw?.inclusions) ? item.raw.inclusions : [];
  const price = priceLine(item);
  const seats = seatsOf(item);
  const highlights = [...item.features, ...includes];

  return (
    <div>
      <Crumbs items={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: service.name, onClick: () => goToService(service) }, { label: item.title }]} />
      <div className="tp-wrap pt-6 md:pt-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tp-h1" style={{ fontSize: "clamp(30px, 3.8vw, 50px)" }}>{item.title}</h1>
              <DietMark diet={item.dietary} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {item.badge ? <span className="tp-chip tp-chip-accent">{item.badge}</span> : null}
              {seats ? <span className="tp-chip">{Icon.users(13)} Up to {seats} people</span> : null}
              <Spice level={item.spiceLevel} />
              {item.chips.filter((chip) => !/people|beds/i.test(chip)).map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
            </div>
          </div>
          {price ? <p className="tp-display text-[clamp(24px,2.6vw,34px)]">{price}</p> : null}
        </div>
        <Reveal><Mosaic item={item} onOpen={setViewer} /></Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div className="flex flex-col gap-12">
            {item.description ? <Reveal><h2 className="tp-h3 mb-5">About this {service.profile.labels.item}</h2><Prose text={item.description} /></Reveal> : null}
            {highlights.length ? (
              <Reveal>
                <h2 className="tp-h3 mb-5">{includes.length && !item.features.length ? "What's included" : "In the room"}</h2>
                <ul className="grid gap-3.5 sm:grid-cols-2">{highlights.map((feature) => <li key={feature} className="flex items-center gap-3 text-[15.5px] font-medium"><Check />{feature}</li>)}</ul>
              </Reveal>
            ) : null}
            {rows.length ? (
              <Reveal>
                <h2 className="tp-h3 mb-5">Details</h2>
                <dl className="tp-card divide-y overflow-hidden" style={{ borderColor: "var(--t-line)" }}>
                  {rows.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-6 px-5 py-4 text-[15px]" style={{ borderColor: "var(--t-line)" }}><dt className="tp-muted">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}
                </dl>
              </Reveal>
            ) : null}
            {isStay(service.kind) ? <HouseInfo kind={service.kind} /> : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {service.leadEnabled ? (
              <Reveal>
                <div className="hd-panel p-6 md:p-8">
                  <h2 className="tp-h3 mb-1">{service.profile.labels.leadTitle}</h2>
                  <p className="tp-muted mb-6 text-[14.5px]">{price ? `${item.title} · ${price}` : "Our team will get back to you shortly."}</p>
                  <LeadFormPanel service={service} item={item} />
                </div>
              </Reveal>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <div className="mt-20">
            <HdHead title={c("services.related.title", service.kind === "menu" ? "You might also like" : `More ${service.profile.labels.items}`)} />
            <div className="flex flex-col gap-4">{related.map((other) => <RoomRow key={other.key} item={other} service={service} />)}</div>
          </div>
        ) : null}
      </div>
      <OtherServices current={service} />
      <PhotoViewer images={item.images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
    </div>
  );
};

/* ───────────────────────── services index ───────────────────────── */

export const ServicesIndex: React.FC = () => {
  const { services, draft, t, goToService, c } = useTpl();
  if (!services.length) {
    return (
      <>
        <PageHeader title="Services" sub="We're putting the finishing touches on this page." />
        <div className="h-24" />
      </>
    );
  }
  if (services.length === 1) return <ServicePage service={services[0]} />;
  return (
    <>
      <PageHeader title={draft?.productTitle || "Our services"} sub={c("services.index.sub", "Pick where you'd like to start.")} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Services" }]} />
      <section className="tp-wrap flex flex-col gap-6 py-10 md:gap-8 md:py-14">
        {services.map((service, index) => {
          const blurb = service.heroSubHeading && service.heroSubHeading !== service.subText ? service.heroSubHeading : "";
          return (
            <Reveal key={service.key} delay={Math.min(index * 0.05, 0.2)}>
              <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover grid w-full overflow-hidden text-left md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="tp-zoom tp-fill aspect-[16/10] md:aspect-auto md:min-h-[280px]">{service.cardImage ? <img src={service.cardImage} alt="" loading="lazy" /> : <Placeholder text={service.heading} />}</div>
                <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
                  <div className="flex items-center gap-3"><span className="hd-num">{String(index + 1).padStart(2, "0")}</span><span className="tp-chip">{service.items.length} {service.items.length === 1 ? service.profile.labels.item : service.profile.labels.items}</span></div>
                  <h2 className="tp-h2" style={{ fontSize: "clamp(26px, 3vw, 38px)" }}>{service.heading}</h2>
                  {service.subText ? <p className="text-[17px] font-medium leading-snug">{service.subText}</p> : null}
                  {blurb ? <p className="tp-muted text-[15.5px] leading-relaxed">{blurb}</p> : null}
                  {service.items.length ? <div className="flex flex-wrap gap-1.5">{service.items.slice(0, 4).map((item) => <span key={item.key} className="tp-chip">{item.title}</span>)}{service.items.length > 4 ? <span className="tp-chip">+{service.items.length - 4} more</span> : null}</div> : null}
                  <span className="tp-btn tp-btn-primary mt-2 self-start">Explore {Icon.arrow(16)}</span>
                </div>
              </button>
            </Reveal>
          );
        })}
      </section>
    </>
  );
};
