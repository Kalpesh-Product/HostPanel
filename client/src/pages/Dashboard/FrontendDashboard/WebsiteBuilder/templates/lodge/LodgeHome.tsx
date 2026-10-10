import React, { useEffect, useState } from "react";
import { Stagger, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { getInclusionMeta } from "../inclusionIcons";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { Label, RollingNumber, SlideIn, Tick } from "./LodgeUI";

const FEATURE_EMOJI = ["✨", "🔥", "🔑"];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** A full-bleed photo slider. Photos cross-fade (1s) and the arrow or a dot moves to the next one. */
const SLIDE_MS = 5500;

const Hero: React.FC<{ images: string[] }> = ({ images }) => {
  const { t, draft, primary, openLead, c, goToService } = useTpl();
  const [index, setIndex] = useState(0);
  const count = images.length;
  const next = () => setIndex((current) => (current + 1) % Math.max(count, 1));
  // Auto-advance; a manual pick restarts the timer so a slide is never skipped straight after a click.
  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(next, SLIDE_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, index]);
  const title = draft?.title || "Find a place you'll love to stay";
  return (
    <section className="ld-hero">
      {images.map((src, n) => (
        <div key={`${src}-${n}`} className={`ld-hero-slide ${n === index ? "is-on" : ""}`} aria-hidden={n !== index}>
          <img src={src} alt="" />
        </div>
      ))}
      {!count ? <div className="absolute inset-0 bg-[var(--t-ink)]" /> : null}
      <div className="ld-hero-shade" />
      <div className="tp-wrap relative z-[2] flex h-full flex-col justify-center">
        <motion.div className="ld-hero-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.8, ease: "easeInOut" }}>
          <h1 className="ld-h1 text-white">{title}</h1>
          <p className="mt-6 max-w-[420px] text-[17px] leading-7">{draft?.subTitle || "Comfortable rooms, a friendly community and everything you need close by."}</p>
          <div className="mt-9 flex flex-wrap items-center gap-7">
            <button type="button" className="ld-btn ld-btn-light" onClick={() => t.goToSection("about")}>{c("home.hero.secondaryCta", "Learn more")}</button>
            {primary?.leadEnabled ? (
              <button type="button" className="ld-link text-white" onClick={() => openLead(primary)}>
                {draft?.CTAButtonText || "Book Now"} <span aria-hidden="true">{Icon.arrow(16)}</span>
              </button>
            ) : primary ? (
              <button type="button" className="ld-link text-white" onClick={() => goToService(primary)}>
                Explore {primary.profile.labels.items} <span aria-hidden="true">{Icon.arrow(16)}</span>
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>
      {count > 1 ? (
        <>
          <div className="ld-hero-dots">
            {images.map((_, n) => <button key={n} type="button" aria-label={`Photo ${n + 1}`} className={n === index ? "is-on" : ""} onClick={() => setIndex(n)} />)}
          </div>
        </>
      ) : null}
    </section>
  );
};

const Intro: React.FC<{ images: string[] }> = ({ images }) => {
  const { t, draft, c } = useTpl();
  const copy = t.aboutBlocks[0];
  const text = String(typeof copy === "string" ? copy : copy?.text || "");
  const cards = [
    { key: "home.intro.card1", fallback: "Prime location", icon: Icon.pin(18), image: images[0] },
    { key: "home.intro.card2", fallback: "Shared amenities", icon: Icon.star(18), image: images[1] },
    { key: "home.intro.card3", fallback: "Comfortable rooms", icon: Icon.check(18), image: images[2] },
  ];
  return (
    <section className="tp-section">
      <div className="tp-wrap text-center">
        <SlideIn><Label>{c("home.intro.eyebrow", "Intro")}</Label></SlideIn>
        <SlideIn delay={0.05}><h2 className="ld-h2 mt-6">{c("home.intro.title", draft?.aboutTitle || "Your future home")}</h2></SlideIn>
        <SlideIn delay={0.1}><p className="ld-muted mx-auto mt-4 max-w-md text-[16px] leading-7">{c("home.intro.sub", text || "We are a team of friendly people. Drop us a message and we'll find the right place for you.")}</p></SlideIn>
      </div>
      <div className="tp-wrap mt-14 grid gap-6 md:grid-cols-3">
        {cards.map((card, index) => (
          <SlideIn key={card.key} delay={index * 0.08}>
            <div className="ld-card">
              <div className="ld-card-media">
                {card.image ? <img src={card.image} alt="" loading="lazy" /> : <Placeholder text={card.fallback} />}
              </div>
              <div className="ld-card-tab">
                <span className="ld-tab-icon" aria-hidden="true">{card.icon}</span>
                <span>{c(card.key, card.fallback)}</span>
              </div>
            </div>
          </SlideIn>
        ))}
      </div>
    </section>
  );
};

const Amenities: React.FC = () => {
  const { draft, c, openLead, primary, t } = useTpl();
  const items = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  if (!items.length) return null;
  const labels = items.map((item) => ({ label: getInclusionMeta(item).label, icon: getInclusionMeta(item).icon }));
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <SlideIn><span className="ld-underline-label">{c("home.amenities.label", "Amenities")}</span></SlideIn>
          <SlideIn delay={0.05}><h2 className="ld-h2 mt-6 max-w-md">{c("home.amenities.title", "Enjoy our exclusive amenities")}</h2></SlideIn>
          <SlideIn delay={0.1}><p className="ld-muted mt-6 max-w-sm text-[16px] leading-7">{c("home.amenities.sub", "Everything you need for a comfortable stay, included with your booking.")}</p></SlideIn>
          <SlideIn delay={0.15}>
            <button type="button" className="ld-btn ld-btn-dark mt-8" onClick={() => (primary?.leadEnabled ? openLead(primary) : t.goToSection("about"))}>
              {c("home.amenities.button", "Learn more")} <span aria-hidden="true">{Icon.arrow(15)}</span>
            </button>
          </SlideIn>
        </div>
        <Stagger className="flex flex-wrap gap-x-4 gap-y-4">
          {labels.map((item, index) => (
            <span key={`${item.label}-${index}`} className="ld-chip">
              <span className="ld-chip-icon" aria-hidden="true">{item.icon ? <span className="block h-[30px] w-[30px] [&>svg]:h-full [&>svg]:w-full">{item.icon}</span> : null}</span>
              {item.label}
            </span>
          ))}
        </Stagger>
      </div>
    </section>
  );
};

const FeatureBand: React.FC<{ image: string }> = ({ image }) => {
  const { c, draft } = useTpl();
  const pills = [1, 2, 3].map((n) => c(`home.discover.pill${n}`, ["Best rated place to stay", "Amazing amenities for you", "24 hrs electronic access"][n - 1]));
  return (
    <section className="pb-24">
      <div className="tp-wrap mb-12">
        <SlideIn><h2 className="ld-h2-lg max-w-3xl">{c("home.discover.title", "Discover the best place to stay")}</h2></SlideIn>
      </div>
      <SlideIn>
        <div className="ld-band">
          {image ? <img src={image} alt={draft?.companyName || ""} loading="lazy" /> : <Placeholder text={draft?.companyName || "Stay"} />}
          <div className="ld-float-stack">
            {pills.map((label, index) => (
              <SlideIn key={label} delay={index * 0.1}>
                <div className="ld-float">
                  <span>{label}</span>
                  <span className="ld-float-icon" aria-hidden="true">{FEATURE_EMOJI[index]}</span>
                </div>
              </SlideIn>
            ))}
          </div>
        </div>
      </SlideIn>
    </section>
  );
};

const Numbers: React.FC = () => {
  const { c, t, rating, primary, draft } = useTpl();
  const amenityCount = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false).length;
  const rows = [
    { key: "home.numbers.row1", fallback: "Reviews", value: String(rating.count || t.testimonials.length || 0) },
    { key: "home.numbers.row2", fallback: cap(primary?.profile.labels.items || "rentals"), value: String(primary?.items.length || 0) },
    { key: "home.numbers.row3", fallback: "Amenities", value: String(amenityCount) },
    { key: "home.numbers.row4", fallback: "Rating", value: rating.count ? rating.avg.toFixed(1) : "5.0" },
  ];
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap grid gap-10 md:grid-cols-[1.2fr_.8fr] md:items-end">
        <div>
          <SlideIn><Label>{c("home.numbers.label", "Numbers")}</Label></SlideIn>
          <SlideIn delay={0.05}><h2 className="ld-h2 mt-6 max-w-2xl">{c("home.numbers.title", "Unique features you can find for our property")}</h2></SlideIn>
        </div>
        <SlideIn delay={0.1}><p className="ld-muted max-w-sm text-[15px] leading-7 md:justify-self-end">{c("home.numbers.sub", "Our guests tell us what makes a stay here worth coming back for.")}</p></SlideIn>
      </div>
      <div className="tp-wrap mt-14">
        {rows.map((row, index) => (
          <SlideIn key={row.key} delay={index * 0.05}>
            <div className="ld-row">
              <p className="text-[28px] tracking-[-.02em]">{c(row.key, row.fallback)}</p>
              <p className="ld-muted text-[15px] leading-6">{c(`home.numbers.desc${index + 1}`, ["Guests who shared their stay", "Places you can book", "Included with every stay", "Average guest rating"][index])}</p>
              <RollingNumber value={row.value} />
            </div>
          </SlideIn>
        ))}
      </div>
    </section>
  );
};

