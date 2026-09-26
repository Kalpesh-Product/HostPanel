import React, { useEffect, useState } from "react";
import { AnimatePresence, CountUp, Reveal, Stagger, motion, useReducedMotion } from "../motion";
import { formatTime12h } from "../leadForms";
import { contentSteps } from "../templateContent";
import type { Service } from "../serviceAdapter";
import { groupOpeningHours } from "../templateKit";
import { getInclusionMeta } from "../inclusionIcons";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, SectionHead } from "../shared/TplUI";
import { CardRow, RoomCard, ServiceCards, Stars, Steps, cheapestItem, stepsFor, unitText } from "./HavenUI";

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/* ───────────────────────── hero ───────────────────────── */

const Hero: React.FC = () => {
  const { t, draft, primary, profile, rating, status, openLead, goToService, c } = useTpl();
  const reduce = useReducedMotion();
  const images: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const main = images.length ? images[t.heroIndex % images.length] : "";
  const second = images.length > 1 ? images[(t.heroIndex + 1) % images.length] : (t.homeGalleryItems?.[0] as string) || "";
  const cheapest = cheapestItem(primary);
  const unit = cheapest ? unitText(cheapest.priceUnit) : "";

  return (
    <section className="relative overflow-hidden pt-[104px] md:pt-[128px]">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-10 h-[460px] w-[460px] rounded-full" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--t-accent) 11%, transparent), transparent 68%)" }} />
      <div className="tp-wrap relative grid items-center gap-12 pb-14 md:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <Reveal y={10}>
            <div className="flex flex-wrap items-center gap-2">
              {rating.count > 0 ? <span className="tp-chip tp-chip-accent">{Icon.star(13)} {rating.avg.toFixed(1)} · {rating.count} review{rating.count > 1 ? "s" : ""}</span> : null}
              {status ? <span className="tp-chip"><span className="hv-dot" style={{ background: status.open ? "#2fae6b" : "#d9534f" }} /> {status.text}</span> : null}
            </div>
          </Reveal>
          <Reveal delay={0.06}><h1 className="tp-h1 mt-5">{draft?.title || draft?.companyName}</h1></Reveal>
          {draft?.subTitle ? <Reveal delay={0.12}><p className="tp-lead mt-6 max-w-xl">{draft.subTitle}</p></Reveal> : null}
          <Reveal delay={0.18} className="mt-9 flex flex-wrap gap-3">
            {primary?.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{draft?.CTAButtonText || profile.labels.cta} {Icon.arrow()}</button> : null}
            {primary ? <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToService(primary)}>{c("home.hero.secondaryCta", `Explore ${profile.labels.listing.toLowerCase()}`)}</button> : null}
          </Reveal>
        </div>

        <Reveal delay={0.1} y={40}>
          <div className="relative mx-auto w-full max-w-[440px] lg:ml-auto lg:mr-0">
            <div className="hv-arch relative aspect-[4/5]" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--t-accent) 30%, var(--t-surface)), var(--t-surface))" }}>
              <AnimatePresence mode="sync">
                {main ? <motion.img key={main} src={main} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} /> : null}
              </AnimatePresence>
            </div>
            {second ? (
              <div className="tp-zoom absolute -bottom-7 -left-8 hidden h-36 w-36 overflow-hidden rounded-full border-[6px] sm:block" style={{ borderColor: "var(--t-bg)" }}>
                <img src={second} alt="" />
              </div>
            ) : null}
            {cheapest ? (
              <motion.div
                className="hv-pill absolute right-2 top-10 rounded-3xl px-5 py-4 sm:-right-5"
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <p className="tp-muted text-[11.5px] font-semibold">Starting from</p>
                <p className="tp-display mt-0.5 text-[26px] leading-none">{cheapest.price}</p>
                {unit ? <p className="tp-muted mt-1 text-[12px]">per {unit}</p> : null}
              </motion.div>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── facts strip ───────────────────────── */

const Facts: React.FC = () => {
  const { draft, primary, profile, rating } = useTpl();
  if (!primary) return null;
  const policy = draft?.stayPolicy || {};
  const cheapest = cheapestItem(primary);
  const raws = primary.items.map((item) => item.raw || {});
  const stays = raws.map((r) => Number(r.minStayMonths)).filter((n) => n > 0);
  const today = new Date().toISOString().slice(0, 10);
  const moveIns = raws.map((r) => String(r.availableFrom || "")).filter(Boolean).sort();
  const nextMoveIn = moveIns.find((d) => d >= today) || moveIns[0];

  const facts: { label: string; value: string }[] = [
    primary.items.length ? { label: profile.labels.items.charAt(0).toUpperCase() + profile.labels.items.slice(1), value: String(primary.items.length) } : null,
    cheapest ? { label: unitText(cheapest.priceUnit) ? `From, per ${unitText(cheapest.priceUnit)}` : "Starting from", value: cheapest.price } : null,
    primary.kind === "coLiving" && stays.length ? { label: "Minimum stay", value: `${Math.min(...stays)} month${Math.min(...stays) > 1 ? "s" : ""}` } : null,
    primary.kind === "coLiving" && nextMoveIn ? { label: "Next move-in", value: formatDate(nextMoveIn) } : null,
    primary.kind !== "coLiving" && policy.checkInTime ? { label: "Check-in from", value: formatTime12h(policy.checkInTime) } : null,
    rating.count ? { label: "Resident rating", value: `${rating.avg.toFixed(1)} / 5` } : null,
  ].filter(Boolean) as { label: string; value: string }[];
  if (facts.length < 2) return null;
  const shown = facts.slice(0, 4);

  return (
    <div className="tp-wrap">
      <Reveal>
        <dl className={`grid grid-cols-2 gap-y-8 py-9 md:py-10 ${shown.length === 4 ? "md:grid-cols-4" : shown.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} hv-rule`} style={{ borderBottom: "1px solid var(--t-line)" }}>
          {shown.map((fact, index) => (
            <div key={fact.label} className={`flex flex-col-reverse px-2 text-center md:px-6 ${index > 0 ? "md:border-l" : ""}`} style={{ borderColor: "var(--t-line)" }}>
              <dt className="tp-muted mt-3 text-[13.5px] font-medium">{fact.label}</dt>
              <dd className="tp-display text-[clamp(26px,3.2vw,40px)] leading-none"><CountUp value={fact.value} /></dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </div>
  );
};

/* ───────────────────────── rooms ───────────────────────── */

const HEADINGS: Record<string, string> = {
  coLiving: "Find your room",
  workation: "Choose your package",
  hostel: "Choose your stay",
  menu: "Popular right now",
  meeting: "Pick a room",
};

const Rooms: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService, c } = useTpl();
  const featured = service.items.filter((i) => i.featured || i.popular || i.badge);
  const list = [...featured, ...service.items.filter((i) => !featured.includes(i))].slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="tp-section" style={{ paddingBottom: 24 }}>
      <div className="tp-wrap">
        <SectionHead
          eyebrow={c("home.rooms.eyebrow", service.profile.labels.listing)}
          title={c("home.rooms.title", HEADINGS[service.kind] || service.profile.labels.listing)}
          sub={c("home.rooms.sub", service.subText) || undefined}
          action={<button type="button" className="tp-link" onClick={() => goToService(service)}>See all {service.items.length} <span className="tp-arrow">{Icon.arrow()}</span></button>}
        />
        <CardRow>
          {list.map((item, index) => (
            <Reveal key={item.key} delay={index * 0.08} className="h-full"><RoomCard item={item} service={service} index={index} /></Reveal>
          ))}
        </CardRow>
      </div>
    </section>
  );
};

/* ───────────────────────── community, amenities, steps, gallery ───────────────────────── */

const Community: React.FC = () => {
  const { t, draft, primary, photo, c } = useTpl();
  const blocks: string[] = t.aboutBlocks.map((b: any) => String(typeof b === "string" ? b : b?.text || "").trim()).filter(Boolean);
  const images: string[] = [0, 1].map((i) => photo(`home.community.image${i + 1}`, t.homeGalleryItems[i] || ""));
  if (!blocks.length) return null;
  const living = primary?.kind === "coLiving";
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-24">
        <Reveal>
          {images[1] ? (
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              <div className="hv-arch tp-zoom aspect-[3/4]"><img src={images[0]} alt="" loading="lazy" /></div>
              <div className="hv-arch tp-zoom mt-12 aspect-[3/4]"><img src={images[1]} alt="" loading="lazy" /></div>
            </div>
          ) : (
            <div className="hv-arch tp-zoom mx-auto aspect-[4/5] max-w-[420px]">{images[0] ? <img src={images[0]} alt="" loading="lazy" /> : <Placeholder text={draft?.companyName || ""} />}</div>
          )}
        </Reveal>
        <div>
          <Reveal><p className="tp-eyebrow mb-4">{living ? "Our community" : "About us"}</p></Reveal>
          <Reveal delay={0.05}><h2 className="tp-h2">{draft?.aboutTitle || `About ${draft?.companyName || "us"}`}</h2></Reveal>
          <Stagger className="mt-6 space-y-4">
            {blocks.slice(0, 2).map((text, index) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16px] leading-relaxed"}>{text}</p>)}
          </Stagger>
          <Reveal delay={0.15}><button type="button" className="tp-link mt-8" onClick={() => t.goToSection("about")}>{c("home.about.link", "Read our story")} <span className="tp-arrow">{Icon.arrow()}</span></button></Reveal>
        </div>
      </div>
    </section>
  );
};

const Amenities: React.FC = () => {
  const { draft, primary, c } = useTpl();
  const enabled = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  const living = primary?.kind === "coLiving";
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <div className="tp-soft grid gap-10 p-7 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:p-14" style={{ borderRadius: 40 }}>
          <Reveal>
            <p className="tp-eyebrow mb-4">{living ? "Life here" : "Amenities"}</p>
            <h2 className="tp-h2">{c("home.amenities.title", "Everything you need, already here")}</h2>
            <p className="tp-lead mt-5">{c("home.amenities.sub", "The small things that make everyday life easy, included from day one.")}</p>
          </Reveal>
          <Stagger className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {enabled.map((item, index) => {
              const { label, icon } = getInclusionMeta(item);
              return (
                <div key={item?.key || index} className="hv-spec">
                  <span className="hv-spec-icon">{icon}</span>
                  <span className="text-[14.5px] font-semibold leading-snug">{label}</span>
                </div>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
};

const HowItWorks: React.FC = () => {
  const { draft, primary, c } = useTpl();
  const steps = contentSteps(draft, stepsFor(primary, draft?.tourBooking?.enabled !== false));
  if (!primary?.leadEnabled || !steps.length) return null;
  const titles: Record<string, string> = { coLiving: "From hello to home", workation: "Your workation, step by step", hostel: "Booking made simple" };
  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <SectionHead eyebrow={c("home.steps.eyebrow", "How it works")} title={c("home.steps.title", titles[primary.kind] || "How it works")} />
        <Steps steps={steps} />
      </div>
    </section>
  );
};

const GalleryStrip: React.FC = () => {
  const { t, c } = useTpl();
  const items: string[] = t.galleryItems;
  if (items.length < 2) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow={c("home.gallery.eyebrow", "Gallery")} title={c("home.gallery.title", "A look around")} action={<button type="button" className="tp-link" onClick={() => t.goToSection("gallery")}>{c("home.gallery.link", "All photos")} <span className="tp-arrow">{Icon.arrow()}</span></button>} />
      </div>
      <Reveal>
        <div className="hv-snap hv-bleed pb-2">
          {items.slice(0, 10).map((src, index) => (
            <button key={`${src}-${index}`} type="button" onClick={() => t.openGalleryViewer(index)} aria-label={`Open photo ${index + 1}`} className="tp-zoom h-[300px] w-[230px] md:h-[400px] md:w-[300px]" style={{ borderRadius: index % 2 === 0 ? "999px 999px 28px 28px" : 28, marginTop: index % 2 === 0 ? 0 : 28 }}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </Reveal>
    </section>
  );
};

/* ───────────────────────── reviews ───────────────────────── */

const Reviews: React.FC = () => {
  const { t, rating, c } = useTpl();
  const reduce = useReducedMotion();
  const list: any[] = t.testimonials.slice(0, 8);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused || list.length < 2) return;
    const id = window.setInterval(() => setIndex((value) => (value + 1) % list.length), 7000);
    return () => window.clearInterval(id);
  }, [paused, list.length, reduce]);

  if (!list.length) return null;
  const item = list[index % list.length];
  const go = (step: number) => setIndex((value) => (value + step + list.length) % list.length);

  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-soft px-6 py-12 text-center md:px-16 md:py-16" style={{ borderRadius: 40 }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="flex justify-center"><p className="tp-eyebrow">{rating.count ? `${rating.avg.toFixed(1)} from ${rating.count} review${rating.count > 1 ? "s" : ""}` : "Reviews"}</p></div>
            <div className="mx-auto mt-8 flex min-h-[250px] max-w-3xl items-center justify-center" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.figure key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }} className="w-full">
                  <div className="flex justify-center"><Stars value={item.rating || 5} size={18} /></div>
                  <blockquote className="tp-display mt-6 text-[clamp(21px,2.8vw,32px)] leading-snug" style={{ fontWeight: 400, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    “{item.text}”
                  </blockquote>
                  <figcaption className="mt-7 flex items-center justify-center gap-3">
                    <span className="tp-display flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-[17px]" style={{ background: "color-mix(in srgb, var(--t-accent) 20%, transparent)", color: "var(--hv-ink-accent)" }}>
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-left"><span className="block text-[15px] font-semibold">{item.name}</span>{item.role ? <span className="tp-muted block text-[13px]">{item.role}</span> : null}</span>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
              {list.length > 1 ? (
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Previous review" className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--t-line)" }} onClick={() => go(-1)}><span style={{ display: "flex", transform: "rotate(180deg)" }}>{Icon.arrow(17)}</span></button>
                  <div className="flex gap-1.5" aria-hidden="true">{list.map((_, i) => <span key={i} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === index % list.length ? 24 : 6, background: i === index % list.length ? "var(--t-accent)" : "var(--t-line)" }} />)}</div>
                  <button type="button" aria-label="Next review" className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--t-line)" }} onClick={() => go(1)}>{Icon.arrow(17)}</button>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm" onClick={() => t.goToSection("testimonials")}>{c("home.reviews.link", "Read all reviews")}</button>
              {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button> : null}
            </div>
          </div>
        </Reveal>
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
        <SectionHead eyebrow={c("home.services.eyebrow", "Also from us")} title={c("home.services.title", "More under one roof")} />
        <ServiceCards services={services} />
      </div>
    </section>
  );
};

