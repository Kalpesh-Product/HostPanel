import { getCareersJobMeta, getCareersJobTitle, getMediaSrc } from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useCoPlace } from "./CoPlaceContext";
import { CoPlaceHours, CoPlaceImage, CoPlacePageHero } from "./CoPlaceUI";

export function AboutPage() {
  const { t, draft, navLabel, photo } = useCoPlace();
  const images = draft.aboutPageImages || [];
  const founders = t.isSectionEnabled("about_founders") ? t.founders : [];
  const team = t.isSectionEnabled("about_team") ? t.aboutPageImageCards : [];
  const people = [...founders, ...team];
  return (
    <>
      <CoPlacePageHero title={draft.aboutPageHeading || navLabel("about", "About us")}
        body={draft.aboutPageIntro} image={photo("about.image", getMediaSrc(images[0]) || t.heroImages[0] || "")} />
      <section className="coplace-section coplace-shell">
        <div className="coplace-split">
          <div>
            {draft.aboutTitle ? <h2>{draft.aboutTitle}</h2> : null}
            {t.aboutIntroBlocks.filter((text: string) => text !== draft.aboutPageIntro).map((text: string, index: number) => <p key={index}>{text}</p>)}
            {t.aboutNarrativeBlocks.map(({ title, body }: { title: string; body: string }) => (
              <article className="coplace-narrative" key={title}><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
          <CoPlaceImage src={photo("about.detail", getMediaSrc(images[1]) || t.galleryItems[0] || "")} />
        </div>
        {people.length ? <div className="coplace-related">
          <h2>{draft.aboutPageTeamHeading || "Meet our team"}</h2>
          <div className="coplace-cards">
            {people.map((person: any, index: number) => <article key={index}>
              <CoPlaceImage src={getMediaSrc(person.image)} />
              <div><h3>{person.name || person.title}</h3><p>{person.role || person.bio || person.description}</p></div>
            </article>)}
          </div>
        </div> : null}
        {draft.faqs?.length ? <div className="coplace-related"><FaqSection faqs={draft.faqs} /></div> : null}
      </section>
    </>
  );
}

export function GalleryPage() {
  const { t, draft, navLabel } = useCoPlace();
  return (
    <>
      <CoPlacePageHero title={draft.galleryPageHeading || navLabel("gallery", "Gallery")} image={t.galleryItems[0] || t.heroImages[0]} />
      <section className="coplace-section coplace-shell">
        {t.galleryItems.length ? <div className="coplace-gallery">
          {t.galleryItems.map((image: string, index: number) => <button key={image + index} type="button"
            aria-label={"Open gallery photo " + (index + 1)} onClick={() => t.openGalleryViewer(index)}><CoPlaceImage src={image} /></button>)}
        </div> : <p>No photos have been added yet.</p>}
      </section>
    </>
  );
}

export function ReviewsPage() {
  const { t, draft, navLabel, rating } = useCoPlace();
  return (
    <>
      <CoPlacePageHero title={draft.testimonialsPageHeading || navLabel("testimonials", "Guest reviews")}
        body={draft.testimonialsPageIntro} image={t.heroImages[0]} />
      <section className="coplace-section coplace-shell coplace-center">
        {rating.count ? <p>{rating.avg.toFixed(1)} / 5 from {rating.count} {rating.count === 1 ? "rating" : "ratings"}</p> : null}
        <div className="coplace-reviews">
          {t.testimonials.map((review: any, index: number) => <figure key={review.key || index}>
            <blockquote>{review.text || review.review || review.testimony}</blockquote><figcaption>{review.name || review.author}</figcaption>
          </figure>)}
        </div>
        {t.showWriteReview ? <button className="coplace-button" type="button" onClick={t.openReviewModal}>Write a review</button> : null}
      </section>
    </>
  );
}

export function ContactPage() {
  const { t, draft, navLabel } = useCoPlace();
  const query = encodeURIComponent(t.contactAddress || "");
  const map = draft.mapUrl || (query ? "https://www.google.com/maps?q=" + query + "&output=embed" : "");
  return (
    <>
      <CoPlacePageHero title={draft.contactPageHeading || navLabel("contact", "Contact")}
        body={draft.contactPageIntro} image={t.heroImages[0]} />
      <section className="coplace-section coplace-shell">
        <div className="coplace-split">
          <div>
            <h2>{draft.contactTitle || "Visit us"}</h2>
            <address className="coplace-contact-details">
              {query ? <a href={"https://www.google.com/maps/search/?api=1&query=" + query} target="_blank" rel="noreferrer">{t.contactAddress}</a> : null}
              {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
            </address>
            <CoPlaceHours />
          </div>
          {draft.contactEnableInquiryForm !== false ? <div className="coplace-form">
            <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft.contactInquirySuccessMessage || "Thanks for getting in touch. We’ll reply soon."} />
          </div> : null}
        </div>
        {map ? <iframe className="coplace-map" title="Workspace location" src={map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : null}
      </section>
    </>
  );
}

export function PartnerPage() {
  const { t, draft, navLabel } = useCoPlace();
  return (
    <>
      <CoPlacePageHero title={t.partnerPageHeading || navLabel("partner", "Partner with us")} body={t.partnerPageContent} image={t.heroImages[0]} />
      {draft.partnerEnableInquiryForm !== false ? <section className="coplace-section coplace-shell">
        <div className="coplace-form coplace-narrow">
          <h2>{t.partnerFormTitle || "Start a conversation"}</h2>
          <MessageForm inquiryType="Partnership" submitLabel="Send enquiry" success={draft.partnerInquirySuccessMessage || "Thanks for your enquiry. We’ll be in touch."} />
        </div>
      </section> : null}
    </>
  );
}

export function CareersPage() {
  const { t, draft, navLabel } = useCoPlace();
  const job = t.careersApplyJob;
  if (job || t.careersDirectApply) {
    return (
      <>
        <CoPlacePageHero title={job ? getCareersJobTitle(job) : draft.careersPageHeading || "Work with us"} />
        <section className="coplace-section coplace-shell coplace-narrow">
          {job ? <button className="coplace-text-link" type="button" onClick={t.closeCareersJob}>← All roles</button> : null}
          {job?.description ? <RoleSection title="The role" text={job.description} /> : null}
          {job?.requirements ? <RoleSection title="Requirements" text={job.requirements} asList /> : null}
          <div className="coplace-form"><ApplyForm /></div>
        </section>
      </>
    );
  }
  return (
    <>
      <CoPlacePageHero title={draft.careersPageHeading || navLabel("careers", "Careers")} body={draft.careersPageIntro} image={t.heroImages[0]} />
      <section className="coplace-section coplace-shell">
        {t.careersJobsLoading ? <p>Loading roles…</p> : t.careersJobs.length ? (
          <ul className="coplace-job-list">
            {t.careersJobs.map((role: any, index: number) => <li key={role.id || index}>
              <button className="coplace-text-link" type="button" onClick={() => t.openCareersJob(role)}>
                {getCareersJobTitle(role)} ↗ <small>{getCareersJobMeta(role)}</small>
              </button>
            </li>)}
          </ul>
        ) : <p>There are no open roles right now.</p>}
        {draft.careersClosingHeading ? <h2>{draft.careersClosingHeading}</h2> : null}
        {draft.careersClosingText ? <p>{draft.careersClosingText}</p> : null}
        <button className="coplace-button" type="button" onClick={t.openCareersGeneralApply}>
          {draft.careersApplyButtonText || "Send a general application"}
        </button>
      </section>
    </>
  );
}
