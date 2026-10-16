import React from "react";
import { motion } from "../motion";
import { useQerja } from "./QerjaContext";
import { QEyebrow, QIcon, QPlaceholder, QReveal } from "./QerjaUI";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { qerjaPrice } from "./qerjaPricing";

const FEATURE_COPY = [
  ["Office Space", "A focused, fully serviced office with the freedom to grow your team."],
  ["Dedicated Desk", "Your own desk in a bright shared studio, ready whenever work calls."],
  ["Virtual Office", "A credible business address and support without a permanent lease."],
  ["Meeting Rooms", "Presentation-ready rooms for conversations that deserve attention."],
];

const Hero: React.FC = () => {
  const { t, draft, primary, c } = useQerja();
  const hero = t.heroImages?.[0] || primary?.heroImage || t.galleryItems?.[0];
  return <section className="qj-hero" style={hero ? { backgroundImage: `linear-gradient(90deg,rgba(4,34,34,.82),rgba(4,34,34,.34)),url(${hero})` } : undefined}>
    <div className="qj-shell qj-hero-inner"><motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, ease: [.22, 1, .36, 1] }}>
      <QEyebrow light>{c("home.hero.eyebrow", "The features of office")}</QEyebrow>
      <h1>{draft?.title || c("home.hero.title", "We’re the Perfect Working Space for You")}</h1>
      <p>{draft?.subTitle || c("home.hero.body", "Thoughtfully designed workspaces, useful services and a community that helps every workday flow better.")}</p>
      <button type="button" className="qj-button qj-button-yellow" onClick={() => t.goToSection("products")}>{draft?.CTAButtonText || "Learn more"} {QIcon.arrow()}</button>
    </motion.div></div>
  </section>;
};

const Trust: React.FC = () => <section className="qj-trust"><div className="qj-shell"><p>Trusted &amp; Recommended By Respected Enterprises</p><div>{["ORBIT", "NORTH", "LOOP", "MONO", "LOGO", "FORM"].map((name, index) => <span key={name}><i>{index + 1}</i>{name}</span>)}</div></div></section>;

const CreativeEnvironment: React.FC = () => {
  const { t, services, c } = useQerja(); const image = t.aboutIntroImage || t.galleryItems?.[3] || t.heroImages?.[1];
  return <section className="qj-creative"><div className="qj-shell qj-creative-grid"><QReveal className="qj-creative-intro"><QEyebrow>{c("home.features.eyebrow", "Features")}</QEyebrow><h2>{c("home.features.title", "We Offer Creative Environment")}</h2><p>{c("home.features.body", "From quiet focus to useful collaboration, every corner is designed to help people work comfortably and confidently.")}</p><div className="qj-creative-photo">{image ? <img src={image} alt="People working in a creative office" /> : <QPlaceholder />}</div></QReveal>
    <div className="qj-feature-matrix">{FEATURE_COPY.map(([title, body], index) => { const service = services[index]; return <QReveal key={title} delay={index * .06}><article><span className="qj-feature-icon">{index === 0 ? "⌂" : index === 1 ? "▣" : index === 2 ? "⌖" : "▤"}</span><h3>{service?.name || title}</h3><p>{service?.description || body}</p><ul><li>Flexible contracts</li><li>24/7 workspace access</li><li>High-speed internet</li></ul><button type="button" onClick={() => service ? t.goToProductPage(service.slug) : t.goToSection("products")}>Learn more {QIcon.arrow(15)}</button></article></QReveal>; })}</div>
  </div></section>;
};

