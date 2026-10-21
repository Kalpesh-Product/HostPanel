import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, Reveal, Stagger, motion } from "../motion";
import {
  groupByCategory,
  priceValue,
  uniqueCategories,
  type Service,
  type ServiceItem,
} from "../serviceAdapter";
import {
  getCareersJobMeta,
  getCareersJobTitle,
  getMediaSrc,
} from "../useWebsiteTemplateData";
import { FaqSection } from "../shared/TplParts";
import {
  ApplyForm,
  MessageForm,
  ReviewModal,
  RoleSection,
} from "../shared/TplForms";
import { LeadFormPanel } from "../shared/TplLead";
import {
  groupOpeningHours,
  highlightLines,
  priceWithUnit,
} from "../templateKit";
import { useTastyc } from "./TastycContext";
import {
  Icon,
  MenuRow,
  Placeholder,
  RatingStars,
  SectionTitle,
  ServiceTile,
} from "./TastycUI";

export { ReviewModal };

export const PageHero: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
  image?: string;
  children?: React.ReactNode;
}> = ({ eyebrow, title, sub, image, children }) => (
  <section className="tc-page-hero">
    {image ? <img src={image} alt="" className="tc-page-hero-image" /> : null}
    <div className="tc-wrap">
      {eyebrow ? (
        <Reveal y={10}>
          <p className="tc-kicker !text-[#e09357]">{eyebrow}</p>
        </Reveal>
      ) : null}
      <Reveal delay={0.06}>
        <h1 className="tc-h1 mt-4 max-w-5xl !text-[clamp(52px,8vw,108px)]">
          {title}
        </h1>
      </Reveal>
      {sub ? (
        <Reveal delay={0.12}>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-white/68">
            {sub}
          </p>
        </Reveal>
      ) : null}
      {children ? (
        <Reveal delay={0.18} className="mt-8">
          {children}
        </Reveal>
      ) : null}
    </div>
  </section>
);

export const ServicesIndex: React.FC = () => {
  const { services, draft, navLabel, c } = useTastyc();
  return (
    <>
      <PageHero
        eyebrow={c("services.index.eyebrow", "Our menu")}
        title={navLabel("products", draft?.productTitle || "What we serve")}
        sub={c(
          "services.index.sub",
          "Explore the menu, our rooms and everything else we offer.",
        )}
        image={services[0]?.heroImage}
      />
      <section className="tc-page-main">
        <div className="tc-wrap tc-service-grid">
          {services.map((service) => (
            <ServiceTile key={service.key} service={service} />
          ))}
        </div>
      </section>
    </>
  );
};

