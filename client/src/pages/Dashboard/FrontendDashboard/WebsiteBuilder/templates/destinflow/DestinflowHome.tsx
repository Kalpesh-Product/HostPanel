import React, { useRef } from "react";
import { Reveal, Stagger } from "../motion";
import type { Service } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";
import {
  DfReviewCard,
  DfRoomCard,
  DfSectionHead,
  DfTextLink,
} from "./DestinflowUI";

const imageOf = (value: any): string =>
  typeof value === "string" ? value : value?.url || "";

/* ───────────────────────── hero ───────────────────────── */

const Hero: React.FC = () => {
  const { t, photo, c } = useTpl();
  const images: string[] = t.heroImages?.length
    ? t.heroImages.map(imageOf)
    : photo("home.hero.image", t.resolvedHomeHeroImage || "")
      ? [photo("home.hero.image", t.resolvedHomeHeroImage || "")]
      : [];
  const image = images.length ? images[t.heroIndex % images.length] : "";

  return (
    <section className="df-hero">
      {image ? (
        <div
          key={image}
          className="df-hero-media"
          style={{ backgroundImage: `url("${image}")` }}
        />
      ) : null}
      <div className="df-shell df-hero-inner">
        <div>
          <div className="df-hero-subtitle">
            <span>{c("home.hero.subtitle1", "Perfect Travel Partner")}</span>
            <span className="df-hero-subtitle-icon" aria-hidden="true">{Icon.star(15)}</span>
            <span>{c("home.hero.subtitle2", "With Experience")}</span>
          </div>
        </div>
        <div>
          <h1 className="df-hero-title">
            {c("home.hero.title", "Explore With Experts")}
          </h1>
        </div>
        <div>
          <div className="df-hero-button-wrap">
            <button type="button" className="df-btn df-hero-button" onClick={() => t.goToSection("about")}>
              {c("home.hero.cta", "Explore With Us")}
              <span aria-hidden="true">{Icon.arrow(17)}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── intro ───────────────────────── */

const Intro: React.FC = () => {
  const { t, draft, photo, c } = useTpl();
  const blocks: string[] = t.aboutBlocks
    .map((block: any) => String(typeof block === "string" ? block : block?.text || "").trim())
    .filter(Boolean);
  const copy =
    c("home.intro.copy", blocks[0] || "") ||
    "A welcoming base for curious travellers — comfortable rooms, honest food and a little room to slow down.";
  const image = photo("home.intro.image", t.homeGalleryItems[0] || t.resolvedHomeHeroImage || "");

  return (
    <section className="df-intro">
      <div className="df-shell df-intro-grid">
        <Reveal>
          <div className="df-icon-tile">{Icon.pin(24)}</div>
          <p className="df-intro-label">{c("home.intro.label", draft?.companyName || "Your home away")}</p>
          {image ? (
            <div className="df-photo" style={{ marginTop: 34, aspectRatio: "16 / 9" }}>
              <img src={image} alt="" loading="lazy" decoding="async" />
            </div>
          ) : null}
        </Reveal>
        <div className="df-intro-copy">
          <Reveal>
            <p className="df-eyebrow">{c("home.intro.eyebrow", "Welcome")}</p>
            <h2 className="df-h2">{c("home.intro.title", draft?.aboutTitle || "Stay a little longer")}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="df-lead">{copy}</p>
          </Reveal>
          {blocks[1] ? (
            <Reveal delay={0.14} className="df-intro-block">
              <p>{blocks[1]}</p>
            </Reveal>
          ) : null}
          <Reveal delay={0.2} className="df-intro-actions">
            <DfTextLink onClick={() => t.goToSection("about")}>
              {c("home.intro.cta", "Our story")}
            </DfTextLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── rooms ───────────────────────── */

const Rooms: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService, c } = useTpl();
  const list = [...service.items].sort((a, b) => {
    const score = (item: typeof a) => Number(item.featured || item.popular || item.badge) * 10 + (item.image ? 1 : 0);
    return score(b) - score(a);
  });
  if (!list.length) return null;
  return (
    <section className="df-rooms">
      <div className="df-shell">
        <DfSectionHead
          eyebrow={c("home.rooms.eyebrow", "Rooms & dorms")}
          title={c("home.rooms.title", "Find your corner of the house")}
          sub={c("home.rooms.sub", service.subText || "Simple, comfortable rooms for every kind of stay.")}
          action={
            <DfTextLink onClick={() => goToService(service)}>
              {c("home.rooms.link", "See all rooms")}
            </DfTextLink>
          }
        />
        <Stagger className="df-grid-3 df-rooms-grid">
          {list.slice(0, 3).map((item, index) => (
            <DfRoomCard key={item.key} service={service} item={item} index={index} />
          ))}
        </Stagger>
      </div>
    </section>
  );
};

/* ───────────────────────── dining ───────────────────────── */

const Dining: React.FC<{ services: Service[] }> = ({ services }) => {
  const { t, draft, photo, c } = useTpl();
  const dining = services.find((service) => service.kind === "menu");
  const source = dining || services.find((service) => service.key !== services[0]?.key);
  const image = photo(
    "home.dining.image",
    source?.cardImage || source?.heroImage || t.homeGalleryItems[2] || t.galleryItems[0] || "",
  );
  if (!image && !dining) return null;
  const open = () => {
    if (source) t.goToProductPage(source.slug);
    else t.goToSection("about");
  };
  return (
    <section className="df-dining">
      <div className="df-shell df-dining-grid">
        <Reveal className="df-photo df-dining-media">
          {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <Placeholder text={draft?.companyName || "Dining"} />}
        </Reveal>
        <div>
          <Reveal>
            <p className="df-eyebrow">{c("home.dining.eyebrow", "Food & drink")}</p>
            <h2 className="df-h2">{c("home.dining.title", "Good food, better conversations")}</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="df-lead">
              {c(
                "home.dining.copy",
                "Start with coffee, stay for dinner. Our kitchen brings local flavours to a table everyone can share.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <button type="button" className="df-btn df-btn-light" onClick={open}>
              {c("home.dining.cta", "Explore")}
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── facilities + feedback ───────────────────────── */

const Facilities: React.FC = () => {
  const { draft, c } = useTpl();
  const inclusions = ((draft?.inclusions || []) as any[])
    .filter((item) => item?.enabled !== false)
    .slice(0, 8);
  if (!inclusions.length) return null;
  return (
    <section className="df-facilities">
      <div className="df-shell">
        <DfSectionHead
          eyebrow={c("home.facilities.eyebrow", "Facilities")}
          title={c("home.facilities.title", "Everything you need is here")}
          sub={c("home.facilities.sub", "Thoughtful spaces and small comforts, included with every stay.")}
        />
        <Stagger className="df-facility-grid">
          {inclusions.map((item, index) => {
            const meta = getInclusionMeta(item);
            return (
              <article className="df-facility" key={item?.key || index}>
                <div className="df-facility-icon">{meta.icon}</div>
                <h3>{meta.label}</h3>
                <p>{index % 2 === 0 ? "Everything you need for an easy stay." : "Thoughtfully chosen for a comfortable visit."}</p>
              </article>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
};

const Feedback: React.FC = () => {
  const { t, primary, openLead, photo, c } = useTpl();
  const image = photo("home.feedback.image", t.homeGalleryItems[3] || t.galleryItems[1] || "");
  return (
    <section className="df-feedback">
      {image ? (
        <div
          key={image}
          className="df-feedback-media"
          style={{ backgroundImage: `url("${image}")` }}
        />
      ) : null}
      <div className="df-feedback-shade" />
      <div className="df-shell df-feedback-inner">
        <Reveal>
          <p className="df-eyebrow">{c("home.feedback.eyebrow", "Guest feedback")}</p>
          <h2 className="df-h2">{c("home.feedback.title", "Come for a night. Leave with a story.")}</h2>
          <p className="df-lead" style={{ color: "rgba(255,255,255,.78)" }}>
            {c(
              "home.feedback.copy",
              "We keep things relaxed, friendly and easy — so you can spend less time planning and more time being here.",
            )}
          </p>
        </Reveal>
        <Reveal delay={0.1} className="df-feedback-actions">
          {primary?.leadEnabled ? (
            <button type="button" className="df-btn df-btn-light" onClick={() => openLead(primary)}>
              {c("home.feedback.cta", "Book your stay")}
            </button>
          ) : null}
          {t.showWriteReview ? (
            <button type="button" className="df-btn df-btn-outline" style={{ borderColor: "#fff", color: "#fff", background: "transparent" }} onClick={t.openReviewModal}>
              {c("home.feedback.secondary", "Share your experience")}
            </button>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── lake feature + testimonials ───────────────────────── */

const LakeFeature: React.FC<{ service: Service | null }> = ({ service }) => {
  const { t, photo, c } = useTpl();
  const image = photo("home.lake.image", t.homeGalleryItems[4] || t.galleryItems[2] || "");
  const rooms = service?.items.slice(0, 3) || [];
  if (!image && !rooms.length) return null;
  return (
    <section className="df-lake">
      <div className="df-shell">
        <div className="df-lake-grid">
          <Reveal className="df-photo df-lake-media">
            {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <Placeholder text="Lakeside" />}
          </Reveal>
          <div>
            <Reveal>
              <p className="df-eyebrow">{c("home.lake.eyebrow", "By the water")}</p>
              <h2 className="df-h2">{c("home.lake.title", "A quieter kind of getaway")}</h2>
              <p className="df-lead">
                {c(
                  "home.lake.copy",
                  "Wake up to still water, take the long way to breakfast and let the day find its own pace.",
                )}
              </p>
            </Reveal>
            <div className="df-lake-list">
              {rooms.length ? (
                rooms.map((item, index) => (
                  <Reveal key={item.key} delay={index * 0.06}>
                    <div className="df-lake-row">
                      <span className="df-lake-index">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.chips.join(" · ") || item.description}</p>
                      </div>
                      <button
                        type="button"
                        className="df-btn df-btn-outline"
                        onClick={() => service && t.goToProductItem(service.slug, item.slug)}
                      >
                        {c("home.lake.rowCta", "View")}
                      </button>
                    </div>
                  </Reveal>
                ))
              ) : (
                <p>{c("home.lake.empty", "Ask us about our favourite rooms for a longer stay.")}</p>
              )}
            </div>
          </div>
        </div>
        <div className="df-marquee" aria-hidden="true">
          {[0, 1].map((copy) => (
            <span key={copy}>
              lake mornings <i>✳</i> slow stays <i>✳</i> good company <i>✳</i>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials: React.FC = () => {
  const { t, rating, c } = useTpl();
  const trackRef = useRef<HTMLDivElement>(null);
  const list: any[] = t.testimonials.slice(0, 8);

  const slide = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".df-review");
    const step = card ? card.getBoundingClientRect().width + 20 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (!list.length) return null;
  return (
    <section className="df-testimonials">
      <div className="df-shell">
        <DfSectionHead
          eyebrow={c("home.reviews.eyebrow", "Testimonials")}
          title={c("home.reviews.title", "Kind words from our guests")}
          sub={rating.count ? `${rating.avg.toFixed(1)} out of 5 · ${rating.count} reviews` : undefined}
          action={
            t.showWriteReview ? (
              <button type="button" className="df-btn df-btn-sm" onClick={t.openReviewModal}>
                {c("home.reviews.write", "Write a review")}
              </button>
            ) : null
          }
        />
        <div className="df-review-track" ref={trackRef}>
          {list.map((item, index) => (
            <DfReviewCard key={item.key || index} item={{ ...item, role: item.jobPosition || item.role }} />
          ))}
        </div>
        <div className="df-carousel-controls">
          <button type="button" className="df-carousel-btn" onClick={() => slide(-1)} aria-label="Previous review">
            {Icon.arrow(16)}
          </button>
          <button type="button" className="df-carousel-btn" onClick={() => slide(1)} aria-label="Next review">
            {Icon.arrow(16)}
          </button>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── gallery + location ───────────────────────── */

const GalleryStrip: React.FC = () => {
  const { t, photo, c } = useTpl();
  const primaryImage = photo("home.gallery.image", t.resolvedHomeHeroImage || "");
  const items: string[] = t.galleryItems.length ? t.galleryItems : primaryImage ? [primaryImage] : [];
  if (!items.length) return null;
  const rows = [items, [...items].reverse()];
  return (
    <section className="df-gallery">
      <div className="df-shell">
        <DfSectionHead
          eyebrow={c("home.gallery.eyebrow", "Gallery")}
          title={c("home.gallery.title", "A look around the house")}
          center
        />
      </div>
      {rows.map((row, rowIndex) => (
        <div className={`df-gallery-row ${rowIndex ? "df-gallery-row--reverse" : ""}`} key={rowIndex}>
          {[...row, ...row].map((src, index) => {
            const realIndex = index % row.length;
            const galleryIndex = t.galleryItems.indexOf(row[realIndex]);
            return (
              <button
                key={`${rowIndex}-${index}-${src}`}
                type="button"
                onClick={() => (galleryIndex >= 0 ? t.openGalleryViewer(galleryIndex) : undefined)}
                aria-label={`Open photo ${realIndex + 1}`}
              >
                <img src={src} alt="" loading="lazy" decoding="async" />
              </button>
            );
          })}
        </div>
      ))}
      <div className="df-gallery-actions">
        <button type="button" className="df-btn df-btn-blue" onClick={() => t.openGalleryViewer(0)}>
          {c("home.gallery.view", "View gallery")}
        </button>
        <button type="button" className="df-btn df-btn-outline" style={{ borderColor: "#fff", color: "#fff", background: "transparent" }} onClick={() => t.goToSection("gallery")}>
          {c("home.gallery.link", "All photos")}
        </button>
      </div>
    </section>
  );
};

const Location: React.FC = () => {
  const { t, draft, primary, openLead, c } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  return (
    <section className="df-section-tight">
      <div className="df-shell">
        <Reveal>
          <div className="df-split">
            <div>
              <p className="df-eyebrow">{c("home.contact.eyebrow", "Find us")}</p>
              <h2 className="df-h2">{draft?.contactTitle || c("home.contact.title", "Come say hello")}</h2>
              <p className="df-lead">{t.contactAddress || draft?.address}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
                {primary?.leadEnabled ? (
                  <button type="button" className="df-btn" onClick={() => openLead(primary)}>
                    {c("home.contact.button", "Book a room")}
                  </button>
                ) : null}
                <button type="button" className="df-btn df-btn-outline" onClick={() => t.goToSection("contact")}>
                  {c("home.contact.details", "Contact details")}
                </button>
              </div>
            </div>
            <div className="df-map" style={{ marginTop: 0 }}>
              {draft?.mapUrl ? (
                <iframe title="Map" src={draft.mapUrl} loading="lazy" />
              ) : (
                <div style={{ display: "grid", placeItems: "center", minHeight: 360 }}>
                  <span>{draft?.companyName || "Map"}</span>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── page ───────────────────────── */

export const DestinflowHome: React.FC = () => {
  const { t, draft, primary, services } = useTpl();
  const others = services.filter((service) => service.key !== primary?.key);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero /> : <div style={{ height: 82 }} />}
      {t.isSectionEnabled("home_about") ? <Intro /> : null}
      {t.isSectionEnabled("home_products") && primary ? <Rooms service={primary} /> : null}
      {t.isSectionEnabled("home_about") ? <Dining services={services} /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Facilities /> : null}
      {t.isSectionEnabled("home_hero") ? <Feedback /> : null}
      {t.isSectionEnabled("home_products") ? <LakeFeature service={primary} /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Testimonials /> : null}
      {t.isSectionEnabled("home_gallery") ? <GalleryStrip /> : null}
      <div className="df-shell">
        <FaqSection faqs={draft?.faqs} />
      </div>
      <Location />
      {others.length && t.isSectionEnabled("home_services") ? (
        <section className="df-section-tight">
          <div className="df-shell">
            <DfSectionHead eyebrow="More from us" title="Explore everything we offer" />
            <div className="df-feature-grid">
              {others.map((service, index) => (
                <button key={service.key} type="button" className="df-feature" onClick={() => t.goToProductPage(service.slug)}>
                  <span className="df-feature-index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{service.name}</h3>
                  <p>{service.subText || service.heroSubHeading}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};
