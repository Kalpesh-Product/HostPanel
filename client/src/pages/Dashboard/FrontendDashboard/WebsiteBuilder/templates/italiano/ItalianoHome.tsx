import { useState } from "react";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { useItaliano } from "./ItalianoContext";
import { MenuList, ItalianoHours, ItalianoImage } from "./ItalianoUI";

export function ItalianoHero() {
  const { t, draft, c, photo } = useItaliano();
  const [position, setPosition] = useState(0);
  const slides = [
    {
      image: photo("hero.image", t.mainHeroImage),
      label: c("hero.eyebrow", "Italian kitchen"),
      title: c("hero.title", draft.title || draft.companyName || "Italiano"),
      body: c("hero.body", draft.subTitle || ""),
    },
    {
      image: photo("hero.second.image", t.heroImages[1]),
      label: c("hero.second.eyebrow", "From the kitchen"),
      title: c("hero.second.title", "Made by hand"),
      body: c("hero.second.body", "Pasta rolled fresh, with sauces that take their time."),
    },
    {
      image: photo("hero.third.image", t.heroImages[2]),
      label: c("hero.third.eyebrow", "Around the table"),
      title: c("hero.third.title", "Rooted in tradition"),
      body: c("hero.third.body", "Italian cooking made for sharing."),
    },
  ].filter((slide, index) => index === 0 || slide.image);
  const current = position % slides.length;
  const slide = slides[current];
  const move = (offset: number) => setPosition((current + offset + slides.length) % slides.length);
  const story = t.isSectionEnabled("home_about");
  const menu = t.productsPageEnabled && t.productPages.length > 0;

  return (
    <section className="italiano-hero" aria-label="Featured at our café">
      <div className="italiano-hero-images" aria-hidden="true">
        {slides.map(({ image }, index) => (
          <div key={index} className={index === current ? "is-current" : undefined}>
            <ItalianoImage src={image} eager={index === 0 || index === current} />
          </div>
        ))}
      </div>
      <div className="italiano-hero-content italiano-center">
        <div aria-live="polite" aria-atomic="true">
          <p className="italiano-kicker italiano-ruled">{slide.label}</p>
          <h1>{slide.title}</h1>
          {slide.body ? <p className="italiano-hero-copy">{slide.body}</p> : null}
        </div>
        {story ? <a className="italiano-button italiano-learn-more" href="#italiano-story">
          {c("hero.cta", "Learn more")}
          <span className="italiano-learn-more-emblem" aria-hidden="true">
            <span className="italiano-learn-more-arrow">navigation</span>
          </span>
        </a> : menu ? <button className="italiano-button" type="button" onClick={() => t.goToSection("products")}>View menu</button> : null}
      </div>
      {slides.length > 1 ? (
        <div className="italiano-hero-controls">
          <button type="button" aria-label="Previous slide" onClick={() => move(-1)}>←</button>
          <button type="button" aria-label="Next slide" onClick={() => move(1)}>→</button>
        </div>
      ) : null}
    </section>
  );
}

