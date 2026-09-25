import React, { useMemo, useState } from "react";
import { AnimatePresence, Reveal, Stagger, motion } from "../motion";
import { formatTime12h } from "../leadForms";
import { uniqueCategories, type Service, type ServiceItem } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, Spice } from "../shared/TplUI";
import { Check, CardRow, Crumbs, CwHead, PageHeader, ServiceCards, SpaceCard, detailRows, priceLine } from "./CommonsUI";

/* ───────────────────────── policy, included ───────────────────────── */

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
      <h2 className="tp-h3 mb-6">What's included</h2>
      <Stagger className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
        {enabled.map((item, index) => {
          const { label, icon } = getInclusionMeta(item);
          return <div key={item?.key || index} className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>{icon}</span><span className="text-[14.5px] font-semibold leading-snug">{label}</span></div>;
        })}
      </Stagger>
    </div>
  );
};

/** Links to the business's other services, so a visitor on one page can still find the rest. */
const OtherServices: React.FC<{ current: Service }> = ({ current }) => {
  const { services } = useTpl();
  const others = services.filter((s) => s.key !== current.key);
  if (!others.length) return null;
  return (
    <section className="tp-wrap py-14">
      <CwHead title="More under one roof" />
      <ServiceCards services={others} />
    </section>
  );
};

/* ───────────────────────── service page ───────────────────────── */

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, openLead } = useTpl();
  const [tab, setTab] = useState("");
  const page = service.page || {};
  const categories = useMemo(() => uniqueCategories(service.items), [service.items]);
  const filtered = tab ? service.items.filter((item) => item.category === tab) : service.items;
  const tours = service.kind === "workspace" && service.leadEnabled;

  return (
    <>
      <PageHeader title={service.heroHeading} sub={service.heroSubHeading} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: service.name }]}>
        {tours ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(service)}>{service.profile.labels.cta} {Icon.arrow()}</button> : null}
      </PageHeader>

      {service.heroImage ? (
        <div className="tp-wrap pt-8 md:pt-10">
          <Reveal><div className="cw-tile aspect-[16/7] min-h-[180px]" style={{ background: "var(--t-surface)" }}><img src={service.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /></div></Reveal>
        </div>
      ) : null}

      <section className="tp-wrap py-10 md:py-14">
        {categories.length > 1 ? (
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter">
            <button type="button" className="tp-tab" aria-pressed={tab === ""} onClick={() => setTab("")}>All</button>
            {categories.map((category) => <button key={category} type="button" className="tp-tab" aria-pressed={tab === category} onClick={() => setTab(tab === category ? "" : category)}>{category}</button>)}
          </div>
        ) : service.items.length > 1 ? (
          <p className="tp-muted mb-8 text-[15px]"><strong style={{ color: "var(--t-text)" }}>{service.items.length}</strong> {service.profile.labels.items}</p>
        ) : null}

        {!service.items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">We're getting this ready — check back soon.</p>
        ) : (
          <CardRow>{filtered.map((item, index) => <SpaceCard key={item.key} item={item} service={service} index={index} />)}</CardRow>
        )}
      </section>

      <div className="tp-wrap flex flex-col gap-10 pb-6 md:gap-14">
        {isStay(service.kind) ? <HouseInfo kind={service.kind} /> : null}
        {page.inclusionsEnabled !== false ? <Included inclusions={page.inclusions} /> : null}
        {service.leadEnabled ? (
          <Reveal>
            <div className="tp-accent-panel flex flex-wrap items-center justify-between gap-5 p-7 md:p-10">
              <div>
                <h2 className="tp-h3" style={{ color: "inherit" }}>{service.kind === "workspace" ? "Not sure which space fits?" : "Can't find the right fit?"}</h2>
                <p className="mt-1.5 text-[15.5px] opacity-80">{service.kind === "workspace" ? "Tell us about your team and we'll suggest the best option." : "Tell us what you need and we'll help."}</p>
              </div>
              <button type="button" className="tp-btn tp-btn-dark" onClick={() => openLead(service)}>{service.profile.labels.cta}</button>
            </div>
          </Reveal>
        ) : null}
      </div>
      <OtherServices current={service} />
      {page.faqEnabled !== false ? <FaqSection faqs={page.faqs} /> : null}
    </>
  );
};

/* ───────────────────────── item detail ───────────────────────── */

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