const MenuListing: React.FC<{ service: Service }> = ({ service }) => {
  const categories = uniqueCategories(service.items);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      service.items.filter(
        (item) =>
          (!category || item.category === category) &&
          (!query.trim() ||
            `${item.title} ${item.description} ${item.category}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [service.items, category, query],
  );
  const grouped = !category && !query && categories.length > 1;
  return (
    <section className="tc-page-main">
      <div className="tc-wrap">
        <div
          className="mb-12 flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center"
          style={{ borderColor: "var(--tc-line)" }}
        >
          <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              className="tp-tab"
              aria-pressed={!category}
              onClick={() => setCategory("")}
            >
              All
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                className="tp-tab whitespace-nowrap"
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <input
            className="tp-input md:!w-[260px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the menu"
            aria-label="Search menu"
          />
        </div>
        {!service.items.length ? (
          <p className="tc-muted py-20 text-center">
            The menu is being prepared.
          </p>
        ) : grouped ? (
          groupByCategory(service.items).map((group) => (
            <div key={group.category || "other"} className="mb-16">
              <div className="mb-5 flex items-center gap-5">
                <h2 className="tc-h3">{group.category || "Menu"}</h2>
                <span
                  className="h-px flex-1"
                  style={{ background: "var(--tc-line)" }}
                />
              </div>
              <div className="tc-menu-grid">
                {group.items.map((item, index) => (
                  <MenuRow
                    key={item.key}
                    service={service}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            <p className="tc-muted mb-5 text-[12px] uppercase tracking-widest">
              {filtered.length} items
            </p>
            <div className="tc-menu-grid">
              {filtered.map((item, index) => (
                <MenuRow
                  key={item.key}
                  service={service}
                  item={item}
                  index={index}
                />
              ))}
            </div>
            {!filtered.length ? (
              <div className="py-20 text-center">
                <h2 className="tc-h3">Nothing matches that</h2>
                <button
                  type="button"
                  className="tc-btn tc-btn-ghost mt-6"
                  onClick={() => {
                    setCategory("");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
};

const OfferListing: React.FC<{ service: Service }> = ({ service }) => {
  const [sort, setSort] = useState("recommended");
  const items = useMemo(
    () =>
      sort === "price-asc"
        ? [...service.items].sort((a, b) => priceValue(a) - priceValue(b))
        : sort === "price-desc"
          ? [...service.items].sort((a, b) => priceValue(b) - priceValue(a))
          : service.items,
    [service.items, sort],
  );
  const { goToItem, openLead } = useTastyc();
  return (
    <section className="tc-page-main">
      <div className="tc-wrap">
        <div className="mb-8 flex justify-end">
          <select
            className="tp-input !w-auto"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
        <div className="tc-product-grid">
          {items.map((item, index) => (
            <Reveal key={item.key} delay={Math.min(index * 0.05, 0.25)}>
              <article className="tc-product">
                <button
                  type="button"
                  className="tc-product-image block w-full"
                  onClick={() => goToItem(service, item)}
                >
                  {item.image ? (
                    <img src={item.image} alt="" />
                  ) : (
                    <Placeholder text={item.title} />
                  )}
                </button>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="tc-serif text-[25px]">{item.title}</h3>
                    {item.price ? (
                      <strong className="tc-price">
                        {priceWithUnit(item.price, item.priceUnit)}
                      </strong>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="tc-muted mt-3 line-clamp-3 text-[13px] leading-6">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      className="tc-link"
                      onClick={() => goToItem(service, item)}
                    >
                      Details
                    </button>
                    {service.leadEnabled ? (
                      <button
                        type="button"
                        className="tc-btn tc-btn-primary !min-h-[42px] !px-4"
                        onClick={() => openLead(service, item)}
                      >
                        Enquire
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { openLead, c } = useTastyc();
  const page = service.page || {};
  return (
    <>
      <PageHero
        eyebrow={service.profile.labels.listing}
        title={service.heroHeading || service.name}
        sub={service.heroSubHeading || service.subText}
        image={service.heroImage}
      >
        {service.leadEnabled ? (
          <button
            type="button"
            className="tc-btn tc-btn-primary"
            onClick={() => openLead(service)}
          >
            {page.heroButtonText || service.profile.labels.cta}
          </button>
        ) : null}
      </PageHero>
      {service.profile.presenter === "menu" ? (
        <MenuListing service={service} />
      ) : (
        <OfferListing service={service} />
      )}
      {service.leadEnabled ? (
        <section className="tc-hours">
          <div className="tc-wrap grid gap-10 py-16 md:grid-cols-[.75fr_1.25fr] md:py-24">
            <div>
              <p className="tc-kicker !text-[#e09357]">
                {c("services.reserve.eyebrow", "Reservation")}
              </p>
              <h2 className="tc-h2 mt-4 text-white">
                {service.profile.labels.leadTitle}
              </h2>
              <p className="mt-5 text-[14px] leading-7 text-white/58">
                {c(
                  "services.reserve.sub",
                  "Choose a date, share a few details and our team will confirm everything with you.",
                )}
              </p>
            </div>
            <div className="bg-white p-6 text-[#1a1715] md:p-9">
              <LeadFormPanel service={service} />
            </div>
          </div>
        </section>
      ) : null}
      {page.faqEnabled !== false ? <FaqSection faqs={page.faqs} /> : null}
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { goToService, openLead } = useTastyc();
  const [shot, setShot] = useState(0);
  useEffect(() => setShot(0), [item.key]);
  const images = item.images?.length
    ? item.images
    : item.image
      ? [item.image]
      : [];
  return (
    <>
      <PageHero
        eyebrow={service.name}
        title={item.title}
        sub={item.description}
        image={images[0]}
      />
      <section className="tc-page-main">
        <div className="tc-wrap">
          <button
            type="button"
            className="tc-link mb-9"
            onClick={() => goToService(service)}
          >
            Back to {service.name}
          </button>
          <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
            <div>
              <div className="aspect-[4/3] overflow-hidden bg-[var(--tc-ink)]">
                {images[shot] ? (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={images[shot]}
                      src={images[shot]}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  </AnimatePresence>
                ) : (
                  <Placeholder text={item.title} />
                )}
              </div>
              {images.length > 1 ? (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {images.slice(0, 8).map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      className={`aspect-square overflow-hidden border-2 ${shot === index ? "border-[var(--tc-orange)]" : "border-transparent"}`}
                      onClick={() => setShot(index)}
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <p className="tc-kicker">
                {item.category || service.profile.labels.item}
              </p>
              <h2 className="tc-h2 mt-3">{item.title}</h2>
              {item.price ? (
                <p className="tc-serif mt-5 text-[30px] text-[var(--t-accent-fg)]">
                  {priceWithUnit(item.price, item.priceUnit)}
                </p>
              ) : null}
              {item.description ? (
                <p className="tc-muted mt-6 whitespace-pre-line text-[15px] leading-7">
                  {item.description}
                </p>
              ) : null}
              {item.chips?.length ? (
                <div className="mt-7 flex flex-wrap gap-2">
                  {item.chips.map((chip) => (
                    <span key={chip} className="tc-tag">
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
              {service.leadEnabled ? (
                <button
                  type="button"
                  className="tc-btn tc-btn-primary mt-8"
                  onClick={() => openLead(service, item)}
                >
                  {service.profile.labels.cta}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export const TastycAbout: React.FC = () => {
  const { t, draft, navLabel, c } = useTastyc();
  const intro: string[] = t.aboutIntroBlocks || [];
  const narrative: any[] = t.aboutNarrativeBlocks || [];
  const founders: any[] = t.founders || [];
  const team: any[] = t.aboutPageImageCards || [];
  const images: string[] = (draft?.aboutPageImages || [])
    .map((item: any) => getMediaSrc(item))
    .filter(Boolean);
  return (
    <>
      <PageHero
        eyebrow={c("about.eyebrow", "About us")}
        title={navLabel("about", draft?.aboutTitle || "Our story")}
        sub={intro[0]}
        image={images[0] || getMediaSrc(team[0]?.image)}
      />
      <section className="tc-page-main">
        <div className="tc-wrap">
          {intro.slice(1).length ? (
            <div className="grid gap-8 md:grid-cols-2">
              {intro.slice(1).map((text, index) => (
                <Reveal key={index}>
                  <p className="tc-serif text-[clamp(24px,3vw,36px)] leading-[1.35]">
                    {text}
                  </p>
                </Reveal>
              ))}
            </div>
          ) : null}
          {narrative.length ? (
            <div className="mt-20">
              {narrative.map((block, index) => (
                <Reveal key={block.title || index}>
                  <div
                    className="grid gap-5 border-t py-10 md:grid-cols-[.4fr_1.6fr] md:py-14"
                    style={{ borderColor: "var(--tc-line)" }}
                  >
                    <div>
                      <span className="tc-kicker">0{index + 1}</span>
                      <h2 className="tc-h3 mt-3">{block.title}</h2>
                    </div>
                    <p className="tc-muted whitespace-pre-line text-[15px] leading-7">
                      {block.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      {founders.length ? (
        <section className="tc-section bg-[var(--tc-ink)] text-white">
          <div className="tc-wrap">
            <SectionTitle
              light
              eyebrow={c("about.founders.eyebrow", "The people")}
              title={c("about.founders.title", "Meet the founders")}
            />
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {founders.map((person, index) => (
                <Reveal key={person.name || index} delay={index * 0.06}>
                  <article className="grid gap-5 border border-white/15 p-5 sm:grid-cols-[170px_1fr]">
                    <div className="aspect-[4/5] overflow-hidden">
                      {person.image ? (
                        <img
                          src={getMediaSrc(person.image)}
                          alt={person.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Placeholder text={person.name} />
                      )}
                    </div>
                    <div>
                      <h3 className="tc-serif text-[27px]">{person.name}</h3>
                      {person.role ? (
                        <p className="tc-kicker mt-2 !text-[#e09357]">
                          {person.role}
                        </p>
                      ) : null}
                      {person.bio ? (
                        <p className="mt-4 text-[13px] leading-6 text-white/58">
                          {person.bio}
                        </p>
                      ) : null}
                      {highlightLines(person.highlights).length ? (
                        <ul className="mt-4 space-y-1 text-[11px] text-white/72">
                          {highlightLines(person.highlights).map((line) => (
                            <li key={line}>— {line}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {team.length ? (
        <section className="tc-section">
          <div className="tc-wrap">
            <SectionTitle
              eyebrow={c("about.team.eyebrow", "Our team")}
              title={draft?.aboutPageTeamHeading || "Meet the baristas"}
            />
            <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4">
              {team.map((card, index) => (
                <Reveal key={card.title || index} delay={index * 0.05}>
                  <div className="aspect-[4/5] overflow-hidden bg-[var(--tc-ink)]">
                    {getMediaSrc(card.image) ? (
                      <img
                        src={getMediaSrc(card.image)}
                        alt={card.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Placeholder text={card.title} />
                    )}
                  </div>
                  <h3 className="tc-serif mt-4 text-[21px]">{card.title}</h3>
                  {card.description ? (
                    <p className="tc-muted mt-1 text-[12px]">
                      {card.description}
                    </p>
                  ) : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const TastycGallery: React.FC = () => {
  const { t, draft, navLabel, c } = useTastyc();
  const items: string[] = t.galleryItems || [];
  return (
    <>
      <PageHero
        eyebrow={c("gallery.eyebrow", "Gallery")}
        title={draft?.galleryPageHeading || navLabel("gallery", "Gallery")}
        sub={
          items.length ? `${items.length} moments from our space` : undefined
        }
        image={items[0]}
      />
      <section className="tc-page-main">
        <div className="tc-gallery-grid">
          {items.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className="tc-gallery-item"
              onClick={() => t.openGalleryViewer(index)}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export const TastycTestimonials: React.FC = () => {
  const { t, draft, navLabel, c, rating } = useTastyc();
  const items = t.testimonials || [];
  return (
    <>
      <PageHero
        eyebrow={c("reviews.eyebrow", "Testimonials")}
        title={navLabel("testimonials", "What visitors say")}
        sub={
          rating.count
            ? `${rating.avg.toFixed(1)} average from ${rating.count} reviews`
            : undefined
        }
        image={t.galleryItems?.[1]}
      />
      <section className="tc-page-main">
        <div className="tc-wrap grid gap-x-14 md:grid-cols-2">
          {items.map((item: any, index: number) => (
            <Reveal
              key={item.id || index}
              delay={Math.min(index * 0.04, 0.2)}
              className="tc-testimonial"
            >
              <RatingStars value={Number(item.rating) || 5} />
              <blockquote className="tc-serif mt-5 text-[27px] leading-[1.35]">
                “
                {item.review || item.testimony || item.text || item.description}
                ”
              </blockquote>
              <p className="tc-kicker mt-6">
                {item.reviewerName || item.name || "Guest"}
              </p>
            </Reveal>
          ))}
        </div>
        {t.showWriteReview ? (
          <div className="mt-12 text-center">
            <button
              type="button"
              className="tc-btn tc-btn-primary"
              onClick={t.openReviewModal}
            >
              {c("reviews.write", "Write a review")}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
};

export const TastycPartner: React.FC = () => {
  const { t, draft, navLabel, c } = useTastyc();
  const body =
    t.partnerPageContent ||
    c("partner.intro", "Tell us how you would like to work together.");
  return (
    <>
      <PageHero
        eyebrow={c("partner.eyebrow", "Partnerships")}
        title={t.partnerPageHeading || navLabel("partner", "Partner with us")}
        sub={body}
        image={t.galleryItems?.[2]}
      />
      <section className="tc-page-main">
        <div className="tc-wrap grid gap-12 md:grid-cols-[.8fr_1.2fr]">
          <div>
            <SectionTitle
              eyebrow="Collaborate"
              title={t.partnerFormTitle || "Start a conversation"}
              copy={body}
            />
          </div>
          <div className="border border-[var(--tc-line)] bg-white/45 p-6 md:p-9">
            <MessageForm
              inquiryType="Partnership"
              submitLabel="Send proposal"
              success="Thank you. Our team will be in touch shortly."
            />
          </div>
        </div>
      </section>
    </>
  );
};

export const TastycContact: React.FC = () => {
  const { t, draft, navLabel, c } = useTastyc();
  const hours = groupOpeningHours(draft?.openingHours);
  return (
    <>
      <PageHero
        eyebrow={c("contact.eyebrow", "Contact")}
        title={draft?.contactTitle || navLabel("contact", "Come say hello")}
        sub={t.contactAddress}
        image={t.galleryItems?.[3] || t.heroImages?.[0]}
      />
      <section className="tc-page-main">
        <div className="tc-wrap grid gap-12 md:grid-cols-[.85fr_1.15fr]">
          <div>
            <SectionTitle
              eyebrow={c("contact.details.eyebrow", "Find us")}
              title={c(
                "contact.details.title",
                "Coffee tastes better together",
              )}
            />{" "}
            <div className="mt-10 space-y-7 text-[14px]">
              {t.contactAddress ? (
                <div className="flex gap-4">
                  {Icon.map(22)}
                  <div>
                    <p className="tc-kicker mb-2">Address</p>
                    <p className="tc-muted leading-6">{t.contactAddress}</p>
                  </div>
                </div>
              ) : null}
              {t.contactPhone ? (
                <div className="flex gap-4">
                  {Icon.phone(22)}
                  <div>
                    <p className="tc-kicker mb-2">Call</p>
                    <a
                      href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}
                    >
                      {t.contactPhone}
                    </a>
                  </div>
                </div>
              ) : null}
              {hours.length ? (
                <div className="flex gap-4">
                  {Icon.clock(22)}
                  <div className="flex-1">
                    <p className="tc-kicker mb-2">Hours</p>
                    {hours.map((row) => (
                      <p
                        key={row.days}
                        className="tc-muted flex justify-between gap-5 border-b py-2 text-[12px]"
                        style={{ borderColor: "var(--tc-line)" }}
                      >
                        <span>{row.days}</span>
                        <strong>{row.hours}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {draft?.contactEnableInquiryForm !== false ? (
            <div className="border border-[var(--tc-line)] bg-white/45 p-6 md:p-9">
              <h2 className="tc-h3 mb-7">Send a message</h2>
              <MessageForm
                inquiryType="Contact"
                submitLabel="Send message"
                success="Thanks. We will get back to you shortly."
              />
            </div>
          ) : null}
        </div>
      </section>
      {draft?.mapUrl ? (
        <section className="pb-[clamp(72px,9vw,130px)]">
          <div className="tc-wrap">
            <iframe
              title="Map"
              src={draft.mapUrl}
              loading="lazy"
              className="h-[360px] w-full border-0 md:h-[520px]"
            />
          </div>
        </section>
      ) : null}
    </>
  );
};

export const TastycCareers: React.FC = () => {
  const { t, draft } = useTastyc();
  const job = t.careersApplyJob;
  if (job) {
    const applyOnly = t.careersDirectApply;
    const tab = applyOnly ? "apply" : t.careersDetailTab;
    return (
      <>
        <PageHero
          eyebrow={applyOnly ? "Open application" : job.department || "Careers"}
          title={applyOnly ? "General application" : getCareersJobTitle(job)}
          sub={applyOnly ? undefined : getCareersJobMeta(job)}
          image={t.galleryItems?.[4]}
        />
        <section className="tc-page-main">
          <div className="tc-wrap">
            <button
              type="button"
              className="tc-link mb-8"
              onClick={t.closeCareersJob}
            >
              All roles
            </button>
            {!applyOnly ? (
              <div className="mb-8 flex gap-2">
                <button
                  type="button"
                  className="tp-tab"
                  aria-pressed={tab === "description"}
                  onClick={() => t.setCareersDetailTab("description")}
                >
                  Description
                </button>
                <button
                  type="button"
                  className="tp-tab"
                  aria-pressed={tab === "apply"}
                  onClick={() => t.setCareersDetailTab("apply")}
                >
                  Apply
                </button>
              </div>
            ) : null}
            {tab === "description" ? (
              <div className="space-y-9 border border-[var(--tc-line)] p-7 md:p-10">
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
                <button
                  type="button"
                  className="tc-btn tc-btn-primary"
                  onClick={() => t.setCareersDetailTab("apply")}
                >
                  Apply now
                </button>
              </div>
            ) : (
              <div className="border border-[var(--tc-line)] p-7 md:p-10">
                <ApplyForm />
              </div>
            )}
          </div>
        </section>
      </>
    );
  }
  const intro = String(draft?.careersPageIntro || "")
    .split("\n")
    .filter(Boolean);
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={
          draft?.careersPageHeading ||
          `Join ${draft?.companyName || "our team"}`
        }
        sub={intro[0] || t.careersFallbackIntro?.[0]}
        image={t.galleryItems?.[4]}
      />
      <section className="tc-page-main">
        <div className="tc-wrap">
          {t.careersJobsLoading ? (
            <p className="tc-muted text-center">Loading open roles…</p>
          ) : !t.careersJobs.length ? (
            <div className="border border-[var(--tc-line)] p-10 text-center">
              <h2 className="tc-h3">No openings right now</h2>
              <p className="tc-muted mt-3">
                Send a general application and tell us how you would like to
                contribute.
              </p>
              <button
                type="button"
                className="tc-btn tc-btn-primary mt-7"
                onClick={t.openCareersGeneralApply}
              >
                General application
              </button>
            </div>
          ) : (
            <Stagger className="space-y-8">
              {t.careersDepartmentSections.map((department: any) => (
                <section
                  key={department.department}
                  className="border-t pt-7"
                  style={{ borderColor: "var(--tc-line)" }}
                >
                  <div className="mb-5 flex items-baseline justify-between">
                    <h2 className="tc-h3">{department.department}</h2>
                    <span className="tc-tag">
                      {department.jobs.length} open
                    </span>
                  </div>
                  {department.jobs.map((item: any) => (
                    <button
                      key={getCareersJobTitle(item)}
                      type="button"
                      className="group flex w-full items-center justify-between gap-5 border-b py-5 text-left"
                      style={{ borderColor: "var(--tc-line)" }}
                      onClick={() => t.openCareersJob(item)}
                    >
                      <span>
                        <strong className="tc-serif block text-[22px]">
                          {getCareersJobTitle(item)}
                        </strong>
                        <span className="tc-muted mt-1 block text-[11px] uppercase tracking-widest">
                          {getCareersJobMeta(item)}
                        </span>
                      </span>
                      <span className="transition group-hover:translate-x-1">
                        {Icon.arrow()}
                      </span>
                    </button>
                  ))}
                </section>
              ))}
            </Stagger>
          )}
        </div>
      </section>
    </>
  );
};