const Quote: React.FC<{ image: string }> = ({ image }) => {
  const { c, t, draft } = useTpl();
  const first: any = t.testimonials[0];
  const fallback = first?.text || "Your comfort is the most important thing to us. Let our team guide you through every step of your stay.";
  const founder: any = (t.founders || [])[0];
  return (
    <section className="ld-dark py-24 md:py-32">
      <div className="tp-wrap grid items-center gap-14 md:grid-cols-[.9fr_1.1fr] md:gap-20">
        <SlideIn>
          <div className="aspect-[4/5] w-full max-w-[380px] overflow-hidden">
            {image || founder?.image ? <img src={image || founder.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Placeholder text={draft?.companyName || "Host"} />}
          </div>
        </SlideIn>
        <div className="ld-quote-rule">
          <SlideIn>
            <svg width="40" height="34" viewBox="0 0 40 34" fill="currentColor" aria-hidden="true"><path d="M0 34V20C0 9 5 2 15 0l2 4C11 6 8 11 8 16h9v18H0Zm22 0V20C22 9 27 2 37 0l2 4c-6 2-9 7-9 12h8v18H22Z" /></svg>
          </SlideIn>
          <SlideIn delay={0.05}><p className="mt-8 text-[clamp(26px,3vw,38px)] font-light leading-[1.4] tracking-[-.01em]">{c("home.quote.text", fallback)}</p></SlideIn>
          <SlideIn delay={0.1}>
            <p className="mt-10 text-[15px] font-semibold">{first?.name || founder?.name || draft?.companyName || ""}</p>
            <p className="mt-1 text-[14px] opacity-65">{first?.role || founder?.role || c("home.quote.role", "Guest")}</p>
          </SlideIn>
        </div>
      </div>
    </section>
  );
};

const urlOf = (value: any): string => (typeof value === "string" ? value : value?.url || "");

const Property: React.FC<{ image: string }> = ({ image }) => {
  const { c, t, draft, primary, openLead, goToService, rating } = useTpl();
  // The featured rental's own photos, so the section always shows the property it describes.
  const featured = Array.from(new Set((primary?.items || []).flatMap((item: any) => [item.image, ...(item.images || [])]).map(urlOf).filter(Boolean))).slice(0, 4);
  const amenityLabels = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false).slice(0, 8).map((item) => getInclusionMeta(item).label);
  const specs: [string, React.ReactNode][] = [
    [c("home.property.spec1", "Location"), draft?.address || t.footerAddress || "—"],
    [c("home.property.spec2", cap(primary?.profile.labels.items || "rentals")), String(primary?.items.length || 0)],
    [c("home.property.spec3", "Rating"), rating.count ? <span className="inline-flex items-center gap-2">{rating.avg.toFixed(1)} <StarRow value={rating.avg} size={13} /></span> : "New"],
    [c("home.property.spec4", "Contact"), t.contactPhone || t.contactEmail || "—"],
  ];
  return (
    <>
      <section className="pb-24">
        <SlideIn>
          <div className="ld-band">
            {image ? <img src={image} alt="" loading="lazy" /> : <Placeholder text={draft?.companyName || "Stay"} />}
          </div>
        </SlideIn>
      </section>
      <section className="tp-section pt-0">
        {/* Rows: the header, then the photo with the amenities beside it and the facts at its bottom
            edge, then the buttons under the photo. The right column starts level with the photo. */}
        <div className="tp-wrap grid grid-cols-1 gap-10 md:grid-cols-[1.1fr_.9fr] md:grid-rows-[auto_480px_auto] md:gap-x-20 md:gap-y-0">
          <div className="md:col-start-1 md:row-start-1 md:pb-10">
            <SlideIn><Label>{c("home.property.label", "Featured")}</Label></SlideIn>
            <SlideIn delay={0.05}><h2 className="ld-h2-lg mt-6">{c("home.property.title", primary?.heading || `Our featured ${primary?.profile.labels.item || "room"}`)}</h2></SlideIn>
            <SlideIn delay={0.1}><p className="ld-muted mt-6 max-w-xl text-[16px] leading-7">{primary?.subText || c("home.property.sub", "A comfortable place with everything in reach, from quiet rooms to shared spaces.")}</p></SlideIn>
          </div>
          {featured[0] ? (
            <SlideIn delay={0.12} className="md:col-start-1 md:row-start-2 flex min-h-[360px] flex-col">
              <div className="ld-rental-media h-full w-full flex-1 overflow-hidden !rounded-xl">
                <img src={featured[0]} alt={primary?.heading || `Featured ${primary?.profile.labels.item || "room"}`} loading="lazy" className="h-full w-full object-cover" />
              </div>
            </SlideIn>
          ) : null}
          {/* Right column: amenities level with the top of the photo, facts level with its bottom. */}
          <SlideIn delay={0.1} className="flex flex-col justify-between gap-10 md:col-start-2 md:row-start-2">
            {amenityLabels.length ? (
              <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {amenityLabels.map((label) => <li key={label} className="flex items-center gap-3 text-[15px]"><Tick />{label}</li>)}
              </ul>
            ) : <div />}
            <div>
              {specs.map(([label, value]) => (
                <div key={String(label)} className="ld-spec">
                  <span className="ld-muted">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </SlideIn>
          <div className="flex flex-wrap items-center gap-7 md:col-start-1 md:row-start-3 md:pt-10 mt-10 md:mt-0">
            {primary?.leadEnabled ? <button type="button" className="ld-btn ld-btn-dark" onClick={() => openLead(primary)}>{c("home.property.button", "Book now")} <span aria-hidden="true">{Icon.arrow(15)}</span></button> : null}
            {primary ? <button type="button" className="ld-link" onClick={() => goToService(primary)}>{c("home.property.link", `See all ${primary.profile.labels.items}`)} <span aria-hidden="true">{Icon.arrow(16)}</span></button> : null}
          </div>
        </div>
      </section>
    </>
  );
};

const RentalCard: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem } = useTpl();
  const beds = Number(item.capacity) || 0;
  return (
    <SlideIn delay={index * 0.08} className="ld-rental">
      <button type="button" className="ld-rental-media block w-full" onClick={() => goToItem(service, item)}>
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
      </button>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          {beds ? <p className="ld-muted text-[13px]">{beds} guests</p> : null}
          <h3 className="mt-1 text-[21px] leading-tight">{item.title}</h3>
        </div>
        <p className="shrink-0 pt-1 text-[16px] font-medium">{priceWithUnit(item.price, item.priceUnit) || "Ask"}</p>
      </div>
      <button type="button" className="ld-link mt-4 text-[14px]" onClick={() => goToItem(service, item)}>View details <span aria-hidden="true">{Icon.arrow(14)}</span></button>
    </SlideIn>
  );
};

const Rentals: React.FC = () => {
  const { c, primary, goToService } = useTpl();
  if (!primary || !primary.items.length) return null;
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <SlideIn><Label>{c("home.rentals.label", primary.profile.labels.tag)}</Label><h2 className="ld-h2 mt-6">{c("home.rentals.title", `Latest ${primary.profile.labels.items}`)}</h2></SlideIn>
          <SlideIn delay={0.08}><button type="button" className="ld-link" onClick={() => goToService(primary)}>{c("home.rentals.link", `View all ${primary.profile.labels.items}`)} <span aria-hidden="true">{Icon.arrow(15)}</span></button></SlideIn>
        </div>
        <div className="grid gap-x-7 gap-y-12 md:grid-cols-3">
          {primary.items.slice(0, 3).map((item, index) => <RentalCard key={item.key} service={primary} item={item} index={index} />)}
        </div>
      </div>
    </section>
  );
};

