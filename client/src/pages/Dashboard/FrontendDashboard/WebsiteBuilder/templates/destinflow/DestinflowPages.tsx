import React from "react";
import { Reveal, Stagger } from "../motion";
import { highlightLines } from "../templateKit";
import {
  getCareersJobMeta,
  getCareersJobTitle,
} from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";
import {
  DfPageHero,
  DfSectionHead,
  DfTextLink,
} from "./DestinflowUI";

const imageOf = (value: any): string =>
  typeof value === "string" ? value : value?.url || "";

/* ───────────────────────── about ───────────────────────── */

export const DestinflowAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useTpl();
  const intro: string[] = t.aboutIntroBlocks;
  const narrative = t.aboutNarrativeBlocks as Array<{ title: string; body: string }>;
  const team = t.aboutPageImageCards;
  const founders = t.founders;
  const photos = (Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : [])
    .map(imageOf)
    .filter(Boolean);
  const collage = photos.length ? photos : t.galleryItems;
  const showFounders = t.isSectionEnabled("about_founders") && founders.length > 0;
  const showTeam = t.isSectionEnabled("about_team") && team.length > 0;

  return (
    <>
      <DfPageHero
        eyebrow={c("about.eyebrow", "Our story")}
        title={navLabel("about", draft?.aboutTitle || "About us")}
        text={intro[0]}
        image={collage[0]}
      />

      {intro.length > 1 || collage.length ? (
        <section className="df-section-tight">
          <div className="df-shell df-split">
            <div className="df-prose">
              {intro.slice(1).map((text, index) => (
                <Reveal key={index}>
                  <p style={index === 0 ? { fontSize: 19, color: "var(--df-heading)" } : undefined}>{text}</p>
                </Reveal>
              ))}
            </div>
            {collage.length ? (
              <Reveal className="df-photo">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {collage.slice(0, 3).map((src: string, index: number) => (
                    <div key={`${src}-${index}`} className="df-photo" style={{ aspectRatio: "4 / 3" }}>
                      <img src={src} alt="" loading="lazy" />
                    </div>
                  ))}
                </div>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {narrative.length ? (
        <section className="df-facilities df-about-values">
          <div className="df-shell">
            <DfSectionHead
              eyebrow={c("about.values.eyebrow", "What we stand for")}
              title={c("about.values.title", "The way we do things")}
            />
            <Stagger className="df-feature-grid df-equal-cards">
              {narrative.map((block, index) => (
                <article className="df-feature" key={block.title}>
                  <span className="df-feature-index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{block.title}</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{block.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {showFounders ? (
        <section className="df-section-tight df-about-founders">
          <div className="df-shell">
            <DfSectionHead eyebrow={c("about.founders.eyebrow", "Your hosts")} title={c("about.founders.title", "Meet the founders")} />
            <Stagger className="df-grid-3 df-founders-grid df-equal-cards">
              {founders.map((founder: any, index: number) => (
                <article className="df-panel" key={index}>
                  <div className="df-photo" style={{ width: 104, height: 104, borderRadius: "50%", marginBottom: 20 }}>
                    {founder.image ? <img src={imageOf(founder.image)} alt={founder.name} /> : <Placeholder text={founder.name} />}
                  </div>
                  <h3 className="df-h3">{founder.name}</h3>
                  {founder.role ? <p className="df-eyebrow">{founder.role}</p> : null}
                  {founder.bio ? <p>{founder.bio}</p> : null}
                  {highlightLines(founder.highlights).length ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0" }}>
                      {highlightLines(founder.highlights).map((line: string) => <li key={line}>{line}</li>)}
                    </ul>
                  ) : null}
                </article>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {showTeam ? (
        <section className="df-section-tight">
          <div className="df-shell">
            <DfSectionHead
              eyebrow={c("about.team.eyebrow", "The crew")}
              title={draft?.aboutPageTeamHeading || c("about.team.title", "The people who'll look after you")}
            />
            <Stagger className="df-feature-grid df-crew-grid">
              {team.map((card: any, index: number) => (
                <article key={index} style={{ textAlign: "center" }}>
                  <div className="df-photo" style={{ width: 128, height: 128, borderRadius: "50%", margin: "0 auto 14px" }}>
                    {card.image ? <img src={imageOf(card.image)} alt={card.title} /> : <Placeholder text={card.title} />}
                  </div>
                  <h3 className="df-h3" style={{ fontSize: 24 }}>{card.title}</h3>
                  {card.description ? <p>{card.description}</p> : null}
                </article>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {t.contactAddress ? (
        <section className="df-section-tight">
          <div className="df-shell df-split">
            <div>
              <p className="df-eyebrow">Getting here</p>
              <h2 className="df-h2">{c("about.map.title", "Find us")}</h2>
              <p className="df-lead">{t.contactAddress}</p>
            </div>
            <div className="df-map" style={{ marginTop: 0 }}>
              {draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" /> : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

/* ───────────────────────── gallery ───────────────────────── */

export const DestinflowGallery: React.FC = () => {
  const { t, draft, navLabel, c } = useTpl();
  const items: string[] = t.galleryItems;
  return (
    <>
      <DfPageHero
        eyebrow={c("gallery.eyebrow", "Gallery")}
        title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")}
        text={items.length ? `${items.length} ${items.length === 1 ? "photo" : "photos"}` : undefined}
      />
      <section className="df-shell" style={{ paddingBottom: 80 }}>
        {items.length ? (
          <div className="df-gallery-page">
            {items.map((src, index) => (
              <Reveal key={`${src}-${index}`} delay={Math.min((index % 6) * 0.04, 0.2)} className={index % 7 === 0 ? "is-wide" : undefined}>
                <button type="button" onClick={() => t.openGalleryViewer(index)} aria-label={`Open photo ${index + 1}`}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="df-empty"><h3>{c("gallery.empty", "Photos are on their way.")}</h3></div>
        )}
      </section>
    </>
  );
};

/* ───────────────────────── contact ───────────────────────── */

export const DestinflowContact: React.FC = () => {
  const { draft, primary, navLabel, c } = useTpl();
  const showForm = draft?.contactEnableInquiryForm !== false;
  const usePrimary = Boolean(primary?.leadEnabled);

  return (
    <>
      <DfPageHero
        eyebrow={c("contact.eyebrow", "Get in touch")}
        title={draft?.contactPageHeading || navLabel("contact", "Contact")}
        text={draft?.contactPageIntro}
      />
      <section className="df-shell" style={{ paddingBottom: 56 }}>
        {showForm ? (
          <Reveal className="df-contact-form-centered df-form-outer-spacing">
            <div className="df-panel">
              <p className="df-eyebrow">{c("contact.form.eyebrow", "Send a message")}</p>
              <h2 className="df-h3">{usePrimary ? c("contact.form.title", "Book your stay") : c("contact.form.general", "Talk to our team")}</h2>
              <div style={{ marginTop: 26 }}>
                {usePrimary && primary ? (
                  <LeadFormPanel service={primary} />
                ) : (
                  <MessageForm
                    inquiryType="General Enquiry"
                    submitLabel={c("contact.form.submit", "Send message")}
                    success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."}
                  />
                )}
              </div>
            </div>
          </Reveal>
        ) : null}
      </section>
      {draft?.mapUrl ? (
        <div className="df-shell" style={{ paddingBottom: 56 }}>
          <div className="df-map"><iframe title="Map" src={draft.mapUrl} loading="lazy" /></div>
        </div>
      ) : null}
      <div className="df-shell"><FaqSection faqs={draft?.faqs} /></div>
    </>
  );
};

/* ───────────────────────── partner ───────────────────────── */

export const DestinflowPartner: React.FC = () => {
  const { t, draft, c } = useTpl();
  const paragraphs = String(t.partnerPageContent || "")
    .split("\n")
    .filter((line) => line.trim());
  return (
    <>
      <DfPageHero
        eyebrow={c("partner.eyebrow", "Partnerships")}
        title={t.partnerPageHeading || c("partner.title", `Partner with ${draft?.companyName || "us"}`)}
        text={paragraphs[0]}
      />
      <section className="df-shell df-split" style={{ paddingBottom: 80 }}>
        <div className="df-prose">
          {(paragraphs.length ? paragraphs.slice(1) : [c("partner.intro", "Travel agents, local businesses and creative partners — tell us how we could work together.")]).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          <DfTextLink onClick={() => t.goToSection("contact")}>{c("partner.contact", "Or email us directly")}</DfTextLink>
        </div>
        <Reveal className="df-form-outer-spacing">
          <div className="df-panel">
            <h2 className="df-h3">{t.partnerFormTitle || c("partner.form.title", "Start a conversation")}</h2>
            <div style={{ marginTop: 24 }}>
              <MessageForm
                inquiryType="Partnership"
                submitLabel={c("partner.form.submit", "Send to our team")}
                success={c("partner.form.success", "We've received your note and will be in touch soon.")}
              />
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
};

/* ───────────────────────── careers ───────────────────────── */

export const DestinflowCareers: React.FC = () => {
  const { t, draft, c } = useTpl();
  const job = t.careersApplyJob;

  if (job) {
    const applyOnly = t.careersDirectApply;
    return (
      <>
        <DfPageHero
          eyebrow={applyOnly ? c("careers.general", "Open application") : job.department || c("careers.eyebrow", "Careers")}
          title={applyOnly ? c("careers.general", "General application") : getCareersJobTitle(job)}
          text={applyOnly ? undefined : getCareersJobMeta(job)}
        />
        <section className="df-shell df-service-layout" style={{ paddingBottom: 80 }}>
          <div className="df-career-back-row">
            <button type="button" className="df-textlink" onClick={t.closeCareersJob}>
              ← Back to careers
            </button>
          </div>
          {!applyOnly ? (
            <Reveal>
              <div className="df-panel df-prose">
                <RoleSection title={c("careers.role.about", "About this role")} text={job.aboutTheJob} />
                <RoleSection title={c("careers.role.tasks", "Key responsibilities")} text={job.keyResponsibilities} asList />
                <RoleSection title={c("careers.role.requirements", "Requirements")} text={job.requirements} asList />
                <RoleSection title={c("careers.role.skills", "Soft skills")} text={job.softSkills} asList />
                {draft?.email ? <p>Prefer email? Send your resume to <strong>{draft.email}</strong>.</p> : null}
              </div>
            </Reveal>
          ) : null}
          <Reveal delay={0.06} className={applyOnly ? "df-career-apply-centered df-form-outer-spacing" : "df-form-outer-spacing"}>
            <div className={`df-panel${applyOnly ? "" : " df-sticky"}`}>
              <h2 className="df-h3">{c("careers.apply.title", "Apply now")}</h2>
              <div style={{ marginTop: 22 }}><ApplyForm centered /></div>
            </div>
          </Reveal>
        </section>
      </>
    );
  }

  const intro = String(draft?.careersPageIntro || "").split("\n").filter(Boolean);
  const lines: string[] = intro.length ? intro : t.careersFallbackIntro;
  return (
    <>
      <DfPageHero
        eyebrow={c("careers.eyebrow", "Careers")}
        title={draft?.careersPageHeading || c("careers.title", `Work with ${draft?.companyName || "us"}`)}
        text={lines[0]}
      />
      <section className="df-shell" style={{ paddingBottom: 80 }}>
        {t.careersJobsLoading ? (
          <p style={{ textAlign: "center", padding: 40 }}>{c("careers.loading", "Loading open roles…")}</p>
        ) : !t.careersJobs.length ? (
          <div className="df-empty">
            <h3>{c("careers.empty.title", "No openings right now")}</h3>
            <p>{c("careers.empty.copy", "Check back soon — or send us a general application.")}</p>
            <button type="button" className="df-btn" style={{ marginTop: 20 }} onClick={t.openCareersGeneralApply}>
              {draft?.careersApplyButtonText || c("careers.apply.general", "General application")}
            </button>
          </div>
        ) : (
          <>
            <Stagger className="df-feature-grid">
              {t.careersDepartmentSections.map((dept: any) => (
                <article className="df-panel" key={dept.department}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <h3 className="df-h3">{dept.department}</h3>
                    <span className="df-chip">{dept.jobs.length} open</span>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0" }}>
                    {dept.jobs.map((item: any, index: number) => (
                      <li key={index} style={{ borderTop: "1px solid var(--df-line)" }}>
                        <button type="button" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 0", border: 0, background: "none", cursor: "pointer", textAlign: "left" }} onClick={() => t.openCareersJob(item)}>
                          <span>
                            <strong style={{ display: "block" }}>{getCareersJobTitle(item)}</strong>
                            <span style={{ fontSize: 13, color: "var(--df-muted)" }}>{getCareersJobMeta(item)}</span>
                          </span>
                          {Icon.arrow(17)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </Stagger>
            <div className="df-panel df-panel-dark" style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <div>
                <h3 className="df-h3">{draft?.careersClosingHeading || c("careers.closing.title", "Don't see your role?")}</h3>
                <p>{draft?.careersClosingText || c("careers.closing.copy", "Send us a general application and tell us how you'd like to contribute.")}</p>
              </div>
              <button type="button" className="df-btn df-btn-light" onClick={t.openCareersGeneralApply}>
                {draft?.careersApplyButtonText || c("careers.apply.general", "General application")}
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
};
