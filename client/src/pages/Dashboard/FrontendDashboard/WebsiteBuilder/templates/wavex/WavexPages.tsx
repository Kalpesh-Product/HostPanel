import React from "react";
import { Reveal } from "../motion";
import { groupOpeningHours } from "../templateKit";
import {
  getCareersJobMeta,
  getCareersJobTitle,
} from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection } from "../shared/TplParts";
import { Icon } from "../shared/TplUI";
import { useWavex } from "./WavexContext";
import { WxCrumbs, WxMedia, WxPageHero, WxSectionHead } from "./WavexUI";

const splitLines = (value: any): string[] =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const WavexAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useWavex();
  const intro: string[] = Array.isArray(t.aboutIntroBlocks) ? t.aboutIntroBlocks : [];
  const narrative: { title: string; body: string }[] = Array.isArray(t.aboutNarrativeBlocks)
    ? t.aboutNarrativeBlocks
    : [];
  const photos: string[] = Array.from(new Set([
    ...(Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : []),
    ...(Array.isArray(t.galleryItems) ? t.galleryItems : []),
  ].map((item: any) => typeof item === "string" ? item : item?.url).filter(Boolean)));
  const founders: any[] = Array.isArray(t.founders) ? t.founders : [];

  return (
    <>
      <WxPageHero
        index="01 / About"
        title={navLabel("about", draft?.aboutTitle || "Our story")}
        body={intro[0] || c("about.intro", "A homegrown space for good work and good company.")}
        image={photos[0] || t.homeHeroImage}
      />
      <WxCrumbs items={[
        { label: "Home", onClick: () => t.goToSection("home") },
        { label: "About" },
      ]} />

      {intro.length > 1 || photos.length ? (
        <section className="wx-section">
          <div className="wx-shell wx-page-intro">
            <Reveal className="wx-prose">
              {intro.slice(1).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </Reveal>
            {photos.length ? (
              <Reveal delay={0.08}>
                <div className="wx-gallery-grid wx-about-gallery">
                  {photos.slice(0, 4).map((src, index) => (
                    <WxMedia key={`${src}-${index}`} src={src} label="" className="wx-gallery-item" />
                  ))}
                </div>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {narrative.length ? (
        <section className="wx-section wx-community">
          <div className="wx-shell">
            <WxSectionHead title={c("about.values.title", "How we do things")} />
            <div className="wx-value-grid">
              {narrative.map((block, index) => (
                <Reveal key={block.title} delay={Math.min(index * 0.06, 0.3)} className="wx-value">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{block.title}</h3>
                  <p>{block.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {founders.length && t.isSectionEnabled("about_founders") ? (
        <section className="wx-section">
          <div className="wx-shell">
            <WxSectionHead title={c("about.founders.title", "The people behind the space")} />
            <div className="wx-room-grid wx-founder-grid">
              {founders.map((founder, index) => (
                <Reveal key={index} delay={Math.min(index * 0.06, 0.3)} className="wx-room">
                  <WxMedia className="wx-room-photo wx-founder-photo" src={founder.image} label={founder.name} />
                  <div className="wx-room-body">
                    <h3>{founder.name}</h3>
                    {founder.role ? <p>{founder.role}</p> : null}
                    {founder.bio ? <p>{founder.bio}</p> : null}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {t.contactAddress ? (
        <section className="wx-section-tight">
          <div className="wx-shell">
            <Reveal className="wx-info-card">
              <span className="wx-info-icon">{Icon.pin(20)}</span>
              <h3 style={{ marginTop: 18 }}>Visit us</h3>
              <p>{t.contactAddress}</p>
              {draft?.mapUrl ? (
                <div className="wx-map" style={{ marginTop: 24 }}>
                  <iframe title="Map" src={draft.mapUrl} loading="lazy" />
                </div>
              ) : null}
            </Reveal>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const WavexGallery: React.FC = () => {
  const { t, draft, navLabel } = useWavex();
  const images: string[] = Array.isArray(t.galleryItems) ? t.galleryItems : [];
  return (
    <>
      <WxPageHero
        index="02 / Gallery"
        title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")}
        body={images.length ? `${images.length} photos of the space` : undefined}
        image={images[0] || t.homeHeroImage}
      />
      <section className="wx-section">
        <div className="wx-shell">
          {images.length ? (
            <div className="wx-gallery-grid">
              {images.map((src, index) => (
                <Reveal key={`${src}-${index}`} delay={Math.min((index % 6) * 0.04, 0.2)}>
                  <button
                    type="button"
                    className="wx-gallery-item"
                    aria-label={`Open photo ${index + 1}`}
                    onClick={() => t.openGalleryViewer(index)}
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="wx-empty">Photos are on their way.</div>
          )}
        </div>
      </section>
    </>
  );
};

export const WavexTestimonials: React.FC = () => {
  const { t, draft, rating, navLabel } = useWavex();
  const list: any[] = Array.isArray(t.testimonials) ? t.testimonials : [];
  return (
    <>
      <WxPageHero
        index="03 / Reviews"
        title={draft?.testimonialsPageHeading || navLabel("testimonials", "What people say")}
        body={draft?.testimonialsPageIntro || undefined}
        image={list[0]?.image || t.homeHeroImage}
      >
        {t.showWriteReview ? (
          <button type="button" className="wx-btn" style={{ marginTop: 24 }} onClick={t.openReviewModal}>
            Write a review
          </button>
        ) : null}
      </WxPageHero>
      <section className="wx-section">
        <div className="wx-shell">
          {rating.count ? (
            <Reveal className="wx-stat-grid">
              <div className="wx-stat"><strong>{rating.avg.toFixed(1)}</strong><span>Average rating</span></div>
              <div className="wx-stat"><strong>{rating.count}</strong><span>Reviews</span></div>
              <div className="wx-stat"><strong>{list.filter((item) => Math.round(item.rating) === 5).length}</strong><span>Five-star stays</span></div>
              <div className="wx-stat"><strong>100%</strong><span>Worth a visit</span></div>
            </Reveal>
          ) : null}
          {list.length ? (
            <div className="wx-room-grid" style={{ marginTop: 30 }}>
              {list.map((item, index) => (
                <Reveal key={index} delay={Math.min(index * 0.05, 0.3)} className="wx-room">
                  <div className="wx-room-body">
                    <span className="wx-quote-mark" aria-hidden="true">“</span>
                    <p className="wx-quote" style={{ fontSize: 19 }}>
                      {item.quote || item.review || item.testimonial || item.text}
                    </p>
                    <div className="wx-person">
                      <div>
                        <strong>{item.author || item.name || "Member"}</strong>
                        <span>{item.role || "Community member"}</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="wx-empty">Be the first to leave a review.</div>
          )}
        </div>
      </section>
    </>
  );
};

export const WavexPartner: React.FC = () => {
  const { t, draft, c } = useWavex();
  const paragraphs = splitLines(t.partnerPageContent);
  return (
    <>
      <WxPageHero
        index="04 / Partner"
        title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`}
        body={c("partner.intro", "Companies, communities and local businesses — let's work together.")}
        image={t.homeHeroImage}
      />
      <section className="wx-section">
        <div className="wx-shell wx-contact-grid">
          <Reveal className="wx-prose">
            {paragraphs.length ? (
              paragraphs.map((line, index) => <p key={index}>{line}</p>)
            ) : (
              <p>{c("partner.intro", "Tell us how we can support your team, community or event.")}</p>
            )}
          </Reveal>
          <Reveal delay={0.08} className="wx-contact-form">
            <h3>{t.partnerFormTitle || "Get in touch"}</h3>
            <p>Tell us a little about what you have in mind.</p>
            <MessageForm
              inquiryType="Partnership"
              submitLabel="Send to our team"
              success="We've received your note and will be in touch soon."
            />
          </Reveal>
        </div>
      </section>
    </>
  );
};

export const WavexContact: React.FC = () => {
  const { t, draft, primary, navLabel, c } = useWavex();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <>
      <WxPageHero
        index="05 / Contact"
        title={draft?.contactPageHeading || navLabel("contact", "Contact")}
        body={draft?.contactPageIntro || c("home.contact.body", "Tell us what you're planning and we'll help you find the right room.")}
        image={t.homeHeroImage}
      />
      <section className="wx-section">
        <div className="wx-shell wx-contact-grid">
          <Reveal>
            <span className="wx-kicker">Get in touch</span>
            <h2 className="wx-title" style={{ marginTop: 14 }}>Come say hello.</h2>
            <div className="wx-contact-lines">
              {t.contactAddress ? <div><i>{Icon.pin(16)}</i>{t.contactAddress}</div> : null}
              {t.contactPhone ? (
                <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                  <i>{Icon.phone(16)}</i>{t.contactPhone}
                </a>
              ) : null}
              {t.contactEmail ? (
                <a href={`mailto:${t.contactEmail}`}><i>{Icon.mail(16)}</i>{t.contactEmail}</a>
              ) : null}
            </div>
            {hours.length ? (
              <div className="wx-facts">
                {hours.map((row) => (
                  <div className="wx-fact" key={row.days}><span>{row.days}</span><b>{row.hours}</b></div>
                ))}
              </div>
            ) : draft?.contactBusinessHours ? (
              <p className="wx-copy" style={{ marginTop: 20 }}>{draft.contactBusinessHours}</p>
            ) : null}
            {draft?.mapUrl ? (
              <div className="wx-map"><iframe title="Map" src={draft.mapUrl} loading="lazy" /></div>
            ) : null}
          </Reveal>
          {showForm ? (
            <Reveal delay={0.08} className="wx-contact-form">
              <h3>{c("home.contact.formTitle", "Book a viewing")}</h3>
              <p>{c("home.contact.formBody", "Share a few details and our team will get back to you.")}</p>
              {primary?.leadEnabled ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm
                  inquiryType="General Enquiry"
                  submitLabel="Send message"
                  success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."}
                />
              )}
            </Reveal>
          ) : null}
        </div>
      </section>
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

export const WavexCareers: React.FC = () => {
  const { t, draft } = useWavex();
  const job = t.careersApplyJob;

  if (job) {
    const applyOnly = t.careersDirectApply;
    return (
      <>
        <WxPageHero
          index="06 / Careers"
          title={applyOnly ? "General application" : getCareersJobTitle(job)}
          body={applyOnly ? undefined : getCareersJobMeta(job)}
          image={t.homeHeroImage}
        />
        <section className="wx-section">
          <div className={`wx-shell${applyOnly ? "" : " wx-contact-grid"}`}>
            {!applyOnly ? (
              <Reveal className="wx-prose">
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection title="Key responsibilities" text={job.keyResponsibilities} asList />
                <RoleSection title="Requirements" text={job.requirements} asList />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
              </Reveal>
            ) : null}
            <Reveal delay={0.08} className={`wx-contact-form${applyOnly ? " wx-contact-form-solo" : ""}`}>
              <h3>Apply now</h3>
              <p>Send us your details and resume.</p>
              <ApplyForm submitLabel="Submit Application" centered />
            </Reveal>
          </div>
        </section>
      </>
    );
  }

  const lines = splitLines(draft?.careersPageIntro);
  const intro = lines.length ? lines : t.careersFallbackIntro || [];
  return (
    <>
      <WxPageHero
        index="06 / Careers"
        title={draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`}
        body={intro[0]}
        image={t.homeHeroImage}
      />
      <section className="wx-section">
        <div className="wx-shell">
          {intro.length > 1 ? (
            <div className="wx-page-intro" style={{ marginBottom: 42 }}>
              {intro.slice(1).map((line, index) => <p className="wx-copy" key={index}>{line}</p>)}
            </div>
          ) : null}
          {t.careersJobsLoading ? (
            <div className="wx-empty">Loading open roles…</div>
          ) : t.careersJobs.length ? (
            <div className="wx-jobs">
              {t.careersDepartmentSections.map((dept: any) => (
                <Reveal key={dept.department}>
                  <WxSectionHead title={dept.department} />
                  {dept.jobs.map((item: any, index: number) => (
                    <button
                      key={index}
                      type="button"
                      className="wx-job"
                      onClick={() => t.openCareersJob(item)}
                    >
                      <span>
                        <h3>{getCareersJobTitle(item)}</h3>
                        <span>{getCareersJobMeta(item)}</span>
                      </span>
                      <span className="wx-space-go">{Icon.arrow(16)}</span>
                    </button>
                  ))}
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="wx-empty">
              <p>No openings right now</p>
              <button
                type="button"
                className="wx-btn"
                style={{ marginTop: 18 }}
                onClick={t.openCareersGeneralApply}
              >
                {draft?.careersApplyButtonText || "General application"}
              </button>
            </div>
          )}
          {t.careersJobs.length ? (
            <Reveal className="wx-contact-form">
              <h3>{draft?.careersClosingHeading || "Don't see your role?"}</h3>
              <p>{draft?.careersClosingText || "Send us a general application and tell us how you'd like to contribute."}</p>
              <button type="button" className="wx-btn" onClick={t.openCareersGeneralApply}>
                {draft?.careersApplyButtonText || "General application"}
              </button>
            </Reveal>
          ) : null}
        </div>
      </section>
    </>
  );
};
