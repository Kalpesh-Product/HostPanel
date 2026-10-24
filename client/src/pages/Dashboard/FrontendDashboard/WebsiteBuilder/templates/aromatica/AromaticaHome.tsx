import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { useAromatica } from "./AromaticaContext";
import { AromaArrow, AromaImage, AromaReveal } from "./AromaticaUI";

const mediaUrl = (value: any) =>
  typeof value === "string" ? value : value?.url || value?.src || "";

const CoffeeBranch = () => (
  <svg className="aroma-coffee-branch" viewBox="0 0 680 430" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M-20 410c182-34 292-108 388-227C449 84 528 38 706 14" />
      <path d="M115 363c-49-55-58-108-28-157 54 18 86 58 91 119" />
      <path d="M238 293c-32-64-20-119 25-158 46 39 57 91 29 145" />
      <path d="M375 184c-13-61 12-112 64-139 34 49 31 96-10 139" />
      <ellipse cx="165" cy="346" rx="42" ry="28" transform="rotate(-25 165 346)" />
      <ellipse cx="283" cy="271" rx="42" ry="28" transform="rotate(-34 283 271)" />
      <ellipse cx="415" cy="166" rx="42" ry="28" transform="rotate(-36 415 166)" />
    </g>
  </svg>
);

const CupLine = () => (
  <svg className="aroma-cup-drawing" viewBox="0 0 520 360" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M76 96h282v126c0 57-47 103-104 103h-74c-57 0-104-46-104-103V96Z" />
      <path d="M358 126h38c54 0 76 67 35 102-18 15-43 18-73 18" />
      <path d="M113 88c50-28 180-28 230 0M141 124c38 17 126 17 165 0" />
    </g>
  </svg>
);

