import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { getInclusionMeta } from "../inclusionIcons";
import { priceWithUnit } from "../templateKit";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { useCabin } from "./CabinContext";
import { CabinImage, CabinReveal } from "./CabinUI";

export function CabinHome() {
  const { t, draft, services, primary, openLead, goToItem, c, photo } = useCabin();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const enabled = t.isSectionEnabled;
  const photos = t.galleryItems as string[];
  const hero = photo("hero.image", getMediaSrc(t.mainHeroImage) || getMediaSrc(t.heroImages[0]) || photos[0] || primary?.heroImage || "");
  const about = photo("intro.image", getMediaSrc(draft.aboutPageImages?.[0]) || photos[0] || hero);
  const stays = services.flatMap((service) => service.items.map((item) => ({ service, item }))).slice(0, 3);
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const amenities = [...new Set([
    ...(stays[0]?.item.features || []),
    ...(draft.inclusions || []).filter((entry: any) => entry.enabled !== false).map((entry: any) => getInclusionMeta(entry).label),
  ])].filter(Boolean).slice(0, 6);
  const reviews = t.testimonials.filter((review: any) => review.text || review.review || review.testimony);
  const review = reviews[reviewIndex % (reviews.length || 1)];
  const faqs = (draft.faqs || []).filter((faq: any) => faq.enabled !== false);
  const title = c("hero.title", draft.title || "Escape");
  const slides = [
    { title, image: hero },
    { title: c("hero.second.title", "Discover"), image: photo("hero.second.image", getMediaSrc(t.heroImages[1])) },
    { title: c("hero.third.title", "Nature"), image: photo("hero.third.image", getMediaSrc(t.heroImages[2])) },
  ].filter((slide, index) => index === 0 || slide.image);
  const slideIndex = heroIndex % slides.length;

  useEffect(() => {
    if (reducedMotion || heroPaused || slides.length < 2 || !enabled("home_hero")) return;
    const timer = window.setInterval(() => setHeroIndex((index) => index + 1), 6000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, heroPaused, slides.length, enabled]);

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
          <p>{c("hero.body", draft.subTitle || "Find your place among the trees. Furnished homes, shared moments, and space to breathe.")}</p>
          {booking ? <button className="cabin-round-link" type="button" onClick={() => openLead(booking)}>{draft.CTAButtonText || c("booking.cta", "Book a stay")} <span aria-hidden="true">↗</span>
          </button> : null}
          {enabled("home_about") ? <a className="cabin-scroll" href="#cabin-intro">{c("hero.scroll", "Scroll down")} <span aria-hidden="true">↓</span></a> : null}
        </div>
      </div>
      {slides.length > 1 ? <div className="cabin-hero-controls" aria-label="Hero slideshow">
        {slides.map((slide, index) => <button type="button" key={index} aria-label={"Show " + slide.title} aria-pressed={slideIndex === index} onClick={() => { setHeroIndex(index); setHeroPaused(true); }} />)}
        {!reducedMotion ? <button className="cabin-hero-pause" type="button" aria-label={heroPaused ? "Play slideshow" : "Pause slideshow"} onClick={() => setHeroPaused(!heroPaused)}>{heroPaused ? "▶" : "Ⅱ"}</button> : null}
      </div> : null}
    </section> : <h1 className="cabin-visually-hidden">{title}</h1>}

    {enabled("home_about") ? <section id="cabin-intro" className="cabin-section cabin-rounded cabin-intro">
      <CabinReveal className="cabin-shell">
        <p className="cabin-kicker">{c("intro.eyebrow", "Intro")}</p>
        <h2>{c("intro.title", draft.aboutTitle || "A place to slow down, settle in, and feel a little closer to nature.")}</h2>
        <div className="cabin-intro-links">
          {t.aboutPageEnabled ? <div>
            <button className="cabin-text-link" type="button" onClick={() => t.goToSection("about")}>{c("intro.cta", "About us")} ↗</button>
            <p>{c("intro.body", t.aboutIntroBlocks[0] || "Thoughtfully furnished spaces for days spent your way.")}</p>
          </div> : null}
          {enabled("home_inclusions") && amenities.length ? <div>
            <a className="cabin-text-link" href="#cabin-amenities">{c("amenities.eyebrow", "Amenities")} ↗</a>
            <p>{c("amenities.body", "The comforts of home, with the outdoors just beyond your door.")}</p>
          </div> : null}
          {t.contactPageEnabled ? <div>
            <button className="cabin-text-link" type="button" onClick={() => t.goToSection("contact")}>{c("contact.cta", "Contact us")} ↗</button>
            <p>{c("intro.contact", "Planning a move or a longer stay? We’re here to help you settle in.")}</p>
          </div> : null}
        </div>
      </CabinReveal>
    </section> : null}

    {enabled("home_gallery") && photos.length ? <section className="cabin-section cabin-shell">
      <CabinReveal className="cabin-collage">
        <div className="cabin-collage-grid">{[...photos, ...photos].slice(0, 9).map((image, index) => <button type="button" key={image + index} aria-label={"Open property photo " + (index % photos.length + 1)} onClick={() => t.openGalleryViewer(index % photos.length)}>
          <CabinImage src={image} />
        </button>)}</div>
        <div className="cabin-collage-title">
          <h2>{c("gallery.title", "Enjoy the experience")}</h2>
        </div>
      </CabinReveal>
    </section> : null}

    {enabled("home_discover") ? <section className="cabin-section cabin-shell">
      <CabinReveal className="cabin-section-heading">
        <h2>{c("discover.title", "Discover")}</h2>
        <p>{c("discover.body", t.aboutIntroBlocks[1] || "Quiet corners, open doors, and room for the things that matter.")}</p>
      </CabinReveal>
      <div className="cabin-discover-grid">
        {[about, photo("discover.second", photos[1] || hero), photo("discover.third", photos[2] || about)].filter(Boolean).map((image, index) => <CabinReveal key={index}>
          <CabinImage src={image} />
        </CabinReveal>)}
        {booking || t.contactPageEnabled ? <CabinReveal className="cabin-discover-cta">
          <p className="cabin-kicker">{c("discover.eyebrow", "Make yourself at home")}</p>
          <h3>{c("discover.cta.title", "What are you waiting for?")}</h3>
          <button type="button" className="cabin-button" onClick={() => booking ? openLead(booking) : t.goToSection("contact")}>{c("booking.cta", "Book a stay")} ↗</button>
        </CabinReveal> : null}
      </div>
    </section> : null}

    {enabled("home_inclusions") && amenities.length ? <section id="cabin-amenities" className="cabin-section cabin-shell cabin-center">
      <CabinReveal>
        <p className="cabin-kicker">{c("amenities.eyebrow", "Amenities")}</p>
        <h2 className="cabin-narrow cabin-auto">{c("amenities.title", "Comfort in every detail. Space to make your own.")}</h2>
        <ul className="cabin-amenity-tags">{amenities.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      </CabinReveal>
    </section> : null}

    {enabled("home_products") && t.productsPageEnabled && stays.length ? <section className="cabin-section cabin-shell">
      <CabinReveal className="cabin-section-heading">
        <h2>{c("stays.title", "Our homes")}</h2>
        <p>{c("stays.body", "Find a space that fits your way of living. Explore our furnished homes and plan your stay.")}</p>
      </CabinReveal>
      <div className="cabin-cards cabin-product-cards">{stays.map(({ service, item }) => <CabinReveal key={service.key + item.key}>
        <article>
          <CabinImage src={item.image || service.cardImage} />
          <div>{item.badge ? <p className="cabin-kicker">{item.badge}</p> : null}<h3>{item.title}</h3>
            <button className="cabin-card-action" type="button" aria-label={"Explore " + item.title} onClick={() => goToItem(service, item)}>{c("stays.cta", "Explore home")} ↗</button>
          </div>
        </article>
      </CabinReveal>)}</div>
    </section> : null}

    {enabled("home_pricing") && t.productsPageEnabled && stays.some(({ item }) => item.price) ? <section className="cabin-section cabin-pricing">
      <div className="cabin-shell">
        <CabinReveal className="cabin-center">
          <p className="cabin-kicker">{c("pricing.eyebrow", "Stay a little longer")}</p>
          <h2>{c("pricing.title", "Find your stay")}</h2>
        </CabinReveal>
        <div className="cabin-price-grid">{stays.filter(({ item }) => item.price).map(({ service, item }) => <article key={item.key}>
          <h3>{item.title}</h3>
          <p className="cabin-price">{priceWithUnit(item.price, item.priceUnit)}</p>{item.description ? <p>{item.description}</p> : null}<ul>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <button type="button" className="cabin-button" onClick={() => goToItem(service, item)}>{c("stays.cta", "Explore home")} ↗</button>
        </article>)}</div>
      </div>
    </section> : null}

    {enabled("home_faq") && faqs.length ? <section className="cabin-section cabin-shell cabin-faq-layout">
      <CabinReveal>
        <h2>{c("faq.title", "Questions")}</h2>
        <p>{c("faq.body", "A few things you may want to know before you arrive.")}</p>
      </CabinReveal>
      <div className="cabin-faqs">{faqs.map((faq: any, index: number) => <details key={index}>
        <summary>{faq.question || faq.q}<span aria-hidden="true">+</span>
        </summary>
        <p>{faq.answer || faq.a}</p>
      </details>)}</div>
    </section> : null}

    {enabled("home_testimonials") && review ? <section className="cabin-section cabin-shell cabin-center cabin-review">
      <CabinReveal>
        <p className="cabin-kicker">{c("reviews.eyebrow", "From our residents")}</p>
        <figure>
          <blockquote>{review.text || review.review || review.testimony}</blockquote>
          <figcaption>{review.name || review.author}</figcaption>
        </figure>
        <div className="cabin-review-dots">{reviews.map((_: any, index: number) => <button type="button" key={index} aria-label={"Show review " + (index + 1)} aria-pressed={reviewIndex === index} onClick={() => setReviewIndex(index)} />)}</div>{t.showWriteReview ? <button type="button" className="cabin-text-link" onClick={t.openReviewModal}>Write a review ↗</button> : null}</CabinReveal>
    </section> : null}

    {enabled("home_stay_request") && booking ? <section className="cabin-section cabin-shell cabin-split cabin-request">
      <CabinReveal>
        <p className="cabin-kicker">{c("booking.eyebrow", "Come stay with us")}</p>
        <h2>{c("booking.heading", "Your next chapter starts here.")}</h2>
        <p>{c("booking.body", "Share your dates and a little about your plans. Our team will help you find your home.")}</p>
        <CabinImage src={photo("booking.image", photos[3] || about)} />
      </CabinReveal>
      <div className="cabin-form">
        <h3>{c("booking.title", "Request a stay")}</h3>
        <LeadFormPanel service={booking} />
      </div>
    </section> : null}
  </>;
}