const CallToAction: React.FC = () => {
  const { c, primary, openLead, t } = useTpl();
  return (
    <section className="tp-wrap pb-24">
      <SlideIn>
        <div className="flex flex-col items-start justify-between gap-8 border-y py-14 md:flex-row md:items-center" style={{ borderColor: "color-mix(in srgb,var(--t-text) 18%,transparent)" }}>
          <div>
            <h2 className="ld-h2">{c("home.cta.title", `Know more about our ${primary?.profile.labels.items || "rooms"}`)}</h2>
            <p className="ld-muted mt-3 max-w-lg text-[15px] leading-7">{c("home.cta.sub", "Tell us what you're looking for and we'll get back to you with the best option.")}</p>
          </div>
          {primary?.leadEnabled ? (
            <button type="button" className="ld-btn ld-btn-dark" onClick={() => openLead(primary)}>{c("home.cta.button", "Book now")} <span aria-hidden="true">{Icon.arrow(15)}</span></button>
          ) : (
            <button type="button" className="ld-btn ld-btn-dark" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")} <span aria-hidden="true">{Icon.arrow(15)}</span></button>
          )}
        </div>
      </SlideIn>
    </section>
  );
};

export const LodgeHome: React.FC = () => {
  const { t, draft, primary, photo } = useTpl();
  // Room photos stay with the rooms; the rest of the business's photos fill the home page slots.
  const roomPhotos = new Set<string>((primary?.items || []).flatMap((item: any) => [item.image, ...(item.images || [])]).filter(Boolean).map(String));
  const pool = Array.from(new Set([...(t.heroImages || []), ...(t.galleryItems || [])].filter(Boolean))).filter((url) => !roomPhotos.has(url));
  // Every hero photo the business has goes into the carousel (up to six), so the slider shows
  // all of them rather than one.
  const heroDefaults: string[] = Array.from(new Set<string>([...(t.heroImages || []).map(urlOf), ...pool].filter(Boolean))).slice(0, 6);
  const heroImages = [1, 2, 3, 4, 5, 6].map((n, index) => photo(`home.hero.image${n}`, heroDefaults[index] || "")).filter(Boolean);
  const introImages = [1, 2, 3].map((n, index) => photo(`home.intro.image${n}`, pool[4 + index] || ""));
  const discover = photo("home.discover.image", pool[7] || "");
  const propertyImage = photo("home.property.image", pool[8] || "");
  const quoteImage = photo("home.quote.image", pool[9] || "");
  const showHero = t.isSectionEnabled("home_hero");
  return (
    <>
      {showHero ? <Hero images={heroImages} /> : <div className="pt-14" />}
      {t.isSectionEnabled("home_about") ? <Intro images={introImages} /> : null}
      {t.isSectionEnabled("home_inclusions") ? <Amenities /> : null}
      {t.isSectionEnabled("home_gallery") ? <FeatureBand image={discover} /> : null}
      {t.isSectionEnabled("home_stats") ? <Numbers /> : null}
      <Quote image={quoteImage} />
      {t.isSectionEnabled("home_products") ? <Property image={propertyImage} /> : null}
      {t.isSectionEnabled("home_products") ? <Rentals /> : null}
      <CallToAction />
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};
