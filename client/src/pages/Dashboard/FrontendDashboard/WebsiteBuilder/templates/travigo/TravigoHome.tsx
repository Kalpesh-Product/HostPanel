import React from "react";
import { Reveal, Stagger, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { getInclusionMeta } from "../inclusionIcons";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";

const bathLabel = (raw: any) => {
  if (raw?.bathroom === "ensuite") return "Attached bath";
  if (raw?.bathroom === "shared") return "Shared bath";
  return "Bath";
};

const RoomCard: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem, openLead } = useTpl();
  const beds = Number(item.capacity) || 0;
  return (
    <motion.article
      className="trv-room"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.2), ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className="trv-room-media text-left" onClick={() => goToItem(service, item)}>
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
      </button>
      <div className="flex flex-col gap-5 pt-5">
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-[15px]">
          {beds ? <span className="trv-spec"><span className="font-bold">{beds}</span> Beds</span> : null}
          <span className="trv-spec"><span className="font-bold">1</span> {bathLabel(item.raw)}</span>
        </div>
        <button type="button" className="text-left" onClick={() => goToItem(service, item)}>
          <h3 className="text-[26px] leading-[1.1] md:text-[30px]">{item.title}</h3>
        </button>
        <div className="flex items-end justify-between gap-4 border-t border-black/15 pt-5">
          <p className="tp-display text-[18px]">{priceWithUnit(item.price, item.priceUnit) || "Ask for pricing"}</p>
          {service.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={() => openLead(service, item)}>Book now</button> : null}
        </div>
      </div>
    </motion.article>
  );
};

const Hero: React.FC<{ circles: string[]; pill: string }> = ({ circles: fallbacks, pill: pillFallback }) => {
  const { draft, primary, openLead, goToService, rating, photo } = useTpl();
  const circles = [1, 2, 3, 4].map((n, index) => photo(`home.hero.image${n}`, fallbacks[index] || "")).filter(Boolean);
  const pill = photo("home.hero.pill", pillFallback);
  const roomCount = primary?.items.length || 0;
  const [first = "", second = "", third = "", fourth = ""] = circles;
  const words = (draft?.title || "Find your ideal stay").split(" ");
  const pillAt = Math.max(1, Math.min(words.length - 1, Math.floor(words.length / 2)));
  return (
    <section className="trv-hero relative overflow-hidden">
      <div className="tp-wrap relative flex min-h-[inherit] flex-col justify-center py-10 md:py-12">
        {first ? <motion.div className="trv-orbit trv-orbit-a" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .22 }}><img src={first} alt="" /></motion.div> : null}
        {second ? <motion.div className="trv-orbit trv-orbit-b" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .34 }}><img src={second} alt="" /></motion.div> : null}
        {third ? <motion.div className="trv-orbit trv-orbit-c" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .46 }}><img src={third} alt="" /></motion.div> : null}
        {fourth ? <motion.div className="trv-orbit trv-orbit-d" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .58 }}><img src={fourth} alt="" /></motion.div> : null}
        <motion.h1 className="trv-hero-title relative z-[1] max-w-[900px]" initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .75, ease: [0.22, 1, 0.36, 1] }}>
          {words.map((word, index) => (
            <React.Fragment key={`${word}-${index}`}>
              {index === pillAt && pill ? <span className="trv-title-pill"><img src={pill} alt="" /></span> : null}
              {word}{index < words.length - 1 ? " " : ""}
            </React.Fragment>
          ))}
        </motion.h1>
        <div className="relative z-[2] mt-10 flex flex-col gap-7 md:ml-[30%] md:mt-12 md:w-[52%]">
          <p className="trv-hero-copy text-[16px] leading-7 opacity-75">{draft?.subTitle || "A comfortable base, a friendly crowd, and the city right outside the door."}</p>
          <div className="flex flex-wrap items-center gap-6">
            {primary ? <button type="button" className="trv-link" onClick={() => goToService(primary)}>Explore rooms <span aria-hidden="true">{Icon.arrow(16)}</span></button> : null}
            {primary?.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{draft?.CTAButtonText || "Book your stay"}</button> : null}
          </div>
        </div>
        <div className="relative z-[2] mt-10 flex flex-wrap gap-12 md:mt-12">
          {roomCount ? <div><p className="trv-number">{roomCount}+</p><p className="mt-2 text-[12px] font-bold uppercase tracking-[.14em] opacity-55">Rooms listed</p></div> : null}
          {rating.count ? <div><p className="trv-number">{rating.count}+</p><p className="mt-2 text-[12px] font-bold uppercase tracking-[.14em] opacity-55">Happy guests</p></div> : null}
        </div>
      </div>
    </section>
  );
};

