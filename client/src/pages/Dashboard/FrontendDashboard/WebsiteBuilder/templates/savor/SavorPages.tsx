import React, { useState } from "react";
import { AnimatePresence, Reveal, Stagger, motion } from "../motion";
import { groupOpeningHours, postWebsiteLead, highlightLines } from "../templateKit";
import { LeadFormPanel } from "./SavorLead";
import { ReviewCard } from "./SavorHome";
import { Icon, Placeholder, SectionHead, StarRow } from "./SavorUI";
import { useSavor } from "./SavorContext";
import { MessageForm, ReviewModal } from "../shared/TplForms";
import { getMediaSrc } from "../useWebsiteTemplateData";

export { ReviewModal };

/** Dark rounded banner that opens every inner page. */
export const PageBanner: React.FC<{ eyebrow?: string; title: string; sub?: string; children?: React.ReactNode }> = ({
  eyebrow,
  title,
  sub,
  children,
}) => (
  <section className="px-3 pt-24 md:px-6 md:pt-28">
    <div className="tp-wrap !max-w-[1320px] !px-0">
      <div className="relative overflow-hidden px-6 py-14 md:px-14 md:py-20" style={{ borderRadius: 40, background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
        <div className="tp-blob" style={{ width: 420, height: 420, right: -120, top: -180, opacity: 0.45 }} />
        <div className="relative">
          {eyebrow ? <Reveal y={10}><p className="tp-eyebrow mb-3" style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{eyebrow}</p></Reveal> : null}
          <Reveal delay={0.06}><h1 className="tp-h1" style={{ fontSize: "clamp(38px, 6vw, 72px)" }}>{title}</h1></Reveal>
          {sub ? <Reveal delay={0.12}><p className="mt-4 max-w-2xl text-[17px] leading-relaxed opacity-85">{sub}</p></Reveal> : null}
          {children ? <Reveal delay={0.18} className="mt-7">{children}</Reveal> : null}
        </div>
      </div>
    </div>
  </section>
);

/* ───────────────────────── about ───────────────────────── */

export const SavorAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useSavor();
  const intro: string[] = t.aboutIntroBlocks;
  const narrative: { title: string; body: string }[] = t.aboutNarrativeBlocks;
  const teamCards: any[] = t.aboutPageImageCards;
  const founders: any[] = t.founders;
  // The builder stores these as { id, url } objects; older data may be plain strings.
  const images: string[] = (Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : []).map((item: any) => getMediaSrc(item)).filter(Boolean);
  const showFounders = t.isSectionEnabled("about_founders") && founders.length > 0;
  const showTeam = t.isSectionEnabled("about_team") && teamCards.length > 0;

  return (
    <>
      <PageBanner eyebrow={c("about.eyebrow", "Our story")} title={navLabel("about", draft?.aboutTitle || "About us")} sub={intro[0]} />

      {images.length ? (
        <section className="tp-wrap pt-10">
          <div className="grid gap-4 md:grid-cols-3">
            {images.slice(0, 3).map((src, index) => (
              <Reveal key={src} delay={index * 0.08} className={`tp-zoom overflow-hidden ${index === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
                <div className="tp-zoom aspect-[4/3] h-full overflow-hidden" style={{ borderRadius: 32 }}><img src={src} alt="" loading="lazy" /></div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {intro.length > 1 ? (
        <section className="tp-wrap pt-14">
          <div className="grid gap-6 md:grid-cols-2">
            {intro.slice(1).map((text, index) => (
              <Reveal key={index}><p className="tp-lead">{text}</p></Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {narrative.length ? (
        <section className="tp-section">
          <div className="tp-wrap">
            {narrative.map((block, index) => (
              <Reveal key={block.title}>
                <div className="grid gap-4 border-t py-10 md:grid-cols-[0.5fr_1.5fr] md:gap-14 md:py-14" style={{ borderColor: "var(--t-line)" }}>
                  <div className="flex items-baseline gap-4">
                    <span className="tp-display text-[15px]" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{String(index + 1).padStart(2, "0")}</span>
                    <h2 className="tp-h3">{block.title}</h2>
                  </div>
                  <p className="tp-muted whitespace-pre-line text-[17px] leading-relaxed">{block.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {showFounders ? (
        <section className="tp-section" style={{ paddingTop: 24 }}>
          <div className="tp-wrap">
            <SectionHead eyebrow={c("about.founders.eyebrow", "The people")} title={c("about.founders.title", "Meet the founders")} />
            <Stagger className="grid gap-6 md:grid-cols-2">
              {founders.map((founder, index) => (
                <div key={index} className="tp-card flex flex-col gap-5 p-6 sm:flex-row" style={{ borderRadius: 32 }}>
                  <div className="h-40 w-40 shrink-0 overflow-hidden rounded-[26px] sm:h-44 sm:w-44">
                    {founder.image ? <img src={typeof founder.image === "string" ? founder.image : founder.image?.url} alt={founder.name} className="h-full w-full object-cover" /> : <Placeholder text={founder.name} />}
                  </div>
                  <div>
                    <h3 className="text-[24px]">{founder.name}</h3>
                    {founder.role ? <p className="mt-1 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{founder.role}</p> : null}
                    {founder.bio ? <p className="tp-muted mt-3 text-[15px] leading-relaxed">{founder.bio}</p> : null}
                    {highlightLines(founder.highlights).length ? <p className="mt-3 text-[13px] font-semibold">{highlightLines(founder.highlights).map((line) => <span key={line} className="block">{line}</span>)}</p> : null}
                  </div>
                </div>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      {showTeam ? (
        <section className="tp-section" style={{ paddingTop: 24 }}>
          <div className="tp-wrap">
            <SectionHead eyebrow={c("about.team.eyebrow", "The crew")} title={draft?.aboutPageTeamHeading || "Meet the team"} />
            <Stagger className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {teamCards.map((card, index) => (
                <div key={index} className="text-left">
                  <div className="tp-zoom aspect-[4/5] overflow-hidden" style={{ borderRadius: 28 }}>
                    {card.image ? <img src={typeof card.image === "string" ? card.image : card.image?.url} alt={card.title} loading="lazy" /> : <Placeholder text={card.title} />}
                  </div>
                  <h3 className="mt-4 text-[19px]">{card.title}</h3>
                  {card.description ? <p className="tp-muted mt-1 text-[14px]">{card.description}</p> : null}
                </div>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}
      <div className="h-16" />
    </>
  );
};

/* ───────────────────────── gallery ───────────────────────── */

export const SavorGallery: React.FC = () => {
  const { t, draft, navLabel, c } = useSavor();
  const items: string[] = t.galleryItems;
  return (
    <>
      <PageBanner eyebrow={c("gallery.eyebrow", "Gallery")} title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")} sub={items.length ? `${items.length} moments` : undefined} />
      <section className="tp-wrap pt-10 pb-16">
        {!items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Photos are on their way.</p>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 lg:gap-5">
            {items.map((src, index) => (
              <Reveal key={`${src}-${index}`} delay={Math.min((index % 6) * 0.05, 0.25)} className="mb-4 break-inside-avoid lg:mb-5">
                <button type="button" onClick={() => t.openGalleryViewer(index)} className="tp-zoom group relative block w-full overflow-hidden" style={{ borderRadius: 26 }} aria-label={`Open photo ${index + 1}`}>
                  <img src={src} alt="" loading="lazy" style={{ height: "auto", aspectRatio: index % 5 === 0 ? "4 / 5" : index % 3 === 0 ? "1 / 1" : "4 / 3" }} />
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

/* ───────────────────────── testimonials ───────────────────────── */

export const SavorTestimonials: React.FC = () => {
  const { t, draft, rating, navLabel, c } = useSavor();
  const list: any[] = t.testimonials;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: list.filter((item) => Math.round(item.rating) === star).length }));
  return (
    <>
      <PageBanner eyebrow={c("reviews.eyebrow", "Reviews")} title={draft?.testimonialsPageHeading || navLabel("testimonials", "What people say")} sub={draft?.testimonialsPageIntro || undefined}>
        {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary" onClick={t.openReviewModal}>{c("reviews.write", "Write a review")} {Icon.arrow()}</button> : null}
      </PageBanner>
      <section className="tp-wrap pt-10 pb-16">
        {!list.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">Be the first to leave a review.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-12">
            {rating.count > 0 ? (
              <Reveal className="lg:sticky lg:top-28 lg:self-start">
                <div className="tp-card p-7" style={{ borderRadius: 32 }}>
                  <p className="tp-display text-[64px]">{rating.avg.toFixed(1)}</p>
                  <StarRow value={rating.avg} size={18} />
                  <p className="tp-muted mt-2 text-[14px]">{rating.count} rating{rating.count > 1 ? "s" : ""}</p>
                  <ul className="mt-6 space-y-2.5">
                    {counts.map(({ star, count }) => (
                      <li key={star} className="flex items-center gap-3 text-[13px]">
                        <span className="w-4 font-bold">{star}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--t-text) 8%, transparent)" }}>
                          <motion.span className="block h-full rounded-full" style={{ background: "var(--t-accent)" }} initial={{ width: 0 }} whileInView={{ width: `${rating.count ? (count / rating.count) * 100 : 0}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                        </span>
                        <span className="tp-muted w-6 text-right">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : <div />}
            <div className="columns-1 gap-5 md:columns-2">
              {list.map((item, index) => <ReviewCard key={item.key || index} item={item} index={index} />)}
            </div>
          </div>
        )}
      </section>
    </>
  );
};

/* ───────────────────────── partner ───────────────────────── */

export const SavorPartner: React.FC = () => {
  const { t, draft, c } = useSavor();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter((line: string) => line.trim());
  return (
    <>
      <PageBanner eyebrow={c("partner.eyebrow", "Partnerships")} title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`} />
      <section className="tp-wrap grid gap-10 pt-12 pb-16 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <Reveal>
          {paragraphs.length ? (
            <div className="space-y-5">
              {paragraphs.map((line: string, index: number) => (
                <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[17px] leading-relaxed"}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="tp-lead">{c("partner.intro", "We love working with people who share our passion. Tell us a little about yourself and how we could work together.")}</p>
          )}
        </Reveal>
        <Reveal delay={0.1}>
          <div className="tp-card p-6 md:p-8" style={{ borderRadius: 32 }}>
            <h2 className="tp-h3 mb-5">{t.partnerFormTitle || "Let's work together"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </Reveal>
      </section>
    </>
  );
};

/* ───────────────────────── contact ───────────────────────── */

export const SavorContact: React.FC = () => {
  const { t, draft, primary, navLabel, c } = useSavor();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  const usePrimaryForm = Boolean(primary?.leadEnabled);
  const person = [draft?.contactPersonName, draft?.contactPersonRole].filter(Boolean).join(" · ");

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--t-accent) 15%, transparent)", color: "var(--t-accent-fg, var(--t-accent))" }}>{icon}</span>
      <div className="min-w-0">
        <p className="tp-muted text-[12px] font-bold uppercase tracking-wider">{label}</p>
        <div className="mt-0.5 break-words text-[16px] font-semibold">{value}</div>
      </div>
    </div>
  );

  return (
    <>
      <PageBanner eyebrow={c("contact.eyebrow", "Get in touch")} title={draft?.contactPageHeading || navLabel("contact", "Contact")} sub={draft?.contactPageIntro || undefined} />
      <section className="tp-wrap grid gap-8 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        {showForm ? (
          <Reveal>
            <div className="tp-card p-6 md:p-10" style={{ borderRadius: 36 }}>
              <h2 className="tp-h3 mb-2">{usePrimaryForm && primary ? primary.profile.labels.leadTitle : "Send us a message"}</h2>
              <p className="tp-muted mb-6 text-[15px]">
                {usePrimaryForm && primary?.kind === "menu" ? "Choose a date and time and we'll hold a table for you." : "We usually reply within a day."}
              </p>
              {usePrimaryForm && primary ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />
              )}
            </div>
          </Reveal>
        ) : <div />}
        <Reveal delay={0.1}>
          <div className="tp-soft space-y-6 p-6 md:p-9">
            {t.contactAddress ? row(Icon.pin(20), "Visit", t.contactAddress) : null}
            {t.contactPhone ? row(Icon.phone(20), "Call", <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a>) : null}
            {t.contactEmail ? row(Icon.mail(20), "Email", <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>) : null}
            {hours.length ? row(Icon.clock(20), "Hours", (
              <ul className="space-y-1.5 text-[15px] font-medium">
                {hours.map((r) => <li key={r.days} className="flex justify-between gap-6"><span className="tp-muted">{r.days}</span><span>{r.hours}</span></li>)}
              </ul>
            )) : draft?.contactBusinessHours ? row(Icon.clock(20), "Hours", draft.contactBusinessHours) : null}
            {person ? row(Icon.users(20), "Your contact", (
              <>
                {person}
                {draft?.contactPersonEmail ? <span className="tp-muted block text-[14px] font-medium">{draft.contactPersonEmail}</span> : null}
                {draft?.contactPersonPhone ? <span className="tp-muted block text-[14px] font-medium">{draft.contactPersonPhone}</span> : null}
              </>
            )) : null}
          </div>
        </Reveal>
      </section>
      {draft?.mapUrl ? (
        <section className="tp-wrap pt-8 pb-16">
          <Reveal>
            <iframe title="Map" src={draft.mapUrl} loading="lazy" className="h-[320px] w-full border-0 md:h-[440px]" style={{ borderRadius: 36 }} />
          </Reveal>
        </section>
      ) : <div className="h-16" />}
    </>
  );
};
