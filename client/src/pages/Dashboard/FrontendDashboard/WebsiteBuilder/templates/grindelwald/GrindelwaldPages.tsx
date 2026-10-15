import React from "react";
import { groupOpeningHours, highlightLines } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Placeholder, StarRow } from "../shared/TplUI";
import { Eyebrow, PageHero, Reveal, Tick } from "./GrindelwaldUI";
import { GrindelwaldCallToAction } from "./GrindelwaldHome";

const img = (value: any): string => (typeof value === "string" ? value : value?.url || "");

/** The reference's "Memory Line" page: a photo hero, then the story told as alternating blocks
 * (one per era), then the team, the sign-up offer and the closing band — same as Home's. */
export const GrindelwaldAbout: React.FC = () => {
  const { t, draft, c } = useTpl();
  const photos = ((Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : []) as any[]).map(img).filter(Boolean);
  const images = photos.length ? photos : t.galleryItems.map(img);
  const story = t.aboutIntroBlocks;
  const narrative = t.aboutNarrativeBlocks;
  const team: any[] = t.founders;
  return (
    <>
      <PageHero image={images[0]} title={draft?.aboutTitle || "Memory Line"} sub={story[0]} />
      {narrative.length ? (
        <section className="tp-section">
          <div className="tp-wrap space-y-24">
            {narrative.map((block: any, index: number) => {
              const flip = index % 2 === 1;
              const photo = images[(index + 1) % images.length] || images[0];
              return (
                <div key={block.title} className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
                  <Reveal from={flip ? "right" : "left"} className={flip ? "md:order-2" : ""}>
                    <div className="aspect-[4/3] overflow-hidden">
                      {photo ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Placeholder text={block.title} />}
                    </div>
                  </Reveal>
                  <Reveal from={flip ? "left" : "right"} delay={0.06} className={flip ? "md:order-1" : ""}>
                    <p className="gw-eyebrow gw-muted">0{index + 1}</p>
                    <h2 className="gw-h2 mt-4">{block.title}</h2>
                    <p className="gw-muted mt-6 text-[16px] leading-8">{block.body}</p>
                  </Reveal>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {team.length ? (
        <section className="tp-section">
          <div className="tp-wrap text-center">
            <Reveal><Eyebrow>{c("about.team.eyebrow", "Our team")}</Eyebrow></Reveal>
            <Reveal from="left"><h2 className="gw-h2 mx-auto mt-5">{c("about.founders.title", "Meet the team")}</h2></Reveal>
          </div>
          <div className="tp-wrap mt-14 grid gap-10 md:grid-cols-3">
            {team.map((founder: any, index: number) => (
              <Reveal key={index} delay={index * 0.06} className="text-center">
                <div className="gw-team-media mx-auto w-full max-w-[300px]">
                  {founder.image ? <img src={img(founder.image)} alt={founder.name} className="h-full w-full object-cover" /> : <Placeholder text={founder.name} />}
                </div>
                <p className="gw-h3 mt-6">{founder.name}</p>
                <p className="gw-muted mt-1 text-[13px] uppercase tracking-[.14em]">{founder.role}</p>
                {founder.bio ? <p className="gw-muted mx-auto mt-4 max-w-xs text-[15px] leading-7">{founder.bio}</p> : null}
                {highlightLines(founder.highlights).map((line) => <p key={line} className="mt-2 text-sm">{line}</p>)}
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
      <GrindelwaldCallToAction />
    </>
  );
};

export const GrindelwaldGallery: React.FC = () => {
  const { t, draft } = useTpl();
  return (
    <>
      <PageHero title={draft?.galleryPageHeading || "A Look Around"} sub="The cabins, the shared spaces and the forest just outside." />
      <section className="tp-wrap pb-24">
        {/* grid-flow-dense: without it, the tall (row-span-2) tiles leave an empty cell behind them
            instead of letting a later tile fill the gap. */}
        <div className="grid auto-rows-[220px] grid-flow-dense grid-cols-2 gap-5 md:auto-rows-[280px] md:grid-cols-3">
          {t.galleryItems.map((src: string, index: number) => (
            <Reveal key={`${src}-${index}`} from="grow" delay={Math.min(index * 0.03, 0.3)} className={index % 5 === 0 ? "md:row-span-2" : ""}>
              <button type="button" className="gw-tile h-full w-full" onClick={() => t.openGalleryViewer(index)}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const GrindelwaldTestimonials: React.FC = () => {
  const { t, draft, rating, c } = useTpl();
  return (
    <>
      <PageHero title={draft?.testimonialsPageHeading || "What People Say"} sub={draft?.testimonialsPageIntro} />
      <section className="tp-wrap pb-24">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6 border-y py-7">
          <div>
            <p className="gw-h1">{rating.count ? rating.avg.toFixed(1) : "5.0"}</p>
            <div className="mt-3"><StarRow value={rating.avg || 5} /></div>
          </div>
          {t.showWriteReview ? <button type="button" className="gw-pill gw-pill-solid" onClick={t.openReviewModal}>{c("reviews.write", "Write a review")}</button> : null}
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {t.testimonials.map((item: any, index: number) => (
            <Reveal key={item.key || index} delay={Math.min(index * 0.05, 0.2)}>
              <figure className="gw-review-card h-full">
                <StarRow value={item.rating || 5} />
                <blockquote className="mt-6 text-[22px] leading-8" style={{ fontFamily: "'Cormorant Upright', serif" }}>&ldquo;{item.text}&rdquo;</blockquote>
                <figcaption className="mt-6 text-[13px] font-bold uppercase tracking-[.12em]">{item.name}{item.role ? <span className="gw-muted font-normal normal-case tracking-normal"> · {item.role}</span> : null}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const GrindelwaldContact: React.FC = () => {
  const { t, draft, primary } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <>
      <PageHero title={draft?.contactPageHeading || "Get In Touch"} sub={draft?.contactPageIntro} />
      <section className="tp-wrap grid gap-14 pb-24 pt-20 lg:grid-cols-[1.2fr_.8fr] lg:gap-20">
        {showForm ? (
          <Reveal from="left">
            <div className="gw-review-card">
              <h2 className="gw-h2 mb-7">{primary?.leadEnabled ? primary.profile.labels.leadTitle : "Send us a message"}</h2>
              {primary?.leadEnabled ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />
              )}
            </div>
          </Reveal>
        ) : null}
        <Reveal from="right" delay={0.08} className="flex flex-col">
          <div className="space-y-9">
            {t.contactAddress ? <div><p className="gw-eyebrow">Address</p><p className="gw-muted mt-2 text-[15px] leading-7">{t.contactAddress}</p></div> : null}
            {t.contactPhone ? <div><p className="gw-eyebrow">Call us</p><a className="gw-muted mt-2 block text-[15px]" href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></div> : null}
            {t.contactEmail ? <div><p className="gw-eyebrow">Got a question?</p><a className="gw-muted mt-2 block text-[15px]" href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></div> : null}
            {hours.length ? <div><p className="gw-eyebrow">Hours</p><ul className="gw-muted mt-2 space-y-1 text-[15px]">{hours.map((row) => <li key={row.days}>{row.days}: {row.hours}</li>)}</ul></div> : null}
          </div>
          {draft?.mapUrl ? (
            <iframe title={`${draft?.companyName || "Business"} location map`} src={draft.mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="mt-9 h-[260px] w-full flex-1 border-0" />
          ) : null}
        </Reveal>
      </section>
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

export const GrindelwaldPartner: React.FC = () => {
  const { t, draft } = useTpl();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter(Boolean);
  return (
    <>
      <PageHero title={t.partnerPageHeading || `Partner With Us`} sub={paragraphs[0]} />
      <section className="tp-wrap grid gap-14 pb-24 md:grid-cols-[.9fr_1.1fr] md:gap-20">
        <Reveal from="left">
          <div className="space-y-6">
            {(paragraphs.slice(1).length ? paragraphs.slice(1) : [PARTNER_FALLBACK]).map((line: string, index: number) => <p key={index} className="gw-muted text-[16px] leading-8">{line}</p>)}
          </div>
        </Reveal>
        <Reveal from="right" delay={0.08}>
          <div className="gw-review-card">
            <h2 className="gw-h2 mb-7">{t.partnerFormTitle || "Get in touch"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </Reveal>
      </section>
    </>
  );
};

const PARTNER_FALLBACK = "Local guides, tour operators and businesses are welcome. Tell us how we could work together.";

/** A small check row used under the unit detail's amenity list. */
export const GrindelwaldCheckRow: React.FC<{ label: string }> = ({ label }) => (
  <li className="flex items-center gap-3 text-[15px]"><Tick />{label}</li>
);