const Explore: React.FC<{ image: string }> = ({ image: fallback }) => {
  const { t, draft, c, photo } = useTpl();
  const image = photo("home.explore.image", fallback);
  const copy = t.aboutBlocks[0];
  const text = String(typeof copy === "string" ? copy : copy?.text || "");
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-10 md:grid-cols-[1fr_1.05fr] md:gap-20">
        <Reveal className="trv-round-media mx-auto aspect-square w-full max-w-[540px]">{image ? <img src={image} alt="" loading="lazy" /> : <Placeholder text={draft?.companyName || "Explore"} />}</Reveal>
        <div>
          <Reveal><p className="mb-5 text-[11px] font-bold uppercase tracking-[.18em]">{c("home.explore.eyebrow", "Explore all the beautiful places")}</p></Reveal>
          <Reveal delay={.05}><h2 className="text-[clamp(42px,6vw,82px)] leading-[.95]">{draft?.aboutTitle || "Stay where you want, when you want."}</h2></Reveal>
          {text ? <Reveal delay={.1}><p className="tp-muted mt-7 max-w-lg text-[16px] leading-7">{text}</p></Reveal> : null}
          <Reveal delay={.15}><button type="button" className="tp-btn tp-btn-primary mt-8" onClick={() => t.goToSection("about")}>Our story {Icon.arrow(15)}</button></Reveal>
        </div>
      </div>
    </section>
  );
};

const Rooms: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService } = useTpl();
  if (!service.items.length) return null;
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap">
        <div className="mb-14 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <Reveal><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em]">Life is for living</p><h2 className="text-[clamp(42px,6vw,82px)] leading-none">Explore rooms</h2></Reveal>
          <Reveal delay={.08}><button type="button" className="trv-link" onClick={() => goToService(service)}>View all rooms <span aria-hidden="true">{Icon.arrow(15)}</span></button></Reveal>
        </div>
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">{service.items.slice(0, 4).map((item, index) => <RoomCard key={item.key} service={service} item={item} index={index} />)}</div>
      </div>
    </section>
  );
};

const Amenities = () => {
  const { draft, c } = useTpl();
  const items = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  if (!items.length) return null;
  const labels = items.map((item) => getInclusionMeta(item).label);
  const reversed = [...labels].reverse();
  const row = (list: string[], reverse: boolean) => (
    <div className="trv-pill-row" aria-hidden={reverse}>
      <div className={`trv-pill-track ${reverse ? "is-reverse" : ""}`}>
        {[...list, ...list].map((label, index) => <span key={`${label}-${index}`} className="trv-feature-pill">{label}</span>)}
      </div>
    </div>
  );
  return (
    <section className="tp-section">
      <div className="mb-14">
        <div className="tp-wrap text-center">
          <Reveal><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em]">{c("home.features.eyebrow", "We make vacations magical")}</p><h2 className="text-[clamp(42px,6vw,82px)] leading-none">{c("home.features.title", "Luxury travel & features")}</h2></Reveal>
        </div>
      </div>
      <div className="space-y-5">
        {row(labels, false)}
        {row(reversed, true)}
      </div>
    </section>
  );
};

const TravelGallery: React.FC<{ images: string[] }> = ({ images: fallbacks }) => {
  const { t, photo } = useTpl();
  const images = [1, 2, 3, 4].map((n, index) => photo(`home.gallery.image${n}`, fallbacks[index] || "")).filter(Boolean);
  if (images.length < 3) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <Reveal><p className="mb-4 text-[11px] font-bold uppercase tracking-[.18em]">Exploring earth's attractions</p><h2 className="max-w-4xl text-[clamp(48px,8vw,110px)] leading-[.88]">Budget travel.<br />Rich life.</h2></Reveal>
        <Stagger className="trv-gallery mt-12">{images.map((src, index) => <button key={`${src}-${index}`} type="button" aria-label={`Open gallery photo ${index + 1}`} onClick={() => t.openGalleryViewer(index)}><img src={src} alt="" loading="lazy" /></button>)}</Stagger>
      </div>
    </section>
  );
};

