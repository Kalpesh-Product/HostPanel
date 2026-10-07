import React from "react";
import { groupOpeningHours, highlightLines } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Placeholder, StarRow } from "../shared/TplUI";
import { Eyebrow, Reveal, Tick } from "./TulumUI";

const img = (value: any): string => (typeof value === "string" ? value : value?.url || "");

const PageHero: React.FC<{ eyebrow: string; title: string; intro?: string }> = ({ eyebrow, title, intro }) => (
  <section className="tp-wrap pb-12 pt-16 text-center md:pb-16 md:pt-24">
    <Reveal><Eyebrow>{eyebrow}</Eyebrow></Reveal>
    <Reveal from="left" delay={0.05}><h1 className="tk-h1 mx-auto mt-6 max-w-4xl">{title}</h1></Reveal>
    {intro ? <Reveal delay={0.1}><p className="tk-muted mx-auto mt-6 max-w-2xl text-[16px] leading-8">{intro}</p></Reveal> : null}
  </section>
);

export const TulumAbout: React.FC = () => {
  const { t, draft, c } = useTpl();
  const photos = ((Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : []) as any[]).map(img).filter(Boolean);
  const images = photos.length ? photos : t.galleryItems.map(img);
  const story = t.aboutIntroBlocks;
  const team: any[] = t.founders;
  return (
    <>
      <PageHero eyebrow={c("about.eyebrow", "Our story")} title={draft?.aboutTitle || "About us"} intro={story[0]} />
      <section className="tp-section pt-0">
        <div className="tp-wrap grid items-center gap-14 md:grid-cols-2 md:gap-20">
          <Reveal from="left">
            <div className="aspect-[4/5] overflow-hidden">
              {images[0] ? <img src={images[0]} alt="" className="h-full w-full object-cover" /> : <Placeholder text="Our story" />}
            </div>
          </Reveal>
          <div>
            <Reveal from="right"><h2 className="tk-h2">{draft?.aboutPageStory || "Made for comfortable, unhurried stays."}</h2></Reveal>
            {story.slice(1).map((text: string, index: number) => <Reveal key={index} from="right" delay={0.06 + index * 0.04}><p className="tk-muted mt-6 text-[16px] leading-8">{text}</p></Reveal>)}
          </div>
        </div>
      </section>
      {t.aboutNarrativeBlocks?.length ? (
        <section className="tk-band py-24">
          <div className="tp-wrap grid gap-12 md:grid-cols-3">
            {t.aboutNarrativeBlocks.map((block: any, index: number) => (
              <Reveal key={block.title} delay={index * 0.06}>
                <div className="border-t border-white/30 pt-6">
                  <p className="text-[13px] opacity-70">0{index + 1}</p>
                  <h3 className="tk-h3 mt-3">{block.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 opacity-85">{block.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
      {team.length ? (
        <section className="tp-section">
          <div className="tp-wrap text-center">
            <Reveal><Eyebrow>{c("about.team.eyebrow", "Our team")}</Eyebrow></Reveal>
            <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5">{c("about.founders.title", "Meet the team")}</h2></Reveal>
          </div>
          <div className="tp-wrap mt-14 grid gap-10 md:grid-cols-3">
            {team.map((founder: any, index: number) => (
              <Reveal key={index} delay={index * 0.06} className="text-center">
                <div className="tk-team-media mx-auto w-full max-w-[300px]">
                  {founder.image ? <img src={img(founder.image)} alt={founder.name} className="h-full w-full object-cover" /> : <Placeholder text={founder.name} />}
                </div>
                <p className="tk-h3 mt-6">{founder.name}</p>
                <p className="tk-muted mt-1 text-[13px] uppercase tracking-[.14em]">{founder.role}</p>
                {founder.bio ? <p className="tk-muted mx-auto mt-4 max-w-xs text-[15px] leading-7">{founder.bio}</p> : null}
                {highlightLines(founder.highlights).map((line) => <p key={line} className="mt-2 text-sm">{line}</p>)}
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
};

export const TulumGallery: React.FC = () => {
  const { t, draft, c } = useTpl();
  return (
    <>
      <PageHero eyebrow={c("gallery.eyebrow", "Gallery")} title={draft?.galleryPageHeading || "A look around"} intro="The units, the shared spaces and the beach just outside." />
      <section className="tp-wrap pb-24">
        <div className="grid auto-rows-[220px] grid-cols-2 gap-5 md:auto-rows-[280px] md:grid-cols-3">
          {t.galleryItems.map((src: string, index: number) => (
            <Reveal key={`${src}-${index}`} from="grow" delay={Math.min(index * 0.03, 0.3)} className={index % 5 === 0 ? "md:row-span-2" : ""}>
              <button type="button" className="tk-tile h-full w-full" onClick={() => t.openGalleryViewer(index)}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const TulumTestimonials: React.FC = () => {
  const { t, draft, rating, c } = useTpl();
  return (
    <>
      <PageHero eyebrow={c("reviews.eyebrow", "Reviews")} title={draft?.testimonialsPageHeading || "What people say about us"} intro={draft?.testimonialsPageIntro} />
      <section className="tp-wrap pb-24">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6 border-y py-7">
          <div>
            <p className="tk-h1">{rating.count ? rating.avg.toFixed(1) : "5.0"}</p>
            <div className="mt-3"><StarRow value={rating.avg || 5} /></div>
          </div>
          {t.showWriteReview ? <button type="button" className="tk-pill tk-pill-solid" onClick={t.openReviewModal}>{c("reviews.write", "Write a review")}</button> : null}
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {t.testimonials.map((item: any, index: number) => (
            <Reveal key={item.key || index} delay={Math.min(index * 0.05, 0.2)}>
              <figure className="tk-review h-full">
                <StarRow value={item.rating || 5} />
                <blockquote className="mt-6 text-[22px] leading-8" style={{ fontFamily: "'Cormorant Upright', serif" }}>&ldquo;{item.text}&rdquo;</blockquote>
                <figcaption className="mt-6 text-[13px] font-bold uppercase tracking-[.12em]">{item.name}{item.role ? <span className="tk-muted font-normal normal-case tracking-normal"> · {item.role}</span> : null}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const TulumContact: React.FC = () => {
  const { t, draft, primary, c } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <>
      <PageHero eyebrow={c("contact.eyebrow", "Get in touch")} title={draft?.contactPageHeading || "Contact us"} intro={draft?.contactPageIntro} />
      <section className="tp-wrap grid gap-14 pb-24 lg:grid-cols-[1.2fr_.8fr] lg:gap-20">
        {showForm ? (
          <Reveal from="left">
            <div className="tk-review">
              <h2 className="tk-h2 mb-7">{primary?.leadEnabled ? primary.profile.labels.leadTitle : "Send us a message"}</h2>
              {primary?.leadEnabled ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />
              )}
            </div>
          </Reveal>
        ) : null}
        <Reveal from="right" delay={0.08}>
          <div className="space-y-9">
            {t.contactAddress ? <div><p className="tk-eyebrow">Address</p><p className="tk-muted mt-2 text-[15px] leading-7">{t.contactAddress}</p></div> : null}
            {t.contactPhone ? <div><p className="tk-eyebrow">Call us</p><a className="tk-muted mt-2 block text-[15px]" href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></div> : null}
            {t.contactEmail ? <div><p className="tk-eyebrow">Got a question?</p><a className="tk-muted mt-2 block text-[15px]" href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></div> : null}
            {hours.length ? <div><p className="tk-eyebrow">Hours</p><ul className="tk-muted mt-2 space-y-1 text-[15px]">{hours.map((row) => <li key={row.days}>{row.days}: {row.hours}</li>)}</ul></div> : null}
          </div>
        </Reveal>
      </section>
      {draft?.mapUrl ? (
        <section className="tp-wrap pb-24">
          <iframe title={`${draft?.companyName || "Business"} location map`} src={draft.mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[360px] w-full border-0 md:h-[460px]" />
        </section>
      ) : null}
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};

export const TulumPartner: React.FC = () => {
  const { t, draft, c } = useTpl();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter(Boolean);
  return (
    <>
      <PageHero eyebrow={c("partner.eyebrow", "Partnerships")} title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`} intro={paragraphs[0]} />
      <section className="tp-wrap grid gap-14 pb-24 md:grid-cols-[.9fr_1.1fr] md:gap-20">
        <Reveal from="left">
          <div className="space-y-6">
            {(paragraphs.slice(1).length ? paragraphs.slice(1) : [PARTNER_FALLBACK]).map((line: string, index: number) => <p key={index} className="tk-muted text-[16px] leading-8">{line}</p>)}
          </div>
        </Reveal>
        <Reveal from="right" delay={0.08}>
          <div className="tk-review">
            <h2 className="tk-h2 mb-7">{t.partnerFormTitle || "Get in touch"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </Reveal>
      </section>
    </>
  );
};

const PARTNER_FALLBACK = "Local guides, tour operators and businesses are welcome. Tell us how we could work together.";

/** A small check row used under the unit detail's amenity list. */
export const TulumCheckRow: React.FC<{ label: string }> = ({ label }) => (
  <li className="flex items-center gap-3 text-[15px]"><Tick />{label}</li>
);
