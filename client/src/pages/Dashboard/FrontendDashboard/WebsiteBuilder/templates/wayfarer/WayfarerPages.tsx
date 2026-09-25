import React from "react";
import { Reveal, Stagger, motion } from "../motion";
import { formatTime12h } from "../leadForms";
import { groupOpeningHours } from "../templateKit";
import { getCareersJobMeta, getCareersJobTitle } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, SectionHead, StarRow } from "../shared/TplUI";
import { WfReview } from "./WayfarerHome";
import { WfBanner } from "./WayfarerUI";

const img = (value: any): string => (typeof value === "string" ? value : value?.url || "");

/* ───────────────────────── about ───────────────────────── */

export const WayfarerAbout: React.FC = () => {
  const { t, draft, navLabel } = useTpl();
  const intro: string[] = t.aboutIntroBlocks;
  const narrative: { title: string; body: string }[] = t.aboutNarrativeBlocks;
  const team: any[] = t.aboutPageImageCards;
  const founders: any[] = t.founders;
  const photos: string[] = ((Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : []) as any[]).map(img).filter(Boolean);
  const collage = photos.length ? photos : t.galleryItems;
  const showFounders = t.isSectionEnabled("about_founders") && founders.length > 0;
  const showTeam = t.isSectionEnabled("about_team") && team.length > 0;

  return (
    <>
      <WfBanner eyebrow="Our story" title={navLabel("about", draft?.aboutTitle || "About us")} sub={intro[0]} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "About" }]} />

      {intro.length > 1 || collage.length ? (
        <section className="tp-wrap grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-16">
          <div className="space-y-5">
            {intro.slice(1).map((text, index) => <Reveal key={index}><p className={index === 0 ? "tp-lead" : "tp-muted text-[16px] leading-relaxed"}>{text}</p></Reveal>)}
          </div>
          {collage.length ? (
            <Reveal className="grid grid-cols-2 gap-3">
              {collage.slice(0, 3).map((src: string, index: number) => (
                <div key={src} className={`tp-zoom overflow-hidden ${index === 0 ? "row-span-2 aspect-[3/4]" : "aspect-[4/3]"}`} style={{ borderRadius: 16 }}><img src={src} alt="" loading="lazy" /></div>
              ))}
            </Reveal>
          ) : null}
        </section>
      ) : null}

      {narrative.length ? (
        <section className="tp-section tp-soft" style={{ borderRadius: 0 }}>
          <div className="tp-wrap">
            <SectionHead eyebrow="What we stand for" title="The way we do things" />
            <Stagger className="grid gap-4 md:grid-cols-2">
              {narrative.map((block, index) => (
                <div key={block.title} className="tp-card flex gap-4 p-6">
                  <span className="wf-fact-icon tp-display shrink-0 text-[15px]">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3 className="tp-h3 mb-2">{block.title}</h3><p className="tp-muted whitespace-pre-line text-[15px] leading-relaxed">{block.body}</p></div>
                </div>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {showFounders ? (
        <section className="tp-section">
          <div className="tp-wrap">
            <SectionHead eyebrow="Your hosts" title="Meet the founders" />
            <Stagger className="grid gap-4 md:grid-cols-2">
              {founders.map((founder, index) => (
                <div key={index} className="tp-card flex items-start gap-5 p-6">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full">{founder.image ? <img src={img(founder.image)} alt={founder.name} className="h-full w-full object-cover" /> : <Placeholder text={founder.name} />}</div>
                  <div>
                    <h3 className="tp-h3">{founder.name}</h3>
                    {founder.role ? <p className="mt-1 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{founder.role}</p> : null}
                    {founder.bio ? <p className="tp-muted mt-3 text-[14px] leading-relaxed">{founder.bio}</p> : null}
                    {founder.highlights ? <p className="mt-2 text-[13px] font-semibold">{founder.highlights}</p> : null}
                  </div>
                </div>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {showTeam ? (
        <section className="tp-section" style={{ paddingTop: 0 }}>
          <div className="tp-wrap">
            <SectionHead eyebrow="The crew" title={draft?.aboutPageTeamHeading || "The people who'll look after you"} />
            <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {team.map((card, index) => (
                <div key={index} className="text-center">
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-full md:h-32 md:w-32">{card.image ? <img src={img(card.image)} alt={card.title} className="h-full w-full object-cover" loading="lazy" /> : <Placeholder text={card.title} />}</div>
                  <h3 className="mt-3 text-[16px]">{card.title}</h3>
                  {card.description ? <p className="tp-muted mt-0.5 text-[13px]">{card.description}</p> : null}
                </div>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {t.contactAddress ? (
        <section className="tp-wrap pb-16">
          <Reveal>
            <div className="tp-card grid overflow-hidden md:grid-cols-[0.8fr_1.2fr]">
              <div className="p-7 md:p-10">
                <p className="tp-eyebrow mb-3">Getting here</p>
                <p className="flex items-start gap-3 text-[16px] font-semibold"><span className="mt-0.5" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.pin(18)}</span>{t.contactAddress}</p>
              </div>
              <div className="min-h-[220px]" style={{ background: "var(--t-surface)" }}>{draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-full min-h-[220px] w-full border-0" /> : null}</div>
            </div>
          </Reveal>
        </section>
      ) : null}
    </>
  );
};

/* ───────────────────────── gallery (mosaic) ───────────────────────── */

export const WayfarerGallery: React.FC = () => {
  const { t, draft, navLabel } = useTpl();
  const items: string[] = t.galleryItems;
  const span = (index: number) => (index % 7 === 0 ? "col-span-2 row-span-2" : index % 5 === 3 ? "row-span-2" : "");
  return (
    <>
      <WfBanner eyebrow="Gallery" title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")} sub={items.length ? `${items.length} photos` : undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Gallery" }]} />
      <section className="tp-wrap py-10 md:py-14">
        {!items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Photos are on their way.</p>
        ) : (
          <div className="grid auto-rows-[150px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4">
            {items.map((src, index) => (
              <Reveal key={`${src}-${index}`} delay={Math.min((index % 6) * 0.04, 0.2)} className={span(index)}>
                <button type="button" onClick={() => t.openGalleryViewer(index)} aria-label={`Open photo ${index + 1}`} className="tp-zoom group relative block h-full w-full overflow-hidden" style={{ borderRadius: 14 }}>
                  <img src={src} alt="" loading="lazy" />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "rgba(0,0,0,.3)", color: "#fff" }}>{Icon.plus(26)}</span>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

/* ───────────────────────── reviews ───────────────────────── */

export const WayfarerTestimonials: React.FC = () => {
  const { t, draft, rating, navLabel } = useTpl();
  const list: any[] = t.testimonials;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: list.filter((item) => Math.round(item.rating) === star).length }));
  return (
    <>
      <WfBanner eyebrow="Reviews" title={draft?.testimonialsPageHeading || navLabel("testimonials", "Guest reviews")} sub={draft?.testimonialsPageIntro || undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Reviews" }]}>
        {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary" onClick={t.openReviewModal}>Write a review</button> : null}
      </WfBanner>
      <section className="tp-wrap py-10 md:py-14">
        {!list.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Be the first to leave a review.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {rating.count > 0 ? (
              <Reveal className="lg:sticky lg:top-24 lg:self-start">
                <div className="tp-card p-6">
                  <p className="tp-display text-[56px] leading-none">{rating.avg.toFixed(1)}</p>
                  <div className="mt-3"><StarRow value={rating.avg} size={18} /></div>
                  <p className="tp-muted mt-2 text-[14px]">{rating.count} rating{rating.count > 1 ? "s" : ""}</p>
                  <ul className="mt-5 space-y-2.5">
                    {counts.map(({ star, count }) => (
                      <li key={star} className="flex items-center gap-3 text-[13px]">
                        <span className="w-3 font-semibold">{star}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--t-text) 8%, transparent)" }}>
                          <motion.span className="block h-full rounded-full" style={{ background: "var(--t-accent)" }} initial={{ width: 0 }} whileInView={{ width: `${(count / rating.count) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                        </span>
                        <span className="tp-muted w-5 text-right">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : <div />}
            <div className="flex flex-col gap-4">
              {list.map((item, index) => <Reveal key={item.key || index} delay={Math.min(index * 0.04, 0.2)}><WfReview item={item} wide /></Reveal>)}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

/* ───────────────────────── partner ───────────────────────── */

export const WayfarerPartner: React.FC = () => {
  const { t, draft } = useTpl();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter((line: string) => line.trim());
  return (
    <>
      <WfBanner eyebrow="Partnerships" title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Partner" }]} />
      <section className="tp-wrap grid gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-16">
        <Reveal>
          <div className="space-y-5">
            {paragraphs.length ? paragraphs.map((line: string, index: number) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16px] leading-relaxed"}>{line}</p>) : <p className="tp-lead">Travel agents, tour operators and local businesses — tell us how we could work together.</p>}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="tp-card p-6 md:p-8">
            <h2 className="tp-h3 mb-5">{t.partnerFormTitle || "Get in touch"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </Reveal>
      </section>
    </>
  );
};

/* ───────────────────────── contact ───────────────────────── */

export const WayfarerContact: React.FC = () => {
  const { t, draft, primary, navLabel } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const policy = draft?.stayPolicy || {};
  const showForm = draft?.contactEnableInquiryForm !== false;
  const usePrimary = Boolean(primary?.leadEnabled);
  const person = [draft?.contactPersonName, draft?.contactPersonRole].filter(Boolean).join(" · ");

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-4">
      <span className="wf-fact-icon">{icon}</span>
      <div className="min-w-0"><p className="tp-muted text-[11px] font-bold uppercase tracking-wider">{label}</p><div className="mt-0.5 break-words text-[15px] font-semibold">{value}</div></div>
    </div>
  );

  return (
    <>
      <WfBanner eyebrow="Get in touch" title={draft?.contactPageHeading || navLabel("contact", "Contact")} sub={draft?.contactPageIntro || undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Contact" }]} />
      <section className="tp-wrap grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 md:py-14">
        {showForm ? (
          <Reveal>
            <div className="tp-card p-6 md:p-9">
              <h2 className="tp-h3 mb-1">{usePrimary && primary ? primary.profile.labels.leadTitle : "Send us a message"}</h2>
              <p className="tp-muted mb-6 text-[14px]">{usePrimary && primary?.kind === "menu" ? "Pick a date and time and we'll hold a table." : "We usually reply within a day."}</p>
              {usePrimary && primary ? <LeadFormPanel service={primary} /> : <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />}
            </div>
          </Reveal>
        ) : <div />}
        <Reveal delay={0.08}>
          <div className="flex flex-col gap-4">
            <div className="tp-card space-y-5 p-6">
              {t.contactAddress ? row(Icon.pin(20), "Address", t.contactAddress) : null}
              {t.contactPhone ? row(Icon.phone(20), "Phone", <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a>) : null}
              {t.contactEmail ? row(Icon.mail(20), "Email", <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>) : null}
              {person ? row(Icon.users(20), "Your contact", <>{person}{draft?.contactPersonEmail ? <span className="tp-muted block text-[13px] font-medium">{draft.contactPersonEmail}</span> : null}{draft?.contactPersonPhone ? <span className="tp-muted block text-[13px] font-medium">{draft.contactPersonPhone}</span> : null}</>) : null}
              {hours.length ? row(Icon.clock(20), "Hours", <ul className="space-y-1 text-[14px] font-medium">{hours.map((r) => <li key={r.days} className="flex justify-between gap-6"><span className="tp-muted">{r.days}</span><span>{r.hours}</span></li>)}</ul>) : draft?.contactBusinessHours ? row(Icon.clock(20), "Hours", draft.contactBusinessHours) : null}
            </div>
            {policy.checkInTime || policy.checkOutTime ? (
              <div className="tp-soft grid grid-cols-2 gap-4 p-5">
                {policy.checkInTime ? <div><p className="tp-muted text-[11px] font-bold uppercase tracking-wider">Check-in</p><p className="text-[16px] font-bold">{formatTime12h(policy.checkInTime)}</p></div> : null}
                {policy.checkOutTime ? <div><p className="tp-muted text-[11px] font-bold uppercase tracking-wider">Check-out</p><p className="text-[16px] font-bold">{formatTime12h(policy.checkOutTime)}</p></div> : null}
              </div>
            ) : null}
          </div>
        </Reveal>
      </section>
      {draft?.mapUrl ? (
        <section className="tp-wrap pb-10"><Reveal><iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-[320px] w-full border-0 md:h-[420px]" style={{ borderRadius: 16 }} /></Reveal></section>
      ) : null}
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

/* ───────────────────────── careers ───────────────────────── */

export const WayfarerCareers: React.FC = () => {
  const { t, draft } = useTpl();
  const job = t.careersApplyJob;

  if (job) {
    const applyOnly = t.careersDirectApply;
    return (
      <>
        <WfBanner eyebrow={applyOnly ? "Open application" : job.department || "Careers"} title={applyOnly ? "General application" : getCareersJobTitle(job)} sub={applyOnly ? undefined : getCareersJobMeta(job)} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Careers", onClick: t.closeCareersJob }, { label: applyOnly ? "Apply" : getCareersJobTitle(job) }]} />
        <section className="tp-wrap grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_440px] lg:gap-12">
          {!applyOnly ? (
            <Reveal>
              <div className="tp-card space-y-8 p-6 md:p-9">
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection title="Key responsibilities" text={job.keyResponsibilities} asList />
                <RoleSection title="Requirements" text={job.requirements} asList />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
                {draft?.email ? <p className="tp-muted border-t pt-5 text-[14px]" style={{ borderColor: "var(--t-line)" }}>Prefer email? Send your resume to <strong style={{ color: "var(--t-text)" }}>{draft.email}</strong>.</p> : null}
              </div>
            </Reveal>
          ) : null}
          <Reveal delay={0.06} className={applyOnly ? "lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-3xl" : "lg:sticky lg:top-24 lg:self-start"}>
            <div className="tp-card p-6 md:p-8"><h2 className="tp-h3 mb-5">Apply now</h2><ApplyForm /></div>
          </Reveal>
        </section>
      </>
    );
  }

  const intro = String(draft?.careersPageIntro || "").split("\n").filter(Boolean);
  const lines: string[] = intro.length ? intro : t.careersFallbackIntro;
  return (
    <>
      <WfBanner eyebrow="Careers" title={draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`} sub={lines[0]} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Careers" }]} />
      <section className="tp-wrap py-10 md:py-14">
        {lines.length > 1 ? <div className="mb-10 grid gap-4 md:grid-cols-2">{lines.slice(1).map((line, i) => <Reveal key={i}><p className="tp-muted text-[15px] leading-relaxed">{line}</p></Reveal>)}</div> : null}
        {t.careersJobsLoading ? (
          <p className="tp-muted py-10 text-center">Loading open roles…</p>
        ) : !t.careersJobs.length ? (
          <div className="tp-soft p-10 text-center">
            <p className="tp-h3">No openings right now</p>
            <p className="tp-muted mt-2 text-[15px]">Check back soon — or send us a general application.</p>
            <button type="button" className="tp-btn tp-btn-primary mt-5" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"}</button>
          </div>
        ) : (
          <>
            <Stagger className="grid gap-4 md:grid-cols-2">
              {t.careersDepartmentSections.map((dept: any) => (
                <div key={dept.department} className="tp-card p-6">
                  <div className="mb-4 flex items-center justify-between gap-3"><h2 className="tp-h3">{dept.department}</h2><span className="tp-chip">{dept.jobs.length} open</span></div>
                  <ul className="divide-y" style={{ borderColor: "var(--t-line)" }}>
                    {dept.jobs.map((item: any, index: number) => (
                      <li key={index} style={{ borderColor: "var(--t-line)" }}>
                        <button type="button" className="group flex w-full items-center justify-between gap-3 py-3.5 text-left" onClick={() => t.openCareersJob(item)}>
                          <span><span className="block text-[15px] font-semibold">{getCareersJobTitle(item)}</span><span className="tp-muted mt-0.5 block text-[12px]">{getCareersJobMeta(item)}</span></span>
                          <span className="transition group-hover:translate-x-1" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.arrow(18)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Stagger>
            <div className="tp-accent-panel mt-6 flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
              <div><h2 className="tp-h3" style={{ color: "inherit" }}>{draft?.careersClosingHeading || "Don't see your role?"}</h2><p className="mt-1 max-w-xl text-[15px] opacity-90">{draft?.careersClosingText || "Send us a general application and tell us how you'd like to contribute."}</p></div>
              <button type="button" className="tp-btn tp-btn-light" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"}</button>
            </div>
          </>
        )}
      </section>
    </>
  );
};
