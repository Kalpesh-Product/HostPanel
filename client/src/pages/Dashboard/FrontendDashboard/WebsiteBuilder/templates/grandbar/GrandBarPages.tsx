import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { ApplyForm, MessageForm } from "../shared/TplForms";
import type { Service, ServiceItem } from "../serviceAdapter";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import { getMediaSrc } from "../useWebsiteTemplateData";
import { useGrandBar } from "./GrandBarContext";
import { GbIcon, GbImage, GbMenuCard, GbPageHero, GbReveal, mapSrc } from "./GrandBarUI";

const sectionImage = (t: any, index = 0) => t.galleryItems?.[index] || t.homeHeroImage || "";

export const ServicesIndex: React.FC = () => {
  const { services, goToService, c, t } = useGrandBar();
  return <><GbPageHero eyebrow="Our menus" title={c("services.index.title", "Explore every flavor")} body={c("services.index.body", "Cocktails, desserts, wines and plates designed for long evenings together.")} image={services[0]?.heroImage || sectionImage(t)}/><section className="gb-page-section"><div className="gb-frame"><div className="gb-service-index">{services.map((service, index) => <GbReveal key={service.key} delay={index * .06}><button type="button" onClick={() => goToService(service)}><div><GbImage src={service.cardImage || service.heroImage} alt={service.name}/><span>0{index + 1}</span></div><h2>{service.name}</h2><p>{service.subText || service.heroSubHeading}</p><b>Explore {GbIcon.arrow(16)}</b></button></GbReveal>)}</div></div></section></>;
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const categories = useMemo(() => Array.from(new Set(service.items.map((item) => item.category).filter(Boolean))), [service.items]);
  const [category, setCategory] = useState("");
  const shown = category ? service.items.filter((item) => item.category === category) : service.items;
  return <><GbPageHero eyebrow={service.profile.labels.listing} title={service.heroHeading || service.name} body={service.heroSubHeading || service.subText} image={service.heroImage}/><section className="gb-page-section gb-service-page"><div className="gb-frame">{categories.length > 1 ? <div className="gb-filters"><button type="button" aria-pressed={!category} onClick={() => setCategory("")}>All</button>{categories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name || "")}>{name}</button>)}</div> : null}<div className="gb-menu-grid">{shown.map((item, index) => <GbMenuCard key={item.key} service={service} item={item} index={index}/>)}</div>{!shown.length ? <p className="gb-empty">The menu is being prepared.</p> : null}</div></section></>;
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { openLead, goToService, t } = useGrandBar();
  const images = item.images?.length ? item.images : [item.image, service.heroImage, ...t.galleryItems].filter(Boolean);
  const [active, setActive] = useState(0);
  return <><GbPageHero eyebrow={service.name} title={item.title} body={item.description} image={images[0]}/><section className="gb-page-section"><div className="gb-frame gb-item-detail"><div className="gb-item-gallery"><AnimatePresence mode="wait"><motion.div className="gb-item-main" key={images[active]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><GbImage src={images[active]} alt={item.title}/></motion.div></AnimatePresence>{images.length > 1 ? <div className="gb-item-thumbs">{images.slice(0, 4).map((src, index) => <button type="button" key={String(src) + index} aria-pressed={active === index} onClick={() => setActive(index)}><GbImage src={src} alt=""/></button>)}</div> : null}</div><GbReveal className="gb-item-copy"><button type="button" className="gb-text-link" onClick={() => goToService(service)}>← Back to {service.name}</button><p className="gb-kicker">{item.category || "House signature"}</p><h2>{item.title}</h2>{item.price ? <strong>{priceWithUnit(item.price, item.priceUnit)}</strong> : null}<p>{item.description}</p>{item.chips?.length ? <ul>{item.chips.map((chip) => <li key={chip}>{GbIcon.check(16)} {chip}</li>)}</ul> : null}{service.leadEnabled ? <button type="button" className="gb-outline-button" onClick={() => openLead(service, item)}>Reserve this experience</button> : null}</GbReveal></div></section></>;
};

export const GrandBarAbout: React.FC = () => {
  const { t, draft, c } = useGrandBar();
  const images = [...(t.aboutImages || []), ...(t.galleryItems || [])];
  const paragraphs = (t.aboutParagraphs || draft?.about || [draft?.aboutPageStory]).map((entry: any) => typeof entry === "string" ? entry : entry?.text || "").filter(Boolean);
  const founders = t.founders || [];
  const team = t.aboutPageImageCards || [];
  const people = [...founders, ...team].slice(0, 6);
  return <><GbPageHero eyebrow={c("about.eyebrow", "Our story")} title={draft?.aboutTitle || "A room shaped by flavor"} body={paragraphs[0]} image={images[0] || sectionImage(t)}/><section className="gb-page-section"><div className="gb-frame gb-about-story"><GbReveal><p className="gb-kicker">Behind the bar</p><h2>{c("about.title", "A night should feel memorable before the first sip")}</h2></GbReveal><div>{paragraphs.slice(1).length ? paragraphs.slice(1).map((text: string, index: number) => <p key={index}>{text}</p>) : <p>We pair thoughtful hospitality with inventive drinks, warm light and a kitchen that keeps pace with the evening.</p>}</div></div></section><section className="gb-about-gallery"><div className="gb-frame"><GbImage src={images[1] || images[0]} alt="Our bar"/><GbImage src={images[2] || images[0]} alt="The team"/><GbImage src={images[3] || images[0]} alt="Evening service"/></div></section>{people.length ? <section className="gb-page-section gb-people"><div className="gb-frame"><div className="gb-section-heading"><p className="gb-kicker">The people</p><h2>{c("about.team.title", "Meet the people behind the bar")}</h2></div><div className="gb-people-grid">{people.map((person: any, index: number) => <GbReveal key={person.name || person.title || index} delay={index * .05}><article><div><GbImage src={getMediaSrc(person.image)} alt={person.name || person.title || "Team member"}/></div><h3>{person.name || person.title}</h3><p>{person.role || person.description}</p><small>{person.bio}</small></article></GbReveal>)}</div></div></section> : null}</>;
};

