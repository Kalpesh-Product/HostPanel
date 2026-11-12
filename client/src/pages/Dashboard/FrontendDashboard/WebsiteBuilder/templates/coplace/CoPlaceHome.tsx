import { getInclusionMeta } from "../inclusionIcons";
import { priceWithUnit } from "../templateKit";
import { FaqSection } from "../shared/TplParts";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { useCoPlace } from "./CoPlaceContext";
import { CoPlaceImage } from "./CoPlaceUI";

export function CoPlaceHome() {
  const { t, draft, services, primary, goToItem, goToService, openLead, c, photo } = useCoPlace();
  const enabled = t.isSectionEnabled;
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const canTour = booking?.kind === "workspace" && draft.tourBooking?.enabled !== false;
  const canBrowse = t.productsPageEnabled && services.length > 0;
  const hero = photo("hero.image", getMediaSrc(draft.mainHeroImage) || getMediaSrc(t.heroImages[0]) || t.galleryItems[0] || "");
  const storyImage = photo("about.image", getMediaSrc(draft.aboutPageImages?.[0]) || t.galleryItems[0] || hero);
  const benefitsImage = photo("benefits.image", getMediaSrc(draft.aboutPageImages?.[1]) || t.galleryItems[1] || storyImage);
  const title = c("hero.title", draft.title || "A better place to do your best work");
  const lastSpace = title.lastIndexOf(" ");
  const logos = draft.logoCarousel?.enabled && Array.isArray(draft.logoCarousel.logos) ? draft.logoCarousel.logos : [];
  const isDemo = draft.searchKey === "demo-preview" && draft.companyId === "demo";
  const people = [
    ...(enabled("about_founders") ? t.founders : []),
    ...(enabled("about_team") ? t.aboutPageImageCards : []),
  ].slice(0, 3);
  const amenities = [...new Set([
    ...(Array.isArray(draft.inclusions) ? draft.inclusions : [])
      .filter((entry: any) => entry?.enabled !== false).map((entry: any) => getInclusionMeta(entry).label as string),
    ...(primary?.items[0]?.features || []),
  ])].filter(Boolean).slice(0, 8);
  const highlights = [
    { icon: "◫", title: c("highlight.1.title", "Flexible plans"), body: c("highlight.1.body", "Find a workspace that fits the way you work.") },
    { icon: "✦", title: c("highlight.2.title", "Modern amenities"), body: c("highlight.2.body", "See what’s included with your workspace.") },
    { icon: "◎", title: c("highlight.3.title", "Room to focus"), body: c("highlight.3.body", "Discover the space and the people behind it.") },
  ];
  const browse = () => t.goToSection("products");

  return (
    <>
      {enabled("home_hero") ? (
        <section className="coplace-hero">
          <div className="coplace-shell coplace-hero-grid">
            <div>
              <h1>{lastSpace < 0 ? title : <>{title.slice(0, lastSpace + 1)}<mark>{title.slice(lastSpace + 1)}</mark></>}</h1>
              <p>{c("hero.body", draft.subTitle || "Find a desk, private office, or meeting room that fits your workday.")}</p>
              <div className="coplace-actions">
                {booking ? <button className="coplace-button" type="button" onClick={() => openLead(booking)}>
                  {draft.CTAButtonText || (canTour ? c("booking.cta", "Book a tour") : c("booking.enquire", "Enquire now"))}
                </button> : null}
                {canBrowse ? <button className="coplace-button coplace-button-outline" type="button" onClick={browse}>
                  {c("hero.secondary", "Explore plans")}
                </button> : null}
              </div>
              {t.contactPhone || t.contactEmail || t.contactPageEnabled ? (
                <div className="coplace-hero-contact">
                  {t.contactPageEnabled ? <button type="button" onClick={() => t.goToSection("contact")}>{c("hero.contact", "Get in touch")}</button> : null}
                  {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
                  {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
                </div>
              ) : null}
            </div>
            {hero ? <div className="coplace-orbit">
              <CoPlaceImage src={hero} eager />
              <span aria-hidden="true">◫</span><span aria-hidden="true">✦</span>
            </div> : null}
          </div>
        </section>
      ) : <h1 className="coplace-visually-hidden">{title}</h1>}

      {enabled("home_logos") && (logos.length || isDemo) ? (
        <section className="coplace-shell coplace-trust coplace-center">
          <h2>{draft.logoCarousel?.title || c("logos.title", "Trusted by forward-thinking teams")}</h2>
          <div>
            {logos.length ? logos.map((logo: any, index: number) => (
              <CoPlaceImage key={index} src={getMediaSrc(logo)} alt={logo?.name || "Member company"} />
            )) : ["Fieldwork", "Northline", "Form Studio", "Daymark", "Goodspace"].map((name) => <b key={name}>{name}</b>)}
          </div>
        </section>
      ) : null}

      {enabled("home_highlights") ? <section className="coplace-shell coplace-highlights" aria-label="Workspace highlights">
        {highlights.map((highlight) => <article key={highlight.icon}>
          <span aria-hidden="true">{highlight.icon}</span><h2>{highlight.title}</h2><p>{highlight.body}</p>
        </article>)}
      </section> : null}

      {enabled("home_products") && canBrowse ? (
        <section className="coplace-section coplace-shell">
          <header className="coplace-center coplace-section-head">
            <p className="coplace-kicker">{c("spaces.eyebrow", "Spaces & memberships")}</p>
            <h2>{c("spaces.title", "Spaces that match your work style")}</h2>
            <p>{c("spaces.body", "Choose the setup that fits your day, from focused solo work to team sessions.")}</p>
          </header>
          <div className="coplace-cards">
            {services.flatMap((service) => service.items.length ? service.items.map((item) => ({
              key: service.key + item.key, title: item.title, image: item.image || service.cardImage || service.heroImage,
              description: item.description, price: priceWithUnit(item.price, item.priceUnit), action: () => goToItem(service, item),
            })) : [{
              key: service.key, title: service.heading, image: service.cardImage || service.heroImage,
              description: service.subText, price: "", action: () => goToService(service),
            }]).slice(0, 3).map((card) => (
              <article key={card.key}>
                <CoPlaceImage src={card.image} />
                <div>
                  <h3>{card.title}</h3>
                  {card.description ? <p>{card.description}</p> : null}
                  {card.price ? <p className="coplace-price">{card.price}</p> : null}
                  <button className="coplace-card-action" type="button" onClick={card.action}
                    aria-label={"Explore " + card.title}>Explore space ↗</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {enabled("home_about") ? (
        <section className="coplace-section coplace-surface">
          <div className="coplace-shell coplace-split">
            <CoPlaceImage src={storyImage} />
            <div>
              <p className="coplace-kicker">{c("about.eyebrow", "About us")}</p>
              <h2>{c("about.title", draft.aboutTitle || "Designed for collaboration, built for focus")}</h2>
              <p>{c("about.body", t.aboutIntroBlocks?.[0] || "Work alongside other people, with room to concentrate when you need it.")}</p>
              {t.aboutPageEnabled ? <button className="coplace-button coplace-button-outline" type="button" onClick={() => t.goToSection("about")}>
                {c("about.cta", "Get to know us")}
              </button> : null}
            </div>
          </div>
        </section>
      ) : null}

      {enabled("home_inclusions") && amenities.length ? (
        <section className="coplace-section coplace-shell coplace-split">
          <div>
            <p className="coplace-kicker">{c("benefits.eyebrow", "Membership benefits")}</p>
            <h2>{c("benefits.title", "Everything you need to thrive in one place")}</h2>
            <ul className="coplace-amenities">{amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}</ul>
            <div className="coplace-actions">
              {booking ? <button className="coplace-button" type="button" onClick={() => openLead(booking)}>
                {canTour ? c("booking.cta", "Book a tour") : c("booking.enquire", "Enquire now")}
              </button> : null}
              {canBrowse ? <button className="coplace-button coplace-button-outline" type="button" onClick={browse}>{c("hero.secondary", "Explore plans")}</button> : null}
            </div>
          </div>
          <CoPlaceImage src={benefitsImage} />
        </section>
      ) : null}

      {enabled("home_team") && people.length ? (
        <section className="coplace-section coplace-surface">
          <div className="coplace-shell">
            <header className="coplace-section-head">
              <p className="coplace-kicker">{c("team.eyebrow", "Meet the team")}</p>
              <h2>{c("team.title", draft.aboutPageTeamHeading || "The people behind your best workdays")}</h2>
            </header>
            <div className="coplace-cards coplace-team">
              {people.map((person: any, index: number) => (
                <article key={index}><CoPlaceImage src={getMediaSrc(person.image)} />
                  <div><h3>{person.name || person.title}</h3><p>{person.role || person.description}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {enabled("home_gallery") && t.galleryItems.length ? (
        <section className="coplace-section coplace-shell">
          <h2 className="coplace-section-head">{c("gallery.title", "A look inside")}</h2>
          <div className="coplace-gallery">
            {t.galleryItems.slice(0, 3).map((image: string, index: number) => (
              <button key={image + index} type="button" aria-label={"Open workspace photo " + (index + 1)}
                onClick={() => t.openGalleryViewer(index)}><CoPlaceImage src={image} /></button>
            ))}
          </div>
        </section>
      ) : null}

      {enabled("home_testimonials") && t.testimonials.length ? (
        <section className="coplace-section coplace-surface">
          <div className="coplace-shell coplace-center">
            <h2>{c("reviews.title", "What our members say")}</h2>
            <div className="coplace-reviews">
              {t.testimonials.slice(0, 3).map((review: any, index: number) => <figure key={review.key || index}>
                <blockquote>{review.text || review.review || review.testimony}</blockquote>
                <figcaption>{review.name || review.author}</figcaption>
              </figure>)}
            </div>
            {t.showWriteReview ? <button className="coplace-button coplace-button-outline" type="button" onClick={t.openReviewModal}>Write a review</button> : null}
          </div>
        </section>
      ) : null}

      {enabled("home_faq") && draft.faqs?.length ? <div className="coplace-section coplace-shell"><FaqSection faqs={draft.faqs} /></div> : null}
      {enabled("home_contact") && t.contactPageEnabled ? (
        <section className="coplace-section coplace-shell coplace-center coplace-home-contact">
          <h2>{c("contact.title", "Come see the space")}</h2>
          {t.contactAddress ? <p>{t.contactAddress}</p> : null}
          <button type="button" className="coplace-button" onClick={() => t.goToSection("contact")}>{c("hero.contact", "Get in touch")}</button>
        </section>
      ) : null}
    </>
  );
}
