import React, { useState } from "react";
import { AnimatePresence, CountUp, Marquee, Reveal, Stagger, motion } from "../motion";
import type { Service } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { todayISO } from "../leadForms";
import { contentSteps } from "../templateContent";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { CardRow, Check, CwHead, ServiceCards, firstOpenHours, priceLine } from "./CommonsUI";

const HEADINGS: Record<string, string> = {
  workspace: "Find your space",
  coLiving: "Find your room",
  workation: "Choose your package",
  hostel: "Choose your stay",
  menu: "Popular right now",
  meeting: "Pick a room",
};

const totalSeats = (service: Service | null) =>
  (service?.items || []).reduce((sum, item) => sum + (Number(item.raw?.seats) > 0 ? Number(item.raw.seats) : 0), 0);

/* ───────────────────────── hero + finder ───────────────────────── */

const Hero: React.FC = () => {
  const { t, draft, primary, profile, rating, status, openLead, goToService, c } = useTpl();
  const heroImages: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const gallery: string[] = [...(t.homeGalleryItems || []), ...(t.galleryItems || [])];
  const main = heroImages.length ? heroImages[t.heroIndex % heroImages.length] : gallery[0] || "";
  const words = String(draft?.title || draft?.companyName || "").trim().split(/\s+/).filter(Boolean);
  const last = words.length > 1 ? words.pop() : "";
  const head = words.join(" ");
  const spaces = primary?.items || [];
  const [want, setWant] = useState("");
  const [people, setPeople] = useState("");
  const [date, setDate] = useState("");

  const find = (event: React.FormEvent) => {
    event.preventDefault();
    if (!primary) return;
    // No live availability: the request goes to the team as a lead, with what was filled in.
    openLead(primary, spaces.find((entry) => entry.title === want) || null, { form: { people, startDate: date } });
  };

  return (
    <section className="tp-wrap pt-4 md:pt-6">
      <div className="cw-on-photo relative overflow-hidden rounded-[28px] text-white md:min-h-[700px]" style={{ background: "var(--t-ink)" }}>
        <AnimatePresence mode="sync">
          {main ? <motion.img key={main} src={main} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} /> : null}
        </AnimatePresence>
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(6,16,36,.88) 0%, rgba(6,16,36,.6) 48%, rgba(6,16,36,.15) 100%), linear-gradient(0deg, rgba(6,16,36,.55), transparent 45%)" }} />
        <div className="relative grid gap-10 p-6 pb-8 pt-16 md:p-12 md:pb-12 md:pt-24 lg:min-h-[700px] lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-12">
          <div>
            <Reveal y={10}>
              <div className="flex flex-wrap items-center gap-2">
                {rating.count > 0 ? <span className="tp-chip" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}><span style={{ color: "var(--t-accent)" }}>{Icon.star(13)}</span> {rating.avg.toFixed(1)} · {rating.count} review{rating.count > 1 ? "s" : ""}</span> : null}
                {status ? <span className="tp-chip" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}><span className="inline-block h-2 w-2 rounded-full" style={{ background: status.open ? "#3ddc97" : "#ff6b6b" }} /> {status.text}</span> : null}
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="tp-h1 mt-6 max-w-5xl" style={{ fontSize: "clamp(40px, 6.2vw, 92px)" }}>
                {head}{last ? " " : ""}{last ? <span style={{ color: "var(--t-accent)" }}>{last}</span> : null}
              </h1>
            </Reveal>
            {draft?.subTitle ? <Reveal delay={0.12}><p className="mt-6 max-w-xl text-[clamp(16px,1.5vw,19px)] leading-relaxed opacity-90">{draft.subTitle}</p></Reveal> : null}
            <Reveal delay={0.18} className="mt-8 flex flex-wrap gap-3">
              {primary?.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{draft?.CTAButtonText || profile.labels.cta} {Icon.arrow()}</button> : null}
              {primary ? <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToService(primary)}>{c("home.hero.secondaryCta", `Explore ${profile.labels.listing.toLowerCase()}`)}</button> : null}
            </Reveal>
          </div>

          {primary?.leadEnabled && t.isSectionEnabled("home_finder") ? (
            <Reveal delay={0.2} y={30}>
              <form onSubmit={find} className="rounded-[20px] bg-white p-5 shadow-2xl md:p-6" style={{ color: "#0b1f3a" }} aria-label="Find your space">
                <p className="tp-display text-[22px]">{c("home.finder.title", primary.kind === "workspace" ? "Find your space" : profile.labels.leadTitle)}</p>
                <p className="mt-1 text-[13.5px]" style={{ color: "#5b6b82" }}>{c("home.finder.sub", "Tell us what you need and we'll confirm availability.")}</p>
                <div className="mt-5 space-y-4">
                  {spaces.length ? (
                    <div>
                      <label className="tp-label" htmlFor="cw-find-what">I'm looking for</label>
                      <select id="cw-find-what" className="tp-input" value={want} onChange={(e) => setWant(e.target.value)}>
                        <option value="">Not sure yet</option>
                        {spaces.map((entry) => <option key={entry.key} value={entry.title}>{entry.title}</option>)}
                      </select>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="tp-label" htmlFor="cw-find-people">{primary.kind === "workspace" ? "Team size" : "People"}</label>
                      <input id="cw-find-people" type="number" min={1} className="tp-input" placeholder="e.g. 4" value={people} onChange={(e) => setPeople(e.target.value)} />
                    </div>
                    <div>
                      <label className="tp-label" htmlFor="cw-find-date">Preferred date</label>
                      <input id="cw-find-date" type="date" min={todayISO()} className="tp-input" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" className="tp-btn tp-btn-primary w-full">{c("home.finder.button", primary.kind === "workspace" ? "Find my space" : profile.labels.cta)} {Icon.arrow()}</button>
                </div>
              </form>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── member logos ───────────────────────── */

const Logos: React.FC = () => {
  const { draft } = useTpl();
  const config = draft?.logoCarousel;
  const logos: string[] = (Array.isArray(config?.logos) ? config.logos : []).map((item: any) => (typeof item === "string" ? item : item?.url || item?.preview || "")).filter(Boolean);
  if (!config?.enabled || !logos.length) return null;
  return (
    <section style={{ borderTop: "1px solid var(--t-line)", borderBottom: "1px solid var(--t-line)" }}>
      <div className="tp-wrap py-9">
        <p className="tp-muted mb-6 text-center text-[12.5px] font-bold uppercase tracking-[0.14em]">{config.title || "Trusted by teams at"}</p>
        <Marquee speed={38}>
          {logos.map((src, index) => <img key={`${src}-${index}`} src={src} alt="" className="h-9 w-auto max-w-[150px] object-contain opacity-70 grayscale" loading="lazy" />)}
        </Marquee>
      </div>
    </section>
  );
};

/* ───────────────────────── space explorer ───────────────────────── */

const Explorer: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService, goToItem, openLead, c } = useTpl();
  const featured = service.items.filter((i) => i.featured || i.popular || i.badge);
  const items = [...featured, ...service.items.filter((i) => !featured.includes(i))].slice(0, 6);
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  const item = items[Math.min(active, items.length - 1)];
  const price = priceLine(item);

  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <CwHead
          title={c("home.spaces.title", HEADINGS[service.kind] || service.profile.labels.listing)}
          sub={c("home.spaces.sub", service.subText) || undefined}
          action={<button type="button" className="tp-link" onClick={() => goToService(service)}>See all {service.items.length} <span className="tp-arrow">{Icon.arrow()}</span></button>}
        />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
          <div role="tablist" aria-label={service.profile.labels.listing} className="hidden self-start overflow-hidden rounded-2xl border lg:block" style={{ borderColor: "var(--t-line)", background: "var(--t-raised)" }}>
            {items.map((entry, index) => (
              <button key={entry.key} type="button" role="tab" aria-selected={index === active} className="cw-tabitem" onClick={() => setActive(index)} style={index === items.length - 1 ? { borderBottom: 0 } : undefined}>
                <span className="cw-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                <span aria-hidden="true">{Icon.arrow(18)}</span>
              </button>
            ))}
          </div>
          <div className="lg:hidden"><div className="tp-scroll-x" role="tablist" aria-label={service.profile.labels.listing}>
            {items.map((entry, index) => <button key={entry.key} type="button" role="tab" aria-selected={index === active} className="tp-tab" aria-pressed={index === active} onClick={() => setActive(index)}>{entry.title}</button>)}
          </div></div>

          <div>
            <AnimatePresence mode="wait">
              <motion.div key={item.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} role="tabpanel">
                <div className="tp-zoom tp-fill aspect-[16/10] rounded-2xl">
                  {item.image ? <img src={item.image} alt={item.title} /> : <Placeholder text={item.title} />}
                  {item.badge ? <span className="tp-chip tp-chip-accent absolute left-4 top-4">{item.badge}</span> : null}
                </div>
                <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
                  <div>
                    <h3 className="tp-h3 !text-[clamp(24px,2.6vw,34px)]">{item.title}</h3>
                    {price ? <p className="tp-muted mt-2 text-[14.5px]">Starting at <strong style={{ color: "var(--t-text)" }}>{price}</strong></p> : null}
                    {item.chips.length ? <div className="mt-4 flex flex-wrap gap-1.5">{item.chips.slice(0, 5).map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}</div> : null}
                    {item.description ? <p className="tp-lead tp-clamp3 mt-4 !text-[16px]">{item.description}</p> : null}
                  </div>
                  <div className="flex flex-col justify-between gap-5">
                    {item.features.length ? <ul className="space-y-2.5">{item.features.slice(0, 5).map((feature) => <li key={feature} className="flex items-center gap-3 text-[14.5px] font-medium"><Check />{feature}</li>)}</ul> : <span />}
                    <div className="flex flex-wrap gap-3">
                      {service.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(service, item)}>{service.profile.labels.itemCta}</button> : null}
                      <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToItem(service, item)}>Details</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── amenities, numbers, community ───────────────────────── */

const Amenities: React.FC = () => {
  const { draft, c } = useTpl();
  const enabled = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <section className="cw-dark mt-16 md:mt-24" style={{ background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
      <div className="tp-wrap py-16 md:py-24">
        <CwHead onDark title={c("home.amenities.title", "Everything included, from day one")} sub={c("home.amenities.sub", "The things that make a working day easy, ready when you arrive.")} />
        <CardRow cols={4} gap={14}>
          {enabled.map((item, index) => {
            const { label, icon } = getInclusionMeta(item);
            return (
              <Reveal key={item?.key || index} delay={Math.min(index * 0.05, 0.3)} className="h-full">
                <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-4 rounded-2xl border p-5 text-center" style={{ borderColor: "color-mix(in srgb, var(--t-on-ink) 16%, transparent)", background: "color-mix(in srgb, var(--t-on-ink) 6%, transparent)" }}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-[12px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>{icon}</span>
                  <span className="text-[15px] font-semibold leading-snug">{label}</span>
                </div>
              </Reveal>
            );
          })}
        </CardRow>
      </div>
    </section>
  );
};

const TOUR_STEPS = [
  { title: "Book a visit", body: "Pick a day and a time that suits you. It takes a minute." },
  { title: "Take a tour", body: "Walk the floor, meet the team and try a desk for yourself." },
  { title: "Pick your space", body: "Choose the desk, cabin or suite that fits, and move in when you're ready." },
];

const TourSteps: React.FC = () => {
  const { t, draft, primary, c } = useTpl();
  if (!primary?.leadEnabled || primary.kind !== "workspace" || draft?.tourBooking?.enabled === false) return null;
  const pool: string[] = Array.from(new Set([...(t.galleryItems || []), ...(t.homeGalleryItems || []), ...(t.heroImages || [])].filter(Boolean)));
  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <CwHead title={c("home.steps.title", "From first visit to your own desk")} />
        <div className="grid gap-5 md:grid-cols-3">
          {contentSteps(draft, TOUR_STEPS).map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1} className="h-full">
              <div className="tp-card h-full overflow-hidden">
                <div className="tp-fill aspect-[4/3]">
                  {step.image || pool[(index + 1) % Math.max(pool.length, 1)] ? <img src={step.image || pool[(index + 1) % pool.length]} alt="" loading="lazy" /> : <Placeholder text={step.title} />}
                  <span className="tp-display absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-[12px] text-[22px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>{index + 1}</span>
                </div>
                <div className="p-6"><h3 className="tp-h3 mb-2">{step.title}</h3><p className="tp-muted text-[15px] leading-relaxed">{step.body}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const Numbers: React.FC = () => {
  const { draft, primary, profile, rating } = useTpl();
  const hours = firstOpenHours(draft?.openingHours);
  const seats = totalSeats(primary);
  const stats: { value: string; label: string; count?: boolean }[] = [
    primary?.items.length ? { value: String(primary.items.length), label: primary.items.length > 1 ? `${profile.labels.items} to choose from` : `${profile.labels.item} to choose from`, count: true } : null,
    seats > 0 ? { value: String(seats), label: "seats in total", count: true } : null,
    hours ? { value: hours.hours.replace(/:00/g, ""), label: hours.days } : null,
    rating.count ? { value: rating.avg.toFixed(1), label: `average from ${rating.count} review${rating.count > 1 ? "s" : ""}` } : null,
  ].filter(Boolean) as any;
  if (stats.length < 2) return null;
  return (
    <section className="mt-10 md:mt-14" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="grid gap-y-10 py-12 md:py-16" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}>
            {stats.slice(0, 4).map((stat, index) => (
              <div key={stat.label} className={`px-2 md:px-8 ${index > 0 ? "md:border-l" : ""}`} style={{ borderColor: "rgba(0,0,0,.18)" }}>
                <p className={`tp-display leading-none ${stat.count ? "text-[clamp(44px,7.4vw,108px)]" : "text-[clamp(22px,2.6vw,36px)]"}`}>{stat.count ? <CountUp value={stat.value} /> : stat.value}</p>
                <p className="mt-3 text-[14px] font-medium opacity-80">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Community: React.FC = () => {
  const { t, draft, photo, c } = useTpl();
  const blocks: string[] = t.aboutBlocks.map((b: any) => String(typeof b === "string" ? b : b?.text || "").trim()).filter(Boolean);
  const images: string[] = [0, 1, 2].map((i) => photo(`home.community.image${i + 1}`, t.homeGalleryItems[i] || ""));
  if (!blocks.length) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <Reveal><span aria-hidden="true" className="mb-5 block h-1.5 w-14 rounded-full" style={{ background: "var(--t-accent)" }} /></Reveal>
          <Reveal delay={0.05}><h2 className="tp-h2">{draft?.aboutTitle || `About ${draft?.companyName || "us"}`}</h2></Reveal>
          <Stagger className="mt-6 space-y-4">
            {blocks.slice(0, 2).map((text, index) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16px] leading-relaxed"}>{text}</p>)}
          </Stagger>
          <Reveal delay={0.15}><button type="button" className="tp-link mt-8" onClick={() => t.goToSection("about")}>{c("home.about.link", "Read our story")} <span className="tp-arrow">{Icon.arrow()}</span></button></Reveal>
        </div>
        <Reveal>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="cw-tile row-span-2 aspect-[3/4]" style={{ background: "var(--t-surface)" }}>{images[0] ? <img src={images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <Placeholder text={draft?.companyName || ""} />}</div>
            {images[1] ? <div className="cw-tile aspect-[4/3]"><img src={images[1]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div> : <div className="cw-tile aspect-[4/3]" style={{ background: "var(--t-accent)" }} />}
            {images[2] ? <div className="cw-tile aspect-[4/3]"><img src={images[2]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div> : <div className="cw-tile aspect-[4/3]" style={{ background: "var(--t-ink)" }} />}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── reviews ───────────────────────── */

export const CwReview: React.FC<{ item: any }> = ({ item }) => (
  <figure className="tp-card flex h-full flex-col gap-5 p-6">
    <span className="tp-display text-[54px] leading-[0.6]" style={{ color: "var(--t-accent)" }} aria-hidden="true">“</span>
    <blockquote className="tp-clamp3 flex-1 text-[16px] leading-relaxed">{item.text}</blockquote>
    <figcaption className="flex items-center gap-3 border-t pt-5" style={{ borderColor: "var(--t-line)" }}>
      <span className="tp-display flex h-11 w-11 items-center justify-center overflow-hidden rounded-[10px] text-[16px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>
        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold">{item.name}</span>{item.role ? <span className="tp-muted block text-[12.5px]">{item.role}</span> : null}</span>
      <StarRow value={item.rating || 5} size={13} />
    </figcaption>
  </figure>
);

const Reviews: React.FC = () => {
  const { t, rating, c } = useTpl();
  const list: any[] = t.testimonials.slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap grid gap-10 lg:grid-cols-[0.6fr_1.4fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <span aria-hidden="true" className="block h-1.5 w-14 rounded-full" style={{ background: "var(--t-accent)" }} />
          {rating.count ? (
            <>
              <p className="tp-display mt-6 text-[clamp(72px,9vw,120px)] leading-none">{rating.avg.toFixed(1)}</p>
              <div className="mt-4" style={{ color: "var(--t-text)" }}><StarRow value={rating.avg} size={20} /></div>
              <p className="tp-muted mt-3 text-[15px]">from {rating.count} member review{rating.count > 1 ? "s" : ""}</p>
            </>
          ) : <h2 className="tp-h2 mt-5">{c("home.reviews.title", "What members say")}</h2>}
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm" onClick={() => t.goToSection("testimonials")}>{c("home.reviews.link", "All reviews")}</button>
            {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button> : null}
          </div>
        </Reveal>
        <div className="border-t" style={{ borderColor: "var(--t-line)" }}>
          {list.map((item, index) => (
            <Reveal key={item.key || index} delay={index * 0.08}>
              <figure className="border-b py-8 md:py-10" style={{ borderColor: "var(--t-line)" }}>
                <blockquote className="tp-display text-[clamp(20px,2.3vw,30px)] leading-snug" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>“{item.text}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="tp-display flex h-11 w-11 items-center justify-center overflow-hidden rounded-[10px] text-[16px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #111)" }}>
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <span><span className="block text-[15px] font-bold">{item.name}</span>{item.role ? <span className="tp-muted block text-[13px]">{item.role}</span> : null}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── other services, visit band ───────────────────────── */

const MoreServices: React.FC<{ services: Service[] }> = ({ services }) => {
  const { c } = useTpl();
  if (!services.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <CwHead title={c("home.services.title", "More under one roof")} />
        <ServiceCards services={services} />
      </div>
    </section>
  );
};

const VisitBand: React.FC = () => {
  const { t, draft, primary, profile, c } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  const form = primary?.leadEnabled ? primary : null;
  const tours = (form?.kind === "workspace" || form?.kind === "coLiving") && draft?.tourBooking?.enabled !== false;
  const hours = firstOpenHours(draft?.openingHours);
  const row = (icon: React.ReactNode, text: React.ReactNode) => <p className="flex items-start gap-3 text-[16px] font-medium"><span className="mt-1 shrink-0">{icon}</span><span>{text}</span></p>;

  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-accent-panel grid gap-10 p-7 md:p-14 lg:grid-cols-2 lg:items-stretch lg:gap-16">
            <div className="flex flex-col gap-6">
              <h2 className="tp-h2">{c("home.visit.title", tours ? "Come and work from here for a day" : form ? profile.labels.leadTitle : draft?.contactTitle || "Come say hello")}</h2>
              <div className="space-y-3">
                {t.contactAddress ? row(Icon.pin(18), t.contactAddress) : null}
                {t.contactPhone ? row(Icon.phone(18), t.contactPhone) : null}
                {t.contactEmail ? row(Icon.mail(18), <span className="break-all">{t.contactEmail}</span>) : null}
                {hours ? row(Icon.clock(18), `${hours.days}: ${hours.hours}`) : draft?.contactBusinessHours ? row(Icon.clock(18), draft.contactBusinessHours) : null}
              </div>
              {draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="mt-2 min-h-[260px] w-full flex-1 border-0" style={{ borderRadius: 14 }} /> : null}
              {!form ? <div><button type="button" className="tp-btn tp-btn-dark" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")}</button></div> : null}
            </div>
            {form ? (
              <div className="tp-card p-6 md:p-8" style={{ color: "var(--t-text)" }}>
                <h3 className="tp-h3 mb-1">{c("home.visit.formTitle", tours ? "Schedule a visit" : profile.labels.leadTitle)}</h3>
                <p className="tp-muted mb-6 text-[14.5px]">{c("home.visit.formSub", tours ? "Pick a day and we'll show you around." : "Share a few details and we'll get back to you.")}</p>
                <LeadFormPanel service={form} defaultMode="visit" />
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── page ───────────────────────── */

export const CommonsHome: React.FC = () => {
  const { t, draft, primary, services } = useTpl();
  const others = services.filter((service) => service.key !== primary?.key);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero /> : null}
      <Logos />
      {t.isSectionEnabled("home_stats") ? <Numbers /> : null}
      {t.isSectionEnabled("home_products") && primary ? <Explorer service={primary} /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Amenities /> : null}
      {t.isSectionEnabled("home_products") && t.isSectionEnabled("home_steps") ? <TourSteps /> : null}
      {t.isSectionEnabled("home_about") ? <Community /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {others.length && t.isSectionEnabled("home_products") && t.isSectionEnabled("home_services") ? <MoreServices services={others} /> : null}
      <FaqSection faqs={draft?.faqs} />
      <VisitBand />
    </>
  );
};