const VisitBand: React.FC = () => {
  const { t, draft, primary, profile, c } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  const form = primary?.leadEnabled ? primary : null;
  const tours = form?.kind === "coLiving" && draft?.tourBooking?.enabled !== false;
  const hours = groupOpeningHours(draft?.openingHours);
  const row = (icon: React.ReactNode, text: React.ReactNode) => <p className="flex items-start gap-3 text-[15.5px]"><span className="mt-1 shrink-0 opacity-80">{icon}</span><span>{text}</span></p>;

  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-dark-panel grid gap-10 p-7 md:p-14 lg:grid-cols-2 lg:gap-16" style={{ borderRadius: 40 }}>
            <div className="flex flex-col gap-5">
              <p className="tp-eyebrow" style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{tours ? "Book a visit" : form ? "Get in touch" : "Find us"}</p>
              <h2 className="tp-h2">{c("home.visit.title", tours ? "Come and see it for yourself" : form ? profile.labels.leadTitle : draft?.contactTitle || "Come say hello")}</h2>
              <div className="space-y-3 opacity-90">
                {t.contactAddress ? row(Icon.pin(17), t.contactAddress) : null}
                {t.contactPhone ? row(Icon.phone(17), t.contactPhone) : null}
                {t.contactEmail ? row(Icon.mail(17), <span className="break-all">{t.contactEmail}</span>) : null}
                {hours[0] ? row(Icon.clock(17), `${hours[0].days}: ${hours[0].hours}`) : draft?.contactBusinessHours ? row(Icon.clock(17), draft.contactBusinessHours) : null}
              </div>
              {draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="mt-2 h-[190px] w-full border-0" style={{ borderRadius: 24 }} /> : null}
              {!form ? <div><button type="button" className="tp-btn tp-btn-light" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")}</button></div> : null}
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

export const HavenHome: React.FC = () => {
  const { t, draft, primary, services } = useTpl();
  const others = services.filter((service) => service.key !== primary?.key);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero /> : <div className="pt-[96px]" />}
      {t.isSectionEnabled("home_facts") ? <Facts /> : null}
      {t.isSectionEnabled("home_products") && primary ? <Rooms service={primary} /> : null}
      {t.isSectionEnabled("home_about") ? <Community /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Amenities /> : null}
      {t.isSectionEnabled("home_products") && t.isSectionEnabled("home_steps") ? <HowItWorks /> : null}
      {t.isSectionEnabled("home_gallery") ? <GalleryStrip /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {others.length && t.isSectionEnabled("home_products") && t.isSectionEnabled("home_services") ? <MoreServices services={others} /> : null}
      <FaqSection faqs={draft?.faqs} />
      <VisitBand />
    </>
  );
};
