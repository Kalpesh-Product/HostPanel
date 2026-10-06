import React, { useEffect, useState } from "react";
import { AnimatePresence, Marquee, Reveal, Stagger, motion, useReducedMotion } from "../motion";
import { contentSteps } from "../templateContent";
import type { Service } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, SectionHead } from "../shared/TplUI";
import { CardRow, CenterEyebrow, ServiceCards, Squiggle, Stars, SuiteCard, stepsFor } from "./CameliaUI";

/* ─────────────────────────────────────────────────────────────────────────
 * Camelia's home page follows the boutique-hotel reference (camelia-template.
 * webflow.io) section for section: a full-bleed framed hero with a centred
 * overlaid heading (not Haven's split two-column layout), a centred intro,
 * a "highlights" band of big captioned photo tiles, a plain three-column
 * services list, a dark full-bleed "location" band, simple suite cards with
 * no price/filters on the face, a dark full-bleed photo CTA band, then
 * reviews and a gallery strip. Alternating light/dark full-bleed sections is
 * the rhythm that makes it read as its own template, not a Haven reskin.
 * ────────────────────────────────────────────────────────────────────── */

/** Shown only when the business hasn't picked any inclusions yet, so a fresh Camelia site still
 * reads like the boutique-hotel reference instead of the Amenities/Highlights sections vanishing.
 * Once the business ticks their own, this is never used. */
const TEMPLATE_DEFAULT_INCLUSIONS = ["personalised", "spa-wellness", "receptionist", "high-speed-internet", "laundry", "excursions"].map(
  (key) => ({ key, enabled: true }),
);

/* ───────────────────────── hero ───────────────────────── */

const Hero: React.FC = () => {
  const { t, draft } = useTpl();
  const images: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const main = images.length ? images[t.heroIndex % images.length] : "";
  // A business can link a video instead of the photo carousel (matches the reference's
  // autoplaying hero). It's a direct URL, not an upload, and quietly falls back to the photo
  // slideshow — or a placeholder — when there isn't one.
  const video = String(draft?.heroVideoUrl || "").trim();

  // Full-bleed, edge to edge — the reference's hero has no side margin and no framed "mat"
  // border at all, unlike the smaller matted photos used elsewhere in the template. The header
  // is sticky (still reserves its own 80px of flow height) rather than fixed, so a -mt-20 here
  // pulls the hero up to visually fill that reserved strip — the video shows straight through
  // the transparent header instead of the header sitting over plain page background. A matching
  // 80px spacer right after Hero (see CameliaHome's root render) cancels the shift this would
  // otherwise cause for every section that follows.
  // Nothing here is animated in on load — checked the reference directly (its heading, nav and
  // video all have no inline opacity/transform and no load-triggered interaction at all, just a
  // poster image behind the <video> so there's no blank flash while it buffers) — so this
  // matches that: everything renders at full opacity immediately, like the reference does.
  return (
    <section id="cm-hero" className="relative -mt-20 aspect-[4/3] w-full overflow-hidden md:aspect-[16/8]">
      {video ? (
        <video className="absolute inset-0 h-full w-full object-cover" src={video} poster={main || undefined} autoPlay muted loop playsInline />
      ) : main ? (
        <img src={main} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--t-accent) 30%, var(--t-surface)), var(--t-surface))" }}>
          <Placeholder text={draft?.companyName || ""} />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.38) 100%)" }} />
      {/* Centred text block mirrors the reference exactly: heading, squiggle, tagline — no
          rating/status chips, which the reference's hero doesn't show either. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center text-white">
        <h1 className="tp-h1" style={{ color: "#fff" }}>{draft?.title || draft?.companyName}</h1>
        <Squiggle style={{ color: "rgba(255,255,255,.85)" }} />
        {draft?.subTitle ? (
          <p className="tp-tagline mx-auto max-w-md text-[22px]" style={{ color: "rgba(255,255,255,.92)" }}>{draft.subTitle}</p>
        ) : null}
      </div>
      {/* Scrolls to the section straight after the hero. The header is sticky (80px), so the
          target is offset by that height to land the section just under the bar. */}
      <button
        type="button"
        aria-label="Scroll to the next section"
        className="cm-scroll-cue absolute bottom-6 left-0 right-0 mx-auto flex items-center justify-center rounded-full border border-white/70 text-white transition-colors hover:bg-white hover:text-black"
        onClick={() => {
          const next = document.getElementById("cm-hero")?.nextElementSibling as HTMLElement | null;
          if (!next) return;
          const scroller = document.getElementById("scrollable-content");
          const top = next.getBoundingClientRect().top + (scroller ? scroller.scrollTop : window.scrollY) - 80;
          if (scroller) scroller.scrollTo({ top, behavior: "smooth" });
          else window.scrollTo({ top, behavior: "smooth" });
        }}
      >
        {Icon.chevron(16)}
      </button>
    </section>
  );
};

