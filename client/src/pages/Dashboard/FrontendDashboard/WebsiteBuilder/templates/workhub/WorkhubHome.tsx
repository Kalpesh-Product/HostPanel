import React, { useState } from "react";
import { Marquee, motion } from "../motion";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { StarRow } from "../shared/TplUI";
import { findCoPlaceDemoLogo } from "../coplace/coPlaceDemoLogos";
import { useWorkhub } from "./WorkhubContext";
import { WhIcon, WhImage, WhReveal } from "./WorkhubUI";

const FALLBACK_QUOTE =
  "WorkHub’s flexible workspaces have made my freelancing journey smoother. I can switch between spaces effortlessly, and the vibrant community adds an extra layer of motivation.";

/** Highlights the business name in the hero headline, as in the WorkHub reference. */
const heroTitleNode = (value: string, companyName: string): React.ReactNode => {
  const text = String(value || "");
  const name = String(companyName || "").trim();
  if (!name) return text;
  const index = text.toLowerCase().indexOf(name.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="wh-hero-accent">
        {text.slice(index, index + name.length)}
      </span>
      {text.slice(index + name.length)}
    </>
  );
};

const NEWS = [
  {
    tag: "Workplace",
    title: "Creating a Distraction-Free Workspace",
    body: "Simple changes to lighting, layout and sound can turn a good meeting room into a great one.",
  },
  {
    tag: "Wellness",
    title: "The Vital Importance of Ergonomic Workspaces",
    body: "Comfortable seating and thoughtful details help teams stay focused for longer.",
  },
  {
    tag: "Technology",
    title: "Pros and Cons of Remote Work",
    body: "Hybrid teams still need a dependable place to meet, share ideas and make decisions.",
  },
];

