import React from "react";
import { Reveal, Stagger, motion } from "../motion";
import { formatTime12h } from "../leadForms";
import { groupOpeningHours, highlightLines } from "../templateKit";
import { getCareersJobMeta, getCareersJobTitle } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { CardRow, HdHead, PageHeader } from "./HuddleUI";
import { HdReview } from "./HuddleHome";

const img = (value: any): string => (typeof value === "string" ? value : value?.url || "");

/* ───────────────────────── about ───────────────────────── */

export const HuddleAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useTpl();
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
      <PageHeader title={navLabel("about", draft?.aboutTitle || "About us")} sub={intro[0]} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "About" }]} />

      {intro.length > 1 || collage.length ? (
        <section className="tp-wrap grid items-center gap-12 py-14 md:grid-cols-2 md:gap-16 md:py-20">
          <div className="space-y-5">
            {intro.slice(1).map((text, index) => <Reveal key={index}><p className={index === 0 ? "tp-lead" : "tp-muted text-[16.5px] leading-relaxed"}>{text}</p></Reveal>)}
          </div>
          {collage.length ? (
            <Reveal className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="hd-tile row-span-2 aspect-[3/4]" style={{ background: "var(--t-surface)" }}><img src={collage[0]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div>
              {collage[1] ? <div className="hd-tile aspect-[4/3]"><img src={collage[1]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div> : null}
              {collage[2] ? <div className="hd-tile aspect-[4/3]"><img src={collage[2]} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div> : null}
            </Reveal>
          ) : null}
        </section>
      ) : null}

      {narrative.length ? (
        <section className="tp-wrap pb-14 md:pb-20">
          <HdHead title={c("about.values.title", "How we do things")} />
          <CardRow cols={3}>
            {narrative.map((block, index) => (
              <Reveal key={block.title} delay={index * 0.08} className="h-full">
                <div className="tp-card h-full p-7">
                  <span className="tp-display flex h-12 w-12 items-center justify-center rounded-[12px] text-[20px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #fff)" }}>{index + 1}</span>
                  <h3 className="tp-h3 mb-3 mt-5">{block.title}</h3>
                  <p className="tp-muted whitespace-pre-line text-[15.5px] leading-relaxed">{block.body}</p>
                </div>
              </Reveal>
            ))}
          </CardRow>
        </section>
      ) : null}

      {showFounders ? (
        <section className="tp-wrap pb-14 md:pb-20">
          <HdHead title={c("about.founders.title", founders.length > 1 ? "Meet the founders" : "Meet the founder")} />
          <CardRow cols={founders.length > 1 ? 2 : 1} gap={24}>
            {founders.map((founder, index) => (
              <Reveal key={index} delay={index * 0.08} className="h-full">
                <div className="tp-card grid h-full overflow-hidden sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div className="tp-fill aspect-[4/5] sm:aspect-auto sm:min-h-[380px]">{founder.image ? <img src={img(founder.image)} alt={founder.name} /> : <Placeholder text={founder.name} />}</div>
                  <div className="flex flex-col justify-center p-7 md:p-10">
                    <h3 className="tp-h2" style={{ fontSize: "clamp(26px, 2.8vw, 38px)" }}>{founder.name}</h3>
                    {founder.role ? <p className="mt-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--t-muted)" }}>{founder.role}</p> : null}
                    {founder.bio ? <p className="tp-muted mt-5 text-[16px] leading-relaxed">{founder.bio}</p> : null}
                    {highlightLines(founder.highlights).length ? <p className="mt-4 inline-flex flex-col self-start rounded-[8px] px-3 py-1.5 text-[13.5px] font-semibold" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #fff)" }}>{highlightLines(founder.highlights).map((line) => <span key={line} className="block">{line}</span>)}</p> : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </CardRow>
        </section>
      ) : null}

      {showTeam ? (
        <section className="tp-wrap pb-14 md:pb-20">
          <HdHead title={draft?.aboutPageTeamHeading || "The team on call"} />
          <CardRow cols={5} gap={24}>
            {team.map((card, index) => (
              <Reveal key={index} delay={Math.min(index * 0.06, 0.3)}>
                <div className="text-center">
                  <div className="tp-fill aspect-square rounded-[16px]">{card.image ? <img src={img(card.image)} alt={card.title} loading="lazy" /> : <Placeholder text={card.title} />}</div>
                  <h3 className="mt-4 text-[18px]">{card.title}</h3>
                  {card.description ? <p className="tp-muted mt-1 text-[14px]">{card.description}</p> : null}
                </div>
              </Reveal>
            ))}
          </CardRow>
        </section>
      ) : null}

      {t.contactAddress ? (
        <section className="tp-wrap pb-6">
          <Reveal>
            <div className="tp-card grid overflow-hidden md:grid-cols-[0.8fr_1.2fr]">
              <div className="p-7 md:p-10">
                <h2 className="tp-h3 mb-4">Getting here</h2>
                <p className="flex items-start gap-3 text-[17px] font-semibold"><span className="mt-1">{Icon.pin(18)}</span>{t.contactAddress}</p>
              </div>
              <div className="min-h-[240px]" style={{ background: "var(--t-surface)" }}>{draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-full min-h-[240px] w-full border-0" /> : null}</div>
            </div>
          </Reveal>
        </section>
      ) : null}
    </>
  );
};

/* ───────────────────────── gallery ───────────────────────── */

export const HuddleGallery: React.FC = () => {
  const { t, draft, navLabel } = useTpl();
  const items: string[] = t.galleryItems;
  return (
    <>
      <PageHeader title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")} sub={items.length ? `${items.length} photo${items.length > 1 ? "s" : ""}` : undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Gallery" }]} />
      <section className="tp-wrap py-10 md:py-14">
        {!items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Photos are on their way.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {items.map((src, index) => (
              <Reveal key={`${src}-${index}`} delay={Math.min((index % 6) * 0.04, 0.2)} className={index % 5 === 0 ? "md:col-span-2" : ""}>
                <button type="button" onClick={() => t.openGalleryViewer(index)} aria-label={`Open photo ${index + 1}`} className={`hd-tile group block w-full ${index % 5 === 0 ? "aspect-[2/1]" : "aspect-[4/3]"}`} style={{ background: "var(--t-surface)" }}>
                  <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "color-mix(in srgb, var(--t-ink) 45%, transparent)", color: "#fff" }}>{Icon.plus(28)}</span>
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

export const HuddleTestimonials: React.FC = () => {
  const { t, draft, rating, navLabel, c } = useTpl();
  const list: any[] = t.testimonials;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: list.filter((item) => Math.round(item.rating) === star).length }));
  return (
    <>
      <PageHeader title={draft?.testimonialsPageHeading || navLabel("testimonials", "What teams say")} sub={draft?.testimonialsPageIntro || undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Reviews" }]}>
        {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary" onClick={t.openReviewModal}>{c("reviews.write", "Write a review")}</button> : null}
      </PageHeader>
      <section className="tp-wrap py-10 md:py-14">
        {!list.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Be the first to leave a review.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {rating.count > 0 ? (
              <Reveal className="lg:sticky lg:top-24 lg:self-start">
                <div className="tp-dark-panel p-7">
                  <p className="tp-display text-[64px] leading-none">{rating.avg.toFixed(1)}</p>
                  <div className="mt-4" style={{ color: "var(--t-accent)" }}><StarRow value={rating.avg} size={18} /></div>
                  <p className="mt-2 text-[14px] opacity-70">{rating.count} rating{rating.count > 1 ? "s" : ""}</p>
                  <ul className="mt-6 space-y-2.5">
                    {counts.map(({ star, count }) => (
                      <li key={star} className="flex items-center gap-3 text-[13px]">
                        <span className="w-3 font-semibold">{star}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--t-on-ink) 16%, transparent)" }}>
                          <motion.span className="block h-full rounded-full" style={{ background: "var(--t-accent)" }} initial={{ width: 0 }} whileInView={{ width: `${(count / rating.count) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
                        </span>
                        <span className="w-5 text-right opacity-70">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : <div />}
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((item, index) => <Reveal key={item.key || index} delay={Math.min(index * 0.04, 0.2)} className="h-full"><HdReview item={item} /></Reveal>)}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

/* ───────────────────────── partner ───────────────────────── */

export const HuddlePartner: React.FC = () => {
  const { t, draft, c } = useTpl();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter((line: string) => line.trim());
  return (
    <>
      <PageHeader title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Partner" }]} />
      <section className="tp-wrap grid gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-16">
        <Reveal>
          <div className="space-y-5">
            {paragraphs.length ? paragraphs.map((line: string, index: number) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16.5px] leading-relaxed"}>{line}</p>) : <p className="tp-lead">{c("partner.intro", "Companies, communities and local businesses — tell us how we could work together.")}</p>}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="tp-card p-6 md:p-8">
            <h2 className="tp-h3 mb-6">{t.partnerFormTitle || "Get in touch"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </Reveal>
      </section>
    </>
  );
};

/* ───────────────────────── contact ───────────────────────── */

export const HuddleContact: React.FC = () => {
  const { t, draft, primary, navLabel, c } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const policy = draft?.stayPolicy || {};
  const showForm = draft?.contactEnableInquiryForm !== false;
  const usePrimary = Boolean(primary?.leadEnabled);
  const person = [draft?.contactPersonName, draft?.contactPersonRole].filter(Boolean).join(" · ");

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #fff)" }}>{icon}</span>
      <div className="min-w-0"><p className="tp-muted text-[12px] font-bold uppercase tracking-wider">{label}</p><div className="mt-0.5 break-words text-[15.5px] font-semibold">{value}</div></div>
    </div>
  );

  return (
    <>
      <PageHeader title={draft?.contactPageHeading || navLabel("contact", "Contact")} sub={draft?.contactPageIntro || undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Contact" }]} />
      <section className="tp-wrap grid gap-8 py-10 md:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch lg:gap-12">
        {showForm ? (
          <Reveal className="h-full">
            <div className="tp-card h-full p-6 md:p-9">
              <h2 className="tp-h3 mb-1">{usePrimary && primary ? primary.profile.labels.leadTitle : "Send us a message"}</h2>
              <p className="tp-muted mb-7 text-[15px]">{c("contact.formSub", "We usually reply within a day.")}</p>
              {usePrimary && primary ? <LeadFormPanel service={primary} /> : <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />}
            </div>
          </Reveal>
        ) : <div />}
        <Reveal delay={0.08} className="h-full">
          <div className="flex h-full flex-col gap-5">
            <div className="tp-soft space-y-6 p-6 md:p-7">
              {t.contactAddress ? row(Icon.pin(19), "Address", t.contactAddress) : null}
              {t.contactPhone ? row(Icon.phone(19), "Phone", <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a>) : null}
              {t.contactEmail ? row(Icon.mail(19), "Email", <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>) : null}
              {person ? row(Icon.users(19), "Your contact", <>{person}{draft?.contactPersonEmail ? <span className="tp-muted block text-[13.5px] font-medium">{draft.contactPersonEmail}</span> : null}{draft?.contactPersonPhone ? <span className="tp-muted block text-[13.5px] font-medium">{draft.contactPersonPhone}</span> : null}</>) : null}
              {hours.length ? row(Icon.clock(19), "Hours", <ul className="space-y-1 text-[14.5px] font-medium">{hours.map((r) => <li key={r.days} className="flex justify-between gap-6"><span className="tp-muted">{r.days}</span><span>{r.hours}</span></li>)}</ul>) : draft?.contactBusinessHours ? row(Icon.clock(19), "Hours", draft.contactBusinessHours) : null}
            </div>
            {policy.checkInTime || policy.checkOutTime ? (
              <div className="tp-card grid grid-cols-2 gap-4 p-6">
                {policy.checkInTime ? <div><p className="tp-muted text-[12px] font-bold uppercase tracking-wider">Check-in</p><p className="tp-display text-[22px]">{formatTime12h(policy.checkInTime)}</p></div> : null}
                {policy.checkOutTime ? <div><p className="tp-muted text-[12px] font-bold uppercase tracking-wider">Check-out</p><p className="tp-display text-[22px]">{formatTime12h(policy.checkOutTime)}</p></div> : null}
              </div>
            ) : null}
            {draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="min-h-[280px] w-full flex-1 border-0" style={{ borderRadius: 16 }} /> : null}
          </div>
        </Reveal>
      </section>
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

/* ───────────────────────── careers ───────────────────────── */

export const HuddleCareers: React.FC = () => {
  const { t, draft } = useTpl();
  const job = t.careersApplyJob;

  if (job) {
    const applyOnly = t.careersDirectApply;
    return (
      <>
        <PageHeader title={applyOnly ? "General application" : getCareersJobTitle(job)} sub={applyOnly ? undefined : getCareersJobMeta(job)} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Careers", onClick: t.closeCareersJob }, { label: applyOnly ? "Apply" : getCareersJobTitle(job) }]} />
        <section className="tp-wrap grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_440px] lg:gap-14">
          {!applyOnly ? (
            <Reveal>
              <div className="space-y-9">
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection title="Key responsibilities" text={job.keyResponsibilities} asList />
                <RoleSection title="Requirements" text={job.requirements} asList />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
                {draft?.email ? <p className="tp-muted border-t pt-6 text-[14.5px]" style={{ borderColor: "var(--t-line)" }}>Prefer email? Send your resume to <strong style={{ color: "var(--t-text)" }}>{draft.email}</strong>.</p> : null}
              </div>
            </Reveal>
          ) : null}
          <Reveal delay={0.06} className={applyOnly ? "lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-3xl" : "lg:sticky lg:top-24 lg:self-start"}>
            <div className="tp-card p-6 md:p-8"><h2 className="tp-h3 mb-6">Apply now</h2><ApplyForm /></div>
          </Reveal>
        </section>
      </>
    );
  }

  const intro = String(draft?.careersPageIntro || "").split("\n").filter(Boolean);
  const lines: string[] = intro.length ? intro : t.careersFallbackIntro;
  return (
    <>
      <PageHeader title={draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`} sub={lines[0]} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Careers" }]} />
      <section className="tp-wrap py-10 md:py-14">
        {lines.length > 1 ? <div className="mb-12 grid gap-5 md:grid-cols-2">{lines.slice(1).map((line, i) => <Reveal key={i}><p className="tp-muted text-[16px] leading-relaxed">{line}</p></Reveal>)}</div> : null}
        {t.careersJobsLoading ? (
          <p className="tp-muted py-10 text-center">Loading open roles…</p>
        ) : !t.careersJobs.length ? (
          <div className="tp-soft p-12 text-center">
            <p className="tp-h3">No openings right now</p>
            <p className="tp-muted mt-2 text-[15.5px]">Check back soon — or send us a general application.</p>
            <button type="button" className="tp-btn tp-btn-primary mt-6" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"}</button>
          </div>
        ) : (
          <>
            <div className="space-y-12">
              {t.careersDepartmentSections.map((dept: any) => (
                <Reveal key={dept.department}>
                  <div className="mb-3 flex items-center justify-between gap-3"><h2 className="tp-h3">{dept.department}</h2><span className="tp-chip">{dept.jobs.length} open</span></div>
                  <ul className="border-t" style={{ borderColor: "var(--t-line)" }}>
                    {dept.jobs.map((item: any, index: number) => (
                      <li key={index} className="border-b" style={{ borderColor: "var(--t-line)" }}>
                        <button type="button" className="group flex w-full items-center justify-between gap-4 py-5 text-left" onClick={() => t.openCareersJob(item)}>
                          <span><span className="tp-display block text-[20px]">{getCareersJobTitle(item)}</span><span className="tp-muted mt-1 block text-[13.5px]">{getCareersJobMeta(item)}</span></span>
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition group-hover:translate-x-1" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #fff)" }}>{Icon.arrow(18)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
            <div className="tp-accent-panel mt-14 flex flex-wrap items-center justify-between gap-5 p-7 md:p-10">
              <div><h2 className="tp-h3" style={{ color: "inherit" }}>{draft?.careersClosingHeading || "Don't see your role?"}</h2><p className="mt-1.5 max-w-xl text-[15.5px] opacity-80">{draft?.careersClosingText || "Send us a general application and tell us how you'd like to contribute."}</p></div>
              <button type="button" className="tp-btn tp-btn-dark" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"}</button>
            </div>
          </>
        )}
      </section>
    </>
  );
};
