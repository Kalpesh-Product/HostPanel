import React, { useState } from "react";
import { Reveal } from "../motion";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { Icon } from "../shared/TplUI";
import { useWavex } from "./WavexContext";
import { WxMedia, WxRoomCard, WxSectionHead } from "./WavexUI";

const unique = (images: string[]) => Array.from(new Set(images.filter(Boolean)));

const pick = (items: string[], index: number) =>
  items.length ? items[index % items.length] : "";

/** Full-bleed hero carousel with the booking CTAs layered over the active slide. */
const Hero: React.FC = () => {
  const { t, primary, profile, openLead, goToService, c, photo } = useWavex();
  const fallback: string[] = Array.isArray(t.heroImages)
    ? t.heroImages
    : t.resolvedHomeHeroImage
      ? [t.resolvedHomeHeroImage]
      : [];
  const gallery: string[] = Array.isArray(t.galleryItems) ? t.galleryItems : [];
  const pool = unique([...fallback, ...gallery]);
  const slides = unique([
    photo("home.hero.image", pool[0] || ""),
    photo("home.hero.image2", pool[1] || pool[0] || ""),
    photo("home.hero.image3", pool[2] || pool[1] || pool[0] || ""),
    photo("home.hero.image4", pool[3] || pool[2] || pool[0] || ""),
  ]);
  const index = slides.length > 1 ? Math.min(t.heroIndex || 0, slides.length - 1) : 0;
  const title = c("home.hero.title", "Your future workspace awaits you");

  const book = () => {
    if (primary?.leadEnabled) openLead(primary);
    else t.goToSection("contact");
  };

  return (
    <section className="wx-hero" aria-label="Hero">
      <div className="wx-shell wx-hero-frame">
        <div className="wx-hero-stage">
        {slides.length ? (
          slides.map((src, i) => (
            <div key={`${src}-${i}`} className={`wx-hero-slide${i === index ? " is-active" : ""}`}>
              <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} />
            </div>
          ))
        ) : (
          <div className="wx-hero-slide is-active" style={{ background: "linear-gradient(135deg,#1d1d21,#34343a)" }} />
        )}
        <div className="wx-hero-shade" />

          <div className="wx-hero-inner">
          <div className="wx-hero-content">
            <Reveal delay={0.06}>
              <h1 className="wx-hero-title">{title}</h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="wx-hero-sub">
                {c(
                  "home.hero.subtitle",
                  "Bright, thoughtfully designed rooms for focused meetings, workshops and everyday work.",
                )}
              </p>
            </Reveal>
            <Reveal delay={0.18} className="wx-hero-actions">
              <button type="button" className="wx-hero-cta" onClick={book}>
                {c("home.hero.primaryCta", "Get in touch")}
              </button>
              <button
                type="button"
                className="wx-hero-cta-secondary"
                onClick={() => (primary ? goToService(primary) : t.goToSection("products"))}
              >
                {c("home.hero.secondaryCta", "Find a room / desk")} {Icon.arrow(16)}
              </button>
            </Reveal>
          </div>

          {slides.length > 1 ? (
            <div className="wx-hero-controls">
              <button
                type="button"
                className="wx-hero-arrow"
                aria-label="Previous photo"
                onClick={t.handleHeroPrev}
              >
                <span style={{ display: "flex", transform: "rotate(180deg)" }}>
                  {Icon.arrow(18)}
                </span>
              </button>
              <button
                type="button"
                className="wx-hero-arrow"
                aria-label="Next photo"
                onClick={t.handleHeroNext}
              >
                {Icon.arrow(18)}
              </button>
            </div>
          ) : null}

          {slides.length > 1 ? (
            <div className="wx-hero-dots" role="group" aria-label="Hero photos">
              {slides.map((src, i) => (
                <button
                  key={`${src}-dot-${i}`}
                  type="button"
                  className={`wx-hero-dot${i === index ? " is-active" : ""}`}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === index}
                  onClick={() => t.setHeroIndex(i)}
                />
              ))}
            </div>
          ) : null}
          {slides.length ? (
            <span className="wx-hero-count">
              {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
          ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

/** The editorial “what's the vibe” section: copy on the left, photo carousel on the right. */
const Vibe: React.FC = () => {
  const { t, c, photo } = useWavex();
  const fallback = unique([
    ...(Array.isArray(t.homeGalleryItems) ? t.homeGalleryItems : []),
    ...(Array.isArray(t.galleryItems) ? t.galleryItems : []),
    ...(Array.isArray(t.heroImages) ? t.heroImages : []),
  ]);
  const slides = unique([
    photo("home.vibe.image", fallback[0] || ""),
    photo("home.vibe.image2", fallback[1] || fallback[0] || ""),
    photo("home.vibe.image3", fallback[2] || fallback[1] || ""),
    photo("home.vibe.image4", fallback[3] || fallback[2] || ""),
  ]);
  const [index, setIndex] = useState(0);
  const active = slides.length ? Math.min(index, slides.length - 1) : 0;

  return (
    <section className="wx-section">
      <div className="wx-shell wx-vibe-grid">
        <div className="wx-vibe-copy">
          <Reveal>
            <span className="wx-kicker">{c("home.vibe.eyebrow", "Our community")}</span>
            <h2 className="wx-title" style={{ marginTop: 14 }}>
              {c("home.vibe.title", "What's the vibe like?")}
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="wx-copy">
              {c(
                "home.vibe.body1",
                "Productive by design, relaxed by nature. Natural light, modern decor and quiet corners make it easy to settle into meaningful work.",
              )}
            </p>
            <p className="wx-copy">
              {c(
                "home.vibe.body2",
                "Join a diverse mix of entrepreneurs, freelancers and teams — with private meeting rooms ready whenever a conversation needs focus.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <button
              type="button"
              className="wx-text-link"
              style={{ marginTop: 24 }}
              onClick={() => t.goToSection("about")}
            >
              More about us {Icon.arrow(17)}
            </button>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="wx-vibe-carousel">
            <div className="wx-slide-stage">
              {slides.length ? (
                slides.map((src, i) => (
                  <div key={`${src}-${i}`} className={`wx-slide${i === active ? " is-active" : ""}`}>
                    <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} />
                  </div>
                ))
              ) : (
                <div className="wx-placeholder">Our space</div>
              )}
              <span className="wx-slide-caption">Life at {t.draft?.companyName || "WaveX"}</span>
              {slides.length > 1 ? (
                <div className="wx-slider-controls">
                  <button
                    type="button"
                    className="wx-arrow"
                    aria-label="Previous photo"
                    onClick={() => setIndex((active - 1 + slides.length) % slides.length)}
                  >
                    <span style={{ display: "flex", transform: "rotate(180deg)" }}>{Icon.arrow(17)}</span>
                  </button>
                  <button
                    type="button"
                    className="wx-arrow"
                    aria-label="Next photo"
                    onClick={() => setIndex((active + 1) % slides.length)}
                  >
                    {Icon.arrow(17)}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <p className="wx-swipe">Swipe / browse the space</p>
        </Reveal>
      </div>
    </section>
  );
};

/** Dark stats panel plus a warm community photograph, mirroring WaveX's membership block. */
const Community: React.FC = () => {
  const { t, c, photo } = useWavex();
  const fallback = pick(Array.isArray(t.galleryItems) ? t.galleryItems : [], 1);
  const image = photo("home.community.image", fallback);
  const benefits = [1, 2, 3].map((n) =>
    c(`home.community.benefit${n}`,
      n === 1 ? "Free meeting hours" : n === 2 ? "Events and celebrations" : "Cafe lounge for quick breaks"),
  );

  return (
    <section className="wx-section wx-community">
      <div className="wx-shell wx-community-grid">
        <Reveal className="wx-community-card">
          <div>
            <span className="wx-kicker">Our community</span>
            <p className="wx-community-number">
              <em>{c("home.community.number", "200+")}</em>
            </p>
            <h3>{c("home.community.title", "Join the 200+ happy professionals residing here daily.")}</h3>
          </div>
          <div className="wx-benefits">
            {benefits.map((benefit) => (
              <div key={benefit} className="wx-benefit">
                <i aria-hidden="true">{Icon.check(13)}</i>
                {benefit}
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="wx-community-photo-wrap">
          <div className="wx-community-photo">
            <WxMedia src={image} label="Our community" eager />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/** Small location / commercial-property cards. */
const Location: React.FC = () => {
  const { t, c } = useWavex();
  return (
    <section className="wx-section-tight" style={{ paddingBottom: 0 }}>
      <div className="wx-shell">
        <WxSectionHead eyebrow="Find us" title={c("home.location.title", "Location")} />
        <div className="wx-info-grid">
          <Reveal className="wx-info-card">
            <span className="wx-info-icon">{Icon.pin(20)}</span>
            <h3>{c("home.location.title", "Location")}</h3>
            <p>
              {c(
                "home.location.body",
                t.contactAddress ||
                  "A calm, connected address with everything a working day needs close by.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.08} className="wx-info-card">
            <span className="wx-info-icon">{Icon.flame(18)}</span>
            <h3>{c("home.property.title", "Commercial Property")}</h3>
            <p>
              {c(
                "home.property.body",
                "Flexible, fully furnished spaces that scale with your team and the way you work.",
              )}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

const Spaces: React.FC = () => {
  const { t, primary, services, c, goToService, openLead } = useWavex();
  const service = primary || services[0];
  const items = (service?.items || []).slice(0, 6);
  return (
    <section className="wx-section">
      <div className="wx-shell">
        <WxSectionHead
          eyebrow={c("home.spaces.eyebrow", "Membership")}
          title={c("home.spaces.title", "Our Space & memberships")}
          body={c(
            "home.spaces.body",
            "Pick the setup that fits your day, from a single desk to a private room for the whole team.",
          )}
          action={
            service ? (
              <button
                type="button"
                className="wx-text-link"
                onClick={() => goToService(service)}
              >
                View all rooms {Icon.arrow(17)}
              </button>
            ) : null
          }
        />
        {items.length ? (
          <div className="wx-space-grid">
            {items.map((item, index) => (
              <Reveal key={item.key} delay={Math.min(index * 0.06, 0.3)}>
                <WxRoomCard item={item} service={service!} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="wx-empty">
            {service?.leadEnabled ? (
              <>
                <p>Rooms are being prepared. Ask us what's available.</p>
                <button
                  type="button"
                  className="wx-btn"
                  style={{ marginTop: 18 }}
                  onClick={() => openLead(service)}
                >
                  {service.profile.labels.cta}
                </button>
              </>
            ) : (
              <p>Rooms are being prepared. Check back soon.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const Testimonials: React.FC = () => {
  const { t, c } = useWavex();
  const reviews: any[] = Array.isArray(t.testimonials) ? t.testimonials : [];
  const [index, setIndex] = useState(0);
  const active = reviews.length ? Math.min(index, reviews.length - 1) : 0;
  const review = reviews[active];
  const quote =
    review?.quote || review?.review || review?.testimonial || review?.testimony || review?.text;
  const author = review?.author || review?.name || review?.person || "WaveX member";

  return (
    <section className="wx-section wx-testimonials">
      <div className="wx-shell">
        <WxSectionHead
          eyebrow={c("home.testimonials.eyebrow", "People Of WaveX")}
          title={c("home.testimonials.title", "Good spaces. Better people.")}
        />
        {quote ? (
          <Reveal className="wx-testimonial-stage">
            <span className="wx-quote-mark" aria-hidden="true">“</span>
            <blockquote className="wx-quote">{quote}</blockquote>
            <div className="wx-person">
              {review?.image ? (
                <img className="wx-avatar" src={review.image} alt="" loading="lazy" />
              ) : (
                <span className="wx-avatar" style={{ display: "grid", placeItems: "center" }}>
                  {String(author).charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <strong>{author}</strong>
                <span>{review?.role || review?.designation || "Community member"}</span>
              </div>
            </div>
            {reviews.length > 1 ? (
              <div className="wx-testimonial-controls">
                <div className="wx-testimonial-dots" role="group" aria-label="Testimonials">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={i === active ? "is-active" : ""}
                      aria-label={`Show review ${i + 1}`}
                      aria-pressed={i === active}
                      onClick={() => setIndex(i)}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="wx-arrow"
                    aria-label="Previous review"
                    onClick={() => setIndex((active - 1 + reviews.length) % reviews.length)}
                  >
                    <span style={{ display: "flex", transform: "rotate(180deg)" }}>{Icon.arrow(16)}</span>
                  </button>
                  <button
                    type="button"
                    className="wx-arrow"
                    aria-label="Next review"
                    onClick={() => setIndex((active + 1) % reviews.length)}
                  >
                    {Icon.arrow(16)}
                  </button>
                </div>
              </div>
            ) : null}
          </Reveal>
        ) : (
          <div className="wx-empty">Stories from our members are on their way.</div>
        )}
      </div>
    </section>
  );
};

const Contact: React.FC = () => {
  const { t, draft, primary, c } = useWavex();
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <section className="wx-section">
      <div className="wx-shell wx-contact-grid">
        <div className="wx-contact-copy">
          <Reveal>
            <span className="wx-kicker">{c("home.contact.eyebrow", "Get in touch")}</span>
            <h2 className="wx-title" style={{ marginTop: 14 }}>
              {c("home.contact.title", "Come say hello.")}
            </h2>
            <p className="wx-copy">
              {c(
                "home.contact.body",
                "Tell us what you're planning and we'll help you find the right room.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.08} className="wx-contact-lines">
            {t.contactAddress ? (
              <div><i>{Icon.pin(16)}</i>{t.contactAddress}</div>
            ) : null}
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                <i>{Icon.phone(16)}</i>{t.contactPhone}
              </a>
            ) : null}
            {t.contactEmail ? (
              <a href={`mailto:${t.contactEmail}`}>
                <i>{Icon.mail(16)}</i>{t.contactEmail}
              </a>
            ) : null}
          </Reveal>
        </div>
        <Reveal delay={0.1} className="wx-contact-form">
          <h3>{c("home.contact.formTitle", "Book a viewing")}</h3>
          <p>{c("home.contact.formBody", "Share a few details and our team will get back to you.")}</p>
          {showForm ? (
            primary?.leadEnabled ? (
              <LeadFormPanel service={primary} compact />
            ) : (
              <MessageForm
                inquiryType="General Enquiry"
                submitLabel="Send message"
                success="Thanks — we'll be in touch soon."
              />
            )
          ) : (
            <p className="wx-copy">Call or email us and we'll help you plan your visit.</p>
          )}
        </Reveal>
      </div>
    </section>
  );
};

export const WavexHome: React.FC = () => {
  const { t } = useWavex();
  return (
    <>
      <Hero />
      {t.isSectionEnabled("home_about") ? <Vibe /> : null}
      {t.isSectionEnabled("home_about") ? <Community /> : null}
      <Location />
      {t.isSectionEnabled("home_products") ? <Spaces /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Testimonials /> : null}
      {t.isSectionEnabled("home_contact") ? <Contact /> : null}
    </>
  );
};