/* ───────────────────────── centred intro ───────────────────────── */

const Intro: React.FC = () => {
  const { t, draft, c } = useTpl();
  const blocks: string[] = t.aboutBlocks.map((b: any) => String(typeof b === "string" ? b : b?.text || "").trim()).filter(Boolean);
  const intro = blocks[0];
  return (
    <section className="tp-section" style={{ paddingBottom: 24 }}>
      <div className="tp-wrap flex flex-col items-center text-center">
        <Reveal><CenterEyebrow>{c("home.intro.eyebrow", "Welcome")}</CenterEyebrow></Reveal>
        <Reveal delay={0.06}>
          <h2 className="tp-h2 mx-auto mt-6 max-w-3xl">{c("home.intro.title", draft?.aboutTitle || `Indulge in exquisite comfort at ${draft?.companyName || "our place"}`)}</h2>
        </Reveal>
        {intro ? <Reveal delay={0.12}><p className="tp-lead mx-auto mt-6 max-w-2xl">{intro}</p></Reveal> : null}
      </div>
    </section>
  );
};

/* ───────────────────────── highlights (big captioned tiles) ───────────────────────── */

const Highlights: React.FC = () => {
  const { t, draft, photo } = useTpl();
  const picked = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  const enabled = picked.length ? picked : TEMPLATE_DEFAULT_INCLUSIONS;
  const gallery: string[] = t.homeGalleryItems || [];
  const tiles = [
    { key: "1", label: enabled[0] ? getInclusionMeta(enabled[0]).label : "", img: photo("home.highlights.image1", gallery[0] || "") },
    { key: "2", label: enabled[1] ? getInclusionMeta(enabled[1]).label : "", img: photo("home.highlights.image2", gallery[1] || "") },
  ].filter((tile) => tile.img);
  if (tiles.length < 2) return null;
  // Full-bleed, edge to edge like the reference — no tp-wrap side margin here.
  return (
    <section>
      <div className="grid gap-1 sm:grid-cols-2">
        {tiles.map((tile, index) => (
          <Reveal key={tile.key} delay={index * 0.08}>
            <div className="cm-tile tp-zoom aspect-[6/5]">
              <img src={tile.img} alt="" loading="lazy" />
              {tile.label ? (
                <div className="cm-tile-caption">
                  <h3 style={{ color: "#fff", fontSize: "clamp(20px,2.4vw,28px)" }}>{tile.label}</h3>
                  <span className="cm-tile-arrow">{Icon.arrow(18)}</span>
                </div>
              ) : null}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/* ───────────────────────── services / amenities, 3 columns of text ───────────────────────── */

const AmenitiesColumns: React.FC = () => {
  const { draft, c } = useTpl();
  const picked = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  const enabled = (picked.length ? picked : TEMPLATE_DEFAULT_INCLUSIONS).slice(0, 6);

  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <div className="flex flex-col items-center text-center">
          <Reveal><CenterEyebrow>{c("home.amenities.eyebrow", "Amenities")}</CenterEyebrow></Reveal>
          <Reveal delay={0.06}><h2 className="tp-h2 mt-6">{c("home.amenities.title", "Elevate your stay with our amenities")}</h2></Reveal>
        </div>
        <Stagger className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3">
          {enabled.map((item, index) => {
            const { label, icon } = getInclusionMeta(item);
            return (
              <div key={item?.key || index} className="flex flex-col items-center text-center">
                <span className="cm-amenity-icon">{icon}</span>
                <h3 className="tp-h3 mt-5" style={{ fontSize: 18 }}>{label}</h3>
              </div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
};

/* ───────────────────────── location band (dark, full-bleed) ───────────────────────── */

const LocationBand: React.FC = () => {
  const { t, draft, c } = useTpl();
  if (!t.contactAddress && !draft?.mapUrl) return null;
  return (
    <section className="cm-band py-16 md:py-24">
      <div className="tp-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          {draft?.mapUrl ? (
            <iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-[280px] w-full border-0 md:h-[380px]" style={{ borderRadius: 2 }} />
          ) : (
            <div className="flex h-[280px] w-full items-center justify-center md:h-[380px]" style={{ background: "color-mix(in srgb, var(--t-on-ink) 6%, transparent)" }}>
              <span style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{Icon.pin(40)}</span>
            </div>
          )}
        </Reveal>
        <div>
          <p className="tp-eyebrow" style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{c("home.location.eyebrow", "Location")}</p>
          <h2 className="tp-h2 mt-5">{c("home.location.title", "Nestled amidst breathtaking natural beauty")}</h2>
          {t.contactAddress ? <p className="mt-5 text-[15.5px] leading-relaxed opacity-85">{t.contactAddress}</p> : null}
          <button type="button" className="tp-btn tp-btn-light mt-7" onClick={() => t.goToSection("contact")}>{c("home.location.button", "Show location")}</button>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── stay / rooms (plain cards, no price on the face) ───────────────────────── */

const HEADINGS: Record<string, string> = {
  coLiving: "Enjoy a personalised and tailored stay",
  workation: "Choose your package",
  hostel: "Choose your stay",
  menu: "Popular right now",
  meeting: "Pick a room",
};

const Stay: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService, c } = useTpl();
  const featured = service.items.filter((i) => i.featured || i.popular || i.badge);
  const list = [...featured, ...service.items.filter((i) => !featured.includes(i))].slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <div className="flex flex-col items-center text-center">
          <Reveal><CenterEyebrow>{c("home.rooms.eyebrow", "Stay")}</CenterEyebrow></Reveal>
          <Reveal delay={0.06}><h2 className="tp-h2 mt-6 max-w-2xl">{c("home.rooms.title", HEADINGS[service.kind] || service.profile.labels.listing)}</h2></Reveal>
        </div>
        <div className="mt-14">
          <CardRow>
            {list.map((item, index) => (
              <Reveal key={item.key} delay={index * 0.08} className="h-full"><SuiteCard item={item} service={service} index={index} /></Reveal>
            ))}
          </CardRow>
        </div>
        {service.items.length > list.length ? (
          <div className="mt-12 flex justify-center">
            <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToService(service)}>{c("home.rooms.link", "Show all suites")}</button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

/* ───────────────────────── offers / CTA band (dark, full-bleed photo) ───────────────────────── */

const OffersBand: React.FC = () => {
  const { t, draft, primary, profile, openLead, c } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  const images: string[] = t.heroImages?.length ? t.heroImages : t.galleryItems;
  const bg = images[images.length - 1] || images[0] || "";
  const hasLead = Boolean(primary?.leadEnabled);

  return (
    <section className="relative overflow-hidden py-20 md:py-28" style={{ background: "var(--t-ink)" }}>
      {bg ? <img src={bg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-45" /> : null}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--t-ink) 55%, transparent), var(--t-ink) 88%)" }} />
      <div className="tp-wrap relative flex flex-col items-center text-center" style={{ color: "var(--t-on-ink)" }}>
        <Reveal><p className="tp-eyebrow" style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{c("home.offers.eyebrow", "Special offers")}</p></Reveal>
        <Reveal delay={0.06}><h2 className="tp-h2 mt-5 max-w-2xl">{c("home.offers.title", "Pamper yourself with our promotions")}</h2></Reveal>
        <Reveal delay={0.12}><p className="mt-5 max-w-xl text-[15.5px] leading-relaxed opacity-85">{c("home.offers.sub", draft?.subTitle || "")}</p></Reveal>
        <Reveal delay={0.18} className="mt-8">
          <button type="button" className="tp-btn tp-btn-light" onClick={() => (hasLead && primary ? openLead(primary) : t.goToSection("contact"))}>
            {hasLead ? draft?.CTAButtonText || profile.labels.cta : c("home.contact.button", "Book now")}
          </button>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── gallery strip ───────────────────────── */

const GalleryStrip: React.FC = () => {
  const { t, c } = useTpl();
  const items: string[] = t.galleryItems;
  if (items.length < 2) return null;
  return (
    <section className="tp-section" style={{ paddingBottom: 24 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow={c("home.gallery.eyebrow", "Gallery")} title={c("home.gallery.title", "A look around")} action={<button type="button" className="tp-link" onClick={() => t.goToSection("gallery")}>{c("home.gallery.link", "All photos")} <span className="tp-arrow">{Icon.arrow()}</span></button>} />
      </div>
      <Reveal>
        <Marquee speed={38} className="cm-bleed">
          {items.slice(0, 10).map((src, index) => (
            <button key={`${src}-${index}`} type="button" onClick={() => t.openGalleryViewer(index)} aria-label={`Open photo ${index + 1}`} className="cm-frame tp-zoom h-[240px] w-[190px] shrink-0 md:h-[300px] md:w-[240px]">
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </Marquee>
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
    <section className="tp-section" style={{ background: "var(--t-surface)" }}>
      <div className="tp-wrap" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <CenterEyebrow>{rating.count ? `${rating.avg.toFixed(1)} from ${rating.count} review${rating.count > 1 ? "s" : ""}` : c("reviews.eyebrow", "Guest reviews")}</CenterEyebrow>
            <div className="mx-auto mt-9 flex min-h-[230px] max-w-3xl items-center justify-center" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.figure key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }} className="w-full">
                  <div className="flex justify-center"><Stars value={item.rating || 5} size={17} /></div>
                  <blockquote className="tp-display mt-6 text-[clamp(21px,2.8vw,32px)] italic leading-snug" style={{ fontWeight: 400, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    “{item.text}”
                  </blockquote>
                  <figcaption className="mt-7 flex flex-col items-center gap-2">
                    <span className="tp-display flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-[17px]" style={{ background: "color-mix(in srgb, var(--t-accent) 20%, transparent)", color: "var(--cm-ink-accent)" }}>
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[15px] font-semibold">{item.name}</span>
                    {item.role ? <span className="tp-muted text-[13px]">{item.role}</span> : null}
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
              {list.length > 1 ? (
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Previous review" className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--t-line)" }} onClick={() => go(-1)}><span style={{ display: "flex", transform: "rotate(180deg)" }}>{Icon.arrow(17)}</span></button>
                  <button type="button" aria-label="Next review" className="flex h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: "var(--t-line)" }} onClick={() => go(1)}>{Icon.arrow(17)}</button>
                </div>
              ) : null}
            </div>
            {t.showWriteReview ? (
              <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm mt-6" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── other services ───────────────────────── */

const MoreServices: React.FC<{ services: Service[] }> = ({ services }) => {
  const { c } = useTpl();
  if (!services.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 0 }}>
      <div className="tp-wrap">
        <div className="flex flex-col items-center text-center">
          <Reveal><CenterEyebrow>{c("home.services.eyebrow", "Also from us")}</CenterEyebrow></Reveal>
          <Reveal delay={0.06}><h2 className="tp-h2 mt-6">{c("home.services.title", "More under one roof")}</h2></Reveal>
        </div>
        <div className="mt-14"><ServiceCards services={services} /></div>
      </div>
    </section>
  );
};

/* ───────────────────────── steps (kept, but folded quietly under Stay) ───────────────────────── */

const HowItWorks: React.FC = () => {
  const { draft, primary, c } = useTpl();
  const steps = contentSteps(draft, stepsFor(primary, draft?.tourBooking?.enabled !== false));
  if (!primary?.leadEnabled || !steps.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 0 }}>
      <div className="tp-wrap">
        <div className="flex flex-col items-center text-center">
          <Reveal><CenterEyebrow>{c("home.steps.eyebrow", "How it works")}</CenterEyebrow></Reveal>
        </div>
        <div className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.12}>
              <div className="text-center">
                <span className="cm-num mb-4 block text-[40px] leading-none">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="tp-h3 mb-2">{step.title}</h3>
                <p className="tp-muted text-[15.5px] leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── page ───────────────────────── */

export const CameliaHome: React.FC = () => {
  const { t, draft, primary, services } = useTpl();
  const others = services.filter((service) => service.key !== primary?.key);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? (
        <>
          <Hero />
          {/* Cancels Hero's -mt-20 (which pulls it up behind the sticky header) so every
              section below renders exactly where it would without that negative margin. */}
          <div className="h-20" aria-hidden="true" />
        </>
      ) : null}
      {t.isSectionEnabled("home_about") ? <Intro /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Highlights /> : null}
      {t.isSectionEnabled("home_inclusions") ? <AmenitiesColumns /> : null}
      <LocationBand />
      {t.isSectionEnabled("home_products") && primary ? <Stay service={primary} /> : null}
      {t.isSectionEnabled("home_products") && t.isSectionEnabled("home_steps") ? <HowItWorks /> : null}
      <OffersBand />
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {t.isSectionEnabled("home_gallery") ? <GalleryStrip /> : null}
      {others.length && t.isSectionEnabled("home_products") && t.isSectionEnabled("home_services") ? <MoreServices services={others} /> : null}
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};
