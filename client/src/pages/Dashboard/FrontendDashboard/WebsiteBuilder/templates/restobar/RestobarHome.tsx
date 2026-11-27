import { useEffect, useState } from "react";
import cafePhoto from "../../../../../../assets/cafe-banner.jpg";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { StarRow } from "../shared/TplUI";
import { useRestobar } from "./RestobarContext";
import { MenuList, RestobarHours, RestobarImage } from "./RestobarUI";

const HERO_PANELS = [
  { label: "Around the table", title: "Make time for good company." },
  { label: "Made with care", title: "Settle in for something delicious." },
  { label: "From the kitchen", title: "Discover our seasonal plates." },
  { label: "A little indulgence", title: "Stay for something sweet." },
];

function RestobarHero() {
  const { t, draft, primary, goToService, c, photo } = useRestobar();
  const [active, setActive] = useState(1);
  const [phoneActive, setPhoneActive] = useState(1);
  const canBrowse = t.productsPageEnabled && t.isSectionEnabled("home_products");
  const slides = HERO_PANELS.map((panel, index) => ({
    label: c("hero.panel" + (index + 1) + ".label", panel.label),
    title: c("hero.panel" + (index + 1) + ".title", panel.title),
    image: photo("hero.panel" + (index + 1) + ".image",
      t.heroImages[index] || t.heroImages[0] || t.galleryItems[0] || ""),
  }));
  const phoneSlide = slides[phoneActive];
  const menuButton = canBrowse ? (
    <button type="button" className="resto-text-link"
      onClick={() => primary ? goToService(primary) : t.goToSection("products")}>
      {draft.CTAButtonText || c("hero.cta", "See our menu")} <span aria-hidden="true">↗</span>
    </button>
  ) : null;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 480px) and (prefers-reduced-motion: no-preference)");
    let timer: number | undefined;
    const syncAutoplay = () => {
      window.clearTimeout(timer);
      if (media.matches && !document.hidden) {
        timer = window.setTimeout(() => {
          setPhoneActive((current) => (current + 1) % HERO_PANELS.length);
        }, 5000);
      }
    };
    syncAutoplay();
    media.addEventListener("change", syncAutoplay);
    document.addEventListener("visibilitychange", syncAutoplay);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", syncAutoplay);
      document.removeEventListener("visibilitychange", syncAutoplay);
    };
  }, [phoneActive]);

  return (
    <section className="resto-hero" aria-label={draft.companyName || "Restobar"}>
      <div className="resto-hero-images" aria-hidden="true">
        {slides.map((slide, index) => (
          <div key={index} className={[index === active && "is-current", index === phoneActive && "is-phone-current"].filter(Boolean).join(" ")}>
            <RestobarImage src={slide.image} eager={index === active} />
          </div>
        ))}
      </div>
      <div className="resto-hero-panels">
        {slides.map((slide, index) => (
          <article key={index} className={index === active ? "is-current" : undefined}
            onPointerEnter={() => setActive(index)} onFocus={() => setActive(index)}>
            <button className="resto-panel-toggle" type="button" aria-pressed={active === index} onClick={() => setActive(index)}>
              <span>{slide.label}</span>
              <strong>{slide.title}</strong>
            </button>
            {menuButton}
          </article>
        ))}
      </div>
      <div className="resto-phone-carousel" role="group" aria-roledescription="carousel" aria-label="Restobar highlights">
        <div>
          <div key={phoneActive} className="resto-phone-slide">
            <p>{phoneSlide.label}</p>
            <h2>{phoneSlide.title}</h2>
          </div>
          {menuButton}
        </div>
        <div className="resto-phone-carousel-controls">
          {slides.map((slide, index) => (
            <button key={index} type="button" className="resto-phone-slide-dot"
              aria-label={`Slide ${index + 1}: ${slide.title}`} aria-current={index === phoneActive ? "true" : undefined}
              onClick={() => setPhoneActive(index)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function RestobarHome() {
  const { t, draft, services, primary, goToService, c, photo, rating } = useRestobar();
  const enabled = t.isSectionEnabled;
  const menu = services.find((service) => service.kind === "menu") || primary;
  const booking = services.find((service) => service.kind === "menu" && service.leadEnabled);
  const photos = t.galleryItems as string[];
  const introImage = photo("about.image", getMediaSrc(draft.aboutPageImages?.[0]) || photos[0] || t.heroImages[0] || "");
  const accentImage = photo("about.detail", getMediaSrc(draft.aboutPageImages?.[1]) || photos[1] || "");
  const bookingImage = photo("booking.image", photos[2] || t.heroImages[1] || "");
  const hoursImage = photo("hours.image", photos[3] || t.heroImages[2] || "");
  const videoUrl = c("hours.video", String(draft.heroVideoUrl || "").trim());
  const title = draft.title || c("about.title", "Seasonal plates and warm hospitality.");

  return (
    <>
      {enabled("home_hero") ? <RestobarHero /> : null}
      {enabled("home_about") ? (
        <section className="resto-section">
          <div className="resto-shell resto-split resto-intro">
            <div className="resto-intro-images">
              <RestobarImage src={introImage} />
              {accentImage && accentImage !== introImage ? <RestobarImage src={accentImage} /> : null}
            </div>
            <div>
              <p className="resto-kicker">{c("about.eyebrow", "Welcome to our table")}</p>
              <h1>{title}</h1>
              <p>{draft.subTitle || t.aboutIntroBlocks?.[0] || c("about.body", "Join us for seasonal cooking, something good to drink, and time with the people you love.")}</p>
              {t.aboutPageEnabled ? <button className="resto-button" type="button" onClick={() => t.goToSection("about")}>{c("about.cta", "Our story")}</button> : null}
            </div>
          </div>
        </section>
      ) : <h1 className="resto-visually-hidden">{title}</h1>}
      {menu && enabled("home_products") && t.productsPageEnabled ? (
        <section className="resto-section resto-menu-section">
          <div className="resto-shell">
            <header className="resto-center">
              <p className="resto-kicker">{c("menu.eyebrow", "From our kitchen")}</p>
              <h2>{c("menu.title", "Find a new favorite.")}</h2>
            </header>
            <MenuList service={menu} limit={6} />
            <div className="resto-center"><button type="button" className="resto-button" onClick={() => goToService(menu)}>
              {c("menu.cta", "View the full menu")}
            </button></div>
          </div>
        </section>
      ) : null}
      {booking && enabled("home_reservations") ? (
        <section className="resto-section resto-booking">
          <RestobarImage src={bookingImage} />
          <div className="resto-shell resto-split">
            <div>
              <p className="resto-kicker">{c("booking.eyebrow", "Join us for a meal")}</p>
              <h2 id="resto-reservation-title" tabIndex={-1}>{c("booking.heading", "Make a date for dinner.")}</h2>
              <p>{c("booking.body", "Choose your date, time and party size to request a table.")}</p>
            </div>
            <div className="resto-form"><LeadFormPanel service={booking} /></div>
          </div>
        </section>
      ) : null}
      {draft.openingHours?.length && enabled("home_hours") ? (
        <section className="resto-section">
          <div className="resto-shell resto-split resto-hours">
            <div>
              <p className="resto-kicker">{c("hours.eyebrow", "Plan your visit")}</p>
              <h2>{c("hours.title", "Working hours")}</h2>
              <RestobarHours />
              {t.contactPageEnabled ? <button className="resto-button" type="button" onClick={() => t.goToSection("contact")}>Find us</button> : null}
            </div>
            <div className="resto-hours-image">
              <RestobarImage src={hoursImage} fallbackSrc={cafePhoto} />
              {/^https?:\/\//i.test(videoUrl) ? <a className="resto-button" href={videoUrl} target="_blank" rel="noreferrer">Watch video ↗</a> : null}
            </div>
          </div>
        </section>
      ) : null}
      {enabled("home_gallery") && photos.length ? (
        <section className="resto-section resto-menu-section">
          <div className="resto-shell">
            <header className="resto-center">
              <p className="resto-kicker">{c("gallery.eyebrow", "At our table")}</p>
              <h2>{c("gallery.title", "A taste of our café")}</h2>
            </header>
            <div className="resto-gallery">
              {photos.slice(0, 3).map((image, index) => <button key={image + index} type="button"
                onClick={() => t.openGalleryViewer(index)} aria-label={"Open gallery photo " + (index + 1)}>
                <RestobarImage src={image} />
              </button>)}
            </div>
          </div>
        </section>
      ) : null}
      {enabled("home_testimonials") && t.testimonials.length ? (
        <section className="resto-section resto-guest-notes">
          <div className="resto-shell resto-center">
            <p className="resto-kicker">{c("reviews.eyebrow", "Guest notes")}</p>
            <h2>{c("reviews.title", "From our guests")}</h2>
            {rating.count > 0 ? (
              <div className="resto-rating-summary">
                <strong>{rating.avg.toFixed(1)} / 5</strong>
                <span aria-hidden="true"><StarRow value={rating.avg} size={18} /></span>
                <span>from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</span>
              </div>
            ) : null}
            <div className="resto-reviews">
              {t.testimonials.slice(0, 3).map((review, index) => (
                <figure key={review.key || index}>
                  {review.rating > 0 ? <div className="resto-review-stars"><StarRow value={review.rating} size={16} /></div> : null}
                  <blockquote>{review.text}</blockquote>
                  <figcaption>{review.name}</figcaption>
                </figure>
              ))}
            </div>
            {t.showWriteReview ? <button type="button" className="resto-button" onClick={t.openReviewModal}>Write a review</button> : null}
          </div>
        </section>
      ) : null}
      {enabled("home_contact") && t.contactPageEnabled ? (
        <section className="resto-section resto-home-contact">
          <div className="resto-shell resto-center">
            <h2>{c("contact.title", "Come by for a meal")}</h2>
            {t.contactAddress ? <p>{t.contactAddress}</p> : null}
            <button type="button" className="resto-button" onClick={() => t.goToSection("contact")}>{c("contact.cta", "Plan your visit")}</button>
          </div>
        </section>
      ) : null}
    </>
  );
}