export const AromaticaHome: React.FC = () => {
  const { t, draft, primary, testimonials, openLead, goToService, c, photo } =
    useAromatica();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const configuredHeroImages = (t.heroImages || [])
    .map(mediaUrl)
    .filter(Boolean);
  const heroFallback = photo(
    "home.hero",
    mediaUrl(t.heroImages?.[0]) || primary?.heroImage || primary?.items[0]?.image,
  );
  const heroSlides = configuredHeroImages.length > 1
    ? configuredHeroImages
    : [heroFallback].filter(Boolean);
  const hero = heroSlides[t.heroIndex % heroSlides.length] || heroFallback;
  const videoUrl = String(draft?.heroVideoUrl || "").trim();
  const products = useMemo(() => primary?.items || [], [primary?.items]);
  const gallery = (t.galleryItems || []).map(mediaUrl).filter(Boolean);
  const reviews = testimonials?.length
    ? testimonials
    : [
        {
          name: "Maya Kapoor",
          text: "Aromatica is my pause button in the middle of the city. Beautiful coffee, warm people and a room that always feels alive.",
        },
        {
          name: "Daniel Roy",
          text: "Every drink feels considered, from the first aroma to the final sip. It is the cafe I bring every visiting friend to.",
        },
        {
          name: "Anika Shah",
          text: "The coffee is precise without being precious, and the team remembers exactly how you like it.",
        },
      ];
  const review = reviews[reviewIndex % reviews.length];
  const menuItems = products.slice(0, 6);
  const tryImages = [
    photo("home.try.primary", gallery[6] || gallery[0] || hero),
    photo("home.try.secondary", gallery[2] || gallery[1] || hero),
  ];
  const videoPoster = photo("home.video", gallery[7] || gallery[3] || hero);
  const enjoyImage = photo(
    "home.enjoy.image",
    mediaUrl(t.aboutImages?.[2]) || gallery[1] || hero,
  );

  return (
    <>
      <section className="aroma-cafe-hero">
        <AnimatePresence initial={false}>
          <motion.div
            className="aroma-cafe-hero-media"
            key={hero}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <AromaImage src={hero} alt="Friends sharing coffee at the cafe" eager />
          </motion.div>
        </AnimatePresence>
        <div className="aroma-cafe-hero-shade" />
        <div className="aroma-shell aroma-cafe-hero-copy">
          <motion.p
            className="aroma-kicker"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            {c("home.hero.kicker", "Welcome to our cafe")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 44 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {c("home.hero.title", "Where Every Sip is a Moment of Delight")}
          </motion.h1>
        </div>
        <button
          className="aroma-hero-scroll"
          type="button"
          onClick={() =>
            document
              .getElementById("aroma-story")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span />
          Scroll
        </button>
      </section>

      <section className="aroma-dark-story" id="aroma-story">
        <CoffeeBranch />
        <div className="aroma-shell aroma-dark-story-grid">
          <AromaReveal>
            <p className="aroma-kicker">{c("home.story.kicker", "Our cafe")}</p>
            <h2>{c("home.story.title", "Savor the blend of classic flavors")}</h2>
          </AromaReveal>
          <AromaReveal className="aroma-dark-story-copy" delay={0.08}>
            <p>
              {c(
                "home.story.body",
                draft?.subTitle ||
                  "A neighborhood cafe where thoughtful coffee, generous food and genuine conversation come together.",
              )}
            </p>
            <p>
              {c(
                "home.story.body2",
                "Our baristas pair time-honored techniques with playful seasonal ideas, creating a familiar ritual that still has room to surprise.",
              )}
            </p>
          </AromaReveal>
        </div>
      </section>

      <section className="aroma-review-stage">
        <div className="aroma-shell">
          <AnimatePresence mode="wait">
            <motion.div
              className="aroma-review-slide"
              key={reviewIndex}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              {review?.image ? (
                <AromaImage
                  className="aroma-review-photo"
                  src={review.image}
                  alt={review?.name || review?.author || "Cafe guest"}
                />
              ) : (
                <span className="aroma-review-portrait">
                  {String(review?.name || review?.author || "A").charAt(0)}
                </span>
              )}
              <blockquote>
                {review?.text || review?.review || review?.comment}
              </blockquote>
              <span className="aroma-review-quote">❞</span>
              <strong>{review?.name || review?.author || "Cafe guest"}</strong>
              <small>{c("home.review.role", "Guest")}</small>
            </motion.div>
          </AnimatePresence>
          <button
            className="aroma-review-arrow is-left"
            type="button"
            aria-label="Previous testimonial"
            onClick={() =>
              setReviewIndex((reviewIndex - 1 + reviews.length) % reviews.length)
            }
          >
            ←
          </button>
          <button
            className="aroma-review-arrow is-right"
            type="button"
            aria-label="Next testimonial"
            onClick={() => setReviewIndex((reviewIndex + 1) % reviews.length)}
          >
            →
          </button>
          <div className="aroma-review-dots">
            {reviews.map((_: any, index: number) => (
              <button
                key={index}
                type="button"
                aria-label={`View testimonial ${index + 1}`}
                className={index === reviewIndex ? "is-active" : ""}
                onClick={() => setReviewIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="aroma-try-section">
        <div className="aroma-shell aroma-try-grid">
          <AromaReveal className="aroma-try-collage">
            <AromaImage src={tryImages[0]} alt="Barista preparing coffee" />
            <AromaImage src={tryImages[1]} alt="A signature cold coffee" />
          </AromaReveal>
          <AromaReveal className="aroma-try-copy" delay={0.08}>
            <p className="aroma-kicker">{c("home.try.kicker", "Come and try")}</p>
            <h2>{c("home.try.title", "We prepare unique drinks")}</h2>
            <p>
              {c(
                "home.try.body",
                "Seasonal ingredients, carefully dialed espresso and a little curiosity make every drink unmistakably ours.",
              )}
            </p>
            <ul>
              <li>{c("home.try.point1", "Freshly roasted specialty coffee")}</li>
              <li>{c("home.try.point2", "House-made syrups and seasonal produce")}</li>
              <li>{c("home.try.point3", "Plant-based and classic milk options")}</li>
            </ul>
            <button
              type="button"
              className="aroma-primary"
              onClick={() => t.goToSection("about")}
            >
              {c("home.try.button", "About us")}
            </button>
          </AromaReveal>
        </div>
      </section>

      <section className="aroma-specials">
        <div className="aroma-shell">
          <AromaReveal className="aroma-centered-head">
            <p className="aroma-kicker">{c("home.menu.kicker", "The menu")}</p>
            <h2>{c("home.products.title", "Our specials")}</h2>
          </AromaReveal>
          <div className="aroma-menu-lines">
            {menuItems.map((item: any, index: number) => (
              <AromaReveal
                className="aroma-menu-line"
                key={item.key || item.slug || index}
                delay={Math.min(index * 0.05, 0.2)}
              >
                <button
                  type="button"
                  onClick={() =>
                    primary && t.goToProductItem(primary.slug, item.slug)
                  }
                >
                  <span className="aroma-menu-name">{item.title}</span>
                  <span className="aroma-menu-dots" />
                  <strong>{item.price || "Fresh today"}</strong>
                  <small>{item.description}</small>
                </button>
              </AromaReveal>
            ))}
          </div>
          <button
            type="button"
            className="aroma-outline-button"
            onClick={() => primary && goToService(primary)}
          >
            {c("home.menu.button", "View full menu")}
            <AromaArrow />
          </button>
        </div>
      </section>

      <section className="aroma-video-story">
        {videoPlaying && videoUrl ? (
          <motion.video
            key="video"
            className="aroma-video-player"
            src={videoUrl}
            poster={videoPoster}
            controls
            autoPlay
            playsInline
            preload="metadata"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
          />
        ) : (
          <motion.div
            key="poster"
            initial={{ scale: 1.08 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <AromaImage src={videoPoster} alt="Barista pouring latte art" />
          </motion.div>
        )}
        {!videoPlaying ? <div className="aroma-video-shade" /> : null}
        {!videoPlaying && videoUrl ? (
          <button
            type="button"
            aria-label="Play cafe video"
            onClick={() => setVideoPlaying(true)}
          >
            <span>▶</span>
            Play
          </button>
        ) : null}
      </section>

      <section className="aroma-enjoy">
        <CupLine />
        <div className="aroma-shell aroma-enjoy-grid">
          <AromaReveal className="aroma-enjoy-photo">
            <AromaImage src={enjoyImage} alt="Aromatica barista" />
          </AromaReveal>
          <AromaReveal className="aroma-enjoy-copy" delay={0.08}>
            <p className="aroma-kicker">{c("home.enjoy.kicker", "Enjoy")}</p>
            <h2>{c("home.enjoy.title", "Irresistible hot drinks")}</h2>
            <p>
              {c(
                "home.enjoy.body",
                "Drop in for the morning ritual, an afternoon reset or one more cup with someone you like.",
              )}
            </p>
            <div className="aroma-inline-hours">
              <strong>{c("home.hours.weekdays", "Mon–Fri: 7 AM – 10 PM")}</strong>
              <strong>{c("home.hours.weekend", "Saturday–Sunday: 8 AM – 9 PM")}</strong>
            </div>
            <button
              type="button"
              className="aroma-primary"
              onClick={() => primary && goToService(primary)}
            >
              {c("home.enjoy.button", "Our menu")}
            </button>
          </AromaReveal>
        </div>
      </section>

      <section className="aroma-numbers">
        <div className="aroma-shell">
          {[1, 2, 3, 4].map((number, index) => (
            <AromaReveal key={number} delay={index * 0.05}>
              <strong>{c(`home.stat${number}.value`, ["48", "12k", "08", "03"][index])}</strong>
              <span>{c(`home.stat${number}.label`, ["Drinks", "People", "Years", "Cafes"][index])}</span>
            </AromaReveal>
          ))}
        </div>
      </section>

      <section className="aroma-final-cta">
        <AromaReveal>
          <p className="aroma-kicker">{c("home.cta.kicker", "Come say hello")}</p>
          <h2>{c("home.cta.title", "Your next favorite coffee is waiting")}</h2>
          <button
            type="button"
            className="aroma-primary"
            onClick={() =>
              primary ? openLead(primary) : t.goToSection("contact")
            }
          >
            {c("home.cta.button", "Reserve a table")}
          </button>
        </AromaReveal>
      </section>
    </>
  );
};