function ItalianoStory() {
  const { t, draft, c, photo } = useItaliano();
  const story = draft.aboutPageStory || t.aboutIntroBlocks?.[0] || "";
  const images = draft.aboutPageImages || [];
  const chapters = [
    { title: c("story.first.title", "Our roots"), body: c("story.first.body", story), image: photo("about.image", getMediaSrc(images[0]) || t.galleryItems[0]) },
    { title: c("story.second.title", "In the kitchen"), body: c("story.second.body", draft.aboutPageMission || ""), image: photo("about.detail", getMediaSrc(images[1])) },
    { title: c("story.third.title", "Around the table"), body: c("story.third.body", draft.aboutPageValues || ""), image: photo("story.third.image", getMediaSrc(images[2])) },
  ].filter((chapter) => chapter.body);

  return (
    <section className="italiano-section italiano-shell italiano-story" id="italiano-story">
      <header className="italiano-center">
        <p className="italiano-kicker italiano-ruled">{c("about.eyebrow", "From Italy with love")}</p>
        <h2>{c("about.title", draft.aboutPageHeading || "Our story")}</h2>
      </header>
      {chapters.length ? (
        <ol className="italiano-chapters">
          {chapters.map((chapter, index) => (
            <li key={index}>
              <span className="italiano-chapter-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <ItalianoImage src={chapter.image} />
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {t.aboutPageEnabled ? <div className="italiano-center">
        <button type="button" className="italiano-button" onClick={() => t.goToSection("about")}>{c("about.cta", "More about us")}</button>
      </div> : null}
    </section>
  );
}

export function ItalianoHome() {
  const { t, draft, services, primary, goToService, c, photo } = useItaliano();
  const enabled = t.isSectionEnabled;
  const menu = services.find((service) => service.kind === "menu") || primary;
  const booking = services.find((service) => service.kind === "menu" && service.leadEnabled);
  const photos = t.galleryItems as string[];
  const bookingImage = photo("booking.image", photos[2] || t.heroImages[1] || "");
  const hoursImage = photo("hours.image", photos[3] || t.heroImages[2] || "");
  const videoUrl = c("hours.video", String(draft.heroVideoUrl || "").trim());

  return (
    <>
      {enabled("home_hero") ? <ItalianoHero /> : <h1 className="italiano-visually-hidden">{draft.companyName || "Italiano"}</h1>}
      {enabled("home_about") ? <ItalianoStory /> : null}
      {enabled("home_chef") && enabled("about_founders") && t.founders[0] ? (
        <section className="italiano-section italiano-menu-section">
          <div className="italiano-shell italiano-split italiano-chef">
            <ItalianoImage src={photo("chef.image", getMediaSrc(t.founders[0].image))} alt={t.founders[0].name} />
            <div>
              <p className="italiano-kicker">{c("chef.eyebrow", t.founders[0].role || "In the kitchen")}</p>
              <h2>{c("chef.title", t.founders[0].name)}</h2>
              <p>{t.founders[0].bio}</p>
            </div>
          </div>
        </section>
      ) : null}
      {menu && enabled("home_products") && t.productsPageEnabled ? (
        <section className="italiano-section italiano-menu-section">
          <div className="italiano-shell">
            <header className="italiano-center">
              <p className="italiano-kicker italiano-ruled">{c("menu.eyebrow", "From our kitchen")}</p>
              <h2>{c("menu.title", "Our menu")}</h2>
            </header>
            <MenuList service={menu} limit={6} />
            <div className="italiano-center"><button type="button" className="italiano-button" onClick={() => goToService(menu)}>
              {c("menu.cta", "View the full menu")}
            </button></div>
          </div>
        </section>
      ) : null}
      {booking && enabled("home_reservations") ? (
        <section className="italiano-section italiano-booking">
          <ItalianoImage src={bookingImage} />
          <div className="italiano-shell italiano-split">
            <div>
              <p className="italiano-kicker">{c("booking.eyebrow", "Reservations")}</p>
              <h2 id="italiano-reservation-title" tabIndex={-1}>{c("booking.heading", "Book a table")}</h2>
              <p>{c("booking.body", "Choose your date, time and party size to request a table.")}</p>
            </div>
            <div className="italiano-form"><LeadFormPanel service={booking} /></div>
          </div>
        </section>
      ) : null}
      {draft.openingHours?.length && enabled("home_hours") ? (
        <section className="italiano-section">
          <div className="italiano-shell italiano-split italiano-hours">
            <div>
              <p className="italiano-kicker">{c("hours.eyebrow", "Plan your visit")}</p>
              <h2>{c("hours.title", "Working hours")}</h2>
              <ItalianoHours />
              {t.contactPageEnabled ? <button className="italiano-button" type="button" onClick={() => t.goToSection("contact")}>Find us</button> : null}
            </div>
            {hoursImage ? (
              <div className="italiano-hours-image">
                <ItalianoImage src={hoursImage} />
                {/^https?:\/\//i.test(videoUrl) ? <a className="italiano-button" href={videoUrl} target="_blank" rel="noreferrer">Watch video ↗</a> : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      {enabled("home_testimonials") && t.testimonials.length ? (
        <section className="italiano-section">
          <div className="italiano-shell italiano-center">
            <p className="italiano-kicker">{c("reviews.eyebrow", "Guest notes")}</p>
            <h2>{c("reviews.title", "From our guests")}</h2>
            <div className="italiano-reviews">
              {t.testimonials.slice(0, 3).map((review: any, index: number) => (
                <figure key={review.key || index}>
                  <blockquote>{review.text || review.review || review.testimony}</blockquote>
                  <figcaption>{review.name || review.author}</figcaption>
                </figure>
              ))}
            </div>
            {t.showWriteReview ? <button type="button" className="italiano-button" onClick={t.openReviewModal}>Write a review</button> : null}
          </div>
        </section>
      ) : null}
      {enabled("home_contact") && t.contactPageEnabled ? (
        <section className="italiano-section italiano-home-contact">
          <div className="italiano-shell italiano-center">
            <h2>{c("contact.title", "Come by for a meal")}</h2>
            {t.contactAddress ? <p>{t.contactAddress}</p> : null}
            <button type="button" className="italiano-button" onClick={() => t.goToSection("contact")}>{c("contact.cta", "Plan your visit")}</button>
          </div>
        </section>
      ) : null}
      {enabled("home_gallery") && photos.length ? (
        <section className="italiano-photo-strip" aria-label={c("gallery.title", "From our table")}>
          {photos.slice(0, 4).map((image, index) => (
            <button key={image + index} type="button" onClick={() => t.openGalleryViewer(index)}
              aria-label={"Open gallery photo " + (index + 1)}>
              <ItalianoImage src={image} />
            </button>
          ))}
        </section>
      ) : null}
    </>
  );
}
