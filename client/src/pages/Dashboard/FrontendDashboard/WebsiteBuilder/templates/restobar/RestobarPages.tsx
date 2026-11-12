import { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { getCareersJobMeta, getCareersJobTitle, getMediaSrc } from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useRestobar } from "./RestobarContext";
import { MenuList, RestobarHours, RestobarImage, RestobarPageHero } from "./RestobarUI";

export function MenusPage() {
  const { t, services, navLabel, goToService } = useRestobar();
  return (
    <>
      <RestobarPageHero title={t.draft?.productPageHeading || navLabel("products", "Our menus")} image={t.heroImages[0]} />
      <section className="resto-section resto-shell">
        {services.length ? (
          <div className="resto-cards">
            {services.map((service) => (
              <article className="resto-menu-card" key={service.key}>
                <RestobarImage src={service.cardImage || service.heroImage} />
                <div><h2>{service.heading}</h2>
                  {service.subText ? <p>{service.subText}</p> : null}
                  <button className="resto-button" type="button" onClick={() => goToService(service)}
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
  const { t, c, openLead } = useRestobar();
  return (
    <>
      <RestobarPageHero title={service.heroHeading} label={service.name} body={service.heroSubHeading}
        image={service.heroImage || service.cardImage || t.heroImages[0]} />
      <section className="resto-section resto-shell">
        <MenuList service={service} />
        {service.leadEnabled ? <div className="resto-center"><button className="resto-button" type="button"
          onClick={() => openLead(service)}>{c("booking.cta", "Book a table")}</button></div> : null}
      </section>
    </>
  );
}

export function MenuItemPage({ service, item }: { service: Service; item: ServiceItem }) {
  const { goToService, openLead, goToItem, c } = useRestobar();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photos = item.images.length ? item.images : [item.image].filter(Boolean);
  const related = service.items.filter((entry) => entry.key !== item.key && entry.category === item.category).slice(0, 3);
  return (
    <section className="resto-section resto-shell">
      <button className="resto-text-link" type="button" onClick={() => goToService(service)}>← Back to {service.name}</button>
      <div className="resto-split resto-item-detail">
        <div>
          {photos[0] ? <button className="resto-image-button" type="button" aria-label="Enlarge dish photo" onClick={() => setPhotoIndex(0)}>
            <RestobarImage src={photos[0]} alt={item.title} eager />
          </button> : <RestobarImage src={service.heroImage} />}
          {photos.length > 1 ? <div className="resto-thumbnails">
            {photos.map((image, index) => <button key={image + index} type="button" onClick={() => setPhotoIndex(index)}
              aria-label={"Enlarge dish photo " + (index + 1)}><RestobarImage src={image} /></button>)}
          </div> : null}
        </div>
        <div>
          <p className="resto-kicker">{item.category || service.name}</p>
          <h1>{item.title}</h1>
          {item.description ? <p>{item.description}</p> : null}
          {item.price ? <strong className="resto-price">{priceWithUnit(item.price, item.priceUnit)}</strong> : null}
          {item.chips.length ? <ul className="resto-chips">{item.chips.map((chip, index) => <li key={chip + index}>{chip}</li>)}</ul> : null}
          {service.leadEnabled ? <button type="button" className="resto-button" onClick={() => openLead(service, item)}>
            {c("booking.cta", "Book a table")}
          </button> : null}
        </div>
      </div>
      {related.length ? <div className="resto-related">
        <h2>From the same menu</h2>
        <div className="resto-cards">
          {related.map((entry) => <article key={entry.key}><button type="button" onClick={() => goToItem(service, entry)}>
            <RestobarImage src={entry.image} /><span>{entry.title}</span>
          </button></article>)}
        </div>
      </div> : null}
      <PhotoViewer images={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onChange={setPhotoIndex} />
    </section>
  );
}

export function AboutPage() {
  const { t, draft, navLabel, photo } = useRestobar();
  const images = draft.aboutPageImages || [];
  const founders = t.isSectionEnabled("about_founders") ? t.founders : [];
  const team = t.isSectionEnabled("about_team") ? t.aboutPageImageCards : [];
  const people = [...founders, ...team];
  return (
    <>
      <RestobarPageHero title={draft.aboutPageHeading || navLabel("about", "About us")}
        body={draft.aboutPageIntro} image={photo("about.image", getMediaSrc(images[0]) || t.heroImages[0] || "")} />
      <section className="resto-section resto-shell">
        <div className="resto-split">
          <div>
            {draft.aboutTitle ? <h2>{draft.aboutTitle}</h2> : null}
            {t.aboutIntroBlocks.filter((text: string) => text !== draft.aboutPageIntro).map((text: string, index: number) => <p key={index}>{text}</p>)}
            {t.aboutNarrativeBlocks.map(({ title, body }: { title: string; body: string }) => (
              <article className="resto-narrative" key={title}><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
          <RestobarImage src={photo("about.detail", getMediaSrc(images[1]) || t.galleryItems[0] || "")} />
        </div>
        {people.length ? <div className="resto-related">
          <h2>{draft.aboutPageTeamHeading || "Meet our team"}</h2>
          <div className="resto-cards">
            {people.map((person: any, index: number) => <article key={index}>
              <RestobarImage src={getMediaSrc(person.image)} />
              <div><h3>{person.name || person.title}</h3><p>{person.role || person.bio || person.description}</p></div>
            </article>)}
          </div>
        </div> : null}
        {draft.faqs?.length ? <div className="resto-related"><FaqSection faqs={draft.faqs} /></div> : null}
      </section>
    </>
  );
}

export function GalleryPage() {
  const { t, draft, navLabel } = useRestobar();
  return (
    <>
      <RestobarPageHero title={draft.galleryPageHeading || navLabel("gallery", "Gallery")} image={t.galleryItems[0] || t.heroImages[0]} />
      <section className="resto-section resto-shell">
        {t.galleryItems.length ? <div className="resto-gallery">
          {t.galleryItems.map((image: string, index: number) => <button key={image + index} type="button"
            aria-label={"Open gallery photo " + (index + 1)} onClick={() => t.openGalleryViewer(index)}><RestobarImage src={image} /></button>)}
        </div> : <p>No photos have been added yet.</p>}
      </section>
    </>
  );
}

export function ReviewsPage() {
  const { t, draft, navLabel, rating } = useRestobar();
  return (
    <>
      <RestobarPageHero title={draft.testimonialsPageHeading || navLabel("testimonials", "Guest reviews")}
        body={draft.testimonialsPageIntro} image={t.heroImages[0]} />
      <section className="resto-section resto-shell resto-center">
        {rating.count ? <p>{rating.avg.toFixed(1)} / 5 from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</p> : null}
        <div className="resto-reviews">
          {t.testimonials.map((review: any, index: number) => <figure key={review.key || index}>
            <blockquote>{review.text || review.review || review.testimony}</blockquote><figcaption>{review.name || review.author}</figcaption>
          </figure>)}
        </div>
        {t.showWriteReview ? <button className="resto-button" type="button" onClick={t.openReviewModal}>Write a review</button> : null}
      </section>
    </>
  );
}

export function ContactPage() {
  const { t, draft, navLabel } = useRestobar();
  const query = encodeURIComponent(t.contactAddress || "");
  const map = draft.mapUrl || (query ? "https://www.google.com/maps?q=" + query + "&output=embed" : "");
  return (
    <>
      <RestobarPageHero title={draft.contactPageHeading || navLabel("contact", "Contact")}
        body={draft.contactPageIntro} image={t.heroImages[0]} />
      <section className="resto-section resto-shell">
        <div className="resto-split">
          <div>
            <h2>{draft.contactTitle || "Visit us"}</h2>
            <address className="resto-contact-details">
              {query ? <a href={"https://www.google.com/maps/search/?api=1&query=" + query} target="_blank" rel="noreferrer">{t.contactAddress}</a> : null}
              {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
            </address>
            <RestobarHours />
          </div>
          {draft.contactEnableInquiryForm !== false ? <div className="resto-form">
            <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft.contactInquirySuccessMessage || "Thanks for getting in touch. We’ll reply soon."} />
          </div> : null}
        </div>
        {map ? <iframe className="resto-map" title="Café location" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : null}
      </section>
    </>
  );
}

export function PartnerPage() {
  const { t, draft, navLabel } = useRestobar();
  return (
    <>
      <RestobarPageHero title={t.partnerPageHeading || navLabel("partner", "Partner with us")} body={t.partnerPageContent} image={t.heroImages[0]} />
      {draft.partnerEnableInquiryForm !== false ? <section className="resto-section resto-shell">
        <div className="resto-form resto-narrow">
          <h2>{t.partnerFormTitle || "Start a conversation"}</h2>
          <MessageForm inquiryType="Partnership" submitLabel="Send enquiry" success={draft.partnerInquirySuccessMessage || "Thanks for your enquiry. We’ll be in touch."} />
        </div>
      </section> : null}
    </>
  );
}

export function CareersPage() {
  const { t, draft, navLabel } = useRestobar();
  const job = t.careersApplyJob;
  if (job || t.careersDirectApply) {
    return (
      <>
        <RestobarPageHero title={job ? getCareersJobTitle(job) : draft.careersPageHeading || "Work with us"} />
        <section className="resto-section resto-shell resto-narrow">
          {job ? <button className="resto-text-link" type="button" onClick={t.closeCareersJob}>← All roles</button> : null}
          {job?.description ? <RoleSection title="The role" text={job.description} /> : null}
          {job?.requirements ? <RoleSection title="Requirements" text={job.requirements} asList /> : null}
          <div className="resto-form"><ApplyForm /></div>
        </section>
      </>
    );
  }
  return (
    <>
      <RestobarPageHero title={draft.careersPageHeading || navLabel("careers", "Careers")} body={draft.careersPageIntro} image={t.heroImages[0]} />
      <section className="resto-section resto-shell">
        {t.careersJobsLoading ? <p>Loading roles…</p> : t.careersJobs.length ? (
          <ul className="resto-job-list">
            {t.careersJobs.map((role: any, index: number) => <li key={role.id || index}>
              <button className="resto-text-link" type="button" onClick={() => t.openCareersJob(role)}>
                {getCareersJobTitle(role)} ↗ <small>{getCareersJobMeta(role)}</small>
              </button>
            </li>)}
          </ul>
        ) : <p>There are no open roles right now.</p>}
        {draft.careersClosingHeading ? <h2>{draft.careersClosingHeading}</h2> : null}
        {draft.careersClosingText ? <p>{draft.careersClosingText}</p> : null}
        <button className="resto-button" type="button" onClick={t.openCareersGeneralApply}>
          {draft.careersApplyButtonText || "Send a general application"}
        </button>
      </section>
    </>
  );
}
