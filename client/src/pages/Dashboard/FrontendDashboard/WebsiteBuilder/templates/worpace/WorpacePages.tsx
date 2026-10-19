import React, { useState } from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import {
  getCareersJobMeta,
  getCareersJobTitle,
} from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { LeadFormPanel } from "../shared/TplLead";
import { useWorpace } from "./WorpaceContext";
import {
  Icon,
  PageHero,
  Placeholder,
  Reveal,
  SectionLabel,
  SpaceCard,
} from "./WorpaceUI";

const src = (value: any) =>
  typeof value === "string" ? value : value?.url || "";

export const ServicesIndex: React.FC = () => {
  const { services, draft, navLabel, goToService, c } = useWorpace();
  return (
    <>
      <PageHero
        title={draft?.productPageHeading || navLabel("products", "Our Spaces")}
        eyebrow={c("services.index.eyebrow", "Flexible workspaces")}
        image={draft?.productPageHeroImage || services[0]?.heroImage}
      />
      <section className="wp-page-section">
        <div className="wp-shell">
          <div className="wp-section-head">
            <div>
              <SectionLabel>
                {c("services.index.label", "Choose your setup")}
              </SectionLabel>
              <h2>
                {c("services.index.title", "A space for every kind of work")}
              </h2>
            </div>
            <p>
              {c(
                "services.index.sub",
                "From one quiet desk to a private room for the whole team, find the setup that keeps your day moving.",
              )}
            </p>
          </div>
          <div className={`wp-service-grid wp-count-${services.length}`}>
            {services.map((service, index) => (
              <Reveal key={service.key} delay={index * 0.06}>
                <button
                  type="button"
                  className="wp-service-tile"
                  onClick={() => goToService(service)}
                >
                  <div>
                    {service.cardImage || service.heroImage ? (
                      <img
                        src={service.cardImage || service.heroImage}
                        alt={service.name}
                      />
                    ) : (
                      <Placeholder text={service.name} />
                    )}
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <small>{service.profile.labels.nav}</small>
                  <h2>{service.name}</h2>
                  <p>{service.description || service.heading}</p>
                  <b>Explore this space {Icon.arrow()}</b>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { openLead, c } = useWorpace();
  return (
    <>
      <PageHero
        title={service.heading || service.name}
        eyebrow={service.name}
        image={service.heroImage || service.cardImage}
      >
        <button
          type="button"
          className="wp-cta wp-page-cta"
          onClick={() => openLead(service)}
        >
          Reserve this space {Icon.arrow()}
        </button>
      </PageHero>
      <section className="wp-page-section">
        <div className="wp-shell">
          <div className="wp-section-head">
            <div>
              <SectionLabel>
                {c("services.rooms.label", "Available options")}
              </SectionLabel>
              <h2>
                {c("services.rooms.title", "Choose the workspace that fits")}
              </h2>
            </div>
            <p>{service.description}</p>
          </div>
          {service.items.length ? (
            <div className={`wp-space-grid wp-count-${service.items.length}`}>
              {service.items.map((item, index) => (
                <Reveal key={item.key} delay={index * 0.06}>
                  <SpaceCard service={service} item={item} index={index} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="wp-empty">
              Spaces are being prepared. Contact us for current availability.
            </div>
          )}
        </div>
      </section>
      <section className="wp-form-band">
        <div className="wp-shell wp-form-grid">
          <div>
            <SectionLabel>
              {c("services.cta.label", "Plan your workday")}
            </SectionLabel>
            <h2>{c("services.cta.title", "Tell us what your team needs")}</h2>
            <p>
              {c(
                "services.cta.sub",
                "Share your preferred date, duration and team size. We will recommend the best available setup.",
              )}
            </p>
          </div>
          <div className="wp-form-card">
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
  const { openLead } = useWorpace();
  const [selected, setSelected] = useState(0);
  const images =
    Array.isArray(item.images) && item.images.length
      ? item.images
      : [item.image, service.heroImage, service.cardImage].filter(Boolean);
  const features = Array.isArray(item.features)
    ? item.features
    : Array.isArray(item.raw?.inclusions)
      ? item.raw.inclusions
      : [];
  return (
    <>
      <PageHero title={item.title} eyebrow={item.category || service.name} />
      <section className="wp-page-section">
        <div className="wp-shell wp-detail-grid">
          <div>
            <div className="wp-detail-main">
              {images[selected] ? (
                <img src={images[selected]} alt={item.title} />
              ) : (
                <Placeholder text={item.title} />
              )}
            </div>
            {images.length > 1 ? (
              <div className="wp-detail-thumbs">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={image + index}
                    onClick={() => setSelected(index)}
                    aria-current={selected === index}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <aside className="wp-detail-copy">
            <SectionLabel>{service.name}</SectionLabel>
            <h2>{item.title}</h2>
            <p className="wp-detail-price">
              {priceWithUnit(item.price, item.priceUnit) ||
                item.raw?.area ||
                "Flexible access"}
            </p>
            <p>{item.description}</p>
            {features.length ? (
              <ul>
                {features.map((line: string) => (
                  <li key={line}>
                    {Icon.check()}
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="wp-cta"
              onClick={() => openLead(service, item)}
            >
              Reserve this space {Icon.arrow()}
            </button>
          </aside>
        </div>
      </section>
      <Suggestions current={item} service={service} />
    </>
  );
};

const Suggestions: React.FC<{ current: ServiceItem; service: Service }> = ({
  current,
  service,
}) => {
  const { services } = useWorpace();
  const list = services
    .flatMap((s) => s.items.map((item) => ({ service: s, item })))
    .filter(({ item }) => item.key !== current.key)
    .slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="wp-suggestions">
      <div className="wp-shell">
        <SectionLabel>Keep exploring</SectionLabel>
        <h2>Other spaces you may like</h2>
        <div className="wp-space-grid">
          {list.map(({ service: s, item }, index) => (
            <SpaceCard key={item.key} service={s} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Shared FAQ block (About, Contact, Home all show the same business FAQs) — kept here, not the
// generic shared FaqSection, so every page's FAQ matches Worpace's own look and `.wp-shell` margin.
export const WorpaceFaq: React.FC<{
  faqs?: Array<{ question?: string; answer?: string }>;
}> = ({ faqs }) => {
  const [open, setOpen] = useState<number | null>(0);
  const items = (faqs || []).filter((item) => item?.question && item?.answer);
  if (!items.length) return null;
  return (
    <section className="wp-about-faq">
      <div className="wp-shell wp-about-faq-grid">
        <Reveal>
          <div>
            <SectionLabel>FAQ</SectionLabel>
            <h2>Good to know</h2>
            <p>
              Useful details about visiting, joining and making the most of your
              workday with us.
            </p>
          </div>
        </Reveal>
        <div className="wp-about-faq-list">
          {items.map((item, index) => {
            const active = open === index;
            return (
              <article
                key={`${item.question}-${index}`}
                className={active ? "is-open" : ""}
              >
                <button
                  type="button"
                  aria-expanded={active}
                  onClick={() => setOpen(active ? null : index)}
                >
                  <span>{item.question}</span>
                  <motion.i
                    aria-hidden="true"
                    animate={{ rotate: active ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    +
                  </motion.i>
                </button>
                <AnimatePresence initial={false}>
                  {active ? (
                    <motion.div
                      className="wp-about-faq-answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p>{item.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const WorpaceAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useWorpace();
  const photos = (draft?.aboutPageImages || []).map(src).filter(Boolean);
  const people = t.founders || [];
  return (
    <>
      <PageHero
        title={navLabel("about", draft?.aboutTitle || "About Us")}
        eyebrow={c("about.eyebrow", "Our story")}
        image={photos[0] || t.aboutIntroImage}
      />
      <section className="wp-page-section">
        <div className="wp-shell wp-about-intro">
          <div>
            <SectionLabel>{c("about.label", "About us")}</SectionLabel>
            <h2>{draft?.aboutTitle || "Where productivity meets comfort"}</h2>
          </div>
          <div>
            {t.aboutIntroBlocks.map((text: string, index: number) => (
              <p key={index}>{text}</p>
            ))}
          </div>
        </div>
        <div className="wp-shell wp-about-collage">
          {[
            photos[1] || t.galleryItems[1],
            photos[2] || t.galleryItems[2],
            t.galleryItems[3],
          ]
            .filter(Boolean)
            .map((image: string, index: number) => (
              <Reveal key={image} delay={index * 0.07}>
                <img src={image} alt="Workspace" />
              </Reveal>
            ))}
        </div>
      </section>
      {people.length ? (
        <section className="wp-team">
          <div className="wp-shell">
            <div className="wp-section-head">
              <div>
                <SectionLabel>
                  {c("about.team.label", "The people")}
                </SectionLabel>
                <h2>
                  {c("about.team.title", "The people behind the workspace")}
                </h2>
              </div>
            </div>
            <div className="wp-team-grid">
              {people.map((person: any, index: number) => (
                <Reveal key={person.name || index} delay={index * 0.06}>
                  <article>
                    {person.image ? (
                      <img src={src(person.image)} alt={person.name} />
                    ) : (
                      <Placeholder text={person.name} />
                    )}
                    <h3>{person.name}</h3>
                    <p>{person.role}</p>
                    <span>{person.bio}</span>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <WorpaceFaq faqs={draft?.faqs} />
    </>
  );
};

export const WorpaceGallery: React.FC = () => {
  const { t, draft, navLabel } = useWorpace();
  return (
    <>
      <PageHero
        title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")}
        eyebrow="Inside the workspace"
        image={t.galleryItems[0]}
      />
      <section className="wp-page-section">
        <div className="wp-gallery">
          {t.galleryItems.map((image: string, index: number) => (
            <Reveal key={image + index} delay={(index % 5) * 0.04}>
              <button type="button" onClick={() => t.openGalleryViewer(index)}>
                <img src={image} alt="Workspace" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const WorpaceTestimonials: React.FC = () => {
  const { t, draft, navLabel, c } = useWorpace();
  return (
    <>
      <PageHero
        title={
          draft?.testimonialsPageHeading ||
          navLabel("testimonials", "Member Stories")
        }
        eyebrow={c("reviews.eyebrow", "Community voices")}
      />
      <section className="wp-page-section">
        <div className="wp-shell wp-review-grid">
          {t.testimonials.map((item: any, index: number) => (
            <Reveal key={item.key || index} delay={index * 0.05}>
              <article>
                <span>
                  {"★".repeat(Math.max(1, Math.round(item.rating || 5)))}
                </span>
                <blockquote>
                  “{item.text || item.review || item.message}”
                </blockquote>
                <p>{item.name || item.author}</p>
              </article>
            </Reveal>
          ))}
        </div>
        {t.showWriteReview ? (
          <div className="wp-center">
            <button
              type="button"
              className="wp-cta"
              onClick={t.openReviewModal}
            >
              {c("reviews.write", "Write a review")} {Icon.arrow()}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
};

export const WorpacePartner: React.FC = () => {
  const { t, draft, c } = useWorpace();
  const lines = String(t.partnerPageContent || "")
    .split("\n")
    .filter(Boolean);
  return (
    <>
      <PageHero
        title={
          t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`
        }
        eyebrow={c("partner.eyebrow", "Partnerships")}
        image={t.galleryItems[3]}
      />
      <section className="wp-page-section">
        <div className="wp-shell wp-form-grid">
          <div>
            <SectionLabel>{c("partner.label", "Grow together")}</SectionLabel>
            <h2>{c("partner.title", "Build a better workday with us")}</h2>
            {lines.length ? (
              lines.map((line: string, index: number) => (
                <p key={index}>{line}</p>
              ))
            ) : (
              <p>
                {c(
                  "partner.intro",
                  "Tell us how your company, community or local business would like to work together.",
                )}
              </p>
            )}
          </div>
          <div className="wp-form-card">
            <h2>{t.partnerFormTitle || "Start a conversation"}</h2>
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

export const WorpaceContact: React.FC = () => {
  const { t, draft, primary, navLabel, c } = useWorpace();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <>
      <PageHero
        title={draft?.contactPageHeading || navLabel("contact", "Contact Us")}
        eyebrow={c("contact.eyebrow", "Get in touch")}
      />
      <section className="wp-page-section">
        <div className="wp-shell">
          <div className="wp-contact-head">
            <h2>{c("contact.title", "Got questions? We've got answers.")}</h2>
            <p>
              {draft?.contactPageIntro ||
                "Tell us what kind of workspace you need and our team will help you plan the right visit."}
            </p>
          </div>
          <div className="wp-contact-grid">
            {showForm ? (
              <div className="wp-form-card">
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
            ) : (
              <div />
            )}
            <aside>
              {t.contactPhone ? (
                <p>
                  <small>Phone</small>
                  <a
                    href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}
                  >
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
              {hours.length ? (
                <div className="wp-hours">
                  <small>Opening hours</small>
                  {hours.map((row) => (
                    <p key={row.days}>
                      <span>{row.days}</span>
                      <b>{row.hours}</b>
                    </p>
                  ))}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>
      {draft?.mapUrl ? (
        <section className="wp-map">
          <iframe title="Map" src={draft.mapUrl} loading="lazy" />
        </section>
      ) : null}
      <WorpaceFaq faqs={draft?.faqs} />
    </>
  );
};

export const WorpaceCareers: React.FC = () => {
  const { t, draft } = useWorpace();
  const job = t.careersApplyJob;
  if (job)
    return (
      <>
        <PageHero
          title={
            t.careersDirectApply
              ? "General application"
              : getCareersJobTitle(job)
          }
          eyebrow={
            t.careersDirectApply ? "Join the team" : getCareersJobMeta(job)
          }
        />
        <section className="wp-page-section">
          <div className="wp-shell wp-career-detail">
            {!t.careersDirectApply ? (
              <div>
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection
                  title="Key responsibilities"
                  text={job.keyResponsibilities}
                  asList
                />
                <RoleSection
                  title="Requirements"
                  text={job.requirements}
                  asList
                />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
              </div>
            ) : null}
            <div className="wp-form-card">
              <h2>Apply now</h2>
              <ApplyForm />
            </div>
          </div>
        </section>
      </>
    );
  const intro = String(draft?.careersPageIntro || "")
    .split("\n")
    .filter(Boolean);
  return (
    <>
      <PageHero
        title={
          draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`
        }
        eyebrow="Careers"
        image={t.galleryItems[4]}
      />
      <section className="wp-page-section">
        <div className="wp-shell wp-jobs">
          {t.careersJobsLoading ? (
            <p>Loading open roles…</p>
          ) : !t.careersJobs.length ? (
            <div className="wp-empty">
              <h2>No openings right now</h2>
              <p>
                {intro[0] ||
                  "Send us a general application and tell us how you would like to contribute."}
              </p>
              <button
                type="button"
                className="wp-cta"
                onClick={t.openCareersGeneralApply}
              >
                {draft?.careersApplyButtonText || "General application"}{" "}
                {Icon.arrow()}
              </button>
            </div>
          ) : (
            t.careersDepartmentSections.map((dept: any) => (
              <section key={dept.department}>
                <SectionLabel>{dept.department}</SectionLabel>
                {dept.jobs.map((item: any, index: number) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => t.openCareersJob(item)}
                  >
                    <span>
                      <b>{getCareersJobTitle(item)}</b>
                      <small>{getCareersJobMeta(item)}</small>
                    </span>
                    {Icon.arrow()}
                  </button>
                ))}
              </section>
            ))
          )}
        </div>
      </section>
    </>
  );
};
