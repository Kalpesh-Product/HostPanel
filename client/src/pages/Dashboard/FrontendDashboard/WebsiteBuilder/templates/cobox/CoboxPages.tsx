import React, { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import {
  getCareersJobMeta,
  getCareersJobTitle,
} from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { LeadFormPanel } from "../shared/TplLead";
import { useCobox } from "./CoboxContext";
import {
  CCtaButton,
  CEyebrow,
  CIcon,
  CPageHero,
  CPlaceholder,
  CReveal,
} from "./CoboxUI";
import { CoboxFaq } from "./CoboxHome";

const srcOf = (value: any): string =>
  typeof value === "string" ? value : String(value?.url || value?.src || "");

const SpaceCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item }) => {
  const { goToItem, openLead } = useCobox();
  const image =
    item.images?.[0] || item.image || service.cardImage || service.heroImage;
  return (
    <article
      className="cbx-space-card"
      role="link"
      tabIndex={0}
      aria-label={`View ${item.title}`}
      onClick={() => goToItem(service, item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToItem(service, item);
        }
      }}
    >
      <figure>
        {image ? (
          <img src={image} alt={item.title} />
        ) : (
          <CPlaceholder text={item.title} />
        )}
      </figure>
      <div className="cbx-space-body">
        <small>{item.category || service.name}</small>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {item.features.length ? (
          <div className="cbx-chips">
            {item.features.slice(0, 3).map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
        ) : null}
        <div className="cbx-space-foot">
          <b>{priceWithUnit(item.price, item.priceUnit) || "On request"}</b>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openLead(service, item);
            }}
          >
            Reserve {CIcon.arrow(14)}
          </button>
        </div>
      </div>
    </article>
  );
};

