import React from "react";
import { motion } from "../motion";
import { groupOpeningHours } from "../templateKit";
import { FaqSection } from "../shared/TplParts";
import { useGrandBar } from "./GrandBarContext";
import { GbIcon, GbImage, GbReveal, mapSrc } from "./GrandBarUI";

export const GrandBarHome: React.FC = () => {
  const { t, draft, primary, c, photo, openLead } = useGrandBar();
  const gallery: string[] = t.galleryItems || [];
  const items = primary?.items || [];
  const heroPoster = photo("home.hero.image", t.homeHeroImage || primary?.heroImage || gallery[0] || "");
  const storyMain = photo("home.story.image", gallery[1] || heroPoster);
  const storyOrb = photo("home.story.orb", gallery[2] || items[0]?.image || heroPoster);
  const menuBanner = photo("home.menu.banner", gallery[3] || items[1]?.image || heroPoster);
  const menuLeftTop = photo("home.menu.leftTop", gallery[4] || items[2]?.image || heroPoster);
  const menuLeftBottom = photo("home.menu.leftBottom", gallery[5] || items[3]?.image || heroPoster);
  const menuRight = photo("home.menu.right", gallery[6] || items[4]?.image || heroPoster);
  const premiumLeft = photo("home.premium.left", gallery[7] || items[5]?.image || storyMain);
  const premiumCenter = photo("home.premium.center", gallery[8] || items[6]?.image || menuBanner);
  const premiumRight = photo("home.premium.right", gallery[9] || items[7]?.image || storyOrb);
  const premiumD = photo("home.premium.d", gallery[10] || items[8]?.image || menuLeftTop);
  const premiumE = photo("home.premium.e", gallery[11] || items[9]?.image || menuLeftBottom);
  const premiumF = photo("home.premium.f", gallery[12] || items[10]?.image || menuRight);
  const premiumRow = [premiumLeft, premiumCenter, premiumRight, premiumD, premiumE, premiumF].filter(Boolean);
  const hours = groupOpeningHours(draft?.openingHours);
  const heroVideo = String(draft?.heroVideoUrl || "").trim();
  const menuNames = primary?.items?.length
    ? Array.from(new Set(primary.items.map((item) => item.category || "Signatures"))).slice(0, 4)
    : ["Cocktails", "Desserts", "Wine & Champagne", "Food & Bites"];

  return <>
    <section className="gb-hero">
      <div className="gb-frame gb-hero-grid">
        <motion.div className="gb-hero-copy" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { delayChildren: .2, staggerChildren: .13 } } }}>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 42 }, visible: { opacity: 1, y: 0, transition: { duration: .92, ease: [0.22, 1, 0.36, 1] } } }}>{c("home.hero.title", draft?.title || "A Mixologist's Paradise")}</motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: .72, ease: [0.22, 1, 0.36, 1] } } }}>{c("home.hero.body", draft?.subTitle || "At Grand Bar, we craft exceptional evenings that tantalize the taste buds and ignite the senses.")}</motion.p>
          <motion.div className="gb-hero-meta" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: .72, ease: [0.22, 1, 0.36, 1] } } }}>
            <span>{GbIcon.map(22)} {t.contactAddress}</span>
            <div><b>{c("home.hero.hoursLabel", "Opening hours")}</b>{hours.slice(0, 2).map((row) => <span key={row.days}>{row.days}: {row.hours}</span>)}</div>
          </motion.div>
        </motion.div>
        <motion.div className="gb-hero-image" initial={{ clipPath: "inset(0 0 100% 0 round 999px 999px 0 0)" }} animate={{ clipPath: "inset(0 0 0% 0 round 999px 999px 0 0)" }} transition={{ duration: 1.18, ease: [0.22, 1, 0.36, 1] }}>
          {heroVideo ? <video className="gb-hero-video" src={heroVideo} poster={heroPoster} autoPlay muted loop playsInline preload="metadata" aria-label="Cocktail bar atmosphere"/> : <GbImage src={heroPoster} alt="Cocktail bar atmosphere"/>}
          <span>{c("home.hero.script", "Flow with the tides")}</span>
        </motion.div>
      </div>
    </section>

    <section className="gb-paradise">
      <div className="gb-frame">
        <GbReveal className="gb-paradise-title"><span className="gb-round-icon" aria-hidden="true">{GbIcon.glass(30)}</span><h2>{c("home.story.title", "Unwind in purple paradise")}</h2></GbReveal>
        <div className="gb-paradise-grid">
          <GbReveal className="gb-paradise-copy">
            <p className="gb-kicker">{c("home.story.eyebrow", "World-class cocktails under the arches")}</p>
            <p>{c("home.story.body", "Our bartenders balance classic technique with bright seasonal ingredients, while the kitchen turns small plates into a reason to stay for one more round.")}</p>
            <button type="button" className="gb-outline-button" onClick={() => primary?.leadEnabled ? openLead(primary) : t.goToSection("contact")}>{c("home.story.button", "Book a table")}</button>
          </GbReveal>
          <motion.div className="gb-paradise-main" initial={{ opacity: 0, y: 54, clipPath: "inset(14% 0 0 0)" }} whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }} viewport={{ once: true, amount: .18 }} transition={{ duration: .95, ease: [0.22, 1, 0.36, 1] }}><GbImage src={storyMain} alt="Cocktail lounge guest"/></motion.div>
          <motion.div className="gb-paradise-orb" initial={{ opacity: 0, y: 46, rotate: 4 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} whileHover={{ y: -10, rotate: -2 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .88, delay: .14, ease: [0.22, 1, 0.36, 1] }}><GbImage src={storyOrb} alt="Signature cocktails"/></motion.div>
        </div>
      </div>
    </section>

    <section className="gb-menu-banner"><motion.div className="gb-menu-banner-media" initial={{ scale: 1.1 }} whileInView={{ scale: 1 }} viewport={{ once: true, amount: .2 }} transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}><GbImage src={menuBanner} alt="Our menu"/></motion.div><div className="gb-menu-banner-shade"/><GbReveal className="gb-menu-banner-title"><h2>{c("home.menu.title", "Our Menus")}</h2></GbReveal></section>

    <section className="gb-menu-discovery">
      <div className="gb-frame gb-menu-discovery-grid">
        <motion.div className="gb-menu-collage gb-menu-collage-left" initial={{ opacity: 0, x: -46 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .88, ease: [0.22, 1, 0.36, 1] }}><GbImage src={menuLeftTop} alt="Chef's plate"/><GbImage src={menuLeftBottom} alt="Dinner guest"/></motion.div>
        <GbReveal className="gb-menu-links"><span className="gb-leaf">⌁</span><p className="gb-kicker">{c("home.menu.eyebrow", "Explore by our cuisines")}</p>{menuNames.map((name) => <button key={name} type="button" onClick={() => primary && t.goToProductPage(primary.slug)}>{name}</button>)}<button type="button" className="gb-outline-button" onClick={() => t.goToSection("products")}>{c("home.menu.button", "View all menus")}</button></GbReveal>
        <motion.div className="gb-menu-collage gb-menu-collage-right" initial={{ opacity: 0, x: 46 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .88, delay: .08, ease: [0.22, 1, 0.36, 1] }}><GbImage src={menuRight} alt="Signature cocktail"/></motion.div>
      </div>
    </section>

    <section className="gb-premium">
      <div className="gb-frame"><GbReveal className="gb-premium-title"><h2>{c("home.premium.title", "Unlock premium flavors")}</h2><p>{c("home.premium.script", "Stirring up something special")}</p></GbReveal></div>
      {premiumRow.length ? (
        <div className="gb-premium-track">
          {/* The row is rendered twice back-to-back and animated exactly -50%, so the loop never
              shows a seam — a standard marquee trick, pauses on hover/focus for anyone reading. */}
          <div className="gb-premium-row">
            {[...premiumRow, ...premiumRow].map((src, index) => <div className="gb-premium-media" key={index}><GbImage src={src} alt="Premium bar experience"/></div>)}
          </div>
        </div>
      ) : null}
    </section>

    <section className="gb-find">
      <div className="gb-frame gb-find-grid"><motion.div className="gb-find-map" initial={{ opacity: 0, clipPath: "inset(12% 0 0 0 round 999px 999px 0 0)" }} whileInView={{ opacity: 1, clipPath: "inset(0% 0 0 0 round 999px 999px 0 0)" }} viewport={{ once: true, amount: .18 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}><iframe title="Location map" src={draft?.mapUrl || mapSrc(t.contactAddress)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/><span>{c("home.location.script", "A blend above the rest")}</span></motion.div><GbReveal className="gb-find-copy"><h2>{c("home.location.title", "Where to find us")}</h2><div className="gb-round-icon">{GbIcon.glass(24)}</div><p>{t.contactAddress}</p>{hours.slice(0, 3).map((row) => <p key={row.days}>{row.days}: {row.hours}</p>)}<a className="gb-outline-button" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(t.contactAddress || "")} target="_blank" rel="noreferrer">{c("home.location.button", "Get direction")}</a></GbReveal></div>
    </section>

    <div className="gb-faq-wrap"><FaqSection faqs={draft?.faqs}/></div>
  </>;
};
