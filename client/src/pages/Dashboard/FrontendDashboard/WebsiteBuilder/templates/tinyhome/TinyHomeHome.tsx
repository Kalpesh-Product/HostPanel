import { getInclusionMeta } from "../inclusionIcons";
import { priceWithUnit } from "../templateKit";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { useTinyHome } from "./TinyHomeContext";
import { TinyHomeImage } from "./TinyHomeUI";

export function TinyHomeHome() {
  const { t, draft, primary, services, openLead, goToItem, c, photo } = useTinyHome();
  const enabled = t.isSectionEnabled;
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const showForm = booking && enabled("home_stay_request");
  const photos = t.galleryItems as string[];
  const hero = photo("hero.image", getMediaSrc(draft.mainHeroImage) || getMediaSrc(t.heroImages[0]) || photos[0] || "");
  const about = photo("intro.image", getMediaSrc(draft.aboutPageImages?.[0]) || photos[0] || hero);
  const featured = primary?.items.find((item) => item.featured) || primary?.items[0];
  const amenities = [...new Set([
    ...(featured?.features || []),
    ...(Array.isArray(draft.inclusions) ? draft.inclusions : [])
      .filter((entry: any) => entry?.enabled !== false)
      .map((entry: any) => getInclusionMeta(entry).label as string),
  ])].filter(Boolean).slice(0, 9);
  const nearbyDefaults = draft.searchKey === "demo-preview" && draft.companyId === "demo"
    ? ["Woodland walks", "Local cafés", "Explore outdoors"] : [];
  const nearby = [1, 2, 3].map((index) => ({
    index,
    title: c("nearby." + index + ".title", nearbyDefaults[index - 1] || ""),
    image: photo("nearby." + index + ".image", nearbyDefaults.length ? photos[index + 3] || "" : ""),
  })).filter((activity) => activity.title || activity.image);
  const firstReview = t.testimonials.find((review: any) => review.text || review.review || review.testimony);
  const title = c("hero.title", draft.title || "A little closer to nature");
  const featuredPrice = featured ? priceWithUnit(featured.price, featured.priceUnit) : "";
  const requestStay = () => {
    if (showForm) document.getElementById("tinyhome-request")?.focus();
    else if (booking) openLead(booking);
    else if (t.productsPageEnabled) t.goToSection("products");
  };

  return (
    <>
      {enabled("home_hero") ? (
        <section className="tinyhome-hero">
          <TinyHomeImage src={hero} eager />
          <div className="tinyhome-hero-panel">
            <div className="tinyhome-hero-copy">
              <p className="tinyhome-kicker">{c("hero.eyebrow", "Take the slower road")}</p>
              <h1>{title}</h1>
              <p>{c("hero.body", draft.subTitle || "Settle into a furnished cabin and make room for time outdoors.")}</p>
              {booking || t.productsPageEnabled ? <button className="tinyhome-button tinyhome-button-light" type="button" onClick={requestStay}>
                {draft.CTAButtonText || (booking ? c("booking.cta", "Book a stay") : "Explore stays")}
              </button> : null}
            </div>
          </div>
        </section>
      ) : <h1 className="tinyhome-visually-hidden">{title}</h1>}

      {enabled("home_about") ? (
        <section className="tinyhome-section tinyhome-shell tinyhome-split tinyhome-welcome">
          <TinyHomeImage src={about} />
          <div>
            <p className="tinyhome-kicker">{c("intro.eyebrow", "Hello, there")}</p>
            <h2>{c("intro.title", draft.aboutTitle || "A small home with room to slow down.")}</h2>
            <p>{c("intro.body", t.aboutIntroBlocks?.[0] || "Stay somewhere quiet, with a kitchen of your own and the outdoors just beyond your door.")}</p>
            {t.aboutPageEnabled ? <button type="button" className="tinyhome-button" onClick={() => t.goToSection("about")}>
              {c("intro.cta", "Read more")}
            </button> : null}
          </div>
        </section>
      ) : null}

      {enabled("home_gallery") && photos.length ? (
        <section className="tinyhome-photo-strip" aria-label="Property photos">
          {photos.slice(0, 4).map((image, index) => (
            <button type="button" key={image + index} aria-label={"Open property photo " + (index + 1)}
              onClick={() => t.openGalleryViewer(index)}><TinyHomeImage src={image} /></button>
          ))}
        </section>
      ) : null}

      {enabled("home_inclusions") && amenities.length ? (
        <section className="tinyhome-section tinyhome-surface">
          <div className="tinyhome-shell tinyhome-split">
            <div>
              <p className="tinyhome-kicker">{c("amenities.eyebrow", "Amenities")}</p>
              <h2>{c("amenities.title", "Everything you need to feel at home.")}</h2>
              <ul className="tinyhome-amenities">{amenities.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <TinyHomeImage src={photo("amenities.image", featured?.image || photos[1] || about)} />
          </div>
        </section>
      ) : null}

      {enabled("home_testimonials") && firstReview ? (
        <section className="tinyhome-section tinyhome-quote">
          <div className="tinyhome-shell tinyhome-narrow tinyhome-center">
            <p className="tinyhome-kicker">{c("reviews.eyebrow", "From our guests")}</p>
            <figure>
              <blockquote>{firstReview.text || firstReview.review || firstReview.testimony}</blockquote>
              <figcaption>{firstReview.name || firstReview.author}</figcaption>
            </figure>
            {t.showWriteReview ? <button type="button" className="tinyhome-button" onClick={t.openReviewModal}>Write a review</button> : null}
          </div>
        </section>
      ) : null}

      {enabled("home_products") && t.productsPageEnabled && primary && featured ? (
        <section className="tinyhome-section tinyhome-shell tinyhome-split tinyhome-feature">
          <TinyHomeImage src={photo("featured.image", featured.image || primary.cardImage || photos[2] || hero)} />
          <div>
            <p className="tinyhome-kicker">{c("featured.eyebrow", "Featured stay")}</p>
            <h2>{featured.title}</h2>
            {featured.description ? <p>{featured.description}</p> : null}
            {featuredPrice ? <p className="tinyhome-price">{featuredPrice}</p> : null}
            <button type="button" className="tinyhome-button" onClick={() => goToItem(primary, featured)}>
              {c("featured.cta", "Explore this stay")}
            </button>
          </div>
        </section>
      ) : null}

      {showForm ? (
        <section className="tinyhome-section tinyhome-surface">
          <div className="tinyhome-shell tinyhome-split">
            <div>
              <p className="tinyhome-kicker">{c("booking.eyebrow", "Make it yours")}</p>
              <h2 id="tinyhome-request" tabIndex={-1}>{c("booking.heading", "Plan your stay")}</h2>
              <p>{c("booking.body", "Share your dates and the number of guests. We’ll follow up to confirm availability.")}</p>
            </div>
            <div className="tinyhome-form"><LeadFormPanel service={booking} /></div>
          </div>
        </section>
      ) : null}

      {enabled("home_nearby") && nearby.length ? (
        <section className="tinyhome-section tinyhome-nearby">
          <div className="tinyhome-shell">
            <p className="tinyhome-kicker">{c("nearby.eyebrow", "Out and about")}</p>
            <h2>{c("nearby.title", "What to do near your cabin")}</h2>
            <div className="tinyhome-cards">
              {nearby.map((activity) => <article key={activity.index}>
                <TinyHomeImage src={activity.image} />
                {activity.title ? <div><h3>{activity.title}</h3></div> : null}
              </article>)}
            </div>
          </div>
        </section>
      ) : null}

      {enabled("home_contact") && t.contactPageEnabled ? (
        <section className="tinyhome-section tinyhome-shell tinyhome-center tinyhome-home-contact">
          <h2>{c("contact.title", "Find your way here")}</h2>
          {t.contactAddress ? <p>{t.contactAddress}</p> : null}
          <button type="button" className="tinyhome-button" onClick={() => t.goToSection("contact")}>{c("contact.cta", "Get directions")}</button>
        </section>
      ) : null}
    </>
  );
}