export const GrandBarGallery: React.FC = () => {
  const { t, draft } = useGrandBar();
  const items = t.galleryItems || [];
  return <><GbPageHero eyebrow="The gallery" title={draft?.galleryPageHeading || "After dark"} body="A glimpse of the room, the drinks and the energy that carries through the night." image={items[0] || t.homeHeroImage}/><section className="gb-page-section"><div className="gb-frame gb-gallery-grid">{items.map((src: string, index: number) => <motion.button type="button" key={src + index} whileHover={{ y: -8 }} onClick={() => t.openGalleryViewer(index)}><GbImage src={src} alt="Grand Bar atmosphere"/></motion.button>)}</div></section></>;
};

export const GrandBarTestimonials: React.FC = () => {
  const { t, rating } = useGrandBar();
  return <><GbPageHero eyebrow="Guest notes" title="Stories from the bar" body={rating.count ? rating.avg.toFixed(1) + " average from " + rating.count + " reviews" : "Memorable nights, in their own words."} image={sectionImage(t, 2)}/><section className="gb-page-section"><div className="gb-frame gb-reviews">{t.testimonials.map((review: any, index: number) => <GbReveal key={review.id || index}><article><span>“</span><blockquote>{review.quote || review.review || review.testimonial || review.testimony || review.text}</blockquote><p>{review.name || review.reviewerName || "Guest"}</p></article></GbReveal>)}</div>{t.showWriteReview ? <button type="button" className="gb-outline-button gb-review-button" onClick={t.openReviewModal}>Write a review</button> : null}</section></>;
};

export const GrandBarPartner: React.FC = () => {
  const { t, c } = useGrandBar();
  return <><GbPageHero eyebrow="Partnerships" title={t.partnerPageHeading || c("partner.title", "Create something remarkable together")} body={t.partnerPageContent || "Collaborations with makers, chefs, artists and brands that share our appetite for memorable experiences."} image={sectionImage(t, 4)}/><section className="gb-page-section"><div className="gb-frame gb-form-layout"><GbReveal><p className="gb-kicker">Collaborate</p><h2>Bring your idea to the table</h2><p>Tell us about your event, product or creative proposal and our team will get in touch.</p></GbReveal><div className="gb-form-panel"><MessageForm inquiryType="Partnership" submitLabel="Send proposal" success="Thank you. Our partnerships team will be in touch shortly."/></div></div></section></>;
};

export const GrandBarCareers: React.FC = () => {
  const { t, draft } = useGrandBar();
  const jobs = t.careersJobs || [];
  return <><GbPageHero eyebrow="Careers" title={draft?.careersPageHeading || "Join the night shift"} body={draft?.careersPageIntro || "Bring curiosity, care and good energy. We will teach the rest."} image={sectionImage(t, 5)}/><section className="gb-page-section"><div className="gb-frame gb-careers"><div><p className="gb-kicker">Open roles</p><h2>Make the evening memorable</h2></div><div className="gb-job-list">{t.careersJobsLoading ? <p>Loading roles…</p> : jobs.length ? jobs.map((job: any) => <button type="button" key={job._id || job.id || job.title} onClick={() => { t.setCareersApplyJob(job); t.setCareersDetailTab("apply"); }}><span>{job.department || "Hospitality"}</span><h3>{job.title || job.jobTitle}</h3><p>{job.location || "On site"}</p>{GbIcon.arrow()}</button>) : <div className="gb-empty"><h3>No open roles right now</h3><p>We are always happy to meet thoughtful hospitality people.</p><button type="button" className="gb-outline-button" onClick={t.openCareersGeneralApply}>Send a general application</button></div>}</div>{t.careersApplyJob ? <div className="gb-form-panel gb-apply"><h2>Apply for {t.careersApplyJob.title || t.careersApplyJob.jobTitle}</h2><ApplyForm/></div> : null}</div></section></>;
};

export const GrandBarContact: React.FC = () => {
  const { t, draft, c } = useGrandBar();
  const hours = groupOpeningHours(draft?.openingHours);
  return <><GbPageHero eyebrow="Contact" title={draft?.contactTitle || "Find your way to the bar"} body={t.contactAddress} image={sectionImage(t, 6)}/><section className="gb-page-section"><div className="gb-frame gb-contact-grid"><GbReveal className="gb-contact-details"><p className="gb-kicker">Visit us</p><h2>{c("contact.title", "The evening starts here")}</h2>{t.contactAddress ? <p>{GbIcon.map()}<span>{t.contactAddress}</span></p> : null}{t.contactPhone ? <a href={"tel:" + String(t.contactPhone).replace(/[^\d+]/g, "")}>{GbIcon.phone()}<span>{t.contactPhone}</span></a> : null}{t.contactEmail ? <a href={"mailto:" + t.contactEmail}><span>✉</span><span>{t.contactEmail}</span></a> : null}<div className="gb-hours">{hours.map((row) => <p key={row.days}><span>{row.days}</span><b>{row.hours}</b></p>)}</div></GbReveal>{draft?.contactEnableInquiryForm !== false ? <div className="gb-form-panel"><h2>Send a message</h2><MessageForm inquiryType="Contact" submitLabel="Send message" success="Thank you. We will get back to you shortly."/></div> : null}</div><div className="gb-contact-map"><iframe title="Location map" src={draft?.mapUrl || mapSrc(t.contactAddress)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></div></section></>;
};
