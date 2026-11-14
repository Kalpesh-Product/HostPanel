import { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { getCareersJobMeta, getCareersJobTitle, getMediaSrc } from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useItaliano } from "./ItalianoContext";
import { MenuList, ItalianoHours, ItalianoImage, ItalianoPageHero } from "./ItalianoUI";

export function MenusPage() {
  const { t, services, navLabel, goToService } = useItaliano();
  return (
    <>
      <ItalianoPageHero title={t.draft?.productPageHeading || navLabel("products", "Our menus")} image={t.heroImages[0]} />
      <section className="italiano-section italiano-shell">
        {services.length ? (
          <div className="italiano-cards">
            {services.map((service) => (
              <article className="italiano-menu-card" key={service.key}>
                <ItalianoImage src={service.cardImage || service.heroImage} />
                <div><h2>{service.heading}</h2>
                  {service.subText ? <p>{service.subText}</p> : null}
                  <button className="italiano-button" type="button" onClick={() => goToService(service)}
                    aria-label={"Explore menu: " + service.heading}>Explore menu ↗</button>
                </div>
              </article>
            ))}
          </div>
        ) : <p>No menus are available yet.</p>}
      </section>
    </>
  );
}

export function MenuPage({ service }: { service: Service }) {
  const { t, c, openLead } = useItaliano();
  return (
    <>
      <ItalianoPageHero title={service.heroHeading} label={service.name} body={service.heroSubHeading}
        image={service.heroImage || service.cardImage || t.heroImages[0]} />
      <section className="italiano-section italiano-shell">
        <MenuList service={service} />
        {service.leadEnabled ? <div className="italiano-center"><button className="italiano-button" type="button"
          onClick={() => openLead(service)}>{c("booking.cta", "Book a table")}</button></div> : null}
      </section>
    </>
  );
}

