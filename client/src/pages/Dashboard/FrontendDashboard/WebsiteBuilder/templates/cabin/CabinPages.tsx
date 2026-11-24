import { getCareersJobMeta, getCareersJobTitle } from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useCabin } from "./CabinContext";
import { cabinFallback, cabinImage } from "./cabinMedia";
import { CabinHours, CabinImage, CabinPageHero } from "./CabinUI";

export function AboutPage() {
  const { t, draft, navLabel, photo } = useCabin();
  const images = draft.aboutPageImages || [];
  const founders = t.isSectionEnabled("about_founders") ? t.founders : [];
  const team = t.isSectionEnabled("about_team") ? t.aboutPageImageCards : [];
  const people = [...founders, ...team];
  return (
    <>
      <CabinPageHero title={draft.aboutPageHeading || navLabel("about", "About us")}
        body={draft.aboutPageIntro} image={photo("about.image", cabinImage(images[0], t.heroImages[0], cabinFallback(0)))} />
      <section className="cabin-section cabin-shell">
        <div className="cabin-split">
          <div>
            {draft.aboutTitle ? <h2>{draft.aboutTitle}</h2> : null}
            {t.aboutIntroBlocks.filter((text: string) => text !== draft.aboutPageIntro).map((text: string, index: number) => <p key={index}>{text}</p>)}
            {t.aboutNarrativeBlocks.map(({ title, body }: { title: string; body: string }) => (
              <article className="cabin-narrative" key={title}><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
          <CabinImage src={photo("about.detail", cabinImage(images[1], t.galleryItems[0], cabinFallback(1)))} fallback={cabinFallback(1)} />
        </div>
        {people.length ? <div className="cabin-related">
          <h2>{draft.aboutPageTeamHeading || "Meet our team"}</h2>
          <div className="cabin-cards">
            {people.map((person: any, index: number) => <article key={index}>
              <CabinImage src={cabinImage(person.image, cabinFallback(index))} fallback={cabinFallback(index)} />
              <div><h3>{person.name || person.title}</h3><p>{person.role || person.bio || person.description}</p></div>
            </article>)}
          </div>
        </div> : null}
        {draft.faqs?.length ? <div className="cabin-related"><FaqSection faqs={draft.faqs} /></div> : null}
      </section>
    </>
  );
}

export function GalleryPage() {
  const { t, draft, navLabel } = useCabin();
  return (
    <>
      <CabinPageHero title={draft.galleryPageHeading || navLabel("gallery", "Gallery")} image={cabinImage(t.galleryItems[0], t.heroImages[0])} />
      <section className="cabin-section cabin-shell">
        {t.galleryItems.length ? <div className="cabin-gallery">
          {t.galleryItems.map((image: string, index: number) => <button key={image + index} type="button"
            aria-label={"Open gallery photo " + (index + 1)} onClick={() => t.openGalleryViewer(index)}><CabinImage src={image} fallback={cabinFallback(index)} /></button>)}
        </div> : <p>No photos have been added yet.</p>}
      </section>
    </>
  );
}

export function ReviewsPage() {
  const { t, draft, navLabel, rating } = useCabin();
  return (
    <>
      <CabinPageHero title={draft.testimonialsPageHeading || navLabel("testimonials", "Guest reviews")}
        body={draft.testimonialsPageIntro} image={cabinImage(t.heroImages[0], cabinFallback(2))} />
      <section className="cabin-section cabin-shell cabin-center">
        {rating.count ? <p>{rating.avg.toFixed(1)} / 5 from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</p> : null}
        <div className="cabin-reviews">
          {t.testimonials.map((review: any, index: number) => <figure key={review.key || index}>
            <blockquote>{review.text || review.review || review.testimony}</blockquote><figcaption>{review.name || review.author}</figcaption>
          </figure>)}
        </div>
        {t.showWriteReview ? <button className="cabin-button" type="button" onClick={t.openReviewModal}>Write a review</button> : null}
      </section>
    </>
  );
}

export function ContactPage() {
  const { t, draft, navLabel } = useCabin();
  const query = encodeURIComponent(t.contactAddress || "");
  const map = draft.mapUrl || (query ? "https://www.google.com/maps?q=" + query + "&output=embed" : "");
  return (
    <>
      <CabinPageHero title={draft.contactPageHeading || navLabel("contact", "Contact")}
        body={draft.contactPageIntro} image={cabinImage(t.heroImages[0], cabinFallback(2))} />
      <section className="cabin-section cabin-shell">
        <div className="cabin-split">
          <div>
            <h2>{draft.contactTitle || "Visit us"}</h2>
            <address className="cabin-contact-details">
              {query ? <a href={"https://www.google.com/maps/search/?api=1&query=" + query} target="_blank" rel="noreferrer">{t.contactAddress}</a> : null}
              {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
            </address>
            <CabinHours />
          </div>
          {draft.contactEnableInquiryForm !== false ? <div className="cabin-form">
            <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft.contactInquirySuccessMessage || "Thanks for getting in touch. We’ll reply soon."} />
          </div> : null}
        </div>
        {map ? <iframe className="cabin-map" title="Property location" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : null}
      </section>
    </>
  );
}

export function PartnerPage() {
  const { t, draft, navLabel } = useCabin();
  return (
    <>
      <CabinPageHero title={t.partnerPageHeading || navLabel("partner", "Partner with us")} body={t.partnerPageContent} image={cabinImage(t.heroImages[0], cabinFallback(2))} />
      {draft.partnerEnableInquiryForm !== false ? <section className="cabin-section cabin-shell">
        <div className="cabin-form cabin-narrow cabin-partner-form">
          <h2>{t.partnerFormTitle || "Start a conversation"}</h2>
          <MessageForm inquiryType="Partnership" submitLabel="Send enquiry" success={draft.partnerInquirySuccessMessage || "Thanks for your enquiry. We’ll be in touch."} />
        </div>
      </section> : null}
    </>
  );
}

export function CareersPage() {
  const { t, draft, navLabel, c } = useCabin();
  const job = t.careersApplyJob;
  if (job || t.careersDirectApply) {
    return (
      <>
        <CabinPageHero title={t.careersDirectApply ? c("careers.apply.title", "General application") : getCareersJobTitle(job)} />
        <section className="cabin-section cabin-shell cabin-narrow">
          {job ? <button className="cabin-text-link" type="button" onClick={t.closeCareersJob}>← All roles</button> : null}
          {job?.description ? <RoleSection title="The role" text={job.description} /> : null}
          {job?.requirements ? <RoleSection title="Requirements" text={job.requirements} asList /> : null}
          <div className="cabin-form"><ApplyForm /></div>
        </section>
      </>
    );
  }
  return (
    <>
      <CabinPageHero title={draft.careersPageHeading || navLabel("careers", "Careers")} body={draft.careersPageIntro} image={cabinImage(t.heroImages[0], cabinFallback(2))} />
      <section className="cabin-section cabin-shell">
        {t.careersJobsLoading ? <p>Loading roles…</p> : t.careersJobs.length ? (
          <ul className="cabin-job-list">
            {t.careersJobs.map((role: any, index: number) => <li key={role.id || index}>
              <button className="cabin-text-link" type="button" onClick={() => t.openCareersJob(role)}>
                {getCareersJobTitle(role)} ↗ <small>{getCareersJobMeta(role)}</small>
              </button>
            </li>)}
          </ul>
        ) : <p className="cabin-center">There are no open roles right now.</p>}
        <div className="cabin-career-cta cabin-center">
          {draft.careersClosingHeading ? <h2>{draft.careersClosingHeading}</h2> : null}
          {draft.careersClosingText ? <p>{draft.careersClosingText}</p> : null}
          <button className="cabin-button" type="button" onClick={t.openCareersGeneralApply}>
            {draft.careersApplyButtonText || "Send a general application"}
          </button>
        </div>
      </section>
    </>
  );
}
