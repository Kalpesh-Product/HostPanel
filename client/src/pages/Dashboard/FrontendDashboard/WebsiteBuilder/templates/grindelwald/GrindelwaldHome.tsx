import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { priceWithUnit } from "../templateKit";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { LogoOval, Reveal } from "./GrindelwaldUI";

const urlOf = (value: any): string => (typeof value === "string" ? value : value?.url || "");
// The same easing Reveal uses, for the hero pieces that can't use Reveal directly (it renders a
// plain div, not a button or a <p>).
const OUT_QUART = [0.25, 1, 0.5, 1] as const;

/** The full-width hero: a round photo with dashed neon rings, the stacked title and a play button for the video. */
const Hero: React.FC<{ image: string }> = ({ image }) => {
  const { draft, c } = useTpl();
  const [playing, setPlaying] = useState(false);
  const video = String(draft?.heroVideoUrl || "").trim();
  return (
    <section id="gw-hero" className="gw-hero">
      <div className="gw-ring" aria-hidden="true" />
      <div className="gw-ring gw-ring-2" aria-hidden="true" />
      {/* Every piece rises in from below and fades in, like the reference's own page-load weight —
          the circle, play button and subtitle are now centred with inset/margin, not a static
          transform, so that fade-up transform is free to animate them without a fight. */}
      <motion.div className="gw-hero-circle" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1, ease: OUT_QUART }}>
        {image ? <img src={image} alt="" /> : <Placeholder text={draft?.companyName || ""} />}
      </motion.div>
      <div className="gw-hero-title">
        <Reveal delay={0.15}><span className="gw-hero-line-1 block">{c("home.hero.line1", "Cozy")}</span></Reveal>
        <Reveal delay={0.3}><span className="gw-hero-line-2 block">{c("home.hero.line2", "Cabin")}</span></Reveal>
        <Reveal delay={0.42}><span className="gw-hero-line-3 block">{c("home.hero.line3", "In The")}</span></Reveal>
        <Reveal delay={0.5}><span className="gw-hero-line-4 block">{c("home.hero.line4", "Woods!")}</span></Reveal>
      </div>
      {video ? (
        <motion.button type="button" className="gw-play" aria-label="Play the video" onClick={() => setPlaying(true)} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.7, ease: OUT_QUART }}>
          <svg width="24" height="26" viewBox="0 0 24 26" aria-hidden="true"><path d="M3 2.5v21L22 13 3 2.5Z" fill="currentColor" /></svg>
        </motion.button>
      ) : null}
      <motion.p className="gw-hero-sub" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6, ease: OUT_QUART }}>
        {c("home.hero.sub", "Escape the stresses of everyday life and reconnect with nature.")}
      </motion.p>
      {playing && video ? (
        <div className="gw-video-modal" role="dialog" aria-label="Video" onClick={() => setPlaying(false)}>
          <button type="button" className="gw-video-close" aria-label="Close video" onClick={() => setPlaying(false)}>×</button>
          <video src={video} controls autoPlay playsInline onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
};

/** The pale intro: a neon oval with the first letter beside the welcome text, and three stats in serif numerals. */
const Intro: React.FC = () => {
  const { c } = useTpl();
  const stats = [1, 2, 3].map((n) => ({
    label: c(`home.intro.stat${n}.label`, ["Dense forest", "Living space", "Proximity to nearest town"][n - 1]),
    value: c(`home.intro.stat${n}.value`, ["20.291m2", "324m2", "30 minutes"][n - 1]),
  }));
  return (
    <section className="tp-section pb-40 pt-40">
      <div className="tp-wrap grid items-center gap-16 md:grid-cols-2">
        <Reveal from="left">
          <div className="max-w-md">
            <LogoOval />
            <p className="mt-10 text-[18px] leading-8">{c("home.intro.text", "Welcome to our cosy cabin in the woods! Our rental home, nestled in the heart of the forest, is the ideal retreat for nature lovers and anyone looking for a peaceful escape from the hustle and bustle of city life.")}</p>
          </div>
        </Reveal>
        <div className="space-y-14 md:pl-12">
          {stats.map((stat, index) => {
            const match = stat.value.match(/^([\d.,]+)\s*(.*)$/);
            return (
              <Reveal key={index} from="right" delay={index * 0.06}>
                <p className="text-[18px]">{stat.label}</p>
                <p className="gw-stat-value mt-3">
                  {match ? match[1] : stat.value}
                  {match && match[2] ? <small>{match[2]}</small> : null}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/** A full-width photo that stays fixed while the page scrolls over it. */
const Parallax: React.FC<{ image: string }> = ({ image }) => (
  <section className="gw-parallax" style={image ? { backgroundImage: `url("${image}")` } : { background: "var(--t-secondary)" }} aria-hidden="true" />
);

/** The green band: a line of text in capitals, then the reference's own photo collage — two
 * columns, each a pair of photos stacked with a gap, with the right column pulled up to
 * interlock with the left one. */
const About: React.FC<{ images: string[] }> = ({ images }) => {
  const { c } = useTpl();
  // Left column: photos 1 and 3. Right column: photos 2 and 4, offset upward.
  const left = [{ src: images[0], ratio: "400 / 341" }, { src: images[2], ratio: "400 / 530" }];
  const right = [{ src: images[1], ratio: "400 / 525" }, { src: images[3], ratio: "400 / 530" }];
  const column = (items: { src: string; ratio: string }[], startDelay: number) => (
    <div className="flex flex-col gap-10">
      {items.map((item, index) => (
        <Reveal key={index} delay={startDelay + index * 0.08} className="gw-about-photo" style={{ aspectRatio: item.ratio }}>
          {item.src ? <img src={item.src} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Placeholder text="" />}
        </Reveal>
      ))}
    </div>
  );
  return (
    <section className="gw-band relative pb-32 pt-20">
      <div className="gw-wave" aria-hidden="true" />
      <div className="tp-wrap pt-24 text-center">
        <Reveal><p className="gw-eyebrow text-[24px] tracking-[.06em]" style={{ color: "var(--t-accent)" }}>{c("home.about.eyebrow", "About us")}</p></Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-8 max-w-5xl text-[26px] uppercase leading-[1.4] tracking-[.01em]">
            {c("home.about.text", "At The Wilderness Retreat, We Pride Ourselves On Offering A Peaceful, Serene Atmosphere That Allows Our Guests To Truly Disconnect From The Stresses Of Everyday Life. Whether You Want To Spend Your Days Exploring The Nearby Trails, Fishing In The Nearby Stream, Or Simply Soaking In The Hot Tub As You Take In The Beauty Of Your Surroundings.")}
          </p>
        </Reveal>
        <div className="mx-auto mt-24 grid max-w-[900px] grid-cols-2 gap-x-6 text-left sm:gap-x-10">
          {column(left, 0)}
          <div className="md:-mt-24">{column(right, 0.08)}</div>
        </div>
      </div>
    </section>
  );
};

/** One room card: a tall photo, the name, a line about the room and an arrow link to its page —
 * the reference's own cabin-card style, reused on both the home page and the Services page. */
export const GrindelwaldRoomCard: React.FC<{ item: any; index: number; service?: any }> = ({ item, index, service }) => {
  const { c, primary, goToItem } = useTpl();
  const target = service || primary;
  if (!target) return null;
  return (
    <Reveal from={index === 0 ? "left" : index % 3 === 2 ? "right" : "bottom"} delay={Math.min(index, 2) * 0.05}>
      <article className="gw-room group">
        <button type="button" className="gw-room-media block w-full" onClick={() => goToItem(target, item)} aria-label={`Open ${item.title}`}>
          {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
        </button>
        <button type="button" className="mt-8 block text-left" onClick={() => goToItem(target, item)}><h3 className="gw-h3">{item.title}</h3></button>
        <p className="gw-muted mt-3 min-h-[52px] text-[16px] leading-7">{item.description}</p>
        {item.price ? <p className="mt-2 text-[15px] font-semibold">{priceWithUnit(item.price, item.priceUnit)}</p> : null}
        <button type="button" className="gw-arrow-link mt-5" onClick={() => goToItem(target, item)}>
          {c("home.rooms.link", "View room")} {Icon.arrow(16)}
        </button>
      </article>
    </Reveal>
  );
};

/** Room cards: a tall photo, the name, a line about the room and an arrow link to its page. */
const Rooms: React.FC = () => {
  const { c, primary } = useTpl();
  if (!primary || !primary.items.length) return null;
  const cards = primary.items.slice(0, 3);
  return (
    <section className="tp-section">
      <div className="tp-wrap text-center">
        <Reveal from="left"><h2 className="gw-h2 mx-auto max-w-3xl">{c("home.rooms.title", "Our unique rooms within the retreat")}</h2></Reveal>
      </div>
      <div className="tp-wrap mt-20 grid gap-10 md:grid-cols-3">
        {cards.map((item, index) => <GrindelwaldRoomCard key={item.key} item={item} index={index} />)}
      </div>
    </section>
  );
};

/** How many photos the carousel shows at once, matching the CSS breakpoints. */
const useCarouselPerView = () => {
  const [perView, setPerView] = useState(() => (typeof window === "undefined" ? 3 : window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3));
  useEffect(() => {
    const onResize = () => setPerView(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return perView;
};

/** The photo carousel: a real sliding track (not a cross-fade) that auto-advances and pauses under the cursor. */
const Slider: React.FC<{ images: string[] }> = ({ images }) => {
  const { c, t } = useTpl();
  const perView = useCarouselPerView();
  const count = images.length;
  const maxIndex = Math.max(0, count - perView);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (index > maxIndex) setIndex(0); }, [maxIndex, index]);
  useEffect(() => {
    if (count <= perView || paused) return;
    const timer = window.setInterval(() => setIndex((current) => (current >= maxIndex ? 0 : current + 1)), 4200);
    return () => window.clearInterval(timer);
  }, [count, perView, maxIndex, paused]);
  if (count < 2) return null;
  const step = (direction: number) => setIndex((current) => Math.min(maxIndex, Math.max(0, current + direction)));
  return (
    <section className="tp-section pt-0">
      <div className="tp-wrap text-center">
        <Reveal from="left"><h2 className="gw-h2 mx-auto max-w-3xl">{c("home.gallery.title", "Experience the magic of the wilderness retreat")}</h2></Reveal>
        <Reveal delay={0.05}><p className="gw-muted mx-auto mt-6 max-w-2xl text-[18px] leading-8">{c("home.gallery.text", "Welcome to our cosy cabin in the woods! Our rental home, nestled in the heart of the forest.")}</p></Reveal>
      </div>
      <div className="tp-wrap mt-16 flex items-center gap-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <button type="button" className="gw-arrow shrink-0" aria-label="Previous photo" disabled={index === 0} onClick={() => step(-1)}><span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>{Icon.chevron(22)}</span></button>
        <div className="gw-carousel flex-1">
          <div className="gw-carousel-track" style={{ transform: `translateX(-${index * (100 / perView)}%)` }}>
            {images.map((src, i) => (
              <button type="button" key={`${src}-${i}`} className="gw-slide" style={{ width: `${100 / perView}%` }} onClick={() => t.openGalleryViewer(i)}>
                <div className="gw-slide-media"><img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /></div>
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="gw-arrow shrink-0" aria-label="Next photo" disabled={index >= maxIndex} onClick={() => step(1)}><span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}>{Icon.chevron(22)}</span></button>
      </div>
      {count > perView ? (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }, (_, i) => (
            <button key={i} type="button" aria-label={`Show photo set ${i + 1}`} onClick={() => setIndex(i)} className="h-2 rounded-full transition-all duration-500" style={{ width: i === index ? 26 : 8, background: i === index ? "var(--t-accent)" : "color-mix(in srgb, var(--t-text) 25%, transparent)" }} />
          ))}
        </div>
      ) : null}
    </section>
  );
};

/** Reviews: three at a time. With more than three, the set moves on every few seconds and pauses under the cursor. */
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
    <section className="tp-section pt-0">
      <div className="tp-wrap text-center">
        <Reveal from="left"><h2 className="gw-h2 mx-auto">{c("home.reviews.title", "What guests say")}</h2></Reveal>
        <Reveal delay={0.05}>
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="gw-h2">{rating.count ? rating.avg.toFixed(1) : "5.0"}</p>
            <StarRow value={rating.avg || 5} size={18} />
            <p className="gw-muted text-[15px]">{c("home.reviews.count", "Based on")} {count} {count === 1 ? "review" : "reviews"}</p>
          </div>
        </Reveal>
      </div>
      <div className="tp-wrap mt-14 grid gap-8 md:grid-cols-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <AnimatePresence mode="popLayout">
          {visible.map((item, index) => (
            <motion.figure
              key={`${start}-${index}-${item.key || item.name}`}
              className="gw-review h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            >
              <StarRow value={item.rating || 5} />
              <blockquote className="mt-6 text-[20px] leading-8" style={{ fontFamily: "'Bodoni Moda', serif" }}>&ldquo;{item.text}&rdquo;</blockquote>
              <figcaption className="mt-6 text-[14px] font-semibold">{item.name}{item.role ? <span className="gw-muted font-normal"> · {item.role}</span> : null}</figcaption>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
      {count > perView ? (
        <div className="mt-10 flex justify-center gap-2">
          {reviews.map((_, index) => (
            <button key={index} type="button" aria-label={`Show review ${index + 1}`} onClick={() => setStart(index)} className="h-2 rounded-full transition-all duration-500" style={{ width: index === start ? 26 : 8, background: index === start ? "var(--t-secondary)" : "color-mix(in srgb, var(--t-secondary) 30%, transparent)" }} />
          ))}
        </div>
      ) : null}
      <div className="mt-12 flex justify-center gap-4">
        <button type="button" className="gw-pill" onClick={() => t.goToSection("testimonials")}>{c("home.reviews.all", "All reviews")}</button>
        {t.showWriteReview ? <button type="button" className="gw-pill gw-pill-solid" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button> : null}
      </div>
    </section>
  );
};

/** The closing section: the reference's own pale "let's talk" band (heading, button, the oval
 * logo again) followed by a separate deep green band of three links — not one dark block, so it
 * doesn't run straight into the footer underneath it. */
export const GrindelwaldCallToAction: React.FC = () => {
  const { c, t, primary, openLead } = useTpl();
  const links = [
    { key: "col1", title: "About Us", sub: "in a true way", go: () => t.goToSection("about") },
    { key: "col2", title: "Rooms", sub: "See our", go: () => t.goToSection("products") },
    { key: "col3", title: "Reserve", sub: "You can", go: () => (primary?.leadEnabled ? openLead(primary) : t.goToSection("contact")) },
  ];
  const talk = () => (primary?.leadEnabled ? openLead(primary) : t.goToSection("contact"));
  return (
    <>
      <section className="tp-section pb-20">
        <div className="tp-wrap grid items-center gap-14 md:grid-cols-[1.3fr_1fr]">
          <Reveal from="left">
            <h2 className="gw-h1 max-w-xl">{c("home.cta.title", "It's Time To Get To Know Each Other!")}</h2>
            <p className="gw-muted mt-7 text-[18px]">{c("home.cta.sub", "Grab a cup of coffee and...")}</p>
            <div className="mt-9"><button type="button" className="gw-pill" onClick={talk}>{c("home.cta.talk", "Let's talk!")}</button></div>
          </Reveal>
          <Reveal from="right" delay={0.1} className="hidden justify-self-center md:block">
            <LogoOval />
          </Reveal>
        </div>
      </section>
      <section className="gw-band py-24">
        <div className="tp-wrap grid gap-10 text-center md:grid-cols-3">
          {links.map((link, index) => (
            <Reveal key={link.key} delay={index * 0.06}>
              <button type="button" className="group block w-full text-center" onClick={link.go}>
                <p className="gw-h3">{c(`home.cta.${link.key}.title`, link.title)}</p>
                <p className="mt-2 text-[16px] opacity-80 transition-opacity group-hover:opacity-100">{c(`home.cta.${link.key}.sub`, link.sub)}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
};

export const GrindelwaldHome: React.FC = () => {
  const { t, draft, primary, photo } = useTpl();
  // Room photos stay with the rooms; the rest of the business's photos fill the home page slots.
  const roomPhotos = new Set<string>((primary?.items || []).flatMap((item: any) => [item.image, ...(item.images || [])]).map(urlOf).filter(Boolean));
  const pool: string[] = Array.from(new Set<string>([...(t.heroImages || []).map(urlOf), ...(t.galleryItems || []).map(urlOf)].filter(Boolean))).filter((url) => !roomPhotos.has(url));
  const heroImage = photo("home.hero.image", pool[0] || "");
  const parallaxImage = photo("home.parallax.image", pool[1] || "");
  const aboutImages = [0, 1, 2, 3].map((index) => photo(`home.about.image${index + 1}`, pool[2 + index] || ""));
  const sliderImages = [1, 2, 3, 4, 5].map((n, index) => photo(`home.gallery.image${n}`, pool[6 + index] || "")).filter(Boolean);
  return (
    <>
      {t.isSectionEnabled("home_hero") ? <Hero image={heroImage} /> : <div className="pt-14" />}
      {t.isSectionEnabled("home_about") ? <Intro /> : null}
      {t.isSectionEnabled("home_about") ? <Parallax image={parallaxImage} /> : null}
      {t.isSectionEnabled("home_about") ? <About images={aboutImages} /> : null}
      {t.isSectionEnabled("home_products") ? <Rooms /> : null}
      {t.isSectionEnabled("home_gallery") ? <Slider images={sliderImages} /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {t.isSectionEnabled("home_contact") ? <GrindelwaldCallToAction /> : null}
      <FaqSection faqs={draft?.faqs} />
    </>
  );
};
