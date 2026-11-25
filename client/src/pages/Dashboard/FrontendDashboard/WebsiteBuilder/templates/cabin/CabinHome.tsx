import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { getInclusionMeta } from "../inclusionIcons";
import { priceWithUnit } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { StarRow } from "../shared/TplUI";
import { useCabin } from "./CabinContext";
import { cabinFallback, cabinImage, cabinSrc } from "./cabinMedia";
import { CabinImage, CabinReveal } from "./CabinUI";

export function CabinHome() {
  const { t, draft, services, primary, rating, openLead, goToItem, c, photo } = useCabin();
  const [reviewPage, setReviewPage] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [activeAmenity, setActiveAmenity] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const enabled = t.isSectionEnabled;
  const photos = t.galleryItems as string[];
  const hero = photo("hero.image", cabinImage(t.mainHeroImage, t.heroImages[0], photos[0], primary?.heroImage));
  const about = photo("intro.image", cabinImage(draft.aboutPageImages?.[0], photos[0], hero));
  // Keep the three amenity cards as cabin interiors; the third fallback used
  // to be a portrait, which did not match the other two cards.
  const amenityImages = [0, 1, 2].map((index) => photo(`amenity.${index + 1}.image`, cabinImage(photos[index], cabinFallback(index + 1), hero)));
  const stays = services.flatMap((service) => service.items.map((item) => ({ service, item }))).slice(0, 3);
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const amenities = [...new Set([
    ...(stays[0]?.item.features || []),
    ...(draft.inclusions || []).filter((entry: any) => entry.enabled !== false).map((entry: any) => getInclusionMeta(entry).label),
  ])].filter(Boolean).slice(0, 6);
  const reviews = t.testimonials.filter((review: any) => review.text || review.review || review.testimony);
  const reviewsPerPage = 3;
  const reviewPageCount = Math.ceil(reviews.length / reviewsPerPage);
  const activeReviewPage = Math.min(reviewPage, Math.max(0, reviewPageCount - 1));
  const firstReviewIndex = activeReviewPage * reviewsPerPage;
  const visibleReviews = reviews.slice(firstReviewIndex, firstReviewIndex + reviewsPerPage);
  const faqs = (draft.faqs || []).filter((faq: any) => faq.enabled !== false);
  const title = c("hero.title", draft.title || "Escape");
  const instagramHref = (t.footerSocialLinks || []).find(({ key }: { key: string }) => key.toLowerCase().includes("instagram"))?.href || "";
  const galleryTitle = c("instagram.title", "Gallery");
  const slides = [
    { title, image: hero },
    { title: c("hero.second.title", "Discover"), image: photo("hero.second.image", cabinSrc(t.heroImages[1])) },
    { title: c("hero.third.title", "Nature"), image: photo("hero.third.image", cabinSrc(t.heroImages[2])) },
  ].filter((slide, index) => index === 0 || slide.image);
  const slideIndex = heroIndex % slides.length;

  useEffect(() => {
    if (reducedMotion || heroPaused || slides.length < 2 || !enabled("home_hero")) return;
    const timer = window.setInterval(() => setHeroIndex((index) => index + 1), 6000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, heroPaused, slides.length, enabled]);

  const goToAnchor = (id: string) => {
    const scroll = () => document.getElementById(id)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    if (t.currentSection !== "home") {
      t.goToSection("home");
      window.setTimeout(scroll, 80);
    } else {
      scroll();
    }
  };

  return <>
    {enabled("home_hero") ? <section className="cabin-hero">
      <div className="cabin-hero-images" aria-hidden="true">
        {slides.map((slide, index) => <div key={index} className={index === slideIndex ? "is-current" : undefined}>
          <CabinImage src={slide.image} eager={index === 0 || index === slideIndex} />
        </div>)}
      </div>
      <div className="cabin-shell cabin-hero-copy">
        <h1 key={slideIndex}>{slides[slideIndex].title}</h1>
        <div className="cabin-hero-bottom">
          <p>{c("hero.body", draft.subTitle || "A sleek, feature-packed template designed to elevate your short-term rental business.")}</p>
          {booking ? <button className="cabin-round-link" type="button" onClick={() => openLead(booking)}>
            {draft.CTAButtonText || c("booking.cta", "Book a stay")} <span aria-hidden="true">↗</span>
          </button> : null}
          {enabled("home_about") ? <a className="cabin-scroll" href="#cabin-intro" onClick={(event) => {
            event.preventDefault();
            goToAnchor("cabin-intro");
          }}>{c("hero.scroll", "Scroll down")} <span aria-hidden="true">↓</span></a> : null}
        </div>
      </div>
      {slides.length > 1 ? <div className="cabin-hero-controls" aria-label="Hero slideshow">
        {slides.map((slide, index) => <button type="button" key={index} aria-label={"Show " + slide.title} aria-pressed={slideIndex === index} onClick={() => {
          setHeroIndex(index);
          setHeroPaused(true);
        }} />)}
        {!reducedMotion ? <button className="cabin-hero-pause" type="button" aria-label={heroPaused ? "Play slideshow" : "Pause slideshow"} onClick={() => setHeroPaused(!heroPaused)}>{heroPaused ? "▶" : "Ⅱ"}</button> : null}
      </div> : null}
    </section> : <h1 className="cabin-visually-hidden">{title}</h1>}
    {enabled("home_hero") ? <div className="cabin-hero-spacer" aria-hidden="true" /> : null}

    <div className={"cabin-content-sheet" + (enabled("home_hero") ? " cabin-rounded" : "")}>
    {enabled("home_about") ? <section id="cabin-intro" className="cabin-section cabin-intro">
      <CabinReveal className="cabin-narrow-container">
        <p className="cabin-kicker">{c("intro.eyebrow", "Intro")}</p>
        <h2>{c("intro.title", draft.aboutTitle || "Escape to tranquility with our cozy cabin rental, nestled in nature’s embrace.")}</h2>
        <div className="cabin-intro-links">
          {t.aboutPageEnabled ? <div>
            <button className="cabin-text-link" type="button" onClick={() => t.goToSection("about")}>{c("intro.cta", "About us")} ↗</button>
            <p>{c("intro.body", t.aboutIntroBlocks[0] || "Whether you’re looking to unwind by the fireplace, explore scenic hiking trails, or simply relax.")}</p>
          </div> : null}
          {enabled("home_inclusions") && amenities.length ? <div>
            <button className="cabin-text-link" type="button" onClick={() => goToAnchor("cabin-amenities")}>{c("amenities.eyebrow", "Amenities")} ↗</button>
            <p>{c("amenities.body", "This is the getaway you’ve been dreaming of: serenity and all the comfortable amenities.")}</p>
          </div> : null}
          {t.contactPageEnabled ? <div>
            <button className="cabin-text-link" type="button" onClick={() => t.goToSection("contact")}>{c("contact.cta", "Contact us")} ↗</button>
            <p>{c("intro.contact", "Located just a short drive from local attractions, our cabin is your home away from home!")}</p>
          </div> : null}
        </div>
      </CabinReveal>
    </section> : null}

    {enabled("home_gallery") && photos.length ? <section className="cabin-section cabin-shell cabin-collage-section">
      <CabinReveal className="cabin-collage">
        <div className="cabin-collage-grid">{[...photos, ...photos].slice(0, 9).map((image, index) => <button type="button" key={image + index} aria-label={"Open property photo " + (index % photos.length + 1)} onClick={() => t.openGalleryViewer(index % photos.length)}>
          <CabinImage src={image} fallback={cabinFallback(index)} />
        </button>)}</div>
        <div className="cabin-collage-title">
          <h2>{c("gallery.title", "Enjoy the Experience")}</h2>
        </div>
        {t.contactPhone || t.contactPageEnabled ? <a className="cabin-call-curve"
          href={t.contactPhone ? `tel:${t.contactPhone}` : "#cabin-request"}
          onClick={(event) => {
            if (t.contactPhone) return;
            event.preventDefault();
            if (t.contactPageEnabled) t.goToSection("contact");
            else goToAnchor("cabin-request");
          }}>
          {c("gallery.cta", "Call us now")} <span aria-hidden="true">↗</span>
        </a> : null}
      </CabinReveal>
    </section> : null}

    {enabled("home_discover") ? <section className="cabin-section cabin-shell">
      <CabinReveal className="cabin-section-heading">
        <h2>{c("discover.title", "Discover")}</h2>
        <p>{c("discover.body", "Whether you manage vacation homes, cozy cabins, or urban apartments, Cabin helps you create a stunning online presence with ease.")}</p>
      </CabinReveal>
      <div className="cabin-discover-grid">
        {[about, photo("discover.second", photos[1] || hero), photo("discover.third", photos[2] || about)].filter(Boolean).map((image, index) => <CabinReveal key={index}>
          <button className="cabin-image-button" type="button" aria-label={"Open discovery photo " + (index + 1)} onClick={() => t.openGalleryViewer(index % (photos.length || 1))}>
            <CabinImage src={image as string} fallback={cabinFallback(index)} />
          </button>
        </CabinReveal>)}
        {booking || t.contactPageEnabled ? <CabinReveal className="cabin-discover-cta">
          <p className="cabin-kicker">{c("discover.eyebrow", "Book today!")}</p>
          <h3>{c("discover.cta.title", "What are you waiting for?")}</h3>
          <button type="button" className="cabin-button" onClick={() => booking ? openLead(booking) : t.goToSection("contact")}>{c("booking.cta", "Book a stay")} ↗</button>
        </CabinReveal> : null}
      </div>
    </section> : null}

    {enabled("home_inclusions") ? <section id="cabin-amenities" className="cabin-section cabin-shell">
      <CabinReveal className="cabin-big-heading center">
        <p className="cabin-kicker">{c("amenities.eyebrow", "Amenities")}</p>
        <h2>{c("amenities.title", "Cabin’s intuitive layout is fully customizable, allowing you to edit and publish in minutes.")}</h2>
        <p>{c("amenities.body", "This is the getaway you’ve been dreaming of: serenity and all the comfortable amenities.")}</p>
      </CabinReveal>
      {amenities.length ? <ul className="cabin-amenity-tags">{amenities.map((feature) => <li key={feature}>{feature}</li>)}</ul> : null}
      <div className={"cabin-expand-grid" + (activeAmenity === null ? "" : ` is-expanding-${activeAmenity}`)}>
        {[1, 2, 3].map((number) => <div
          className={"cabin-expand-card" + (activeAmenity === number - 1 ? " is-active" : "")}
          key={number}
          onMouseEnter={() => setActiveAmenity(number - 1)}
          onMouseLeave={() => setActiveAmenity(null)}
          onFocus={() => setActiveAmenity(number - 1)}
          onBlur={() => setActiveAmenity(null)}
        >
          <button type="button" aria-label={"Open " + c(`amenity.${number}.title`, "amenity") + " photograph"} onClick={() => t.openGalleryViewer((number - 1) % (photos.length || 1))}>
            <CabinImage src={amenityImages[number - 1]} fallback={cabinFallback(number - 1)} />
            <h3>{c(`amenity.${number}.title`, ["Comfort", "Elegance", "Design"][number - 1])}</h3>
          </button>
        </div>)}
      </div>
      <div className="cabin-stats">
        {[1, 2, 3].map((number) => <CabinReveal className="cabin-stats-block" key={number}>
          <p className="cabin-stats-number">{c(`stats.${number}.number`, ["15+", "$50k", "120+"][number - 1])}</p>
          <div>
            <h3>{c(`stats.${number}.title`, ["Friendly Host", "Gross Revenue", "Happy Guests"][number - 1])}</h3>
            <p>{c(`stats.${number}.body`, [
              "Are you in the short-term rental market? Look no further than Cabin.",
              "A modern and user-friendly template designed for property managers.",
              "Whether you manage a cozy cabin or a beachfront home, Cabin is for you.",
            ][number - 1])}</p>
          </div>
        </CabinReveal>)}
      </div>
    </section> : null}

    {enabled("home_products") && t.productsPageEnabled && stays.length > 0 ? <section id="cabin-cabins" className="cabin-section cabin-shell">
      <CabinReveal className="cabin-section-heading">
        <h2>{c("stays.title", "Cabins")}</h2>
        <p>{c("stays.body", "Cabin is built to meet the needs of short-term rental businesses with key features that allow you to display property images, and more.")}</p>
      </CabinReveal>
      <div className="cabin-works">
        {stays.map(({ service, item }, index) => (
          <CabinReveal className="cabin-work-card" key={`${service.key}-${item.key}`}>
            <button className="cabin-work-image" type="button" aria-label={`Explore ${item.title}`} onClick={() => goToItem(service, item)}>
              <CabinImage src={cabinImage(item.image, service.cardImage, service.heroImage)} fallback={cabinFallback(index + 5)} alt={item.title} />
              <span className="cabin-work-hover" aria-hidden="true">{c("stays.cta", "View work")} ↗</span>
            </button>
            <div className="cabin-work-meta">
              <small>{String(index + 1).padStart(2, "0")} / {service.heading || c("stays.title", "Cabins")}</small>
              <button type="button" onClick={() => goToItem(service, item)}>{item.title}</button>
              {item.price ? <small>{priceWithUnit(item.price, item.priceUnit)}</small> : null}
            </div>
          </CabinReveal>
        ))}
      </div>
    </section> : null}

    {enabled("home_pricing") && t.productsPageEnabled && stays.some(({ item }) => item.price) ? <section id="cabin-pricing" className="cabin-section cabin-pricing">
      <div className="cabin-shell">
        <div className="dark-bg">
          <div className="radial-container" aria-hidden="true">
            <div className="circle-big" /><div className="circle-medium" /><div className="circle-small" /><div className="circle-micro" />
          </div>
          <CabinReveal className="heading-large-center">
            <p className="cabin-kicker white">{c("pricing.eyebrow", "Pricing")}</p>
            <h4>{c("pricing.title", "Choose your Plan")}</h4>
            <p>{c("pricing.body", "Choose one of our simple pricing plans.")}</p>
          </CabinReveal>
          <div className="cabin-price-grid">
            {stays.filter(({ item }) => item.price).map(({ service, item }, index) => <article className={index === 1 ? "dark" : undefined} key={item.key}>
              {item.badge ? <span className="cabin-badge">{item.badge}</span> : null}
              <h3>{item.title}</h3>
              <p className="cabin-price">{priceWithUnit(item.price, item.priceUnit)}</p>
              {item.description ? <p>{item.description}</p> : null}
              {item.features?.length ? <>
                <h4 className="cabin-price-features-title">{c("pricing.details", "What's included")}</h4>
                <ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </> : null}
              <button type="button" className="cabin-button" onClick={() => goToItem(service, item)}>{c("stays.cta", "View work")} ↗</button>
            </article>)}
          </div>
        </div>
      </div>
    </section> : null}

    {enabled("home_faq") && faqs.length ? <section id="cabin-faq" className="cabin-section cabin-shell cabin-faq-layout">
      <CabinReveal>
        <h2>{c("faq.title", "Faq")}</h2>
        <p>{c("faq.body", "Our template combines a sleek, minimalistic design with robust functionality.")}</p>
      </CabinReveal>
      <div className="cabin-faqs">{faqs.map((faq: any, index: number) => <details key={index}>
        <summary>{faq.question || faq.q}<span aria-hidden="true">+</span>
        </summary>
        <p>{faq.answer || faq.a}</p>
      </details>)}</div>
    </section> : null}

    {enabled("home_testimonials") && reviews.length ? <section className="cabin-section cabin-shell" aria-label="Testimonials">
      <CabinReveal>
        <p className="cabin-kicker cabin-center">{c("reviews.eyebrow", "Testimonial")}</p>
        {rating.count > 0 ? <div className="cabin-rating-summary">
          <strong>{rating.avg.toFixed(1)} / 5</strong>
          <span className="cabin-stars" aria-hidden="true"><StarRow value={rating.avg} size={18} /></span>
          <span>from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</span>
        </div> : null}
        <div className="cabin-reviews">
          {visibleReviews.map((review: any, index: number) => <figure key={review.key || index}>
            {review.rating > 0 ? <div className="cabin-stars"><StarRow value={review.rating} size={16} /></div> : null}
            <blockquote>{review.text || review.review || review.testimony}</blockquote>
            <figcaption>
              <span className="cabin-avatar" aria-hidden="true">{(review.name || review.author || "G").charAt(0)}</span>
              <span>{review.name || review.author}{review.jobPosition ? <small> — {review.jobPosition}</small> : null}</span>
            </figcaption>
          </figure>)}
        </div>
        {reviewPageCount > 1 ? <div className="cabin-review-dots">
          {Array.from({ length: reviewPageCount }, (_, index) => (
            <button type="button" key={index} aria-label={`Show review page ${index + 1}`} aria-pressed={activeReviewPage === index} onClick={() => setReviewPage(index)} />
          ))}
        </div> : null}
        <div className="cabin-center">{t.showWriteReview ? <button type="button" className="cabin-text-link" onClick={t.openReviewModal}>Write a review ↗</button> : null}</div>
      </CabinReveal>
    </section> : null}

    {enabled("home_stay_request") && booking ? <section id="cabin-request" className="cabin-section cabin-shell cabin-split cabin-request">
      <CabinReveal>
        <p className="cabin-kicker">{c("booking.eyebrow", "Contact")}</p>
        <h2>{c("booking.heading", "Send Us Your Message!")}</h2>
        <p>{c("booking.body", "Escape to tranquility with our cozy cabin rental, nestled in nature’s embrace — perfect for those seeking a peaceful stay.")}</p>
        <CabinImage src={photo("booking.image", cabinImage(photos[3], about, cabinFallback(3)))} fallback={cabinFallback(3)} />
      </CabinReveal>
      <div className="cabin-form">
        <h3>{c("booking.title", "Request a stay")}</h3>
        <LeadFormPanel service={booking} />
      </div>
    </section> : null}

    {enabled("home_instagram") && photos.length ? <section className="cabin-instagram cabin-shell">
      <div className="cabin-instagram-label">
        <h2>{galleryTitle === "@Cabin" ? "Gallery" : galleryTitle}</h2>
        {instagramHref ? <a className="cabin-text-link" href={instagramHref} target="_blank" rel="noreferrer">Follow ↗</a> : null}
      </div>
      <div className="cabin-instagram-grid">
        {photos.slice(0, 8).map((image, index) => <button type="button" key={image + index} aria-label={"Open Instagram photo " + (index + 1)} onClick={() => t.openGalleryViewer(index)}>
          <CabinImage src={image} fallback={cabinFallback(index)} />
        </button>)}
      </div>
    </section> : null}
    </div>
  </>;
}
