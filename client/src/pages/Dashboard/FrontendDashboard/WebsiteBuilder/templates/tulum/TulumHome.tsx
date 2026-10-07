import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { getInclusionMeta } from "../inclusionIcons";
import { Eyebrow, LineIcon, OutlinePill, Reveal, Tick, capacityLine } from "./TulumUI";

const urlOf = (value: any): string => (typeof value === "string" ? value : value?.url || "");

/** Full-bleed video (when the owner linked one) or photo, with the title, price line and spec strip. */
const Hero: React.FC<{ image: string }> = ({ image }) => {
  const { t, draft, primary, openLead, c } = useTpl();
  const video = String(draft?.heroVideoUrl || "").trim();
  const first: any = primary?.items?.[0];
  const specs = [
    { icon: "building" as const, text: c("home.hero.spec1", draft?.address?.split(",")[0] || "Front beach") },
    { icon: "sofa" as const, text: c("home.hero.spec2", `${first?.capacity || 2} guests`) },
    { icon: "sparkle" as const, text: c("home.hero.spec3", "Concierge, 24 hours") },
  ];
  return (
    <section id="tk-hero" className="tk-hero">
      {video ? (
        <video src={video} poster={image || undefined} autoPlay muted loop playsInline />
      ) : image ? (
        <img src={image} alt="" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--t-accent) 40%, var(--t-bg)), var(--t-bg))" }}>
          <Placeholder text={draft?.companyName || ""} />
        </div>
      )}
      <div className="tk-hero-veil" aria-hidden="true" />
      <div className="tp-wrap relative z-[2] flex h-full flex-col justify-end pb-24 md:pb-36">
        <h1 className="tk-h1 text-[#f1f1ed]">{draft?.title || draft?.companyName}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <p className="tk-h3 whitespace-nowrap text-[#f1f1ed]">{first ? priceWithUnit(first.price, first.priceUnit) : ""}</p>
          {primary?.leadEnabled ? (
            <button type="button" className="tk-pill tk-pill-light" onClick={() => openLead(primary)}>{draft?.CTAButtonText || "Book today!"}</button>
          ) : (
            <button type="button" className="tk-pill tk-pill-light" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")}</button>
          )}
        </div>
        <p className="mt-3 text-[14px] opacity-85">{c("home.hero.caption", "Price per night for a double bed room")}</p>
        <div className="tk-hero-specs mt-10">
          {specs.map((spec, index) => (
            <div key={index} className="tk-hero-spec">
              <LineIcon name={spec.icon} className="h-9 w-9 shrink-0 opacity-90" />
              <span>{spec.text}</span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="tk-scroll-cue" aria-label="Scroll to the next section" onClick={() => document.getElementById("tk-intro")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        {Icon.chevron(20)}
      </button>
    </section>
  );
};

const Intro: React.FC = () => {
  const { t, c } = useTpl();
  const columns = [
    { icon: "building" as const, title: c("home.intro.col1.title", "Luxury"), text: c("home.intro.col1.text", "Designed for slow mornings, with fine linens, natural light and a kitchen that works.") },
    { icon: "sofa" as const, title: c("home.intro.col2.title", "Comfort"), text: c("home.intro.col2.text", "Furnished homes, fast Wi-Fi and a workspace that feels calm, so you can work or rest.") },
    { icon: "sparkle" as const, title: c("home.intro.col3.title", "Experience"), text: c("home.intro.col3.text", "Local guides, beach walks and sunset plans, arranged by a team that knows the area.") },
  ];
  return (
    <section id="tk-intro" className="tp-section pb-20">
      <div className="tp-wrap text-center">
        <Reveal><Eyebrow>{c("home.intro.eyebrow", "Welcome to paradise")}</Eyebrow></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5 max-w-3xl">{c("home.intro.title", "Enjoy a stay made for slow days")}</h2></Reveal>
      </div>
      <div className="tp-wrap mt-20 grid gap-14 md:grid-cols-3">
        {columns.map((col, index) => (
          <Reveal key={col.title} from={index === 0 ? "left" : index === 2 ? "right" : "bottom"} delay={index * 0.05} className="text-center">
            <div className="tk-col-icon"><LineIcon name={col.icon} /></div>
            <h3 className="tk-h3 mt-6">{col.title}</h3>
            <p className="tk-muted mx-auto mt-4 max-w-xs text-[15px] leading-7">{col.text}</p>
            <div className="mt-8"><OutlinePill onClick={() => t.goToSection("about")}>{c("home.intro.button", "Learn more")}</OutlinePill></div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/** The sage band: a photo beside the "access to the beach" copy. */
const BandFeature: React.FC<{ image: string }> = ({ image }) => {
  const { c, t, draft } = useTpl();
  const copy = t.aboutBlocks[0];
  const text = String(typeof copy === "string" ? copy : copy?.text || "");
  return (
    <section className="tk-band py-24 md:py-32">
      <div className="tp-wrap grid items-center gap-14 md:grid-cols-2 md:gap-20">
        <Reveal from="left">
          <div className="aspect-[4/5] w-full overflow-hidden">
            {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Placeholder text={draft?.companyName || "Stay"} />}
          </div>
        </Reveal>
        <div>
          <Reveal from="right"><Eyebrow>{c("home.band.eyebrow", "Access to the beach")}</Eyebrow></Reveal>
          <Reveal from="right" delay={0.05}><h2 className="tk-h2 mt-5">{c("home.band.title", draft?.aboutTitle || "Steps from the water")}</h2></Reveal>
          <Reveal from="right" delay={0.1}><p className="mt-6 max-w-md text-[16px] leading-8 opacity-90">{c("home.band.text", text || "A short walk takes you to the sand, the restaurants and the market, so the day is yours to plan.")}</p></Reveal>
          <Reveal from="right" delay={0.15}><div className="mt-9"><OutlinePill onClick={() => t.goToSection("about")}>{c("home.band.button", "Read our story")}</OutlinePill></div></Reveal>
        </div>
      </div>
    </section>
  );
};

/** Three photo tiles with a label each, under the amenities heading. */
const Amenities: React.FC<{ images: string[] }> = ({ images }) => {
  const { c, photo, t } = useTpl();
  const tiles = [
    { key: "home.amenities.tile1", label: "Amenities", text: "Your family will enjoy a safe and comfortable environment." },
    { key: "home.amenities.tile2", label: "Living", text: "Open spaces, shade and green corners for slow afternoons." },
    { key: "home.amenities.tile3", label: "Luxury", text: "Well-designed apartments with the details that make a stay easy." },
  ];
  return (
    <section className="tp-section">
      <div className="tp-wrap text-center">
        <Reveal><Eyebrow>{c("home.amenities.eyebrow", "Amenities")}</Eyebrow></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5 max-w-2xl">{c("home.amenities.title", "Find the best amenities")}</h2></Reveal>
      </div>
      <div className="tp-wrap mt-16 grid gap-6 md:grid-cols-3">
        {tiles.map((tile, index) => {
          const src = photo(`home.amenities.image${index + 1}`, images[index] || "");
          return (
            <Reveal key={tile.key} from="grow" delay={index * 0.08}>
              <button type="button" className="tk-tile group block w-full text-left" onClick={() => t.goToSection("gallery")}>
                <div className="aspect-[4/5] w-full">
                  {src ? <img src={src} alt="" loading="lazy" /> : <Placeholder text={tile.label} />}
                </div>
                <p className="tk-h3 mt-6">{c(`${tile.key}.label`, tile.label)}</p>
                <p className="tk-muted mt-2 text-[15px] leading-7">{c(`${tile.key}.text`, tile.text)}</p>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

/** Unit rows: a photo beside the name, the total area and the full feature list, right-aligned. */
const UnitRow: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem, openLead, c, draft } = useTpl();
  const flip = index % 2 === 1;
  // The unit's own features first, then the business's inclusions, so each unit lists ten lines.
  const businessLines = ((draft?.inclusions as any[]) || []).filter((inc) => inc?.enabled !== false).map((inc) => getInclusionMeta(inc).label);
  const features = Array.from(new Set([...(item.features || []), ...businessLines])).slice(0, 10);
  const area = item.raw?.area;
  return (
    <Reveal from={flip ? "right" : "left"} className="tk-unit grid items-center gap-10 md:grid-cols-2 md:gap-0">
      <button type="button" className={`tk-unit-media block w-full text-left ${flip ? "md:order-2" : ""}`} onClick={() => goToItem(service, item)}>
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
      </button>
      <div className={`md:px-10 ${flip ? "md:order-1 md:text-left" : "md:text-right"}`}>
        {area ? <p className="tk-eyebrow tk-muted">{c("home.units.area", "Total area")}: {area}</p> : capacityLine(service.kind, item.capacity) ? <p className="tk-eyebrow tk-muted">{capacityLine(service.kind, item.capacity)}</p> : null}
        <h3 className="tk-h2 mt-3">{item.title}</h3>
        {item.price ? <p className="tk-h3 mt-3 whitespace-nowrap">{priceWithUnit(item.price, item.priceUnit)}</p> : null}
        {features.length ? (
          <ul className={`tk-feature-list mt-6 text-[16px] leading-[36px] ${flip ? "" : "md:text-right"}`}>
            {features.map((feature) => <li key={feature} className={flip ? "" : "md:justify-end"}>{feature}</li>)}
          </ul>
        ) : null}
        <div className={`mt-8 flex flex-wrap items-center gap-6 ${flip ? "" : "md:justify-end"}`}>
          <OutlinePill onClick={() => goToItem(service, item)}>{c("home.units.button", "View unit")}</OutlinePill>
          {service.leadEnabled ? <button type="button" className="tk-link" onClick={() => openLead(service, item)}>{c("home.units.book", "Book")}</button> : null}
        </div>
      </div>
    </Reveal>
  );
};

const Units: React.FC = () => {
  const { c, primary, goToService } = useTpl();
  if (!primary || !primary.items.length) return null;
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap text-center">
        <Reveal><LineIcon name="building" className="mx-auto h-12 w-12" /></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mt-5">{c("home.units.title", "Units available for booking")}</h2></Reveal>
        <Reveal delay={0.05}><p className="tk-muted mt-3 text-[15px]">{c("home.units.sub", "With more than 20 years of experience")}</p></Reveal>
      </div>
      <div className="tp-wrap mt-16 space-y-24">
        {primary.items.slice(0, 3).map((item, index) => <UnitRow key={item.key} service={primary} item={item} index={index} />)}
      </div>
      <div className="mt-16 text-center">
        <button type="button" className="tk-link" onClick={() => goToService(primary)}>{c("home.units.all", "See all units")} <span aria-hidden="true">{Icon.arrow(14)}</span></button>
      </div>
    </section>
  );
};

/** A photo grid: one tall photo beside three shorter ones. Sits in its own section, above the team. */
const Gallery: React.FC<{ images: string[] }> = ({ images }) => {
  const { c, t, photo } = useTpl();
  const tiles = [1, 2, 3, 4, 5].map((n, index) => photo(`home.gallery.image${n}`, images[index] || "")).filter(Boolean);
  if (tiles.length < 2) return null;
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap text-center">
        <Reveal><Eyebrow>{c("home.gallery.eyebrow", "Gallery")}</Eyebrow></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5">{c("home.gallery.title", "A look around")}</h2></Reveal>
        <Reveal delay={0.05}><p className="tk-muted mt-3 text-[15px]">{c("home.gallery.sub", "The units, the shared spaces and the beach just outside.")}</p></Reveal>
      </div>
      <div className="tp-wrap mt-14 grid auto-rows-[200px] grid-cols-2 gap-5 md:auto-rows-[260px] md:grid-cols-4">
        {tiles.map((src, index) => (
          <Reveal key={`${src}-${index}`} from="grow" delay={index * 0.06} className={index === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""}>
            <button type="button" className="tk-tile h-full w-full" onClick={() => t.openGalleryViewer(index)}>
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
};


/** The reference's "We have the best units" block: a heading, three team members and a decorative photo. */
const TeamGallery: React.FC = () => {
  const { c, t } = useTpl();
  // Only real team members are shown, three at most; nothing is padded in.
  const members: any[] = (t.founders || []).slice(0, 3);
  if (!members.length) return null;
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap text-center">
        <Reveal><Eyebrow>{c("home.team.eyebrow", "Our team")}</Eyebrow></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5">{c("home.team.title", "Meet the team")}</h2></Reveal>
        <Reveal delay={0.05}><p className="tk-muted mt-3 text-[15px]">{c("home.team.sub", "The people who look after every stay")}</p></Reveal>
      </div>
      <div className="tp-wrap relative mt-16 grid gap-10 md:grid-cols-3">
        {members.map((member, index) => (
          <Reveal key={`${member.name}-${index}`} delay={index * 0.06} className="text-center">
            <div className="tk-team-media w-full">
              {member.image ? <img src={urlOf(member.image)} alt={member.name} /> : <Placeholder text={member.name} />}
            </div>
            <p className="tk-h3 mt-6">{member.name}</p>
            <p className="tk-muted mt-1 text-[15px]">{member.role}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

/** Pricing: fixed rows for the description and the includes, so every card lines up. */
const Pricing: React.FC = () => {
  const { c, primary, openLead, goToItem } = useTpl();
  if (!primary || !primary.items.length) return null;
  const cards = primary.items.slice(0, 3);
  const popular = cards.length === 3 ? 1 : -1;
  return (
    <section className="tk-band-soft tp-section">
      <div className="tp-wrap text-center">
        <Reveal><Eyebrow>{c("home.pricing.eyebrow", "Pricing")}</Eyebrow></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5">{c("home.pricing.title", "Simple, transparent pricing")}</h2></Reveal>
        <Reveal delay={0.05}><p className="tk-muted mt-3 text-[15px]">{c("home.pricing.sub", "With more than 20 years of experience")}</p></Reveal>
      </div>
      <div className="tp-wrap mt-16 grid gap-10 md:grid-cols-3">
        {cards.map((item, index) => {
          const rows = Array.from({ length: 6 }, (_, n) => (item.features || [])[n] || "");
          return (
            <Reveal key={item.key} from={index === 0 ? "left" : index === 2 ? "right" : "bottom"} delay={index * 0.05}>
              <article className="tk-price-card flex h-full flex-col">
                <button type="button" className="tk-price-media block w-full text-left" onClick={() => primary && goToItem(primary, item)} aria-label={`Open ${item.title}`}>
                  {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
                  {index === popular ? <span className="tk-badge">{c("home.pricing.badge", "Popular!")}</span> : null}
                </button>
                <div className="flex flex-1 flex-col px-5 pb-8 pt-7">
                  <button type="button" className="text-left" onClick={() => primary && goToItem(primary, item)}>
                    <p className="tk-h3">{item.title}</p>
                  </button>
                  <p className="tk-h2 mt-2 whitespace-nowrap">{priceWithUnit(item.price, item.priceUnit) || "On request"}</p>
                  <p className="tk-muted mt-4 min-h-[75px] text-[15px] leading-[25px]">{item.description}</p>
                  <p className="tk-eyebrow tk-muted mt-6">{c("home.pricing.includes", "Includes")}</p>
                  <ul className="mt-4">
                    {rows.map((feature, n) => (
                      <li key={n} className="mb-[22px] flex h-6 items-center gap-3 text-[15px]">{feature ? <><Tick />{feature}</> : null}</li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-col gap-3 pt-6">
                    <button type="button" className="tk-pill tk-pill-solid w-full justify-center" onClick={() => (primary.leadEnabled ? openLead(primary, item) : undefined)}>{c("home.pricing.button", "Book now")}</button>
                    <button type="button" className="tk-pill w-full justify-center" onClick={() => primary && goToItem(primary, item)}>{c("home.pricing.details", "View details")}</button>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

/** Reviews: three at a time. With more than three, the set slides on every few seconds and stops while the cursor is over it. */
const Reviews: React.FC = () => {
  const { c, t, rating } = useTpl();
  const reviews: any[] = t.testimonials;
  const perView = 3;
  const count = reviews.length;
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (count <= perView || paused) return;
    const timer = window.setInterval(() => setStart((current) => (current + 1) % count), 5000);
    return () => window.clearInterval(timer);
  }, [count, paused]);
  if (!count) return null;
  const visible = Array.from({ length: Math.min(perView, count) }, (_, index) => reviews[(start + index) % count]);
  return (
    <section className="tp-section">
      <div className="tp-wrap text-center">
        <Reveal><Eyebrow>{c("home.reviews.eyebrow", "Reviews")}</Eyebrow></Reveal>
        <Reveal from="left"><h2 className="tk-h2 mx-auto mt-5">{c("home.reviews.title", "What people say about us")}</h2></Reveal>
        {/* Overall rating: the average stars and how many reviews it comes from. */}
        <Reveal delay={0.05}>
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="tk-h2">{rating.count ? rating.avg.toFixed(1) : "5.0"}</p>
            <StarRow value={rating.avg || 5} size={18} />
            <p className="tk-muted text-[15px]">{c("home.reviews.count", "Based on")} {count} {count === 1 ? "review" : "reviews"}</p>
          </div>
        </Reveal>
      </div>
      <div className="tp-wrap mt-14 grid gap-6 md:grid-cols-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <AnimatePresence mode="popLayout">
          {visible.map((item, index) => (
            <motion.figure
              key={`${start}-${index}-${item.key || item.name}`}
              className="tk-review h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            >
              <StarRow value={item.rating || 5} />
              <blockquote className="mt-6 text-[20px] leading-8" style={{ fontFamily: "'Cormorant Upright', serif" }}>&ldquo;{item.text}&rdquo;</blockquote>
              <figcaption className="mt-6 text-[13px] font-bold uppercase tracking-[.12em]">{item.name}{item.role ? <span className="tk-muted font-normal normal-case tracking-normal"> · {item.role}</span> : null}</figcaption>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
      {count > perView ? (
        <div className="mt-10 flex justify-center gap-2">
          {reviews.map((_, index) => (
            <button key={index} type="button" aria-label={`Show review ${index + 1}`} onClick={() => setStart(index)} className="h-2 rounded-full transition-all duration-500" style={{ width: index === start ? 26 : 8, background: index === start ? "var(--t-text)" : "color-mix(in srgb, var(--t-text) 35%, transparent)" }} />
          ))}
        </div>
      ) : null}
      <div className="mt-12 flex justify-center gap-4">
        <button type="button" className="tk-pill" onClick={() => t.goToSection("testimonials")}>{c("home.reviews.all", "All reviews")}</button>
        {t.showWriteReview ? <button type="button" className="tk-pill tk-pill-solid" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button> : null}
      </div>
    </section>
  );
};

/** The review-site strip: how far the main places are, shown as a row of facts. */
const Distances: React.FC = () => {
  const { c } = useTpl();
  const places = [
    { key: "home.distance1", label: "Airport", value: "5 minutes away" },
    { key: "home.distance2", label: "Beach", value: "Front beach" },
    { key: "home.distance3", label: "Downtown", value: "15 minutes away" },
    { key: "home.distance4", label: "Restaurants", value: "10 minutes away" },
  ];
  return (
    <section className="tk-band-soft py-20">
      <div className="tp-wrap">
        <p className="tk-eyebrow text-center opacity-70">{c("home.distances.eyebrow", "As seen on exclusive review sites")}</p>
        <div className="mt-12 grid grid-cols-2 gap-10 md:grid-cols-4">
          {places.map((place) => (
            <div key={place.key} className="tk-distance">
              <p className="tk-h3">{c(`${place.key}.label`, place.label)}</p>
              <p className="text-[14px] opacity-75">{c(`${place.key}.value`, place.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CallToAction: React.FC = () => {
  const { c, primary, openLead, t } = useTpl();
  return (
    <section className="tp-wrap pb-24">
      <Reveal>
        <div className="flex flex-col items-center justify-between gap-8 border-y py-14 text-center md:flex-row md:text-left" style={{ borderColor: "color-mix(in srgb,var(--t-text) 22%,transparent)" }}>
          <div>
            <h2 className="tk-h2">{c("home.cta.title", "Ready for your stay?")}</h2>
            <p className="tk-muted mt-3 max-w-lg text-[15px] leading-7">{c("home.cta.sub", "Tell us your dates and we will find the unit that suits you.")}</p>
          </div>
          {primary?.leadEnabled ? (
            <button type="button" className="tk-pill tk-pill-solid" onClick={() => openLead(primary)}>{c("home.cta.button", "Book now")}</button>
          ) : (
            <button type="button" className="tk-pill tk-pill-solid" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")}</button>
          )}
        </div>
      </Reveal>
    </section>
  );
};

export const TulumHome: React.FC = () => {
  const { t, primary, draft, photo } = useTpl();
  // Room photos stay with the rooms; the rest of the business's photos fill the home page slots.
  const roomPhotos = new Set<string>((primary?.items || []).flatMap((item: any) => [item.image, ...(item.images || [])]).map(urlOf).filter(Boolean));
  const pool: string[] = Array.from(new Set<string>([...(t.heroImages || []).map(urlOf), ...(t.galleryItems || []).map(urlOf)].filter(Boolean))).filter((url) => !roomPhotos.has(url));
  const heroImage = photo("home.hero.image", pool[0] || "");
  const bandImage = photo("home.band.image", pool[1] || "");
  const amenityImages = [pool[2] || "", pool[3] || "", pool[4] || ""];
  const galleryImages = pool.slice(5, 10);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero image={heroImage} /> : <div className="pt-14" />}
      {t.isSectionEnabled("home_about") ? <Intro /> : null}
      {t.isSectionEnabled("home_about") ? <BandFeature image={bandImage} /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Amenities images={amenityImages} /> : null}
      {t.isSectionEnabled("home_products") ? <Units /> : null}
      {t.isSectionEnabled("home_gallery") ? <Gallery images={galleryImages} /> : null}
      {t.isSectionEnabled("home_team") ? <TeamGallery /> : null}
      {t.isSectionEnabled("home_products") ? <Pricing /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {t.isSectionEnabled("home_stats") ? <Distances /> : null}
      <CallToAction />
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};
