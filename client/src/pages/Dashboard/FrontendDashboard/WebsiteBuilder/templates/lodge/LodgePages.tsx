import React from "react";
import { Stagger } from "../motion";
import { groupOpeningHours, highlightLines } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Placeholder, StarRow } from "../shared/TplUI";
import { Label, SlideIn } from "./LodgeUI";

const img = (value: any): string => (typeof value === "string" ? value : value?.url || "");

const Hero: React.FC<{ eyebrow: string; title: string; intro?: string }> = ({ eyebrow, title, intro }) => (
  <section className="tp-wrap pb-12 pt-14 md:pb-16 md:pt-20">
    <SlideIn><Label>{eyebrow}</Label></SlideIn>
    <SlideIn delay={0.05}><h1 className="ld-h2-lg mt-6 max-w-4xl">{title}</h1></SlideIn>
    {intro ? <SlideIn delay={0.1}><p className="ld-muted mt-6 max-w-2xl text-[16px] leading-8">{intro}</p></SlideIn> : null}
  </section>
);

const TEAM_PLACEHOLDER: any[] = [{ name: "", role: "", bio: "" }, { name: "", role: "", bio: "" }];

export const LodgeAbout: React.FC = () => {
  const { t, draft, c } = useTpl();
  const photos = ((Array.isArray(draft?.aboutPageImages) ? draft.aboutPageImages : []) as any[]).map(img).filter(Boolean);
  const images = photos.length ? photos : t.galleryItems;
  const story = t.aboutIntroBlocks;
  const team: any[] = t.founders.length ? t.founders : TEAM_PLACEHOLDER;
  return (
    <>
      <Hero eyebrow="About us" title={draft?.aboutTitle || "About us"} intro={story[0]} />
      <section className="tp-section pt-0">
        <div className="tp-wrap grid items-center gap-12 md:grid-cols-2 md:gap-20">
          <SlideIn>
            <div className="aspect-[4/5] overflow-hidden">
              {images[0] ? <img src={images[0]} alt="" className="h-full w-full object-cover" /> : <Placeholder text="Our story" />}
            </div>
          </SlideIn>
          <div>
            <SlideIn><Label>Our story</Label><h2 className="ld-h2-lg mt-6">{draft?.aboutPageStory || "Made for comfortable, easy stays."}</h2></SlideIn>
            {story.slice(1).map((text: string, index: number) => <SlideIn key={index} delay={0.08 + index * 0.04}><p className="ld-muted mt-6 text-[16px] leading-8">{text}</p></SlideIn>)}
          </div>
        </div>
      </section>
      {t.aboutNarrativeBlocks?.length ? (
        <section className="ld-dark py-24">
          <div className="tp-wrap grid gap-12 md:grid-cols-3">
            {t.aboutNarrativeBlocks.map((block: any, index: number) => (
              <SlideIn key={block.title} delay={index * 0.06}>
                <div className="border-t border-white/25 pt-6">
                  <p className="text-[13px] opacity-55">0{index + 1}</p>
                  <h3 className="mt-3 text-[24px]">{block.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 opacity-70">{block.body}</p>
                </div>
              </SlideIn>
            ))}
          </div>
        </section>
      ) : null}
      {/* The team always has its place on the page. Until the owner adds people in the builder, it
          shows neutral cards so the section never disappears. */}
      <section className="tp-section">
        <div className="tp-wrap">
          <SlideIn><Label>{c("about.team.eyebrow", "Our team")}</Label><h2 className="ld-h2 mb-12 mt-6">{c("about.founders.title", "Meet the team")}</h2></SlideIn>
          <Stagger className="grid gap-10 md:grid-cols-2">
            {team.map((founder: any, index: number) => (
              <article key={index} className="grid gap-6 sm:grid-cols-[150px_1fr]">
                <div className="aspect-square overflow-hidden">
                  {founder.image ? <img src={img(founder.image)} alt={founder.name} className="h-full w-full object-cover" /> : <Placeholder text={founder.name || "Team"} />}
                </div>
                <div>
                  <h3 className="text-[24px]">{founder.name || "Team member"}</h3>
                  <p className="ld-muted mt-1 text-[14px]">{founder.role || "Add a name and role in the website builder"}</p>
                  {founder.bio ? <p className="ld-muted mt-4 text-[15px] leading-7">{founder.bio}</p> : null}
                  {highlightLines(founder.highlights).map((line) => <p key={line} className="mt-2 text-sm font-medium">{line}</p>)}
                </div>
              </article>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
};

export const LodgeGallery: React.FC = () => {
  const { t, draft } = useTpl();
  return (
    <>
      <Hero eyebrow="Gallery" title={draft?.galleryPageHeading || "A look around"} intro="Rooms, shared spaces and the places around us." />
      <section className="tp-wrap pb-24">
        <div className="grid auto-rows-[220px] grid-cols-2 gap-4 md:auto-rows-[280px] md:grid-cols-3">
          {t.galleryItems.map((src: string, index: number) => (
            <SlideIn key={`${src}-${index}`} delay={Math.min(index * 0.03, 0.3)} className={index % 5 === 0 ? "md:row-span-2" : ""}>
              <button type="button" className="ld-rental-media h-full w-full overflow-hidden !rounded-lg" onClick={() => t.openGalleryViewer(index)}>
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </SlideIn>
          ))}
        </div>
      </section>
    </>
  );
};

export const LodgeTestimonials: React.FC = () => {
  const { t, draft, rating } = useTpl();
  return (
    <>
      <Hero eyebrow="Reviews" title={draft?.testimonialsPageHeading || "Guest reviews"} intro={draft?.testimonialsPageIntro} />
      <section className="tp-wrap pb-24">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-y py-7">
          <div>
            <p className="text-[56px] font-light leading-none">{rating.count ? rating.avg.toFixed(1) : "5.0"}</p>
            <div className="mt-3"><StarRow value={rating.avg || 5} /></div>
          </div>
          {t.showWriteReview ? <button type="button" className="ld-btn ld-btn-dark" onClick={t.openReviewModal}>Write a review</button> : null}
        </div>
        <Stagger className="grid gap-x-10 gap-y-12 md:grid-cols-2">
          {t.testimonials.map((item: any, index: number) => (
            <figure key={item.key || index} className="border-t pt-7" style={{ borderColor: "color-mix(in srgb,var(--t-text) 16%,transparent)" }}>
              <StarRow value={item.rating || 5} />
              <blockquote className="mt-5 text-[20px] leading-8">{item.text}</blockquote>
              <figcaption className="mt-6 text-[14px] font-medium">{item.name}{item.role ? <span className="ld-muted font-normal"> · {item.role}</span> : null}</figcaption>
            </figure>
          ))}
        </Stagger>
      </section>
    </>
  );
};

export const LodgeContact: React.FC = () => {
  const { t, draft, primary } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const showForm = draft?.contactEnableInquiryForm !== false;
  return (
    <>
      <Hero eyebrow="Contact us" title={draft?.contactPageHeading || "Get in touch"} intro={draft?.contactPageIntro} />
      <section className="tp-wrap grid gap-14 pb-24 lg:grid-cols-[1.2fr_.8fr] lg:gap-20">
        {showForm ? (
          <SlideIn>
            <div className="rounded-2xl border p-8" style={{ borderColor: "color-mix(in srgb,var(--t-text) 16%,transparent)" }}>
              <h2 className="ld-h2 mb-7">{primary?.leadEnabled ? primary.profile.labels.leadTitle : "Drop us your message!"}</h2>
              {primary?.leadEnabled ? (
                <LeadFormPanel service={primary} />
              ) : (
                <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />
              )}
            </div>
          </SlideIn>
        ) : null}
        <SlideIn delay={0.08}>
          <div className="space-y-9">
            {t.contactAddress ? <div><p className="text-[14px] font-medium">Address</p><p className="ld-muted mt-2 text-[15px] leading-7">{t.contactAddress}</p></div> : null}
            {t.contactPhone ? <div><p className="text-[14px] font-medium">Call us</p><a className="ld-muted mt-2 block text-[15px]" href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></div> : null}
            {t.contactEmail ? <div><p className="text-[14px] font-medium">Got a question?</p><a className="ld-muted mt-2 block text-[15px]" href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></div> : null}
            {hours.length ? <div><p className="text-[14px] font-medium">Hours</p><ul className="ld-muted mt-2 space-y-1 text-[15px]">{hours.map((row) => <li key={row.days}>{row.days}: {row.hours}</li>)}</ul></div> : null}
          </div>
        </SlideIn>
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

export const LodgePartner: React.FC = () => {
  const { t, draft } = useTpl();
  const paragraphs = String(t.partnerPageContent || "").split("\n").filter(Boolean);
  return (
    <>
      <Hero eyebrow="Partners" title={t.partnerPageHeading || `Partner with ${draft?.companyName || "us"}`} intro={paragraphs[0]} />
      <section className="tp-wrap grid gap-14 pb-24 md:grid-cols-[.9fr_1.1fr] md:gap-20">
        <SlideIn>
          <div className="space-y-6">
            {(paragraphs.slice(1).length ? paragraphs.slice(1) : [PARTNER_FALLBACK]).map((line: string, index: number) => <p key={index} className="ld-muted text-[16px] leading-8">{line}</p>)}
          </div>
        </SlideIn>
        <SlideIn delay={0.08}>
          <div className="rounded-2xl border p-8" style={{ borderColor: "color-mix(in srgb,var(--t-text) 16%,transparent)" }}>
            <h2 className="ld-h2 mb-7">{t.partnerFormTitle || "Get in touch"}</h2>
            <MessageForm inquiryType="Partnership" submitLabel="Send to our team" success="We've received your note and will be in touch soon." />
          </div>
        </SlideIn>
      </section>
    </>
  );
};

const PARTNER_FALLBACK = "Travel agents, local businesses and community groups are welcome. Tell us a little about yourself and how we could work together.";