export const ServicesIndex: React.FC = () => {
  const { services, draft, navLabel, c, goToService } = useCobox();
  return (
    <>
      <CPageHero
        title={draft?.productPageHeading || navLabel("products", "Our services")}
        eyebrow={c("services.index.eyebrow", "Our services")}
        image={draft?.productPageHeroImage || services[0]?.heroImage}
      >
        <p>
          {c(
            "services.index.body",
            "From a flexible desk to a private suite, choose the workspace that fits the way your team works."
          )}
        </p>
      </CPageHero>
      <section className="cbx-page">
        <div className="cbx-shell">
          <div className="cbx-head center">
            <CEyebrow>{c("services.index.label", "Find your place")}</CEyebrow>
            <h2>
              {c(
                "services.index.title",
                "Workspace solutions designed around your work"
              )}
            </h2>
          </div>
          <div className="cbx-page-grid">
            {services.map((service, index) => (
              <CReveal key={service.key} delay={index * 0.05}>
                <button
                  type="button"
                  className="cbx-page-card"
                  onClick={() => goToService(service)}
                >
                  <figure>
                    {service.cardImage || service.heroImage ? (
                      <img
                        src={service.cardImage || service.heroImage}
                        alt={service.name}
                      />
                    ) : (
                      <CPlaceholder text={service.name} />
                    )}
                  </figure>
                  <div className="cbx-page-card-body">
                    <small className="cbx-project-tag" style={{ margin: 0 }}>
                      {service.profile.labels.tag}
                    </small>
                    <h3>{service.name}</h3>
                    <p>{service.subText || service.heroSubHeading}</p>
                    <b>
                      Explore this space {CIcon.arrow(15)}
                    </b>
                  </div>
                </button>
              </CReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, openLead, c } = useCobox();
  return (
    <>
      <CPageHero
        title={service.heroHeading || service.heading}
        eyebrow={service.name}
        image={service.heroImage || service.cardImage}
      >
        {service.heroSubHeading ? <p>{service.heroSubHeading}</p> : null}
        <CCtaButton onClick={() => openLead(service)}>
          {service.profile.labels.cta}
        </CCtaButton>
      </CPageHero>
      <section className="cbx-page">
        <div className="cbx-shell">
          <div className="cbx-head center">
            <CEyebrow>{c("services.options.eyebrow", "Available options")}</CEyebrow>
            <h2>{c("services.options.title", "Choose a workspace that fits")}</h2>
            {service.subText || service.heroSubHeading ? (
              <p>{service.subText || service.heroSubHeading}</p>
            ) : null}
          </div>
          {service.items.length ? (
            <div className="cbx-space-grid">
              {service.items.map((item, index) => (
                <CReveal key={item.key} delay={index * 0.05}>
                  <SpaceCard service={service} item={item} index={index} />
                </CReveal>
              ))}
            </div>
          ) : (
            <div className="cbx-empty">
              Spaces are being prepared. Contact us for current availability.
            </div>
          )}
        </div>
      </section>
      <section className="cbx-cta">
        <div className="cbx-shell cbx-cta-grid">
          <div>
            <CEyebrow light>{c("services.form.eyebrow", "Book a space")}</CEyebrow>
            <h2>{c("services.form.title", "Tell us how you like to work")}</h2>
            <p>
              {c(
                "services.form.body",
                "Share your date, team size and preferred setup. We will recommend the best available space."
              )}
            </p>
            <div className="cbx-contact-lines">
              {t.contactPhone ? (
                <p>
                  <small>Phone</small>
                  <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                    {t.contactPhone}
                  </a>
                </p>
              ) : null}
              {t.contactEmail ? (
                <p>
                  <small>Email</small>
                  <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
                </p>
              ) : null}
            </div>
          </div>
          <div className="cbx-form-card">
            <LeadFormPanel service={service} />
          </div>
        </div>
      </section>
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { services, openLead } = useCobox();
  const [selected, setSelected] = useState(0);
  const images = (
    item.images?.length
      ? item.images
      : [item.image, service.heroImage, service.cardImage].filter(Boolean)
  ) as string[];
  const features = Array.isArray(item.features) ? item.features : [];
  const related = services
    .flatMap((s) => s.items.map((entry) => ({ service: s, item: entry })))
    .filter((entry) => entry.item.key !== item.key)
    .slice(0, 3);
  return (
    <>
      <CPageHero
        title={item.title}
        eyebrow={item.category || service.name}
        image={images[0]}
      />
      <section className="cbx-page">
        <div className="cbx-shell cbx-detail">
          <div>
            <div className="cbx-detail-main">
              {images[selected] ? (
                <img src={images[selected]} alt={item.title} />
              ) : (
                <CPlaceholder text={item.title} />
              )}
            </div>
            {images.length > 1 ? (
              <div className="cbx-detail-thumbs">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={image + index}
                    aria-current={selected === index}
                    onClick={() => setSelected(index)}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <aside className="cbx-detail-aside">
            <CEyebrow>{service.name}</CEyebrow>
            <h2 style={{ fontSize: 30 }}>{item.title}</h2>
            <strong>{priceWithUnit(item.price, item.priceUnit) || "On request"}</strong>
            {item.chips.length ? (
              <div className="cbx-chips">
                {item.chips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            ) : null}
            <p>{item.description}</p>
            {features.length ? (
              <ul>
                {features.map((line: string) => (
                  <li key={line}>
                    <i style={{ color: "var(--cbx-dark)", fontStyle: "normal" }}>
                      {CIcon.check(14)}
                    </i>
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            <CCtaButton onClick={() => openLead(service, item)}>
              {service.profile.labels.itemCta}
            </CCtaButton>
          </aside>
        </div>
      </section>
      {related.length ? (
        <section className="cbx-related">
          <div className="cbx-shell">
            <CEyebrow>Keep exploring</CEyebrow>
            <h2>Other spaces you may like</h2>
            <div className="cbx-space-grid">
              {related.map(({ service: s, item: entry }, index) => (
                <SpaceCard key={entry.key} service={s} item={entry} index={index} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const CoboxAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useCobox();
  const photos = (draft?.aboutPageImages || []).map(srcOf).filter(Boolean);
  const people = (t.founders || []) as any[];
  return (
    <>
      <CPageHero
        title={navLabel("about", draft?.aboutTitle || "About us")}
        eyebrow={c("about.eyebrow", "About us")}
        image={photos[0] || t.aboutIntroImage}
      />
      <section className="cbx-page">
        <div className="cbx-shell cbx-about-story">
          <div>
            <CEyebrow>{c("about.story.eyebrow", "Our story")}</CEyebrow>
            <h2>{draft?.aboutTitle || "A workspace with a real community"}</h2>
          </div>
          <div>
            {(t.aboutIntroBlocks || []).map((line: string, index: number) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
        <div className="cbx-shell cbx-about-imgs">
          {[
            photos[1] || t.galleryItems?.[1],
            photos[2] || t.galleryItems?.[2],
            t.galleryItems?.[3],
          ]
            .filter(Boolean)
            .map((image: string, index: number) => (
              <CReveal key={image} delay={index * 0.06}>
                <img src={image} alt="Workspace life" />
              </CReveal>
            ))}
        </div>
      </section>
      {people.length ? (
        <section className="cbx-team">
          <div className="cbx-shell">
            <div className="cbx-head center">
              <CEyebrow>{c("about.team.eyebrow", "Our team")}</CEyebrow>
              <h2>
                {draft?.aboutPageTeamHeading ||
                  c("about.team.title", "Meet the people behind the workspace")}
              </h2>
            </div>
            <div className="cbx-team-grid">
              {people.map((person, index) => (
                <CReveal key={person.name || index} delay={index * 0.05}>
                  <article className="cbx-team-card">
                    {srcOf(person.image) ? (
                      <img src={srcOf(person.image)} alt={person.name} />
                    ) : (
                      <CPlaceholder text={person.name} />
                    )}
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                    {person.bio ? <span>{person.bio}</span> : null}
                  </article>
                </CReveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <CoboxFaq faqs={draft?.faqs} />
    </>
  );
};

export const CoboxGallery: React.FC = () => {
  const { t, draft, navLabel, c } = useCobox();
  return (
    <>
      <CPageHero
        title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")}
        eyebrow={c("gallery.eyebrow", "Inside our space")}
        image={t.galleryItems?.[0]}
      />
      <section className="cbx-page">
        <div className="cbx-shell">
          <div className="cbx-gallery">
            {(t.galleryItems || []).map((image: string, index: number) => (
              <CReveal key={image + index} delay={(index % 4) * 0.04}>
                <button
                  type="button"
                  onClick={() => t.openGalleryViewer(index)}
                  aria-label={`Open photo ${index + 1}`}
                >
                  <img src={image} alt={`Workspace photo ${index + 1}`} />
                </button>
              </CReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const CoboxTestimonials: React.FC = () => {
  const { t, draft, navLabel, c } = useCobox();
  return (
    <>
      <CPageHero
        title={
          draft?.testimonialsPageHeading ||
          navLabel("testimonials", "Testimonials")
        }
        eyebrow={c("reviews.eyebrow", "Member stories")}
      />
      <section className="cbx-page">
        <div className="cbx-shell">
          <div className="cbx-review-grid">
            {(t.testimonials || []).map((item: any, index: number) => (
              <CReveal key={item.key || index} delay={index * 0.04}>
                <article>
                  <span className="cbx-stars">
                    {"★".repeat(Math.max(1, Math.round(item.rating || 5)))}
                  </span>
                  <blockquote>
                    “{item.text || item.review || item.message || item.testimony}”
                  </blockquote>
                  <strong>{item.name || item.author}</strong>
                </article>
              </CReveal>
            ))}
          </div>
          {t.showWriteReview ? (
            <div className="cbx-center">
              <CCtaButton onClick={t.openReviewModal}>
                {c("reviews.write", "Write a review")}
              </CCtaButton>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};

export const CoboxPartner: React.FC = () => {
  const { t, draft, c } = useCobox();
  const lines = String(t.partnerPageContent || "")
    .split("\n")
    .filter(Boolean);
  return (
    <>
      <CPageHero
        title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`}
        eyebrow={c("partner.eyebrow", "Partnerships")}
        image={t.galleryItems?.[3]}
      />
      <section className="cbx-page">
        <div className="cbx-shell cbx-form-layout">
          <div>
            <CEyebrow>{c("partner.label", "Work together")}</CEyebrow>
            <h2>{c("partner.title", "Let's build a better workday together")}</h2>
            {lines.length ? (
              lines.map((line: string, index: number) => (
                <p key={index} style={{ marginTop: 14 }}>
                  {line}
                </p>
              ))
            ) : (
              <p style={{ marginTop: 14 }}>
                {c(
                  "partner.body",
                  "Tell us how your company, community or local business would like to collaborate."
                )}
              </p>
            )}
          </div>
          <div className="cbx-form-card">
            <h3>{t.partnerFormTitle || "Start a conversation"}</h3>
            <MessageForm
              inquiryType="Partnership"
              submitLabel="Send to our team"
              success="We've received your note and will be in touch soon."
            />
          </div>
        </div>
      </section>
    </>
  );
};

export const CoboxContact: React.FC = () => {
  const { t, draft, primary, navLabel } = useCobox();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <>
      <CPageHero
        title={draft?.contactPageHeading || navLabel("contact", "Contact us")}
        eyebrow="Get in touch"
        image={t.galleryItems?.[4]}
      />
      <section className="cbx-page">
        <div className="cbx-shell cbx-contact-grid">
          <div>
            <CEyebrow>Plan your visit</CEyebrow>
            <h2>{draft?.contactTitle || "Find your next workspace"}</h2>
            <p style={{ marginTop: 14 }}>
              {draft?.contactPageIntro ||
                "Tell us what kind of space you need and our team will help you plan the right visit."}
            </p>
            <div className="cbx-contact-list">
              {t.contactPhone ? (
                <p>
                  <small>Phone</small>
                  <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                    {t.contactPhone}
                  </a>
                </p>
              ) : null}
              {t.contactEmail ? (
                <p>
                  <small>Email</small>
                  <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
                </p>
              ) : null}
              {t.contactAddress ? (
                <p>
                  <small>Address</small>
                  <span>{t.contactAddress}</span>
                </p>
              ) : null}
            </div>
            {hours.length ? (
              <div className="cbx-hours">
                {hours.map((row) => (
                  <p key={row.days}>
                    <small>{row.days}</small>
                    <span>{row.hours}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          {showForm ? (
            <div className="cbx-form-card">
              {primary?.leadEnabled ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm
                  inquiryType="General Enquiry"
                  submitLabel="Send message"
                  success={
                    draft?.contactInquirySuccessMessage ||
                    "Thank you. Your inquiry has been submitted successfully."
                  }
                />
              )}
            </div>
          ) : null}
        </div>
      </section>
      {draft?.mapUrl ? (
        <section className="cbx-map">
          <iframe title="Map" src={draft.mapUrl} loading="lazy" />
        </section>
      ) : null}
      <CoboxFaq faqs={draft?.faqs} />
    </>
  );
};

export const CoboxCareers: React.FC = () => {
  const { t, draft } = useCobox();
  const job = t.careersApplyJob;
  if (job) {
    return (
      <>
        <CPageHero
          title={
            t.careersDirectApply
              ? "General application"
              : getCareersJobTitle(job)
          }
          eyebrow={t.careersDirectApply ? "Join our team" : getCareersJobMeta(job)}
        />
        <section className="cbx-page">
          <div className="cbx-shell cbx-career-detail">
            {!t.careersDirectApply ? (
              <div>
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection
                  title="Key responsibilities"
                  text={job.keyResponsibilities}
                  asList
                />
                <RoleSection title="Requirements" text={job.requirements} asList />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
              </div>
            ) : null}
            <div className="cbx-form-card">
              <h3>Apply now</h3>
              <ApplyForm />
            </div>
          </div>
        </section>
      </>
    );
  }
  const intro = String(draft?.careersPageIntro || "")
    .split("\n")
    .filter(Boolean);
  return (
    <>
      <CPageHero
        title={
          draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`
        }
        eyebrow="Careers"
        image={t.galleryItems?.[4]}
      />
      <section className="cbx-page">
        <div className="cbx-shell cbx-jobs">
          {t.careersJobsLoading ? (
            <p>Loading open roles…</p>
          ) : !t.careersJobs.length ? (
            <div className="cbx-empty">
              <h2 style={{ marginBottom: 10 }}>No openings right now</h2>
              <p>
                {intro[0] ||
                  "Send us a general application and tell us how you would like to contribute."}
              </p>
              <div style={{ marginTop: 22 }}>
                <CCtaButton onClick={t.openCareersGeneralApply}>
                  {draft?.careersApplyButtonText || "General application"}
                </CCtaButton>
              </div>
            </div>
          ) : (
            t.careersDepartmentSections.map((dept: any) => (
              <div key={dept.department}>
                <CEyebrow>{dept.department}</CEyebrow>
                <div className="cbx-jobs">
                  {dept.jobs.map((item: any, index: number) => (
                    <button
                      type="button"
                      className="cbx-job"
                      key={index}
                      onClick={() => t.openCareersJob(item)}
                    >
                      <span>
                        <b>{getCareersJobTitle(item)}</b>
                        <small>{getCareersJobMeta(item)}</small>
                      </span>
                      <span style={{ color: "var(--cbx-dark)" }}>
                        {CIcon.arrow(18)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
};
