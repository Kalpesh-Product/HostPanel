import React from "react";
import { Reveal, Stagger, motion } from "../motion";
import { formatTime12h } from "../leadForms";
import { groupOpeningHours } from "../templateKit";
import { getCareersJobMeta, getCareersJobTitle } from "../useWebsiteTemplateData";
import { LeadFormPanel } from "../shared/TplLead";
import { ApplyForm, MessageForm, RoleSection } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, SectionHead } from "../shared/TplUI";
import { PageHeader, Stars } from "./HavenUI";

const img = (value: any): string => (typeof value === "string" ? value : value?.url || "");

/* ───────────────────────── about ───────────────────────── */

export const HavenAbout: React.FC = () => {
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
      <PageHeader eyebrow="Our story" title={navLabel("about", draft?.aboutTitle || "About us")} sub={intro[0]} image={collage[0]} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "About" }]} />

      {intro.length > 1 || collage.length > 1 ? (
        <section className="tp-wrap grid items-center gap-12 py-14 md:grid-cols-2 md:gap-20 md:py-20">
          <div className="space-y-5">
            {intro.slice(1).map((text, index) => <Reveal key={index}><p className={index === 0 ? "tp-lead" : "tp-muted text-[16.5px] leading-relaxed"}>{text}</p></Reveal>)}
          </div>
          {collage.length > 1 ? (
            <Reveal className="grid grid-cols-2 gap-4">
              <div className="hv-arch tp-zoom aspect-[3/4]"><img src={collage[1]} alt="" loading="lazy" /></div>
              {collage[2] ? <div className="hv-arch tp-zoom mt-10 aspect-[3/4]"><img src={collage[2]} alt="" loading="lazy" /></div> : null}
            </Reveal>
          ) : null}
        </section>
      ) : null}

      {narrative.length ? (
        <section className="tp-wrap pb-14 md:pb-20">
          <SectionHead eyebrow="What we stand for" title="The way we do things" />
          <div>
            {narrative.map((block, index) => (
              <Reveal key={block.title}>
                <div className="hv-rule grid gap-3 py-8 md:grid-cols-[110px_0.7fr_1.3fr] md:gap-8 md:py-10">
                  <span className="hv-num text-[40px] leading-none">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="tp-h3">{block.title}</h3>
                  <p className="tp-muted whitespace-pre-line text-[16px] leading-relaxed">{block.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {showFounders ? (
        <section className="tp-wrap pb-14 md:pb-20">
          <SectionHead eyebrow="Your hosts" title="Meet the founders" />
          <Stagger className="grid gap-8 md:grid-cols-2">
            {founders.map((founder, index) => (
              <div key={index} className="flex items-start gap-6">
                <div className="hv-arch tp-zoom h-[190px] w-[140px] shrink-0">{founder.image ? <img src={img(founder.image)} alt={founder.name} /> : <Placeholder text={founder.name} />}</div>
                <div className="pt-2">
                  <h3 className="tp-h3">{founder.name}</h3>
                  {founder.role ? <p className="mt-1 text-[13px] font-semibold" style={{ color: "var(--hv-ink-accent)" }}>{founder.role}</p> : null}
                  {founder.bio ? <p className="tp-muted mt-3 text-[15px] leading-relaxed">{founder.bio}</p> : null}
                  {founder.highlights ? <p className="mt-2 text-[14px] font-semibold">{founder.highlights}</p> : null}
                </div>
              </div>
            ))}
          </Stagger>
        </section>
      ) : null}

      {showTeam ? (
        <section className="tp-wrap pb-14 md:pb-20">
          <SectionHead eyebrow="The team" title={draft?.aboutPageTeamHeading || "The people who make it feel like home"} />
          <Stagger className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {team.map((card, index) => (
              <div key={index} className="text-center">
                <div className="tp-fill mx-auto h-32 w-32 rounded-full md:h-36 md:w-36">{card.image ? <img src={img(card.image)} alt={card.title} loading="lazy" /> : <Placeholder text={card.title} />}</div>
                <h3 className="mt-4 text-[19px]">{card.title}</h3>
                {card.description ? <p className="tp-muted mt-1 text-[14px]">{card.description}</p> : null}
              </div>
            ))}
          </Stagger>
        </section>
      ) : null}

      {t.contactAddress ? (
        <section className="tp-wrap pb-6">
          <Reveal>
            <div className="tp-soft grid overflow-hidden md:grid-cols-[0.8fr_1.2fr]" style={{ borderRadius: 36 }}>
              <div className="p-8 md:p-12">
                <p className="tp-eyebrow mb-4">Getting here</p>
                <p className="flex items-start gap-3 text-[17px] font-semibold"><span className="mt-1" style={{ color: "var(--hv-ink-accent)" }}>{Icon.pin(18)}</span>{t.contactAddress}</p>
              </div>
              <div className="min-h-[240px]" style={{ background: "var(--t-surface2, var(--t-surface))" }}>{draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-full min-h-[240px] w-full border-0" /> : null}</div>
            </div>
          </Reveal>
        </section>
      ) : null}
    </>
  );
};

/* ───────────────────────── gallery (masonry) ───────────────────────── */

const SHAPES = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]", "aspect-[4/5]", "aspect-[5/4]"];

export const HavenGallery: React.FC = () => {
  const { t, draft, navLabel } = useTpl();
  const items: string[] = t.galleryItems;
  return (
    <>
      <PageHeader eyebrow="Gallery" title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")} sub={items.length ? `${items.length} photo${items.length > 1 ? "s" : ""}` : undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Gallery" }]} />
      <section className="tp-wrap py-10 md:py-14">
        {!items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Photos are on their way.</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 md:gap-5">
            {items.map((src, index) => (
              <Reveal key={`${src}-${index}`} delay={Math.min((index % 6) * 0.04, 0.2)} className="mb-4 break-inside-avoid md:mb-5">
                <button type="button" onClick={() => t.openGalleryViewer(index)} aria-label={`Open photo ${index + 1}`} className={`tp-zoom group relative block w-full ${SHAPES[index % SHAPES.length]}`} style={{ borderRadius: 26 }}>
                  <img src={src} alt="" loading="lazy" />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "rgba(0,0,0,.28)", color: "#fff" }}>{Icon.plus(28)}</span>
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

const ReviewCard: React.FC<{ item: any }> = ({ item }) => (
  <figure className="tp-card flex flex-col gap-5 p-7">
    <Stars value={item.rating || 5} size={16} />
    <blockquote className="tp-display text-[19px] leading-snug" style={{ fontWeight: 400 }}>“{item.text}”</blockquote>
    <figcaption className="flex items-center gap-3">
      <span className="tp-display flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-[16px]" style={{ background: "color-mix(in srgb, var(--t-accent) 20%, transparent)", color: "var(--hv-ink-accent)" }}>
        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
      </span>
      <span><span className="block text-[14.5px] font-semibold">{item.name}</span>{item.role ? <span className="tp-muted block text-[12.5px]">{item.role}</span> : null}</span>
    </figcaption>
  </figure>
);

export const HavenTestimonials: React.FC = () => {
  const { t, draft, rating, navLabel } = useTpl();
  const list: any[] = t.testimonials;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: list.filter((item) => Math.round(item.rating) === star).length }));
  return (
    <>
      <PageHeader eyebrow="Reviews" title={draft?.testimonialsPageHeading || navLabel("testimonials", "What residents say")} sub={draft?.testimonialsPageIntro || undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Reviews" }]}>
        {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary" onClick={t.openReviewModal}>Write a review</button> : null}
      </PageHeader>
      <section className="tp-wrap py-10 md:py-14">
        {!list.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Be the first to leave a review.</p>
        ) : (
          <>
            {rating.count > 0 ? (
              <Reveal>
                <div className="tp-soft mb-10 grid items-center gap-8 p-7 md:grid-cols-[auto_1fr] md:gap-16 md:p-10" style={{ borderRadius: 36 }}>
                  <div>
                    <p className="tp-display text-[72px] leading-none">{rating.avg.toFixed(1)}</p>
                    <div className="mt-3"><Stars value={rating.avg} size={19} /></div>
                    <p className="tp-muted mt-2 text-[14px]">{rating.count} rating{rating.count > 1 ? "s" : ""}</p>
                  </div>
                  <ul className="max-w-xl space-y-2.5">
                    {counts.map(({ star, count }) => (
                      <li key={star} className="flex items-center gap-4 text-[13.5px]">
                        <span className="w-3 font-semibold">{star}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--t-text) 9%, transparent)" }}>
                          <motion.span className="block h-full rounded-full" style={{ background: "var(--t-accent)" }} initial={{ width: 0 }} whileInView={{ width: `${(count / rating.count) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9 }} />
                        </span>
                        <span className="tp-muted w-5 text-right">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}
            <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
              {list.map((item, index) => <Reveal key={item.key || index} delay={Math.min(index * 0.04, 0.2)} className="mb-5 break-inside-avoid"><ReviewCard item={item} /></Reveal>)}
            </div>
          </>
        )}
      </section>
    </>
  );
};

/* ───────────────────────── partner ───────────────────────── */

export const HavenPartner: React.FC = () => {
  const { t, draft } = useTpl();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter((line: string) => line.trim());
  return (
    <>
      <PageHeader eyebrow="Partnerships" title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Partner" }]} />
      <section className="tp-wrap grid gap-12 py-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-16">
        <Reveal>
          <div className="space-y-5">
            {paragraphs.length ? paragraphs.map((line: string, index: number) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16.5px] leading-relaxed"}>{line}</p>) : <p className="tp-lead">Businesses, communities and local partners — tell us how we could work together.</p>}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="tp-card p-7 md:p-9">
            <h2 className="tp-h3 mb-6">{t.partnerFormTitle || "Get in touch"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </Reveal>
      </section>
    </>
  );
};

/* ───────────────────────── contact ───────────────────────── */

export const HavenContact: React.FC = () => {
  const { t, draft, primary, navLabel } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const policy = draft?.stayPolicy || {};
  const showForm = draft?.contactEnableInquiryForm !== false;
  const usePrimary = Boolean(primary?.leadEnabled);
  const person = [draft?.contactPersonName, draft?.contactPersonRole].filter(Boolean).join(" · ");

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="hv-spec !items-start">
      <span className="hv-spec-icon">{icon}</span>
      <div className="min-w-0"><p className="tp-muted text-[12px] font-semibold">{label}</p><div className="mt-0.5 break-words text-[15.5px] font-semibold">{value}</div></div>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Get in touch" title={draft?.contactPageHeading || navLabel("contact", "Contact")} sub={draft?.contactPageIntro || undefined} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Contact" }]} />
      <section className="tp-wrap grid gap-8 py-10 md:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        {showForm ? (
          <Reveal>
            <div className="tp-card p-7 md:p-10">
              <h2 className="tp-h3 mb-1">{usePrimary && primary ? primary.profile.labels.leadTitle : "Send us a message"}</h2>
              <p className="tp-muted mb-7 text-[15px]">We usually reply within a day.</p>
              {usePrimary && primary ? <LeadFormPanel service={primary} /> : <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />}
            </div>
          </Reveal>
        ) : <div />}
        <Reveal delay={0.08}>
          <div className="flex flex-col gap-5">
            <div className="tp-soft space-y-6 p-7" style={{ borderRadius: 32 }}>
              {t.contactAddress ? row(Icon.pin(19), "Address", t.contactAddress) : null}
              {t.contactPhone ? row(Icon.phone(19), "Phone", <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a>) : null}
              {t.contactEmail ? row(Icon.mail(19), "Email", <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>) : null}
              {person ? row(Icon.users(19), "Your contact", <>{person}{draft?.contactPersonEmail ? <span className="tp-muted block text-[13.5px] font-medium">{draft.contactPersonEmail}</span> : null}{draft?.contactPersonPhone ? <span className="tp-muted block text-[13.5px] font-medium">{draft.contactPersonPhone}</span> : null}</>) : null}
              {hours.length ? row(Icon.clock(19), "Hours", <ul className="space-y-1 text-[14.5px] font-medium">{hours.map((r) => <li key={r.days} className="flex justify-between gap-6"><span className="tp-muted">{r.days}</span><span>{r.hours}</span></li>)}</ul>) : draft?.contactBusinessHours ? row(Icon.clock(19), "Hours", draft.contactBusinessHours) : null}
            </div>
            {policy.checkInTime || policy.checkOutTime ? (
              <div className="tp-card grid grid-cols-2 gap-4 p-6">
                {policy.checkInTime ? <div><p className="tp-muted text-[12px] font-semibold">Check-in</p><p className="tp-display text-[22px]">{formatTime12h(policy.checkInTime)}</p></div> : null}
                {policy.checkOutTime ? <div><p className="tp-muted text-[12px] font-semibold">Check-out</p><p className="tp-display text-[22px]">{formatTime12h(policy.checkOutTime)}</p></div> : null}
              </div>
            ) : null}
          </div>
        </Reveal>
      </section>
      {draft?.mapUrl ? (
        <section className="tp-wrap pb-10"><Reveal><iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-[320px] w-full border-0 md:h-[420px]" style={{ borderRadius: 32 }} /></Reveal></section>
      ) : null}
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

/* ───────────────────────── careers ───────────────────────── */

export const HavenCareers: React.FC = () => {
  const { t, draft } = useTpl();
  const job = t.careersApplyJob;

  if (job) {
    const applyOnly = t.careersDirectApply;
    return (
      <>
        <PageHeader eyebrow={applyOnly ? "Open application" : job.department || "Careers"} title={applyOnly ? "General application" : getCareersJobTitle(job)} sub={applyOnly ? undefined : getCareersJobMeta(job)} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Careers", onClick: t.closeCareersJob }, { label: applyOnly ? "Apply" : getCareersJobTitle(job) }]} />
        <section className="tp-wrap grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_440px] lg:gap-14">
          {!applyOnly ? (
            <Reveal>
              <div className="space-y-9">
                <RoleSection title="About this role" text={job.aboutTheJob} />
                <RoleSection title="Key responsibilities" text={job.keyResponsibilities} asList />
                <RoleSection title="Requirements" text={job.requirements} asList />
                <RoleSection title="Soft skills" text={job.softSkills} asList />
                {draft?.email ? <p className="tp-muted hv-rule pt-6 text-[14.5px]">Prefer email? Send your resume to <strong style={{ color: "var(--t-text)" }}>{draft.email}</strong>.</p> : null}
              </div>
            </Reveal>
          ) : null}
          <Reveal delay={0.06} className={applyOnly ? "lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-3xl" : "lg:sticky lg:top-28 lg:self-start"}>
            <div className="tp-card p-7 md:p-9"><h2 className="tp-h3 mb-6">Apply now</h2><ApplyForm /></div>
          </Reveal>
        </section>
      </>
    );
  }

  const intro = String(draft?.careersPageIntro || "").split("\n").filter(Boolean);
  const lines: string[] = intro.length ? intro : t.careersFallbackIntro;
  return (
    <>
      <PageHeader eyebrow="Careers" title={draft?.careersPageHeading || `Work with ${draft?.companyName || "us"}`} sub={lines[0]} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Careers" }]} />
      <section className="tp-wrap py-10 md:py-14">
        {lines.length > 1 ? <div className="mb-12 grid gap-5 md:grid-cols-2">{lines.slice(1).map((line, i) => <Reveal key={i}><p className="tp-muted text-[16px] leading-relaxed">{line}</p></Reveal>)}</div> : null}
        {t.careersJobsLoading ? (
          <p className="tp-muted py-10 text-center">Loading open roles…</p>
        ) : !t.careersJobs.length ? (
          <div className="tp-soft p-12 text-center" style={{ borderRadius: 36 }}>
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
                  <ul>
                    {dept.jobs.map((item: any, index: number) => (
                      <li key={index} className="hv-rule">
                        <button type="button" className="group flex w-full items-center justify-between gap-4 py-5 text-left" onClick={() => t.openCareersJob(item)}>
                          <span><span className="tp-display block text-[21px]">{getCareersJobTitle(item)}</span><span className="tp-muted mt-1 block text-[13.5px]">{getCareersJobMeta(item)}</span></span>
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition group-hover:translate-x-1" style={{ borderColor: "var(--t-line)", color: "var(--hv-ink-accent)" }}>{Icon.arrow(18)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
            <div className="tp-accent-panel mt-14 flex flex-wrap items-center justify-between gap-5 p-8 md:p-10">
              <div><h2 className="tp-h3" style={{ color: "inherit" }}>{draft?.careersClosingHeading || "Don't see your role?"}</h2><p className="mt-1.5 max-w-xl text-[15.5px] opacity-90">{draft?.careersClosingText || "Send us a general application and tell us how you'd like to contribute."}</p></div>
              <button type="button" className="tp-btn tp-btn-light" onClick={t.openCareersGeneralApply}>{draft?.careersApplyButtonText || "General application"}</button>
            </div>
          </>
        )}
      </section>
    </>
  );
};