const FutureBand: React.FC = () => {
  const { t, c } = useQerja(); const image = t.galleryItems?.[2] || t.heroImages?.[1];
  return <section className="qj-future"><div className="qj-shell qj-future-grid"><QReveal><QEyebrow light>{c("home.future.eyebrow", "Overview")}</QEyebrow><h2>{c("home.future.title", "Future of working space is here")}</h2><p>{c("home.future.body", "A flexible workplace should move at the same pace as your ideas. Choose the setup you need and change it whenever your work does.")}</p></QReveal><QReveal delay={.08} className="qj-future-media"><div>{image ? <img src={image} alt="Modern collaborative office" /> : <QPlaceholder />}</div><button type="button" aria-label="Explore our spaces" onClick={() => t.goToSection("gallery")}><span>▶</span> Play Video</button></QReveal></div><div className="qj-shell qj-stats">{[["24+", "Rooms Available"], ["40+", "Devices Setup"], ["90+", "Reading Resources"], ["24", "Hours Open"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>;
};

const SpaceListings: React.FC = () => {
  const { t, services, openLead, c } = useQerja(); const items = services.flatMap(service => service.items.map(item => ({ service, item }))).slice(0, 4);
  return <section className="qj-locations"><div className="qj-shell"><div className="qj-section-head"><div><QEyebrow>{c("home.spaces.eyebrow", "Locations")}</QEyebrow><h2>{c("home.spaces.title", "Explore Available Office Spaces")}</h2></div><button type="button" className="qj-text-link" onClick={() => t.goToSection("products")}>View all {QIcon.arrow()}</button></div>{items.length ? <div className={`qj-location-grid qj-count-${items.length}`}>{items.map(({ service, item }, index) => { const image = item.images?.[0] || item.image || service.cardImage || service.heroImage; return <QReveal key={item.key} delay={index * .055}><article><button type="button" className="qj-location-image" onClick={() => t.goToProductItem(service.slug, item.slug)}>{image ? <img src={image} alt={item.title} /> : <QPlaceholder text={item.title} />}<span>0{index + 1}</span></button><div><small>{item.category || service.name}</small><h3>{item.title}</h3><p>{item.description}</p><footer><b>{qerjaPrice(item,index)}</b><button type="button" onClick={() => openLead(service, item)}>Book now {QIcon.arrow(15)}</button></footer></div></article></QReveal>; })}</div> : <div className="qj-empty">Add coworking spaces in the website builder to show them here.</div>}</div></section>;
};

const Enterprise: React.FC = () => {
  const { t, c } = useQerja(); const image = t.galleryItems?.[10] || t.galleryItems?.[8] || t.galleryItems?.[3];
  return <section className="qj-enterprise"><div className="qj-enterprise-image">{image ? <img src={image} alt="Private enterprise office" /> : <QPlaceholder />}</div><QReveal className="qj-enterprise-copy"><QEyebrow light>{c("home.enterprise.eyebrow", "Enterprise")}</QEyebrow><h2>{c("home.enterprise.title", "Enterprise Space Solutions")}</h2><p>{c("home.enterprise.body", "Your culture deserves more than a standard floor plan. We shape private, scalable spaces around the way your people work.")}</p><strong>Special features:</strong>{["Custom Office Layout", "Custom Interior Design", "Budget Friendly Options"].map((label, index) => <div key={label}><i>0{index + 1}</i><span><b>{label}</b><small>Designed with your team, brand and day-to-day needs in mind.</small></span></div>)}<button type="button" className="qj-button qj-button-yellow" onClick={() => t.goToSection("contact")}>Book Enterprise solutions {QIcon.arrow()}</button></QReveal></section>;
};

const Members: React.FC = () => {
  const { t, c } = useQerja(); const image = t.galleryItems?.[4] || t.aboutIntroImage;
  return <section className="qj-members"><div className="qj-shell qj-members-grid"><QReveal><QEyebrow>{c("home.members.eyebrow", "Members")}</QEyebrow><h2>{c("home.members.title", "We Look After Our Members")}</h2><p>{c("home.members.body", "The right support makes ambitious work feel lighter. Our team takes care of the practical details and keeps useful expertise close by.")}</p><div className="qj-member-benefits"><span>Free Risk Assessment</span><span>Accounting Services</span><span>Global Coworking Access</span><span>Legal Consult</span></div></QReveal><QReveal delay={.08} className="qj-members-image">{image ? <img src={image} alt="Coworking members" /> : <QPlaceholder />}</QReveal></div></section>;
};

const Testimonials: React.FC = () => {
  const { t, c } = useQerja(); const reviews = (t.testimonials || []).slice(0, 3); if (!reviews.length) return null;
  return <section className="qj-testimonial"><div className="qj-shell"><div className="qj-section-head"><div><QEyebrow>{c("home.reviews.eyebrow", "Testimonials")}</QEyebrow><h2>{c("home.reviews.title", "What Our Customer Says")}</h2></div></div><div className={`qj-testimonial-grid qj-count-${reviews.length}`}>{reviews.map((item: any, index: number) => { const person=t.founders?.[index]; const avatar=typeof person?.image==="string"?person.image:person?.image?.url; return <QReveal key={item.key || index} delay={index * .06}><article><span>★★★★★</span><blockquote>“{item.text || item.review || item.message || item.testimony}”</blockquote><footer>{avatar?<img src={avatar} alt=""/>:null}<span><b>{item.name || item.author}</b><small>{item.jobPosition || item.role || "Member"}</small></span></footer></article></QReveal>; })}</div></div></section>;
};

const ContactBand: React.FC = () => {
  const { t, draft, primary, c } = useQerja(); const showForm = draft?.contactEnableInquiryForm !== false;
  return <section className="qj-book-band"><div className="qj-shell"><div><QEyebrow light>{c("home.contact.eyebrow", "Contact us")}</QEyebrow><h2>{c("home.contact.title", "Find your next workspace")}</h2><p>{c("home.contact.body", "Tell us what kind of space you need and our team will help you plan the right visit.")}</p><div className="qj-contact-lines">{t.contactPhone ? <p><small>Phone</small><a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></p> : null}{t.contactEmail ? <p><small>Email</small><a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p> : null}{t.contactAddress ? <p><small>Address</small><span>{t.contactAddress}</span></p> : null}</div></div>{showForm ? <div className="qj-form-card">{primary?.leadEnabled ? <LeadFormPanel service={primary} /> : <MessageForm inquiryType="General Enquiry" submitLabel="Send message" success={draft?.contactInquirySuccessMessage || "Thank you. Your inquiry has been submitted successfully."} />}</div> : null}</div></section>;
};

export const QerjaHome: React.FC = () => <><Hero /><Trust /><CreativeEnvironment /><FutureBand /><SpaceListings /><Enterprise /><Members /><Testimonials /><ContactBand /></>;
