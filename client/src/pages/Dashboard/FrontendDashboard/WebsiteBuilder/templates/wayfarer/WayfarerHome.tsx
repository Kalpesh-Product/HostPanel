import React from "react";
import { AnimatePresence, Reveal, Stagger, motion } from "../motion";
import { formatTime12h } from "../leadForms";
import type { Service } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, SectionHead, StarRow } from "../shared/TplUI";
import { BookingBar, Fact, Mosaic, ServiceCards, StayCard } from "./WayfarerUI";
import { useFromPrice } from "./WayfarerChrome";

/* ───────────────────────── hero ───────────────────────── */

const Hero: React.FC = () => {
  const { t, draft, primary, profile, rating, status, openLead, goToService, c } = useTpl();
  const images: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const image = images.length ? images[t.heroIndex % images.length] : "";
  const hasBar = Boolean(primary && primary.leadEnabled && ["hostel", "workation", "coLiving", "menu"].includes(primary.kind));

  return (
    <section className="relative flex min-h-[640px] items-end overflow-hidden md:min-h-[86vh]" style={{ background: "linear-gradient(135deg, var(--t-ink), color-mix(in srgb, var(--t-accent) 45%, var(--t-ink)))", color: "#fff" }}>
      <AnimatePresence mode="sync">
        {image ? (
          <motion.img key={image} src={image} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        ) : null}
      </AnimatePresence>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,10,12,.82) 8%, rgba(6,10,12,.35) 55%, rgba(6,10,12,.5))" }} />
      <div className="tp-wrap relative w-full pb-16 pt-32 md:pb-24">
        <div className="max-w-3xl">
          <Reveal y={12}>
            <div className="flex flex-wrap items-center gap-2">
              {rating.count > 0 ? (
                <span className="tp-chip" style={{ background: "rgba(255,255,255,.16)", color: "#fff", backdropFilter: "blur(6px)" }}>
                  <span style={{ color: "#ffd166" }}>{Icon.star(13)}</span> {rating.avg.toFixed(1)} · {rating.count} review{rating.count > 1 ? "s" : ""}
                </span>
              ) : null}
              {status ? (
                <span className="tp-chip" style={{ background: "rgba(255,255,255,.16)", color: "#fff" }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: status.open ? "#3ddc97" : "#ff6b6b" }} /> {status.text}
                </span>
              ) : null}
            </div>
          </Reveal>
          <Reveal delay={0.06}><h1 className="tp-h1 mt-4">{draft?.title || draft?.companyName}</h1></Reveal>
          {draft?.subTitle ? <Reveal delay={0.12}><p className="mt-4 max-w-xl text-[17px] leading-relaxed opacity-90">{draft.subTitle}</p></Reveal> : null}
        </div>
        <Reveal delay={0.2} className="mt-8 max-w-4xl">
          {hasBar ? (
            <BookingBar service={primary} />
          ) : (
            <div className="flex flex-wrap gap-3">
              {primary?.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{draft?.CTAButtonText || profile.labels.cta} {Icon.arrow()}</button> : null}
              {primary ? <button type="button" className="tp-btn tp-btn-light" onClick={() => goToService(primary)}>{c("home.hero.secondaryCta", `Explore ${profile.labels.listing.toLowerCase()}`)}</button> : null}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── facts, stays ───────────────────────── */

const Facts: React.FC = () => {
  const { draft, primary, rating } = useTpl();
  const policy = draft?.stayPolicy || {};
  const from = useFromPrice();
  const facts: { icon: React.ReactNode; label: string; value: string }[] = [
    policy.checkInTime ? { icon: Icon.clock(20), label: "Check-in", value: `From ${formatTime12h(policy.checkInTime)}` } : null,
    policy.checkOutTime ? { icon: Icon.clock(20), label: "Check-out", value: `Until ${formatTime12h(policy.checkOutTime)}` } : null,
    policy.minStayNights ? { icon: Icon.users(20), label: "Minimum stay", value: `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}` } : null,
    from ? { icon: Icon.check(20), label: "Prices from", value: from } : null,
    rating.count ? { icon: Icon.star(20), label: "Guest rating", value: `${rating.avg.toFixed(1)} / 5` } : null,
  ].filter(Boolean) as any;
  if (facts.length < 2 || !primary) return null;
  return (
    <div className="tp-wrap relative z-10 -mt-10 md:-mt-12">
      <Reveal>
        <div className="tp-card grid gap-5 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-4">
          {facts.slice(0, 4).map((fact) => <Fact key={fact.label} {...fact} />)}
        </div>
      </Reveal>
    </div>
  );
};

const Stays: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService, c } = useTpl();
  const featured = service.items.filter((i) => i.featured || i.popular || i.badge);
  const list = [...featured, ...service.items.filter((i) => !featured.includes(i))].slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <SectionHead
          eyebrow={service.profile.labels.listing}
          title={c("home.stays.title", service.kind === "menu" ? "Popular right now" : "Choose your stay")}
          sub={c("home.stays.sub", service.subText) || undefined}
          action={<button type="button" className="tp-link" onClick={() => goToService(service)}>See all {service.items.length} <span className="tp-arrow">{Icon.arrow()}</span></button>}
        />
        <div className="flex flex-col gap-4">
          {list.map((item, index) => <StayCard key={item.key} item={item} service={service} index={index} />)}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── amenities, story, gallery ───────────────────────── */

const Amenities: React.FC = () => {
  const { draft, c } = useTpl();
  const enabled = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <section className="tp-section tp-soft" style={{ borderRadius: 0 }}>
      <div className="tp-wrap grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <Reveal>
          <p className="tp-eyebrow mb-3">{c("home.amenities.eyebrow", "Amenities")}</p>
          <h2 className="tp-h2">{c("home.amenities.title", "Everything you need, already here")}</h2>
          <p className="tp-lead mt-4">{c("home.amenities.sub", "The small things that make a stay easy, included with your booking.")}</p>
        </Reveal>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {enabled.map((item, index) => {
            const { label, icon } = getInclusionMeta(item);
            return (
              <div key={item?.key || index} className="tp-card flex flex-col items-start gap-3 p-4">
                <span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{icon}</span>
                <span className="text-[13px] font-semibold leading-snug">{label}</span>
              </div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
};

const Vibe: React.FC = () => {
  const { t, draft, photo, c } = useTpl();
  const blocks: string[] = t.aboutBlocks.map((b: any) => String(typeof b === "string" ? b : b?.text || "").trim()).filter(Boolean);
  const images: string[] = [0, 1].map((i) => photo(`home.vibe.image${i + 1}`, t.homeGalleryItems[i] || ""));
  if (!blocks.length) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <Reveal className="relative">
          <div className="tp-zoom aspect-[4/3.3] overflow-hidden" style={{ borderRadius: 20 }}>
            {images[0] ? <img src={images[0]} alt="" loading="lazy" /> : <Placeholder text={draft?.companyName || ""} />}
          </div>
          {images[1] ? (
            <div className="tp-zoom absolute -bottom-6 -right-2 hidden h-40 w-48 overflow-hidden border-4 md:block" style={{ borderRadius: 16, borderColor: "var(--t-bg)" }}>
              <img src={images[1]} alt="" loading="lazy" />
            </div>
          ) : null}
        </Reveal>
        <div>
          <Reveal><p className="tp-eyebrow mb-3">{c("home.vibe.eyebrow", "The vibe")}</p></Reveal>
          <Reveal delay={0.05}><h2 className="tp-h2">{draft?.aboutTitle || `About ${draft?.companyName || "us"}`}</h2></Reveal>
          <Stagger className="mt-5 space-y-4">
            {blocks.slice(0, 2).map((text, index) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[15px] leading-relaxed"}>{text}</p>)}
          </Stagger>
          <Reveal delay={0.15}><button type="button" className="tp-link mt-6" onClick={() => t.goToSection("about")}>{c("home.about.link", "Read our story")} <span className="tp-arrow">{Icon.arrow()}</span></button></Reveal>
        </div>
      </div>
    </section>
  );
};

const GalleryBlock: React.FC = () => {
  const { t, c } = useTpl();
  const items: string[] = t.galleryItems;
  if (items.length < 2) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 16 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow={c("home.gallery.eyebrow", "Gallery")} title={c("home.gallery.title", "Take a look around")} action={<button type="button" className="tp-link" onClick={() => t.goToSection("gallery")}>{c("home.gallery.link", "All photos")} <span className="tp-arrow">{Icon.arrow()}</span></button>} />
        <Reveal><Mosaic images={items} onOpen={(i) => t.openGalleryViewer(i)} /></Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── reviews ───────────────────────── */

export const WfReview: React.FC<{ item: any; wide?: boolean }> = ({ item, wide }) => (
  <figure className={`tp-card flex h-full flex-col gap-4 p-5 ${wide ? "" : "w-[300px] sm:w-[340px]"}`}>
    <StarRow value={item.rating || 5} />
    <blockquote className="tp-clamp3 flex-1 text-[15px] leading-relaxed">{item.text}</blockquote>
    <figcaption className="flex items-center gap-3">
      <span className="tp-display flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-[15px]" style={{ background: "color-mix(in srgb, var(--t-accent) 16%, transparent)", color: "var(--t-accent-fg, var(--t-accent))" }}>
        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
      </span>
      <span><span className="block text-[14px] font-semibold">{item.name}</span>{item.role ? <span className="tp-muted block text-[12px]">{item.role}</span> : null}</span>
    </figcaption>
  </figure>
);

const Reviews: React.FC = () => {
  const { t, rating, c } = useTpl();
  const list: any[] = t.testimonials.slice(0, 8);
  if (!list.length) return null;
  return (
    <section className="tp-section tp-soft" style={{ borderRadius: 0 }}>
      <div className="tp-wrap grid gap-8 lg:grid-cols-[0.55fr_1.45fr] lg:gap-12">
        <Reveal>
          <p className="tp-eyebrow mb-3">{c("home.reviews.eyebrow", "Reviews")}</p>
          {rating.count ? (
            <>
              <p className="tp-display text-[64px] leading-none">{rating.avg.toFixed(1)}</p>
              <div className="mt-3"><StarRow value={rating.avg} size={18} /></div>
              <p className="tp-muted mt-2 text-[14px]">from {rating.count} guest review{rating.count > 1 ? "s" : ""}</p>
            </>
          ) : <h2 className="tp-h2">{c("home.reviews.title", "What guests say")}</h2>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm" onClick={() => t.goToSection("testimonials")}>{c("home.reviews.link", "Read all reviews")}</button>
            {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button> : null}
          </div>
        </Reveal>
        <div className="tp-scroll-x -mr-5 pr-5 md:-mr-7 md:pr-7">
          {list.map((item, index) => <WfReview key={item.key || index} item={item} />)}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── other services, location ───────────────────────── */

const MoreServices: React.FC<{ services: Service[] }> = ({ services }) => {
  const { c } = useTpl();
  if (!services.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow={c("home.services.eyebrow", "Also from us")} title={c("home.services.title", "More ways to stay with us")} />
        <ServiceCards services={services} />
      </div>
    </section>
  );
};

const Location: React.FC = () => {
  const { t, draft, primary, profile, openLead, c } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 16 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-card grid overflow-hidden md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 p-7 md:p-12">
              <p className="tp-eyebrow">{c("home.contact.eyebrow", "Find us")}</p>
              <h2 className="tp-h2">{draft?.contactTitle || "Come say hello"}</h2>
              {t.contactAddress ? <p className="tp-lead flex items-start gap-3"><span className="mt-1" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.pin(18)}</span>{t.contactAddress}</p> : null}
              <div className="mt-2 flex flex-wrap gap-3">
                {primary?.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{profile.labels.cta}</button> : null}
                <button type="button" className="tp-btn tp-btn-ghost" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")}</button>
              </div>
            </div>
            <div className="min-h-[260px]" style={{ background: "var(--t-surface)" }}>
              {draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-full min-h-[260px] w-full border-0" /> : <Placeholder text={draft?.companyName || ""} />}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── page ───────────────────────── */

export const WayfarerHome: React.FC = () => {
  const { t, draft, primary, services } = useTpl();
  const others = services.filter((service) => service.key !== primary?.key);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero /> : <div className="pt-[68px]" />}
      {t.isSectionEnabled("home_facts") ? <Facts /> : null}
      {t.isSectionEnabled("home_products") && primary ? <Stays service={primary} /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Amenities /> : null}
      {t.isSectionEnabled("home_about") ? <Vibe /> : null}
      {t.isSectionEnabled("home_gallery") ? <GalleryBlock /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {others.length && t.isSectionEnabled("home_products") && t.isSectionEnabled("home_services") ? <MoreServices services={others} /> : null}
      <FaqSection faqs={draft?.faqs} />
      <Location />
    </>
  );
};