export function MenuItemPage({ service, item }: { service: Service; item: ServiceItem }) {
  const { goToService, openLead, goToItem, c } = useItaliano();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photos = item.images.length ? item.images : [item.image].filter(Boolean);
  const related = service.items.filter((entry) => entry.key !== item.key && entry.category === item.category).slice(0, 3);
  return (
    <section className="italiano-section italiano-shell">
      <button className="italiano-text-link" type="button" onClick={() => goToService(service)}>← Back to {service.name}</button>
      <div className="italiano-split italiano-item-detail">
        <div>
          {photos[0] ? <button className="italiano-image-button" type="button" aria-label="Enlarge dish photo" onClick={() => setPhotoIndex(0)}>
            <ItalianoImage src={photos[0]} alt={item.title} eager />
          </button> : <ItalianoImage src={service.heroImage} />}
          {photos.length > 1 ? <div className="italiano-thumbnails">
            {photos.map((image, index) => <button key={image + index} type="button" onClick={() => setPhotoIndex(index)}
              aria-label={"Enlarge dish photo " + (index + 1)}><ItalianoImage src={image} /></button>)}
          </div> : null}
        </div>
        <div>
          <p className="italiano-kicker">{item.category || service.name}</p>
          <h1>{item.title}</h1>
          {item.description ? <p>{item.description}</p> : null}
          {item.price ? <strong className="italiano-price">{priceWithUnit(item.price, item.priceUnit)}</strong> : null}
          {item.chips.length ? <ul className="italiano-chips">{item.chips.map((chip, index) => <li key={chip + index}>{chip}</li>)}</ul> : null}
          {service.leadEnabled ? <button type="button" className="italiano-button" onClick={() => openLead(service, item)}>
            {c("booking.cta", "Book a table")}
          </button> : null}
        </div>
      </div>
      {related.length ? <div className="italiano-related">
        <h2>From the same menu</h2>
        <div className="italiano-cards">
          {related.map((entry) => <article key={entry.key}><button type="button" onClick={() => goToItem(service, entry)}>
            <ItalianoImage src={entry.image} /><span>{entry.title}</span>
          </button></article>)}
        </div>
      </div> : null}
      <PhotoViewer images={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onChange={setPhotoIndex} />
    </section>
  );
}

export function AboutPage() {
  const { t, draft, navLabel, photo } = useItaliano();
  const images = draft.aboutPageImages || [];
  const founders = t.isSectionEnabled("about_founders") ? t.founders : [];
  const team = t.isSectionEnabled("about_team") ? t.aboutPageImageCards : [];
  const people = [...founders, ...team];
  return (
    <>
      <ItalianoPageHero title={draft.aboutPageHeading || navLabel("about", "About us")}
        body={draft.aboutPageIntro} image={photo("about.image", getMediaSrc(images[0]) || t.heroImages[0] || "")} />
      <section className="italiano-section italiano-shell">
        <div className="italiano-split">
          <div>
            {draft.aboutTitle ? <h2>{draft.aboutTitle}</h2> : null}
            {t.aboutIntroBlocks.filter((text: string) => text !== draft.aboutPageIntro).map((text: string, index: number) => <p key={index}>{text}</p>)}
            {t.aboutNarrativeBlocks.map(({ title, body }: { title: string; body: string }) => (
              <article className="italiano-narrative" key={title}><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
          <ItalianoImage src={photo("about.detail", getMediaSrc(images[1]) || t.galleryItems[0] || "")} />
        </div>
        {people.length ? <div className="italiano-related">
          <h2>{draft.aboutPageTeamHeading || "Meet our team"}</h2>
          <div className="italiano-cards">
            {people.map((person: any, index: number) => <article key={index}>
              <ItalianoImage src={getMediaSrc(person.image)} />
              <div><h3>{person.name || person.title}</h3><p>{person.role || person.bio || person.description}</p></div>
            </article>)}
          </div>
        </div> : null}
        {draft.faqs?.length ? <div className="italiano-related"><FaqSection faqs={draft.faqs} /></div> : null}
      </section>
    </>
  );
}

export function GalleryPage() {
  const { t, draft, navLabel } = useItaliano();
  return (
    <>
      <ItalianoPageHero title={draft.galleryPageHeading || navLabel("gallery", "Gallery")} image={t.galleryItems[0] || t.heroImages[0]} />
      <section className="italiano-section italiano-shell">
        {t.galleryItems.length ? <div className="italiano-gallery">
          {t.galleryItems.map((image: string, index: number) => <button key={image + index} type="button"
            aria-label={"Open gallery photo " + (index + 1)} onClick={() => t.openGalleryViewer(index)}><ItalianoImage src={image} /></button>)}
        </div> : <p>No photos have been added yet.</p>}
      </section>
    </>
  );
}

export function ReviewsPage() {
  const { t, draft, navLabel, rating } = useItaliano();
  return (
    <>
      <ItalianoPageHero title={draft.testimonialsPageHeading || navLabel("testimonials", "Guest reviews")}
        body={draft.testimonialsPageIntro} image={t.heroImages[0]} />
      <section className="italiano-section italiano-shell italiano-center">
        {rating.count ? <p>{rating.avg.toFixed(1)} / 5 from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</p> : null}
        <div className="italiano-reviews">
          {t.testimonials.map((review: any, index: number) => <figure key={review.key || index}>
            <blockquote>{review.text || review.review || review.testimony}</blockquote><figcaption>{review.name || review.author}</figcaption>
          </figure>)}
        </div>
        {t.showWriteReview ? <button className="italiano-button" type="button" onClick={t.openReviewModal}>Write a review</button> : null}
      </section>
    </>
  );
}

export function ContactPage() {
  const { t, draft, navLabel } = useItaliano();
  const query = encodeURIComponent(t.contactAddress || "");
  const map = draft.mapUrl || (query ? "https://www.google.com/maps?q=" + query + "&output=embed" : "");
  return (
    <>
      <ItalianoPageHero title={draft.contactPageHeading || navLabel("contact", "Contact")}
        body={draft.contactPageIntro} image={t.heroImages[0]} />
      <section className="italiano-section italiano-shell">
        <div className="italiano-split">
          <div>
            <h2>{draft.contactTitle || "Visit us"}</h2>
            <address className="italiano-contact-details">
              {query ? <a href={"https://www.google.com/maps/search/?api=1&query=" + query} target="_blank" rel="noreferrer">{t.contactAddress}</a> : null}
              {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
            </address>
            <ItalianoHours />
          </div>
          {draft.contactEnableInquiryForm !== false ? <div className="italiano-form">
            <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft.contactInquirySuccessMessage || "Thanks for getting in touch. We’ll reply soon."} />
          </div> : null}
        </div>
        {map ? <iframe className="italiano-map" title="Café location" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : null}
      </section>
    </>
  );
}

export function PartnerPage() {
  const { t, draft, navLabel } = useItaliano();
  return (
    <>
      <ItalianoPageHero title={t.partnerPageHeading || navLabel("partner", "Partner with us")} body={t.partnerPageContent} image={t.heroImages[0]} />
      {draft.partnerEnableInquiryForm !== false ? <section className="italiano-section italiano-shell">
        <div className="italiano-form italiano-narrow">
          <h2>{t.partnerFormTitle || "Start a conversation"}</h2>
          <MessageForm inquiryType="Partnership" submitLabel="Send enquiry" success={draft.partnerInquirySuccessMessage || "Thanks for your enquiry. We’ll be in touch."} />
        </div>
      </section> : null}
    </>
  );
}

export function CareersPage() {
  const { t, draft, navLabel } = useItaliano();
  const job = t.careersApplyJob;
  if (job || t.careersDirectApply) {
    return (
      <>
        <ItalianoPageHero title={job ? getCareersJobTitle(job) : draft.careersPageHeading || "Work with us"} />
        <section className="italiano-section italiano-shell italiano-narrow">
          {job ? <button className="italiano-text-link" type="button" onClick={t.closeCareersJob}>← All roles</button> : null}
          {job?.description ? <RoleSection title="The role" text={job.description} /> : null}
          {job?.requirements ? <RoleSection title="Requirements" text={job.requirements} asList /> : null}
          <div className="italiano-form"><ApplyForm /></div>
        </section>
      </>
    );
  }
  return (
    <>
      <ItalianoPageHero title={draft.careersPageHeading || navLabel("careers", "Careers")} body={draft.careersPageIntro} image={t.heroImages[0]} />
      <section className="italiano-section italiano-shell">
        {t.careersJobsLoading ? <p>Loading roles…</p> : t.careersJobs.length ? (
          <ul className="italiano-job-list">
            {t.careersJobs.map((role: any, index: number) => <li key={role.id || index}>
              <button className="italiano-text-link" type="button" onClick={() => t.openCareersJob(role)}>
                {getCareersJobTitle(role)} ↗ <small>{getCareersJobMeta(role)}</small>
              </button>
            </li>)}
          </ul>
        ) : <p>There are no open roles right now.</p>}
        {draft.careersClosingHeading ? <h2>{draft.careersClosingHeading}</h2> : null}
        {draft.careersClosingText ? <p>{draft.careersClosingText}</p> : null}
        <button className="italiano-button" type="button" onClick={t.openCareersGeneralApply}>
          {draft.careersApplyButtonText || "Send a general application"}
        </button>
      </section>
    </>
  );
}
