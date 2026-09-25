import React, { useState } from "react";
import { AnimatePresence, Marquee, Reveal, Stagger, motion } from "../motion";
import { groupOpeningHours } from "../templateKit";
import { groupByCategory, uniqueCategories, type Service } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { Icon, ItemCard, Placeholder, SectionHead, StarRow, TileGrid } from "./SavorUI";
import { useSavor } from "./SavorContext";

/* ───────────────────────── hero ───────────────────────── */

const Hero: React.FC = () => {
  const { t, draft, primary, profile, rating, status, openLead, goToService } = useSavor();
  const images: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const image = images.length ? images[t.heroIndex % images.length] : "";
  const hasLead = Boolean(primary?.leadEnabled);
  const spotlight = primary?.items.find((i) => i.popular || i.featured || i.badge) || primary?.items[0];
  const itemCount = primary?.items.length || 0;

  return (
    <section className="relative overflow-hidden pt-28 md:pt-36">
      <div className="tp-blob" style={{ width: 460, height: 460, top: -120, right: -120 }} />
      <div className="tp-blob" style={{ width: 340, height: 340, bottom: -80, left: -100, opacity: 0.3 }} />
      <div className="tp-wrap relative grid items-center gap-10 pb-16 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:pb-24">
        <div>
          <Reveal y={16}>
            <span className="tp-chip tp-chip-accent">
              {status ? (
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: status.open ? "#1f9d55" : "#c0392b" }} />
              ) : null}
              {status?.text || "Welcome"}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="tp-h1 mt-5">{draft?.title || draft?.companyName}</h1>
          </Reveal>
          {draft?.subTitle ? (
            <Reveal delay={0.16}>
              <p className="tp-lead mt-6 max-w-xl">{draft.subTitle}</p>
            </Reveal>
          ) : null}
          <Reveal delay={0.24} className="mt-8 flex flex-wrap gap-3">
            {hasLead && primary ? (
              <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>
                {draft?.CTAButtonText || profile.labels.cta} {Icon.arrow()}
              </button>
            ) : (
              <button type="button" className="tp-btn tp-btn-primary" onClick={() => t.goToSection("contact")}>
                {draft?.CTAButtonText || "Get in touch"} {Icon.arrow()}
              </button>
            )}
            {primary ? (
              <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToService(primary)}>
                {primary.kind === "menu" ? "See the menu" : `Explore ${profile.labels.listing.toLowerCase()}`}
              </button>
            ) : null}
          </Reveal>
          <Reveal delay={0.32} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            {rating.count > 0 ? (
              <div className="flex items-center gap-3">
                <span className="tp-display text-[34px]">{rating.avg.toFixed(1)}</span>
                <div>
                  <StarRow value={rating.avg} />
                  <p className="tp-muted mt-0.5 text-[12px]">{rating.count} review{rating.count > 1 ? "s" : ""}</p>
                </div>
              </div>
            ) : null}
            {itemCount > 0 ? (
              <div>
                <p className="tp-display text-[34px]">{itemCount}</p>
                <p className="tp-muted text-[12px]">{itemCount === 1 ? profile.labels.item : profile.labels.items} to choose from</p>
              </div>
            ) : null}
          </Reveal>
        </div>

        <Reveal delay={0.12} y={40} className="relative">
          <div className="tp-zoom relative aspect-[4/5] overflow-hidden md:aspect-[5/6]" style={{ borderRadius: 44 }}>
            <AnimatePresence mode="sync">
              {image ? (
                <motion.img
                  key={image}
                  src={image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                />
              ) : (
                <div className="absolute inset-0"><Placeholder text={draft?.companyName || ""} /></div>
              )}
            </AnimatePresence>
          </div>
          {spotlight ? (
            <motion.div
              className="tp-card absolute -bottom-6 -left-3 flex w-[250px] items-center gap-3 p-3 md:-left-10"
              style={{ borderRadius: 24, boxShadow: "0 24px 50px -24px rgba(0,0,0,.4)" }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                {spotlight.image ? <img src={spotlight.image} alt="" className="h-full w-full object-cover" /> : <Placeholder text={spotlight.title} />}
              </div>
              <div className="min-w-0">
                <p className="tp-eyebrow" style={{ fontSize: 10 }}>{spotlight.badge || "Favourite"}</p>
                <p className="tp-display truncate text-[17px]">{spotlight.title}</p>
                {spotlight.price ? <p className="text-[13px] font-bold" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{spotlight.price}</p> : null}
              </div>
            </motion.div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── service showcase ───────────────────────── */

const CategoryTiles: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService } = useSavor();
  const groups = groupByCategory(service.items).filter((g) => g.category);
  if (groups.length < 2) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow="Browse" title="Pick your craving" />
        <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {groups.slice(0, 8).map((group) => {
            const cover = group.items.find((i) => i.image)?.image;
            return (
              <button
                key={group.category}
                type="button"
                onClick={() => goToService(service, { category: group.category })}
                className="tp-card tp-card-hover group relative block aspect-[4/5] w-full overflow-hidden text-left"
                style={{ borderRadius: 28 }}
              >
                <div className="tp-zoom absolute inset-0">
                  {cover ? <img src={cover} alt="" loading="lazy" /> : <Placeholder text={group.category} />}
                </div>
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.72), transparent 62%)" }} />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
                  <h3 className="text-[22px] md:text-[26px]">{group.category}</h3>
                  <p className="mt-1 text-[12px] font-semibold opacity-80">{group.items.length} {group.items.length === 1 ? "item" : "items"}</p>
                </div>
              </button>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
};

const Showcase: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService } = useSavor();
  const featured = service.items.filter((i) => i.popular || i.featured || i.badge);
  const rest = service.items.filter((i) => !featured.includes(i));
  // Favourites first, topped up so the grid always ends on a full row.
  const list = (featured.length >= 3 ? [...featured, ...rest] : service.items).slice(0, 6);
  if (!list.length) return null;
  const isMenu = service.profile.presenter === "menu";
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead
          eyebrow={isMenu ? "From our kitchen" : service.profile.labels.listing}
          title={isMenu ? "Favourites people keep coming back for" : service.heading}
          sub={isMenu ? undefined : service.subText}
          action={
            <button type="button" className="tp-link" onClick={() => goToService(service)}>
              {isMenu ? "View the full menu" : "See everything"} <span className="tp-arrow">{Icon.arrow()}</span>
            </button>
          }
        />
        <div className={`grid gap-5 sm:grid-cols-2 ${isMenu ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}>
          {list.map((item, index) => (
            <ItemCard key={item.key} item={item} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── story ───────────────────────── */

const Story: React.FC = () => {
  const { t, draft } = useSavor();
  const blocks: string[] = t.aboutBlocks
    .map((block: any) => (typeof block === "string" ? block : block?.text))
    .map((text: string) => String(text || "").trim())
    .filter(Boolean);
  const image = t.aboutPageImageCards?.[0]?.image || t.homeGalleryItems?.[1] || t.homeGalleryItems?.[0] || "";
  if (!blocks.length && !draft?.aboutTitle) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <Reveal className="tp-zoom relative aspect-[4/3.4] overflow-hidden" y={30}>
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 40 }}>
            {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Placeholder text={draft?.companyName || ""} />}
          </div>
        </Reveal>
        <div>
          <Reveal><p className="tp-eyebrow mb-3">Our story</p></Reveal>
          <Reveal delay={0.06}><h2 className="tp-h2">{draft?.aboutTitle || `About ${draft?.companyName || "us"}`}</h2></Reveal>
          <Stagger className="mt-6 space-y-4">
            {blocks.slice(0, 3).map((text, index) => (
              <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16px] leading-relaxed"}>{text}</p>
            ))}
          </Stagger>
          <Reveal delay={0.2}>
            <button type="button" className="tp-link mt-8" onClick={() => t.goToSection("about")}>
              More about us <span className="tp-arrow">{Icon.arrow()}</span>
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── hours + reserve ───────────────────────── */

const HoursReserve: React.FC = () => {
  const { t, draft, primary, profile, openLead, status } = useSavor();
  const hours = groupOpeningHours(draft?.openingHours);
  const hasLead = Boolean(primary?.leadEnabled);
  if (!hours.length && !hasLead && !draft?.contactBusinessHours) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-accent-panel relative overflow-hidden p-8 md:p-14">
            <div className="tp-blob" style={{ width: 380, height: 380, right: -100, top: -140, background: "rgba(255,255,255,.25)", opacity: 0.6 }} />
            <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] opacity-80">{status?.text || "Come by"}</p>
                <h2 className="tp-h2 mt-3" style={{ color: "inherit" }}>
                  {hasLead ? profile.labels.cta : "Visit us"}
                </h2>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed opacity-90">
                  {primary?.kind === "menu"
                    ? "Pick a date and time and we'll keep a table ready for you."
                    : "Tell us what you need and we'll get back to you shortly."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {hasLead && primary ? (
                    <button type="button" className="tp-btn tp-btn-light" onClick={() => openLead(primary)}>{profile.labels.cta} {Icon.arrow()}</button>
                  ) : null}
                  {t.contactPhone ? (
                    <a className="tp-btn" style={{ border: "1.5px solid rgba(255,255,255,.55)", color: "inherit" }} href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                      {Icon.phone()} {t.contactPhone}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="rounded-[26px] p-6" style={{ background: "rgba(255,255,255,.14)", backdropFilter: "blur(6px)" }}>
                <p className="mb-4 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] opacity-85">{Icon.clock()} Opening hours</p>
                {hours.length ? (
                  <ul className="space-y-3 text-[15px]">
                    {hours.map((row) => (
                      <li key={row.days} className="flex justify-between gap-4 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "rgba(255,255,255,.2)" }}>
                        <span className="opacity-85">{row.days}</span>
                        <span className="font-bold">{row.hours}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] font-semibold">{draft?.contactBusinessHours}</p>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── reviews ───────────────────────── */

export const ReviewCard: React.FC<{ item: any; index?: number }> = ({ item, index = 0 }) => {
  const [open, setOpen] = useState(false);
  const long = String(item.text || "").length > 190;
  return (
    <Reveal delay={Math.min(index * 0.06, 0.3)} className="mb-5 break-inside-avoid">
      <figure className="tp-card p-6">
        <StarRow value={item.rating || 5} />
        <blockquote className={`mt-3 text-[15px] leading-relaxed ${long && !open ? "tp-clamp3" : ""}`}>{item.text}</blockquote>
        {long ? (
          <button type="button" className="tp-link mt-2 !text-[13px]" onClick={() => setOpen((v) => !v)}>
            {open ? "Show less" : "Read more"}
          </button>
        ) : null}
        <figcaption className="mt-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full tp-display text-[16px]" style={{ background: "color-mix(in srgb, var(--t-accent) 18%, transparent)", color: "var(--t-accent-fg, var(--t-accent))" }}>
            {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
          </span>
          <span>
            <span className="block text-[14px] font-bold">{item.name}</span>
            {item.role ? <span className="tp-muted block text-[12px]">{item.role}</span> : null}
          </span>
        </figcaption>
      </figure>
    </Reveal>
  );
};

const Reviews: React.FC = () => {
  const { t, rating } = useSavor();
  const list: any[] = t.testimonials.slice(0, Math.max(3, Number(t.draft?.testimonialsHomePreviewCount) || 3));
  if (!list.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead
          eyebrow="Kind words"
          title={rating.count ? `Rated ${rating.avg.toFixed(1)} by people like you` : "What people say"}
          action={
            <button type="button" className="tp-link" onClick={() => t.goToSection("testimonials")}>
              All reviews <span className="tp-arrow">{Icon.arrow()}</span>
            </button>
          }
        />
        <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
          {list.map((item, index) => <ReviewCard key={item.key || index} item={item} index={index} />)}
        </div>
        {t.showWriteReview ? (
          <div className="mt-10 flex justify-center">
            <button type="button" className="tp-btn tp-btn-primary" onClick={t.openReviewModal}>Write a review {Icon.arrow()}</button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

/* ───────────────────────── gallery, inclusions, other services ───────────────────────── */

const GalleryStrip: React.FC = () => {
  const { t } = useSavor();
  const items: string[] = t.homeGalleryItems;
  if (!items.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead
          eyebrow="Gallery"
          title="A peek inside"
          action={<button type="button" className="tp-link" onClick={() => t.goToSection("gallery")}>See all photos <span className="tp-arrow">{Icon.arrow()}</span></button>}
        />
      </div>
      <div className="tp-scroll-x px-5 md:px-8" style={{ scrollPaddingLeft: 20 }}>
        {items.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => t.openGalleryViewer(index)}
            className="tp-zoom block overflow-hidden"
            style={{ width: index % 3 === 1 ? 300 : 380, height: 380, borderRadius: 30 }}
            aria-label={`Open photo ${index + 1}`}
          >
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
};

export const InclusionsStrip: React.FC<{ inclusions?: any[]; title?: string }> = ({ inclusions, title = "Included" }) => {
  const enabled = (inclusions || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="tp-wrap">
        <p className="tp-eyebrow mb-6 text-center">{title}</p>
        <Stagger className="flex flex-wrap justify-center gap-x-6 gap-y-8">
          {enabled.map((item, index) => {
            const { label, icon } = getInclusionMeta(item);
            return (
              <div key={item?.key || index} className="flex w-28 flex-col items-center gap-2 text-center">
                <span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider tp-muted">{label}</span>
              </div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
};

const MoreServices: React.FC<{ services: Service[] }> = ({ services }) => {
  if (!services.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow="More from us" title="Everything under one roof" />
        <TileGrid services={services} cols={3} />
      </div>
    </section>
  );
};

/* ───────────────────────── closing CTA ───────────────────────── */

const ClosingCta: React.FC = () => {
  const { t, draft, primary, profile, openLead } = useSavor();
  if (!t.isSectionEnabled("home_contact")) return null;
  const hasLead = Boolean(primary?.leadEnabled);
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-dark-panel p-8 text-center md:p-16">
            <h2 className="tp-h2 mx-auto max-w-3xl" style={{ color: "inherit" }}>
              {draft?.contactTitle || "Let's talk"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] opacity-80">
              {t.contactAddress || "Questions, bookings or just saying hello — we'd love to hear from you."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {hasLead && primary ? (
                <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{profile.labels.cta}</button>
              ) : null}
              <button type="button" className="tp-btn" style={{ border: "1.5px solid rgba(255,255,255,.4)", color: "inherit" }} onClick={() => t.goToSection("contact")}>
                Contact us
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── page ───────────────────────── */

export const SavorHome: React.FC = () => {
  const { t, draft, primary, services } = useSavor();
  const others = services.filter((service) => service.key !== primary?.key);
  const categories = primary ? uniqueCategories(primary.items) : [];

  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero /> : <div className="pt-24" />}

      {categories.length > 1 ? (
        <div className="py-5" style={{ background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
          <Marquee speed={38}>
            {categories.concat(categories).map((category, index) => (
              <span key={`${category}-${index}`} className="tp-display flex items-center gap-10 whitespace-nowrap text-[26px]">
                {category} <span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>✦</span>
              </span>
            ))}
          </Marquee>
        </div>
      ) : null}

      {t.isSectionEnabled("home_products") && primary ? (
        <>
          {primary.profile.presenter === "menu" ? <CategoryTiles service={primary} /> : null}
          <Showcase service={primary} />
        </>
      ) : null}

      {t.isSectionEnabled("home_inclusions") ? <InclusionsStrip inclusions={draft?.inclusions} /> : null}
      {t.isSectionEnabled("home_about") ? <Story /> : null}
      <HoursReserve />
      {others.length && t.isSectionEnabled("home_products") ? <MoreServices services={others} /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {t.isSectionEnabled("home_gallery") ? <GalleryStrip /> : null}
      <ClosingCta />
    </>
  );
};