const JourneyCta: React.FC<{ image: string }> = ({ image: fallback }) => {
  const { primary, openLead, photo } = useTpl();
  const image = photo("home.cta.image", fallback);
  if (!primary) return null;
  return (
    <section className="trv-cta py-16 md:py-24">
      <div className="tp-wrap grid items-center gap-10 md:grid-cols-[1fr_280px] md:gap-20">
        <div><Reveal><p className="mb-4 text-[11px] font-bold uppercase tracking-[.18em] text-white/55">See the world with your own two eyes</p><h2 className="text-[clamp(42px,7vw,92px)] leading-[.92]">Journey, exploration, & adventure.</h2></Reveal>{primary.leadEnabled ? <Reveal delay={.1}><button type="button" className="mt-8 rounded-full bg-white px-7 py-3 text-sm font-bold text-black" onClick={() => openLead(primary)}>Book now</button></Reveal> : null}</div>
        {image ? <Reveal delay={.08} className="trv-cta-disc mx-auto w-full max-w-[280px]"><img src={image} alt="" loading="lazy" /></Reveal> : null}
      </div>
    </section>
  );
};

const Reviews = () => {
  const { t } = useTpl();
  const reviews: any[] = t.testimonials.slice(0, 4);
  if (!reviews.length) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap">
        <Reveal><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em]">Reviews</p><h2 className="text-[clamp(42px,6vw,82px)] leading-none">Happy customers</h2></Reveal>
        <Stagger className="mt-12 grid gap-8 md:grid-cols-2">{reviews.map((item, index) => <figure key={item.key || index} className="trv-review"><StarRow value={item.rating || 5} /><blockquote className="mt-5 text-[18px] leading-8">{item.text}</blockquote><figcaption className="mt-6 text-[12px] font-bold uppercase tracking-[.12em]">{item.name}{item.role ? <span className="font-normal opacity-50"> · {item.role}</span> : null}</figcaption></figure>)}</Stagger>
        <div className="mt-10 flex flex-wrap gap-3"><button type="button" className="tp-btn tp-btn-ghost" onClick={() => t.goToSection("testimonials")}>All reviews</button>{t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary" onClick={t.openReviewModal}>Write a review</button> : null}</div>
      </div>
    </section>
  );
};

const Contact = () => {
  const { t, draft } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  return <section className="tp-section tp-soft"><div className="tp-wrap grid gap-8 md:grid-cols-2 md:items-end"><Reveal><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em]">Find us</p><h2 className="text-[clamp(38px,5vw,68px)] leading-none">{draft?.contactTitle || "Start your next trip here."}</h2></Reveal><Reveal delay={.08}><div className="space-y-3 text-[16px] leading-7">{t.contactAddress ? <p>{t.contactAddress}</p> : null}{t.contactPhone ? <p><a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></p> : null}{t.contactEmail ? <p><a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p> : null}</div><button type="button" className="tp-btn tp-btn-primary mt-6" onClick={() => t.goToSection("contact")}>Contact us {Icon.arrow(15)}</button></Reveal></div></section>;
};

export const TravigoHome: React.FC = () => {
  const { t, draft, primary } = useTpl();
  const roomPhotos = new Set<string>((primary?.items || []).flatMap((item: any) => [item.image, ...(item.images || [])]).filter(Boolean).map(String));
  const pool = Array.from(new Set([...(t.heroImages || []), ...(t.galleryItems || [])].filter(Boolean))).filter((url) => !roomPhotos.has(url));
  const circles = pool.slice(0, 4);
  const pill = pool[4] || "";
  const exploreImage = pool[5] || "";
  const galleryImages = pool.slice(6, 10);
  const ctaImage = pool[10] || "";
  return <>{t.isSectionEnabled("home_hero") ? <Hero circles={circles} pill={pill} /> : <div className="pt-14" />}{t.isSectionEnabled("home_about") ? <Explore image={exploreImage} /> : null}{t.isSectionEnabled("home_products") && primary ? <Rooms service={primary} /> : null}{t.isSectionEnabled("home_inclusions") ? <Amenities /> : null}{t.isSectionEnabled("home_gallery") ? <TravelGallery images={galleryImages} /> : null}<JourneyCta image={ctaImage} />{t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}<FaqSection faqs={draft?.faqs} /><Contact /></>;
};
