import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { groupOpeningHours } from "../templateKit";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { useTastyc } from "./TastycContext";
import { Icon, Placeholder, RatingStars, ServiceTile } from "./TastycUI";

const Hero: React.FC = () => {
  const { t, draft, primary, profile, openLead, goToService, c } = useTastyc();
  const images: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const image = images[t.heroIndex % Math.max(images.length, 1)] || "";
  const canBook = Boolean(primary?.leadEnabled);
  return <section className="tc-hero">
    <div className="tc-hero-media">{images.length ? images.map((src, index) => {
      const active = index === t.heroIndex % images.length;
      return <motion.img key={src} src={src} alt="" aria-hidden={!active} initial={false} animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 1.045 }} transition={{ opacity: { duration: 1.35, ease: "easeInOut" }, scale: { duration: 6.5, ease: [0.22, 1, 0.36, 1] } }} />;
    }) : image ? <img src={image} alt="" /> : <Placeholder text={draft?.companyName} />}</div>
    <div className="tc-hero-content">
      <motion.span className="tc-hero-rule" initial={{ width: 0 }} animate={{ width: 30 }} transition={{ delay: .35, duration: .55 }} />
      <motion.p className="tc-kicker !text-[#e38a3d]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .38 }}>{c("home.hero.eyebrow", "Welcome to our coffee house")}</motion.p>
      <motion.h1 className="tc-h1 tc-hero-title mt-7" initial={{ opacity: 0, y: 38 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .48, duration: .75 }}>{draft?.title || "Coffee & chocolate"}</motion.h1>
      {draft?.subTitle ? <motion.p className="mx-auto mt-6 max-w-xl text-[13px] leading-7 text-white/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .68 }}>{draft.subTitle}</motion.p> : null}
      <motion.div className="tc-hero-actions" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .78 }}>
        <button type="button" className="tc-btn tc-btn-light" onClick={() => canBook && primary ? openLead(primary) : t.goToSection("contact")}>{draft?.CTAButtonText || (canBook ? profile.labels.cta : "Contact us")}</button>
        {primary ? <button type="button" className="tc-btn tc-btn-text" onClick={() => goToService(primary)}>{c("home.hero.secondaryCta", "Open menu")} {Icon.arrow()}</button> : null}
      </motion.div>
    </div>
    <button type="button" className="tc-scroll-cue" aria-label="Scroll to content" onClick={() => document.getElementById("tc-home-content")?.scrollIntoView({ behavior: "smooth" })}><span /></button>
  </section>;
};

const EditorialStories: React.FC = () => {
  const { t, draft, primary, c, goToService } = useTastyc();
  const aboutImages = (draft?.aboutPageImages || []).map((item: any) => getMediaSrc(item)).filter(Boolean);
  const gallery = t.homeGalleryItems || [];
  const stories = [
    { eyebrow: c("home.story.one.eyebrow", "About us"), title: c("home.story.one.title", draft?.aboutTitle || "We invite you to visit our coffee house"), body: c("home.story.one.body", t.aboutIntroBlocks?.[0] || "A thoughtful room, patient coffee and food made for lingering a little longer."), image: aboutImages[0] || gallery[0], label: c("home.story.one.link", "Read more"), action: () => t.goToSection("about") },
    { eyebrow: c("home.story.two.eyebrow", "Coffee menu"), title: c("home.story.two.title", "Always quality beans"), body: c("home.story.two.body", primary?.subText || "Seasonal roasts, slow brews and familiar favourites, prepared with precision."), image: primary?.heroImage || aboutImages[1] || gallery[1], label: c("home.story.two.link", "View menu"), action: () => primary && goToService(primary) },
    { eyebrow: c("home.story.three.eyebrow", "Our team"), title: c("home.story.three.title", "Use the tips and recipes of our baristas"), body: c("home.story.three.body", "Meet the people behind every pour, pastry and warm welcome."), image: aboutImages[2] || gallery[2], label: c("home.story.three.link", "Meet the team"), action: () => t.goToSection("about") },
  ];
  return <section id="tc-home-content" className="tc-editorial">{stories.map((story, index) => <article key={story.eyebrow} className="tc-story" data-reverse={index % 2 ? "true" : "false"}>
    <motion.div className="tc-story-copy" initial={{ opacity: 0, x: index % 2 ? 36 : -36 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .72, ease: [0.22, 1, 0.36, 1] }}><p className="tc-kicker tc-kicker-rule">{story.eyebrow}</p><h2 className="tc-story-title">{story.title}</h2><p className="tc-story-body">{story.body}</p><button type="button" className="tc-btn tc-btn-primary" onClick={story.action}>{story.label}</button></motion.div>
    <motion.button type="button" className="tc-story-media" onClick={story.action} initial={{ opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }}>{story.image ? <img src={story.image} alt="" loading="lazy" /> : <Placeholder text={story.title} />}<span className="tc-story-image-index">0{index + 1}</span></motion.button>
  </article>)}</section>;
};

