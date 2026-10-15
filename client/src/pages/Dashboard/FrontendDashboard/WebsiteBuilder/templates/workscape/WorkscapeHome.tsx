import React from "react";
import { motion } from "../motion";
import { WksIcon, WksImage, WksReveal } from "./WorkscapeUI";
import { useWorkscape } from "./WorkscapeContext";

const VALUES = [
  ["Community Building", "Building a space where everyone feels welcome and connected within the group."],
  ["Sustainable Actions", "Committed to thoughtful practices that reduce waste without reducing comfort."],
  ["Incubating Innovations", "Fostering an environment that encourages new ideas and useful growth."],
  ["Room for Flexibility", "Offering adaptable rooms to suit interviews, workshops and team sessions."],
];

const MARKS = ["NORTH/CO", "STUDIO—01", "WORKFORM", "UNION SPACE", "COMMON", "ORBIT"];

export const WorkscapeHome: React.FC = () => {
  const { t, draft, primary, c, photo, goToItem, openLead } = useWorkscape();
  const hero = photo("home.hero.image", t.homeHeroImage || primary?.heroImage || t.galleryItems?.[0] || "");
  const items = primary?.items || [];
  const gallery = (t.galleryItems || []).slice(0, 6);
  const review = t.testimonials?.[0];
  const reviewCopy = review?.quote || review?.review || review?.testimonial || review?.testimony || review?.text;

  return <>
    <section className="wks-home-hero"><div className="wks-shell"><motion.div className="wks-home-hero-media" initial={{ clipPath: "inset(0 0 100% 0 round 0 0 24px 24px)" }} animate={{ clipPath: "inset(0 0 0% 0 round 0 0 24px 24px)" }} transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}><WksImage src={hero} alt="Workspace"/><div className="wks-home-shade"/><motion.div className="wks-home-title" initial={{ opacity: 0, y: 45 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .32, duration: .8 }}><h1>{c("home.hero.title", draft?.title || "Work Better, Together")}</h1><div><button type="button" onClick={() => t.goToSection("products")}>View Spaces</button><button type="button" onClick={() => t.goToSection("gallery")}>View Gallery</button></div></motion.div><div className="wks-home-corner"><p>{c("home.news.body", "Our newest meeting suite is open. Discover a calmer place for your next big conversation.")}</p><WksImage src={gallery[2] || primary?.cardImage} alt="New location"/><h2>{c("home.news.title", "New Location")}</h2><button type="button" aria-label="Explore spaces" onClick={() => t.goToSection("products")}>{WksIcon.arrow()}</button></div></motion.div></div></section>

    <section className="wks-marks"><div className="wks-shell">{MARKS.map((mark, index) => <span key={mark} className={`wks-mark-${index}`}>{mark}</span>)}</div></section>

    <section className="wks-values"><div className="wks-shell"><div className="wks-values-stage"><div className="wks-values-heading"><h2>{c("home.values.title", "Our Values")}</h2><button type="button" onClick={() => t.goToSection("about")}>See More</button></div><div className="wks-values-track">{VALUES.map(([title, body], index) => <WksReveal key={title} delay={index * .06}><article><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article></WksReveal>)}</div></div></div></section>

    {items.length ? <section className="wks-section wks-home-spaces"><div className="wks-shell"><h2>{c("home.spaces.title", "Explore Spaces")}</h2><div className="wks-home-space-grid">{items.slice(0, 4).map((item, index) => <WksReveal key={item.key} delay={index * .05}><article><button type="button" className="wks-space-image" onClick={() => primary && goToItem(primary, item)}><WksImage src={item.image} alt={item.title}/><span>{WksIcon.arrow()}</span></button><h3>{item.title}</h3><p>{item.description}</p></article></WksReveal>)}</div></div></section> : null}

    {review ? <section className="wks-home-testimonial"><div className="wks-shell"><div className="wks-testimonial-media"><WksImage src={gallery[3] || hero} alt={review.name || "Member"}/><div className="wks-testimonial-shade"/><blockquote>{reviewCopy}</blockquote><div className="wks-testimonial-name"><strong>{review.name || review.reviewerName || "Guest"}</strong><span>{review.role || "Workspace member"}</span></div><div className="wks-testimonial-arrows"><span>←</span><span>→</span></div></div></div></section> : null}

    {gallery.length ? <section className="wks-section wks-home-gallery"><div className="wks-shell"><h2>{c("home.gallery.title", "Inside the WorkScape")}</h2><div className="wks-gallery-mosaic">{gallery.slice(0, 4).map((src: any, index: number) => <motion.button type="button" key={index} whileHover={{ scale: .985 }} onClick={() => t.openGalleryViewer(index)}><WksImage src={src} alt="Workspace interior"/></motion.button>)}</div></div></section> : null}

    {items.length ? <section className="wks-section wks-home-pricing"><div className="wks-shell"><h2>{c("home.pricing.title", "Pricing Plan")}</h2><div className="wks-reference-plans">{items.slice(0, 3).map((item, index) => <motion.article key={item.key} whileHover={{ y: -6 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}><button type="button" className="wks-plan-card" onClick={() => primary && openLead(primary, item)} aria-label={`Reserve ${item.title}`}><h3>{item.title}</h3><div className="wks-plan-body"><ul>{(item.features.length ? item.features : ["High-speed Wi-Fi", "Meeting-ready technology", "On-site support", "Refreshments included"]).slice(0, 4).map((feature) => <li key={feature}>{feature}</li>)}</ul><div className="wks-plan-bottom"><span>{index === 1 ? "Best for growing teams" : "Flexible booking"}<br/>Everything included</span><strong>{item.price || "Ask us"}{item.price ? <small>{item.priceUnit}</small> : null}</strong></div></div></button></motion.article>)}</div></div></section> : null}
  </>;
};