export const WorkhubHome: React.FC = () => {
  const {
    t,
    draft,
    primary,
    rating,
    c,
    photo,
    status,
    openLead,
    goToItem,
  } = useWorkhub();
  const [locationIndex, setLocationIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);

  const gallery = (t.galleryItems || []).filter(Boolean) as string[];
  const hero = photo(
    "home.hero.image",
    t.homeHeroImage || primary?.heroImage || gallery[0] || "",
  );
  const servicesImage = photo(
    "home.services.image",
    primary?.cardImage || primary?.heroImage || gallery[1] || hero,
  );
  const items = primary?.items || [];
  const reviews = t.testimonials || [];
  const review = reviews[reviewIndex % Math.max(reviews.length, 1)];
  const reviewRating = Number(review?.rating);
  const reviewCopy =
    review?.quote ||
    review?.review ||
    review?.testimonial ||
    review?.testimony ||
    review?.text ||
    FALLBACK_QUOTE;
  const reviewName =
    review?.name || review?.reviewerName || "Sophia Lee";
  const reviewRole = review?.role || "Member";
  const moveReview = (step: number) => {
    if (!reviews.length) return;
    setReviewIndex((index) => (index + step + reviews.length) % reviews.length);
  };
  const locations = [
    {
      name: draft?.contactAddress ? "Our Main Location" : "Pinnacle Suites",
      detail:
        t.contactAddress ||
        draft?.contactAddress ||
        "Central business district, easily reached by road and transit.",
      hours: status?.text || "Open today · flexible access",
      image: gallery[1] || servicesImage || hero,
    },
    {
      name: "Cityscape Heights",
      detail: draft?.contactAddress || "Downtown district · meeting rooms and lounges.",
      hours: "Mon – Fri · 8:00 AM – 8:00 PM",
      image: gallery[2] || gallery[0] || hero,
    },
    {
      name: "Metropolitan Oasis",
      detail: "A quieter setting for workshops, interviews and focused team days.",
      hours: "Daily · 9:00 AM – 7:00 PM",
      image: gallery[3] || gallery[1] || hero,
    },
  ];
  const activeLocation = locations[locationIndex];
  const trusted = draft?.logoCarousel;
  const trustedLogos = (Array.isArray(trusted?.logos) ? trusted.logos : [])
    .map((logo: { name?: string } | string) => {
      const src = getMediaSrc(logo);
      const demoLogo = findCoPlaceDemoLogo(src);
      const name = typeof logo === "string" ? "" : logo?.name || "";
      return { src: demoLogo?.url || src, name: demoLogo?.name || name };
    })
    .filter(({ src }) => Boolean(src));
  const homeServices = items.slice(0, 6).filter((_, index) => index !== 3);

  return (
    <>
      <section className="wh-hero">
        <div className="wh-shell">
          <motion.div
            className="wh-hero-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="wh-hero-panel"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="wh-hero-panel-inner">
                <h1>
                  {heroTitleNode(
                    c(
                      "home.hero.title",
                      draft?.title ||
                        `Curate your office space with ${draft?.companyName || "WorkHub"}`,
                    ),
                    draft?.companyName || "WorkHub",
                  )}
                </h1>
                <p className="wh-hero-sub">
                  {c(
                    "home.hero.subtitle",
                    draft?.subTitle ||
                      draft?.subtitle ||
                      "Empowering professionals with innovative workspaces",
                  )}
                </p>
                <div className="wh-hero-actions">
                  <button
                    type="button"
                    className="wh-btn"
                    onClick={() =>
                      primary?.leadEnabled ? openLead(primary) : t.goToSection("contact")
                    }
                  >
                    Get a Quote {WhIcon.arrow()}
                  </button>
                  <button
                    type="button"
                    className="wh-btn-outline"
                    onClick={() => t.goToSection("products")}
                  >
                    Our Services
                  </button>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="wh-hero-image"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <WhImage src={hero} alt="Meeting room interior" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {items.length ? (
        <section className="wh-section wh-services">
          <div className="wh-shell">
            <WhReveal>
              <div className="wh-section-head">
                <div>
                  <p className="wh-label">Our Services</p>
                  <h2>{c("home.services.title", "Discover Our Array of Services")}</h2>
                </div>
                <button
                  type="button"
                  className="wh-textlink"
                  onClick={() => t.goToSection("products")}
                >
                  View Services {WhIcon.arrow()}
                </button>
              </div>
            </WhReveal>
            <div className="wh-services-grid">
              {homeServices.map((item, index) => (
                <WhReveal key={item.key} delay={Math.min(index * 0.06, 0.3)}>
                  <article className="wh-service-card">
                    <span className="wh-service-num">0{index + 1}</span>
                    <h3>{item.title}</h3>
                    <p>
                      {item.description ||
                        "A flexible, fully equipped setting for your best work."}
                    </p>
                    <div className="wh-service-foot">
                      <small>
                        {item.capacity
                          ? `Up to ${item.capacity} people`
                          : item.chips[0] || "Flexible setup"}
                      </small>
                      <button
                        type="button"
                        className="wh-textlink"
                        onClick={() =>
                          primary
                            ? goToItem(primary, item)
                            : t.goToSection("products")
                        }
                      >
                        View Space {WhIcon.arrow()}
                      </button>
                    </div>
                    <WhImage
                      src={item.image || servicesImage}
                      alt={item.title}
                      className="wh-service-thumb"
                    />
                  </article>
                </WhReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="wh-section wh-locations">
        <div className="wh-shell">
          <WhReveal>
            <div className="wh-section-head">
              <div>
                <p className="wh-label">Locations</p>
                <h2>{c("home.locations.title", "Explore Our Locations")}</h2>
              </div>
              <button
                type="button"
                className="wh-textlink"
                onClick={() => t.goToSection("contact")}
              >
                View Locations {WhIcon.arrow()}
              </button>
            </div>
          </WhReveal>
          <div className="wh-location-layout">
            <div className="wh-location-photo">
              <WhImage
                src={activeLocation.image}
                alt={activeLocation.name}
              />
              <span className="wh-location-flag">
                {WhIcon.pin(13)} {activeLocation.hours}
              </span>
            </div>
            <div>
              <div className="wh-location-tabs">
                {locations.map((location, index) => (
                  <button
                    type="button"
                    key={location.name}
                    className={`wh-location-tab ${index === locationIndex ? "wh-active" : ""}`}
                    onClick={() => setLocationIndex(index)}
                    aria-pressed={index === locationIndex}
                  >
                    <span>0{index + 1}</span>
                    <strong>{location.name}</strong>
                    <small>{location.hours}</small>
                  </button>
                ))}
              </div>
              <div className="wh-location-info">
                <p>{activeLocation.detail}</p>
                <div className="wh-location-actions">
                  <button
                    type="button"
                    className="wh-btn"
                    onClick={() =>
                      primary
                        ? openLead(primary)
                        : t.goToSection("contact")
                    }
                  >
                    Enquire Now {WhIcon.arrow()}
                  </button>
                  <button
                    type="button"
                    className="wh-btn-outline"
                    onClick={() => t.goToSection("contact")}
                  >
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wh-section wh-split-section">
        <div className="wh-shell wh-split">
          <WhReveal>
            <article className="wh-split-panel wh-split-panel-dark">
              <div>
                <p className="wh-eyebrow">Built to grow</p>
                <h3>{c("home.cta.title", "Scalable Vision: Your Future-Ready Workspace")}</h3>
                <p>
                  {c(
                    "home.cta.body",
                    "Our rooms adapt as your team changes, so you can focus on the work ahead instead of the logistics.",
                  )}
                </p>
              </div>
              <div className="wh-split-actions">
                <button
                  type="button"
                  className="wh-btn-white"
                  onClick={() => t.goToSection("contact")}
                >
                  Request a Quote
                </button>
              </div>
            </article>
          </WhReveal>
          <WhReveal delay={0.08}>
            <article className="wh-split-panel wh-split-panel-light">
              <div>
                <p className="wh-label">Room to move</p>
                <h3>Discover the Flexibility of Our Workspaces</h3>
                <p>
                  Choose a room by the hour or by the day. Bring a team of two
                  or twenty — we will have the space ready.
                </p>
              </div>
              <div className="wh-split-actions">
                <button
                  type="button"
                  className="wh-btn"
                  onClick={() => t.goToSection("products")}
                >
                  View Our Services {WhIcon.arrow()}
                </button>
              </div>
            </article>
          </WhReveal>
        </div>
      </section>

      <section className="wh-testimonials">
        <div className="wh-shell">
          <div className="wh-testimonial-head">
            <div>
              <p className="wh-eyebrow">Member stories</p>
              <h2>{c("home.testimonials.title", "What our Members Say")}</h2>
              {rating.count > 0 ? (
                <div className="wh-testimonial-rating">
                  <strong>{rating.avg.toFixed(1)} / 5</strong>
                  <span aria-hidden="true"><StarRow value={rating.avg} size={18} /></span>
                  <span>from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</span>
                </div>
              ) : null}
            </div>
            <p>
              Real words from the people who use our rooms every week.
            </p>
          </div>
          <div className="wh-testimonial-body">
            <div className="wh-testimonial-photo">
              <WhImage
                src={gallery[3] || hero}
                alt={reviewName}
              />
            </div>
            <div>
              <span className="wh-quote-mark" aria-hidden="true">
                “
              </span>
              {reviewRating > 0 ? (
                <div className="wh-testimonial-stars" role="img" aria-label={`${reviewRating} out of 5 stars`}>
                  <span aria-hidden="true"><StarRow value={reviewRating} size={18} /></span>
                </div>
              ) : null}
              <motion.blockquote
                key={reviewIndex}
                className="wh-testimonial-quote"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                {reviewCopy}
              </motion.blockquote>
              <div className="wh-testimonial-name">
                <strong>{reviewName}</strong>
                <span>{reviewRole}</span>
              </div>
            </div>
            <div className="wh-testimonial-arrows">
              <button
                type="button"
                onClick={() => moveReview(-1)}
                aria-label="Previous testimonial"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => moveReview(1)}
                aria-label="Next testimonial"
              >
                →
              </button>
            </div>
          </div>
          {t.showWriteReview ? (
            <div className="wh-testimonial-review-action">
              <button type="button" className="wh-btn-white" onClick={t.openReviewModal}>
                Write a review
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {trusted?.enabled && trustedLogos.length > 0 ? (
        <section className="wh-trusted">
          <div className="wh-shell wh-trusted-inner">
            <p className="wh-eyebrow wh-trusted-label">
              {trusted.title || c("home.trusted.title", "Trusted by Leading Companies")}
            </p>
            <Marquee className="wh-trusted-logos" speed={38}>
              {trustedLogos.map(({ src, name }, index) => (
                <WhImage key={`${src}-${index}`} src={src} alt={name || `Company logo ${index + 1}`} />
              ))}
            </Marquee>
          </div>
        </section>
      ) : null}

      <section className="wh-cta-band">
        <div className="wh-shell wh-cta-band-inner">
          <div>
            <p className="wh-eyebrow">Get started</p>
            <h2>{c("home.ctaBand.title", "Ready to Transform Your Workspace?")}</h2>
            <p>
              {c(
                "home.ctaBand.body",
                "Request a quote or schedule a tour today!",
              )}
            </p>
          </div>
          <button
            type="button"
            className="wh-btn-white"
            onClick={() => t.goToSection("contact")}
          >
            Enquire Now {WhIcon.arrow()}
          </button>
        </div>
      </section>

      <section className="wh-section wh-news">
        <div className="wh-shell">
          <WhReveal>
            <div className="wh-section-head">
              <div>
                <p className="wh-label">Journal</p>
                <h2>{c("home.news.title", "Stay in the know")}</h2>
                <p>{c("home.news.body", "Ideas and updates for better workdays.")}</p>
              </div>
              <button
                type="button"
                className="wh-textlink"
                onClick={() => t.goToSection("contact")}
              >
                View All Posts {WhIcon.arrow()}
              </button>
            </div>
          </WhReveal>
          <div className="wh-news-grid">
            {NEWS.map((post, index) => (
              <WhReveal key={post.title} delay={index * 0.06}>
                <article className="wh-news-card">
                  <div className="wh-news-media">
                    <WhImage
                      src={gallery[index + 2] || gallery[index] || hero}
                      alt={post.title}
                    />
                  </div>
                  <div className="wh-news-body">
                    <div className="wh-news-meta">
                      <b>{post.tag}</b>
                      <span>WorkHub journal</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.body}</p>
                    <button
                      type="button"
                      className="wh-textlink"
                      onClick={() => t.goToSection("contact")}
                    >
                      Read more {WhIcon.arrow()}
                    </button>
                  </div>
                </article>
              </WhReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
