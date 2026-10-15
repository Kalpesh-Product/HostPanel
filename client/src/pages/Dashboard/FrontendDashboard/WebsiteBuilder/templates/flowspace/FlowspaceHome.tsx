import React from "react";
import { motion } from "../motion";
import { FaqSection } from "../shared/TplParts";
import { priceWithUnit } from "../templateKit";
import { useFlowspace } from "./FlowspaceContext";
import { Icon, Placeholder, Reveal, SectionHead } from "./FlowspaceUI";

const AMENITIES = ["Presentation display", "Fast Wi-Fi", "Video calls", "Whiteboards", "24/7 access", "Ergonomic chairs", "Coffee & tea", "Soundproof rooms", "On-site support", "Easy rescheduling", "Natural light", "Breakout spaces"];

const Hero: React.FC = () => {
  const { t, draft, primary, c, rating } = useFlowspace();
  const image = t.heroImages?.[0] || primary?.heroImage || t.galleryItems?.[0];
  return <section className="fs-hero"><div className="fs-hero-media">{image ? <img src={image} alt="Modern meeting and workspace"/> : <Placeholder text="Lumen Rooms"/>}<span/></div><div className="fs-shell fs-hero-grid"><div className="fs-hero-copy"><motion.h1 initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22, duration: .9, ease: [0.22, 1, 0.36, 1] }}>{draft?.title || "Your next workspace starts here."}</motion.h1><motion.p className="fs-hero-sub" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .36, duration: .7 }}>{draft?.subTitle || "Flexible, fully equipped meeting rooms built for focused teams, creative sessions, and work that matters."}</motion.p><motion.div className="fs-hero-actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .48 }}><button type="button" className="fs-pill-btn fs-hero-cta" onClick={() => t.goToSection("products")}>{draft?.CTAButtonText || "Find your desk"}<span className="fs-btn-icon">{Icon.map()}</span></button></motion.div><motion.div className="fs-trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .65 }}><span>{rating.count ? `${rating.avg.toFixed(1)} from ${rating.count} teams` : c("home.hero.proof", "Trusted by 500+ professionals")}</span></motion.div></div></div></section>;
};

const Intro: React.FC = () => {
  const { t, c } = useFlowspace();
  return <section className="fs-intro"><div className="fs-shell"><Reveal className="fs-intro-statement"><h2>{c("home.intro.title", "Work solo, meet others, or bring your team together — all in one flexible space.")}</h2><p>{t.aboutIntroBlocks?.[0] || "Our rooms are designed for comfort, connection and deep focus, with everything ready before your team arrives."}</p></Reveal><div className="fs-amenity-cloud">{AMENITIES.map((item, index) => <span key={item}><i>{["⌁","▣","◫","✎","◷","♧"][index % 6]}</i>{item}</span>)}</div></div></section>;
};

const Spaces: React.FC = () => {
  const { primary, t, openLead, goToItem, c } = useFlowspace();
  if (!primary) return null;
  const rooms = primary.items.slice(0, 4);
  return <section className="fs-section fs-spaces"><div className="fs-shell"><div className="fs-space-layout"><Reveal className="fs-space-intro"><p className="fs-kicker">Flexible by design</p><h2 className="fs-h2">{c("home.spaces.title", "Find your space, your way")}</h2><p className="fs-copy">{c("home.spaces.sub", primary.subText || "From quick calls to full-day workshops, our rooms adapt to your pace, your people and the work ahead.")}</p><button type="button" className="fs-pill-btn fs-dark-btn" onClick={() => primary.leadEnabled ? openLead(primary) : t.goToSection("contact")}>Book a tour</button></Reveal><div className="fs-space-list">{rooms.length ? rooms.map((item, index) => <Reveal key={item.key} delay={index * .06}><article><button type="button" onClick={() => goToItem(primary, item)}><span className="fs-space-symbol">{["⌁","▣","♧","◫"][index % 4]}</span><span><strong>{item.title}</strong><small>{item.category || item.chips?.[0] || "A room made for better work"}</small></span></button><p>{item.description || "A private, fully equipped room with reliable technology and thoughtful support."}</p></article></Reveal>) : <div className="fs-empty">Add meeting rooms in the Website Builder to show them here.</div>}</div></div></div></section>;
};