const FeatureIcon: React.FC<{ index: number }> = ({ index }) => {
  if (index === 0) return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 16h34v35H12zM18 10h22M18 24h22M20 31h18M25 38h8M46 24h4a8 8 0 0 1 0 16h-4"/></svg>;
  if (index === 1) return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 26h30v17a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12zM47 30h3a7 7 0 0 1 0 14h-4M24 6c-5 7 5 9 0 16M34 6c-5 7 5 9 0 16"/></svg>;
  return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="17" r="9"/><path d="M14 58c1-15 7-24 18-24s17 9 18 24M23 14h18M18 43l14 9 14-9M26 35l6 17 6-17"/></svg>;
};

const Features: React.FC = () => {
  const { c } = useTastyc();
  const features = [[c("home.feature.one", "Menu for every taste"), c("home.feature.1.body", "Morning classics, seasonal plates and desserts made in-house.")], [c("home.feature.two", "Always quality beans"), c("home.feature.2.body", "Traceable beans selected and roasted for a balanced, expressive cup.")], [c("home.feature.three", "Experienced baristas"), c("home.feature.3.body", "A skilled team that treats every drink with the attention it deserves.")]];
  return <section className="tc-feature-band"><div className="tc-wrap tc-feature-grid">{features.map(([title, body], index) => <motion.div key={title} className="tc-feature" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .45 }} transition={{ delay: index * .1, duration: .6 }}><span className="tc-feature-icon"><FeatureIcon index={index} /></span><h3>{title}</h3><p>{body}</p></motion.div>)}</div></section>;
};

const Hours: React.FC = () => {
  const { t, draft, primary, profile, openLead, c, photo } = useTastyc();
  const rows = groupOpeningHours(draft?.openingHours);
  const image = photo("home.hours.image", t.galleryItems?.[3] || t.heroImages?.[1]);
  if (!rows.length && !draft?.contactBusinessHours) return null;
  return <section className="tc-hours" style={image ? { backgroundImage: `url(${image})` } : undefined}><div className="tc-hours-overlay"/><div className="tc-wrap tc-hours-stage">
    <motion.div className="tc-hours-copy" initial={{ opacity: 0, x: -35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .35 }}><p className="tc-kicker tc-kicker-rule !text-[#e38a3d]">{c("home.hours.eyebrow", "Reservation")}</p><h2 className="tc-hours-title">{c("home.hours.title", "Working hours")}</h2><p>{c("home.hours.sub", "Join us for slow mornings, bright lunches and coffee that carries into the evening.")}</p><div className="mt-9 flex flex-wrap gap-4">{primary?.leadEnabled ? <button type="button" className="tc-btn tc-btn-primary" onClick={() => openLead(primary)}>{profile.labels.cta}</button> : null}<button type="button" className="tc-btn tc-btn-light" onClick={() => t.goToSection("contact")}>Contact us</button></div></motion.div>
    <motion.div className="tc-hours-card" initial={{ opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ delay: .12 }}>{rows.length ? rows.slice(0, 3).map((row) => <div key={row.days} className="tc-hours-block"><span>{row.days}</span><strong>{row.hours}</strong></div>) : <p>{draft.contactBusinessHours}</p>}{t.contactPhone ? <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{Icon.phone(17)} {t.contactPhone}</a> : null}</motion.div>
  </div></section>;
};

