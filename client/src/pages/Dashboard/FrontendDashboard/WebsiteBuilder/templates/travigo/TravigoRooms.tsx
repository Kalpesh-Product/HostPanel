import React, { useState } from "react";
import { Reveal, Stagger } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { getInclusionMeta } from "../inclusionIcons";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";

const PageIntro: React.FC<{ eyebrow: string; title: string; sub?: string }> = ({ eyebrow, title, sub }) => (
  <section>
    <div className="tp-wrap pb-10 pt-10 md:pb-12 md:pt-14">
      <Reveal><p className="mb-4 text-[11px] font-bold uppercase tracking-[.18em]">{eyebrow}</p></Reveal>
      <Reveal delay={.05}><h1 className="max-w-5xl text-[clamp(56px,9vw,126px)] leading-[.84]">{title}</h1></Reveal>
      {sub ? <Reveal delay={.1}><p className="tp-muted mt-7 max-w-xl text-[16px] leading-7">{sub}</p></Reveal> : null}
    </div>
  </section>
);

const RoomCard: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem, openLead } = useTpl();
  return (
    <Reveal delay={Math.min(index * .05, .2)}>
      <article className="group border-t pt-5" style={{ borderColor: "color-mix(in srgb,var(--t-text) 22%,transparent)" }}>
        <button type="button" className="block w-full text-left" onClick={() => goToItem(service, item)}>
          <div className={`tp-zoom relative aspect-[4/3] overflow-hidden ${index % 3 === 1 ? "rounded-[999px_999px_0_0]" : index % 3 === 2 ? "rounded-[0_0_999px_999px]" : ""}`}>
            {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
            {item.badge ? <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-black">{item.badge}</span> : null}
          </div>
          <div className="flex items-start justify-between gap-4 py-5">
            <div>
              {item.chips.length ? <p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] opacity-55">{item.chips.slice(0, 3).join(" · ")}</p> : null}
              <h2 className="text-[23px] leading-tight md:text-[28px]">{item.title}</h2>
            </div>
            <p className="tp-display shrink-0 text-[17px]">{priceWithUnit(item.price, item.priceUnit)}</p>
          </div>
        </button>
        {service.leadEnabled ? <button type="button" className="mb-6 text-[12px] font-bold uppercase tracking-[.12em] underline underline-offset-4" onClick={() => openLead(service, item)}>Book this room</button> : null}
      </article>
    </Reveal>
  );
};

const FeatureBand: React.FC<{ service: Service }> = ({ service }) => {
  const raw = Array.isArray(service.page?.inclusions) ? service.page.inclusions : [];
  const values = raw.filter((item: any) => item?.enabled !== false).map((item: any) => getInclusionMeta(item).label);
  const fallback = service.items.flatMap((item) => item.features).filter((item, index, all) => item && all.indexOf(item) === index);
  const labels = (values.length ? values : fallback).slice(0, 16);
  if (!labels.length) return null;
  return (
    <section className="tp-section trv-cta">
      <div className="tp-wrap grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
        <Reveal><p className="mb-4 text-[11px] font-bold uppercase tracking-[.18em] text-white/55">We make vacations magical</p><h2 className="text-[clamp(42px,6vw,80px)] leading-[.92]">Luxury travel & features</h2></Reveal>
        <Stagger className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">{labels.map((label) => <div key={label} className="flex items-center gap-3 border-b border-white/15 pb-4 text-[14px]"><span className="h-2 w-2 rounded-full bg-[var(--t-secondary,#d8ff48)]" />{label}</div>)}</Stagger>
      </div>
    </section>
  );
};

export const TravigoServicePage: React.FC<{ service: Service }> = ({ service }) => (
  <>
    <PageIntro eyebrow="Explore rooms" title={service.heading || "Rooms & Suites"} sub={service.subText || undefined} />
    <section className="tp-wrap pb-16 md:pb-24">
      {service.items.length ? <Stagger className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">{service.items.map((item, index) => <RoomCard key={item.key} service={service} item={item} index={index} />)}</Stagger> : <p className="tp-muted border-y py-16 text-center">Rooms are being prepared.</p>}
    </section>
    <FeatureBand service={service} />
    {service.page?.faqEnabled !== false ? <FaqSection faqs={service.page?.faqs} /> : null}
  </>
);

export const TravigoServicesIndex: React.FC = () => {
  const { services, draft, goToService } = useTpl();
  if (services.length === 1) return <TravigoServicePage service={services[0]} />;
  return (
    <>
      <PageIntro eyebrow="Explore" title={draft?.productTitle || "Rooms & services"} />
      <section className="tp-wrap pb-20"><Stagger className="grid gap-6 md:grid-cols-2">{services.map((service, index) => <button key={service.key} type="button" onClick={() => goToService(service)} className="group border-t pt-5 text-left" style={{ borderColor: "color-mix(in srgb,var(--t-text) 22%,transparent)" }}><div className={`tp-zoom aspect-[16/11] overflow-hidden ${index % 2 ? "rounded-[999px_999px_0_0]" : ""}`}>{service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}</div><div className="flex items-end justify-between gap-4 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] opacity-55">{service.items.length} {service.profile.labels.items}</p><h2 className="mt-2 text-[30px]">{service.heading}</h2></div><span className="mb-1">{Icon.arrow(20)}</span></div></button>)}</Stagger></section>
    </>
  );
};

export const TravigoItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const images = item.images.length ? item.images : item.image ? [item.image] : [];
  const related = service.items.filter((other) => other.key !== item.key).slice(0, 3);
  return (
    <div>
      <div className="tp-wrap pb-10 pt-8 md:pb-12 md:pt-10">
        <nav className="mb-8 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[.12em] opacity-55"><button type="button" onClick={() => t.goToSection("home")}>Home</button><span>/</span><button type="button" onClick={() => goToService(service)}>{service.name}</button><span>/</span><span>{item.title}</span></nav>
        <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]"><Reveal><p className="mb-4 text-[11px] font-bold uppercase tracking-[.18em]">Room stay</p><h1 className="max-w-5xl text-[clamp(48px,7vw,96px)] leading-[.9]">{item.title}</h1></Reveal><Reveal delay={.08}><p className="tp-display text-[24px]">{priceWithUnit(item.price, item.priceUnit)}</p></Reveal></div>
        {images.length ? <div className="mt-12 grid h-[420px] grid-cols-2 gap-4 md:h-[620px] md:grid-cols-[1.25fr_.75fr] md:grid-rows-2"><button type="button" onClick={() => setViewer(0)} className="tp-zoom row-span-2 overflow-hidden"><img src={images[0]} alt={item.title} className="h-full w-full object-cover" /></button>{images.slice(1, 3).map((src, index) => <button key={src} type="button" onClick={() => setViewer(index + 1)} className={`tp-zoom hidden overflow-hidden md:block ${index === 0 ? "rounded-[999px_999px_0_0]" : "rounded-[0_0_999px_999px]"}`}><img src={src} alt="" className="h-full w-full object-cover" /></button>)}</div> : null}
      </div>
      <section className="tp-wrap grid gap-12 pb-20 lg:grid-cols-[1fr_390px] lg:gap-20">
        <div>
          <Reveal><p className="mb-4 text-[11px] font-bold uppercase tracking-[.18em]">About room</p><h2 className="text-[clamp(36px,4vw,58px)] leading-none">A comfortable place to land.</h2>{item.description ? <p className="tp-muted mt-6 whitespace-pre-line text-[16px] leading-8">{item.description}</p> : null}</Reveal>
          {item.features.length ? <div className="mt-12 border-t pt-8" style={{ borderColor: "color-mix(in srgb,var(--t-text) 20%,transparent)" }}><h3 className="text-[28px]">What this place offers</h3><Stagger className="mt-7 grid gap-4 sm:grid-cols-2">{item.features.map((feature) => <div key={feature} className="flex items-center gap-3 text-[15px]"><span className="flex h-8 w-8 items-center justify-center rounded-full border">{Icon.check(14)}</span>{feature}</div>)}</Stagger></div> : null}
        </div>
        {service.leadEnabled ? <Reveal delay={.08} className="lg:sticky lg:top-24 lg:self-start"><div className="border-y py-7" style={{ borderColor: "color-mix(in srgb,var(--t-text) 22%,transparent)" }}><p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em]">Reserve this room</p><h2 className="mb-6 text-[30px]">{service.profile.labels.leadTitle}</h2><LeadFormPanel service={service} item={item} /></div></Reveal> : null}
      </section>
      {related.length ? <section className="tp-soft tp-section"><div className="tp-wrap"><h2 className="mb-10 text-[clamp(38px,5vw,66px)]">Other rooms</h2><div className="grid gap-6 md:grid-cols-3">{related.map((other, index) => <RoomCard key={other.key} service={service} item={other} index={index} />)}</div></div></section> : null}
      <PhotoViewer images={images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
    </div>
  );
};