const GalleryRail: React.FC = () => {
  const { t, primary, goToItem, c } = useFlowspace();
  if (!primary?.items.length) return null;
  const rooms = primary.items.slice(0, 4);
  return <section className="fs-rail-section"><div className="fs-shell"><Reveal><SectionHead title={c("home.gallery.title", "Find your workspace")} body="Explore meeting rooms designed to keep teams productive, connected and comfortable." action={<button type="button" className="fs-outline-btn" onClick={() => t.goToSection("products")}>View all services</button>}/></Reveal><div className="fs-location-grid">{rooms.map((item, index) => <motion.button key={item.key} type="button" onClick={() => goToItem(primary, item)} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65, delay: index * .07, ease: [0.22, 1, 0.36, 1] }}><img src={item.image || primary.cardImage || primary.heroImage || t.galleryItems?.[index]} alt={item.title}/><span className="fs-location-shade"/><span className="fs-location-copy"><strong>{item.title}</strong><small>{item.chips.join(" · ") || item.description}</small></span><i>{Icon.arrow()}</i></motion.button>)}</div></div></section>;
};

const Plans: React.FC = () => {
  const { primary, openLead, c } = useFlowspace();
  if (!primary?.items.length) return null;
  return <section className="fs-section fs-plans"><div className="fs-shell"><Reveal><SectionHead title={c("home.plans.title", "Plans that fit the way you work")} body={c("home.plans.sub", "Whether you need a room for one hour or a regular home for the team, choose a setup that moves with you.")}/></Reveal><div className="fs-plan-grid">{primary.items.slice(0, 3).map((item, index) => <Reveal key={item.key} delay={index * .07}><article className={`fs-plan ${index === 1 ? "fs-plan-featured" : ""}`}><div><span>{item.category || `Room ${index + 1}`}</span>{index === 1 ? <span className="fs-plan-popular">Popular</span> : null}</div><h3>{item.title}</h3>{item.price ? <p className="fs-plan-price">{priceWithUnit(item.price, item.priceUnit)}</p> : null}<p>{item.description || "A fully equipped room with everything your team needs."}</p>{primary.leadEnabled ? <button type="button" className="fs-plan-button" onClick={() => openLead(primary, item)}>Choose this room {Icon.arrow()}</button> : null}<ul>{(item.features.length ? item.features : [...item.chips, "High-speed Wi-Fi", "Display included"]).slice(0, 4).map((feature) => <li key={feature}>{Icon.check()} {feature}</li>)}</ul></article></Reveal>)}</div></div></section>;
};

const Reviews: React.FC = () => {
  const { t, c } = useFlowspace();
  const items = (t.testimonials || []).slice(0, 4);
  if (!items.length) return null;
  return <section className="fs-section fs-reviews"><div className="fs-shell"><SectionHead title={c("home.reviews.title", "What our members say")} body="Teams come for the space and return for the calm, the support and how easy the whole experience feels."/><div className="fs-review-track">{items.map((item: any, index: number) => <Reveal key={item.id || index} delay={index * .05}><article><div className="fs-stars">{Array.from({ length: 5 }, (_, i) => <span key={i}>{Icon.star()}</span>)}</div><blockquote>“{item.review || item.testimony || item.text || item.description}”</blockquote><p>{item.reviewerName || item.name || "Member"}</p></article></Reveal>)}</div></div></section>;
};

const Questions: React.FC = () => {
  const { primary, t, c } = useFlowspace();
  const faqs = primary?.page?.faqs || [];
  if (!faqs.length) return null;
  return <section className="fs-section fs-faq"><div className="fs-shell fs-faq-grid"><div><h2 className="fs-h2">{c("home.faq.title", "Got questions? We’ve got answers.")}</h2><p className="fs-copy">Everything you may be wondering before booking—from access and equipment to timing and flexibility.</p><button type="button" className="fs-dark-btn fs-pill-btn" onClick={() => t.goToSection("contact")}>Contact us</button></div><FaqSection faqs={faqs}/></div></section>;
};

const FinalCTA: React.FC = () => {
  const { t, primary, openLead, c } = useFlowspace();
  const image = t.galleryItems?.[7] || t.heroImages?.[1] || t.galleryItems?.[0];
  return <section className="fs-final">{image ? <img className="fs-final-bg" src={image} alt=""/> : null}<span className="fs-final-shade"/><div className="fs-shell"><div className="fs-final-copy"><h2>{c("home.cta.title", "Ready to find your flow?")}</h2><p>{c("home.cta.sub", "Join teams who choose rooms built for focus, flexibility and real connection. Your space is waiting.")}</p>{primary?.leadEnabled ? <button type="button" className="fs-pill-btn fs-pill-light" onClick={() => openLead(primary)}>Find your room {Icon.arrow()}</button> : null}</div><div className="fs-final-proof"><span>Fast Wi-Fi</span><span>Flexible access</span><span>Meeting ready</span><strong>Join 500+ professionals</strong></div></div></section>;
};

export const FlowspaceHome: React.FC = () => <><Hero/><Intro/><Spaces/><GalleryRail/><Plans/><Reviews/><Questions/><FinalCTA/></>;