const Testimonials: React.FC = () => {
  const { t, c } = useTastyc();
  const items = (t.testimonials || []).slice(0, 6);
  const [index, setIndex] = useState(0);
  useEffect(() => { if (items.length < 2) return; const timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), 5200); return () => window.clearInterval(timer); }, [items.length]);
  if (!items.length) return null;
  const item = items[index] || items[0];
  return <section className="tc-testimonials tc-section"><div className="tc-wrap tc-testimonial-layout">
    <div className="tc-testimonial-intro"><p className="tc-kicker tc-kicker-rule">{c("home.reviews.eyebrow", "Testimonials")}</p><h2>{c("home.reviews.title", "What our visitors say")}</h2><p>{c("home.reviews.sub", "Honest words from the people who make this room feel alive.")}</p><button type="button" className="tc-link mt-8" onClick={() => t.goToSection("testimonials")}>More about us</button></div>
    <div className="tc-quote-stage"><AnimatePresence mode="wait"><motion.article key={item.id || index} initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -25 }} transition={{ duration: .5 }}><span className="tc-quote-mark">“</span><RatingStars value={Number(item.rating) || 5}/><h3>{item.title || item.heading || "A wonderful place"}</h3><blockquote>{item.review || item.testimony || item.text || item.description}</blockquote><div className="tc-reviewer"><span>{item.reviewerName || item.name || "Guest"}</span><small>{item.date || "Verified visitor"}</small></div></motion.article></AnimatePresence><div className="tc-slider-controls"><div>{items.map((_: any, dot: number) => <button key={dot} type="button" aria-label={`Show testimonial ${dot + 1}`} aria-pressed={dot === index} onClick={() => setIndex(dot)}/>)}</div><span>Slider navigation</span><button type="button" aria-label="Previous testimonial" onClick={() => setIndex((index - 1 + items.length) % items.length)}>{Icon.back()}</button><button type="button" aria-label="Next testimonial" onClick={() => setIndex((index + 1) % items.length)}>{Icon.arrow()}</button></div></div>
  </div></section>;
};

const Stats: React.FC = () => {
  const { primary, rating, c } = useTastyc();
  const stats = useMemo(() => [[c("home.stat.one.value", `${Math.max((primary?.items?.length || 0) * 25, 150)}+`), c("home.stat.one.label", "Guests every week")], [c("home.stat.two.value", `${primary?.items?.length || 8}+`), c("home.stat.two.label", "Signature plates")], [c("home.stat.three.value", rating.avg ? rating.avg.toFixed(1) : "4.9"), c("home.stat.three.label", "Average rating")], [c("home.stat.four.value", "7"), c("home.stat.four.label", "Days of warm welcomes")]], [c, primary?.items?.length, rating.avg]);
  return <section className="tc-stats"><div className="tc-wrap">{stats.map(([value, label], index) => <motion.div key={label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}><strong>{value}</strong><span>{label}</span></motion.div>)}</div></section>;
};

const BrandStory: React.FC = () => {
  const { t, primary, draft, c, goToService, openLead, photo } = useTastyc();
  const image = photo("home.brand.image", t.galleryItems?.[4] || t.heroImages?.[2]);
  return <section className="tc-brand-story"><div className="tc-wrap tc-brand-layout"><motion.div className="tc-brand-visual" initial={{ opacity: 0, rotate: -2, y: 30 }} whileInView={{ opacity: 1, rotate: 0, y: 0 }} viewport={{ once: true, amount: .25 }}>{image ? <img src={image} alt="" loading="lazy"/> : <Placeholder text={draft?.companyName}/>}<span>{draft?.companyName || "Coffee House"}</span></motion.div><motion.div className="tc-brand-copy" initial={{ opacity: 0, x: 35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .35 }}><p className="tc-kicker tc-kicker-rule">{c("home.brand.eyebrow", "Our coffee house")}</p><h2>{c("home.brand.title", "Coffee, conversation and a table worth returning to")}</h2><p>{c("home.brand.body", "A neighbourhood coffee house shaped by careful sourcing, generous hospitality and the pleasure of doing simple things exceptionally well.")}</p><div className="mt-9 flex flex-wrap gap-4">{primary ? <button type="button" className="tc-btn tc-btn-primary" onClick={() => goToService(primary)}>Explore menu</button> : null}{primary?.leadEnabled ? <button type="button" className="tc-btn tc-btn-dark" onClick={() => openLead(primary)}>Reserve a table</button> : null}</div></motion.div></div></section>;
};

const OtherServices: React.FC = () => {
  const { services, primary, c } = useTastyc();
  const others = services.filter((service) => service.key !== primary?.key);
  if (!others.length) return null;
  return <section className="tc-section"><div className="tc-wrap"><p className="tc-kicker tc-kicker-rule">{c("home.services.eyebrow", "More from us")}</p><h2 className="tc-h2 mt-5 max-w-3xl">{c("home.services.title", "Everything under one roof")}</h2><div className="tc-service-grid mt-12">{others.map((service) => <ServiceTile key={service.key} service={service}/>)}</div></div></section>;
};

export const TastycHome: React.FC = () => <><Hero/><EditorialStories/><Features/><Hours/><Testimonials/><Stats/><BrandStory/><OtherServices/></>;
