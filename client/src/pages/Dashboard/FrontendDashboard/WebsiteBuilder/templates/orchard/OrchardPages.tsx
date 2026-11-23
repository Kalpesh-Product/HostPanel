import React from "react";
import {
  getCareersJobMeta,
  getCareersJobTitle,
} from "../useWebsiteTemplateData";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import {
  OrchardContactItems,
  OrchardHeading,
  OrchardPageHero,
  OrchardPhoto,
  OrchardReviews,
  OrchardTextLink,
} from "./OrchardUI";

const img = (value: any) =>
  typeof value === "string" ? value : value?.url || "";

export const OrchardAbout: React.FC = () => {
  const { t, draft, navLabel, c, photo } = useTpl();
  const photos = ((draft?.aboutPageImages || []) as any[])
    .map(img)
    .filter(Boolean)
    .concat(t.galleryItems || []);
  const team = t.aboutPageImageCards || [];
  const founders = t.founders || [];

  return (
    <>
      <OrchardPageHero
        eyebrow={c("about.eyebrow", "Our story")}
        title={navLabel("about", draft?.aboutTitle || c("about.title", "Built around the way people actually live."))}
        text={t.aboutIntroBlocks?.[0]}
        image={photos[0]}
      />
      <section className="ol-section ol-section-soft">
        <div className="ol-shell ol-about-grid">
          <OrchardPhoto
            src={photo("about.image1", photos[1] || t.galleryItems?.[1])}
            alt="Life at the house"
            className="ol-about-photo"
          />
          <div>
            <OrchardHeading
              eyebrow={c("about.story.eyebrow", "How it began")}
              title={c("about.story.title", "We wanted a stay with a little more thought in it.")}
              small
            />
            <p className="ol-lead">
              {t.aboutIntroBlocks?.slice(1).join("\n\n") ||
                draft?.aboutPageStory ||
                c(
                  "about.story.body",
                  "Orchard started with a simple question: why do the places we stay so often feel disposable? We set out to make somewhere comfortable, calm and genuinely connected to its neighbourhood.",
                )}
            </p>
          </div>
          <OrchardPhoto
            src={photo("about.image2", photos[2] || t.galleryItems?.[2])}
            alt="A shared space"
            className="ol-about-photo ol-about-photo-offset"
          />
        </div>
      </section>

      {t.aboutNarrativeBlocks?.length ? (
        <section className="ol-section">
          <div className="ol-shell">
            <OrchardHeading
              eyebrow={c("about.values.eyebrow", "What we stand for")}
              title={c("about.values.title", "A few things we will not compromise on.")}
              small
            />
            <div className="ol-feature-grid">
              {t.aboutNarrativeBlocks.map((block: any, index: number) => (
                <article key={block.title} className="ol-feature">
                  <span className="ol-feature-icon">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{block.title}</h3>
                  <p>{block.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {founders.length || team.length ? (
        <section className="ol-section ol-section-soft">
          <div className="ol-shell">
            <OrchardHeading
              eyebrow={c("about.team.eyebrow", "The people here")}
              title={c("about.team.title", "Local hosts, real recommendations.")}
              small
            />
            <div className="ol-team-grid">
              {[...founders, ...team].slice(0, 6).map((person: any, index) => (
                <article key={`${person.name || person.title}-${index}`} className="ol-team-card">
                  <OrchardPhoto
                    src={img(person.image)}
                    alt={person.name || person.title || "Team member"}
                    className="ol-team-photo"
                  />
                  <h3>{person.name || person.title}</h3>
                  <p>{person.role || person.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

export const OrchardGallery: React.FC = () => {
  const { t, draft, navLabel, c } = useTpl();
  const photos: string[] = t.galleryItems || [];
  return (
    <>
      <OrchardPageHero
        eyebrow={c("gallery.eyebrow", "The camera roll")}
        title={
          draft?.galleryPageHeading ||
          navLabel("gallery", c("gallery.title", "A closer look"))
        }
        text={c(
          "gallery.sub",
          "Rooms, shared spaces and the little details that make the house feel like home.",
        )}
        image={photos[0]}
      />
      <section className="ol-shell ol-gallery-page ol-gallery-grid">
        {photos.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => t.openGalleryViewer(index)}
            className={
              index % 5 === 0 ? "is-wide" : index % 3 === 1 ? "is-tall" : ""
            }
          >
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </section>
    </>
  );
};

export const OrchardTestimonials: React.FC = () => {
  const { t, c } = useTpl();
  const count = (t.testimonials || []).length;
  return (
    <>
      <OrchardPageHero
        eyebrow={c("testimonials.eyebrow", "Guest book")}
        title={c("testimonials.title", "Stories from the house")}
        text={c(
          "testimonials.sub",
          "Notes from the people who slept here, cooked here and explored the neighbourhood from here.",
        )}
        image={t.galleryItems?.[3]}
      />
      <section className="ol-section">
        <div className="ol-shell">
          <div className="ol-review-intro">
            <h2>
              {count
                ? `${count} ${count === 1 ? "story" : "stories"}`
                : c("testimonials.empty", "Be the first to leave a note")}
            </h2>
            <button
              type="button"
              className="ol-btn"
              onClick={() => t.setReviewModalOpen(true)}
            >
              {c("testimonials.write", "Write a review")}
            </button>
          </div>
          <OrchardReviews />
        </div>
      </section>
    </>
  );
};

const InquiryPage: React.FC<{ type: "partner" | "contact" }> = ({ type }) => {
  const { t, draft, navLabel, c } = useTpl();
  const partner = type === "partner";
  return (
    <>
      <OrchardPageHero
        eyebrow={c(
          partner ? "partner.eyebrow" : "contact.eyebrow",
          partner ? "Work with us" : "Get in touch",
        )}
        title={
          partner
            ? draft?.partnerHeading ||
              navLabel("partner", c("partner.title", "Let's make something together"))
            : navLabel("contact", c("contact.title", "Come say hello"))
        }
        text={
          partner
            ? draft?.partnerContent ||
              c(
                "partner.sub",
                "Local businesses, creative people and good ideas are always welcome here.",
              )
            : c(
                "contact.sub",
                "Questions about a room, a visit or the neighbourhood? We are happy to help.",
              )
        }
        image={t.galleryItems?.[partner ? 5 : 4]}
      />
      <section className="ol-section">
        <div className="ol-shell ol-tour-grid">
          <div>
            <OrchardHeading
              eyebrow={c(partner ? "partner.form.eyebrow" : "contact.form.eyebrow", partner ? "Collaborate" : "Send a note")}
              title={c(
                partner ? "partner.form.title" : "contact.form.title",
                partner
                  ? "Good ideas travel better together."
                  : "No scripts. Just a real person replying.",
              )}
              small
            />
            {!partner ? <OrchardContactItems /> : null}
          </div>
          <div className="ol-tour-panel">
            <MessageForm
              inquiryType={partner ? "Partnership" : "Contact"}
              submitLabel={c(
                partner ? "partner.submit" : "contact.submit",
                partner ? "Send partnership idea" : "Send message",
              )}
              success={
                partner
                  ? "Thanks — our team will be in touch."
                  : "Thanks — we will get back to you shortly."
              }
            />
          </div>
        </div>
      </section>
      {!partner && draft?.mapUrl ? (
        <section className="ol-shell ol-contact-map">
          <iframe title="Map" src={draft.mapUrl} loading="lazy" />
        </section>
      ) : null}
    </>
  );
};
export const OrchardPartner = () => <InquiryPage type="partner" />;
export const OrchardContact = () => <InquiryPage type="contact" />;

export const OrchardCareers: React.FC = () => {
  const { t, draft, c } = useTpl();
  const job = t.careersApplyJob;
  if (job)
    return (
      <>
        <OrchardPageHero
          eyebrow={job.department || c("careers.eyebrow", "Join the team")}
          title={getCareersJobTitle(job)}
          text={getCareersJobMeta(job)}
          image={t.galleryItems?.[2]}
        />
        <section className="ol-shell ol-job ol-job-apply">
          <div className="ol-job-details">
            <RoleSection title="About this role" text={job.aboutTheJob} />
            <RoleSection
              title="Key responsibilities"
              text={job.keyResponsibilities}
              asList
            />
            <RoleSection title="Requirements" text={job.requirements} asList />
          </div>
          <aside className="ol-tour-panel ol-apply-panel">
            <div className="ol-apply-panel-inner">
              <OrchardTextLink onClick={t.closeCareersJob}>
                {c("careers.back", "All roles")}
              </OrchardTextLink>
              <h2 className="mt-6">
                {c("careers.apply.title", "Apply to join us")}
              </h2>
              <ApplyForm />
            </div>
          </aside>
        </section>
      </>
    );
  return (
    <>
      <OrchardPageHero
        eyebrow={c("careers.eyebrow", "Work where people meet")}
        title={
          draft?.careersPageHeading ||
          c("careers.title", `Join ${draft?.companyName || "our team"}`)
        }
        text={draft?.careersPageIntro || t.careersFallbackIntro?.[0]}
        image={t.galleryItems?.[2]}
      />
      <section className="ol-section">
        <div className="ol-shell">
          <OrchardHeading
            eyebrow={c("careers.roles.eyebrow", "Open roles")}
            title={c("careers.roles.title", "Bring your energy. We will teach the rest.")}
            sub={c(
              "careers.roles.sub",
              "From housekeeping to guest experience, good people make this place work.",
            )}
          />
          {t.careersJobsLoading ? (
            <p className="ol-lead">{c("careers.loading", "Loading roles…")}</p>
          ) : t.careersJobs.length ? (
            <div className="ol-role-list">
              {t.careersJobs.map((role: any, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => t.openCareersJob(role)}
                >
                  <span className="ol-eyebrow">{getCareersJobMeta(role)}</span>
                  <strong>{getCareersJobTitle(role)}</strong>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="ol-no-roles">
              <p>
                {c(
                  "careers.noRoles",
                  "No listed roles today, but good people are always welcome.",
                )}
              </p>
              <OrchardTextLink onClick={t.openCareersGeneralApply}>
                {c("careers.generalApply", "Send a general application")}
              </OrchardTextLink>
            </div>
          )}
        </div>
      </section>
    </>
  );
};