/** One big photo with a thumbnail strip underneath. */
const Gallery: React.FC<{ item: ServiceItem; onOpen: (index: number) => void }> = ({ item, onOpen }) => {
  const [index, setIndex] = useState(0);
  if (!item.images.length) return <div className="cw-tile flex aspect-[16/8] items-center justify-center" style={{ background: "var(--t-surface)" }}><Placeholder text={item.title} /></div>;
  const current = Math.min(index, item.images.length - 1);
  return (
    <div>
      <button type="button" onClick={() => onOpen(current)} aria-label="Open photo" className="cw-tile block aspect-[16/8] w-full min-h-[220px]" style={{ background: "var(--t-surface)" }}>
        <AnimatePresence mode="sync">
          <motion.img key={item.images[current]} src={item.images[current]} alt={item.title} className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
        </AnimatePresence>
      </button>
      {item.images.length > 1 ? (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Photos">
          {item.images.map((src, i) => (
            <button key={`${src}-${i}`} type="button" aria-label={`Show photo ${i + 1}`} aria-pressed={i === current} onClick={() => setIndex(i)} className="h-[68px] w-[104px] shrink-0 overflow-hidden rounded-[10px] border-2 transition" style={{ borderColor: i === current ? "var(--t-text)" : "transparent", opacity: i === current ? 1 : 0.7 }}>
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const rows = detailRows(service, item);
  const related = service.items.filter((o) => o.key !== item.key && (item.category ? o.category === item.category : true)).slice(0, 3);
  const includes: string[] = Array.isArray(item.raw?.inclusions) ? item.raw.inclusions : [];
  const price = priceLine(item);
  const highlights = [...item.features, ...includes];

  return (
    <div>
      <Crumbs items={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: service.name, onClick: () => goToService(service) }, { label: item.title }]} />
      <div className="tp-wrap pt-6 md:pt-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="tp-h1" style={{ fontSize: "clamp(30px, 3.8vw, 50px)" }}>{item.title}</h1>
            <DietMark diet={item.dietary} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {item.badge ? <span className="tp-chip tp-chip-accent">{item.badge}</span> : null}
            <Spice level={item.spiceLevel} />
            {item.chips.map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
          </div>
        </div>
        <Reveal><Gallery item={item} onOpen={setViewer} /></Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div className="flex flex-col gap-12">
            {item.description ? <Reveal><h2 className="tp-h3 mb-5">About this {service.profile.labels.item}</h2><Prose text={item.description} /></Reveal> : null}
            {rows.length ? (
              <Reveal>
                <h2 className="tp-h3 mb-5">Details</h2>
                <dl className="tp-card divide-y overflow-hidden" style={{ borderColor: "var(--t-line)" }}>
                  {rows.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-6 px-5 py-4 text-[15px]" style={{ borderColor: "var(--t-line)" }}><dt className="tp-muted">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}
                </dl>
              </Reveal>
            ) : null}
            {highlights.length ? (
              <Reveal>
                <h2 className="tp-h3 mb-5">{includes.length && !item.features.length ? "What's included" : "Highlights"}</h2>
                <ul className="grid gap-3.5 sm:grid-cols-2">{highlights.map((feature) => <li key={feature} className="flex items-center gap-3 text-[15.5px] font-medium"><Check />{feature}</li>)}</ul>
              </Reveal>
            ) : null}
            {isStay(service.kind) ? <HouseInfo kind={service.kind} /> : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {service.leadEnabled ? (
              <Reveal>
                <div className="tp-card p-6 md:p-8" style={{ borderColor: "var(--t-text)", borderWidth: 2 }}>
                  <h2 className="tp-h3 mb-1">{service.profile.labels.leadTitle}</h2>
                  <p className="tp-muted mb-6 text-[14.5px]">{price ? `Starting at ${price}` : "Our team will get back to you shortly."}</p>
                  <LeadFormPanel service={service} item={item} />
                </div>
              </Reveal>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <div className="mt-20">
            <CwHead title={service.kind === "menu" ? "You might also like" : `More ${service.profile.labels.items}`} />
            <CardRow>{related.map((other, index) => <SpaceCard key={other.key} item={other} service={service} index={index} />)}</CardRow>
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
  const { services, draft, t, goToService } = useTpl();
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
      <PageHeader title={draft?.productTitle || "Our services"} sub="Pick where you'd like to start." crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Services" }]} />
      <section className="tp-wrap flex flex-col gap-8 py-10 md:gap-10 md:py-14">
        {services.map((service, index) => {
          const blurb = service.heroSubHeading && service.heroSubHeading !== service.subText ? service.heroSubHeading : "";
          return (
            <Reveal key={service.key} delay={Math.min(index * 0.05, 0.2)}>
              <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover grid w-full overflow-hidden text-left md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="tp-zoom tp-fill aspect-[16/10] md:aspect-auto md:min-h-[300px]">{service.cardImage ? <img src={service.cardImage} alt="" loading="lazy" /> : <Placeholder text={service.heading} />}</div>
                <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
                  <div className="flex items-center gap-3"><span className="cw-num">{String(index + 1).padStart(2, "0")}</span><span className="tp-chip">{service.items.length} {service.items.length === 1 ? service.profile.labels.item : service.profile.labels.items}</span></div>
                  <h2 className="tp-h2" style={{ fontSize: "clamp(26px, 3vw, 40px)" }}>{service.heading}</h2>
                  {service.subText ? <p className="text-[17px] font-medium leading-snug">{service.subText}</p> : null}
                  {blurb ? <p className="tp-muted text-[15.5px] leading-relaxed">{blurb}</p> : null}
                  {service.items.length ? <div className="flex flex-wrap gap-1.5">{service.items.slice(0, 4).map((item) => <span key={item.key} className="tp-chip">{item.title}</span>)}{service.items.length > 4 ? <span className="tp-chip">+{service.items.length - 4} more</span> : null}</div> : null}
                  <span className="mt-2 inline-flex items-center gap-2 self-start rounded-[10px] px-5 py-3 text-[14.5px] font-bold" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>Explore {Icon.arrow(16)}</span>
                </div>
              </button>
            </Reveal>
          );
        })}
      </section>
    </>
  );
};
