import React, { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { formatTime12h } from "../leadForms";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { ChArrow, ChLabel, ChPageHero, ChPhoto, ChReveal } from "./CaliHostelUI";

const StayRow: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem, openLead } = useTpl();
  return <ChReveal delay={Math.min(index * 0.05, 0.18)}><article className="ch-stay-row"><button type="button" className="ch-stay-photo" onClick={() => goToItem(service, item)}><ChPhoto src={item.image} alt={item.title} />{item.badge ? <span>{item.badge}</span> : null}</button><div className="ch-stay-body"><p>{String(index + 1).padStart(2, "0")} / {item.chips.slice(0, 3).join(" · ")}</p><button type="button" onClick={() => goToItem(service, item)}><h2>{item.title}</h2></button><p className="ch-stay-desc">{item.description}</p><div className="ch-stay-actions"><strong>{priceWithUnit(item.price, item.priceUnit) || "Ask for rates"}</strong><button type="button" onClick={() => openLead(service, item)}>Reserve this bed <ChArrow /></button></div></div></article></ChReveal>;
};

export const CaliHostelServicePage: React.FC<{ service: Service }> = ({ service }) => <><ChPageHero eyebrow="Rooms & beds" title={service.heroHeading || service.heading} text={service.heroSubHeading || service.subText} image={service.heroImage} /><section className="ch-shell ch-stays"><div className="ch-stay-list">{service.items.map((item, index) => <StayRow key={item.key} service={service} item={item} index={index} />)}</div></section>{service.page?.faqEnabled !== false ? <FaqSection faqs={service.page?.faqs} /> : null}</>;

export const CaliHostelServicesIndex: React.FC = () => {
  const { services, draft, goToService } = useTpl();
  if (services.length === 1) return <CaliHostelServicePage service={services[0]} />;
  return <><ChPageHero eyebrow="Explore the house" title={draft?.productTitle || "Choose how you stay"} text="Every part of the house is designed for good sleep, easy conversations and simple days out." image={services[0]?.heroImage} /><section className="ch-shell ch-service-index">{services.map((service, index) => <ChReveal key={service.key} delay={index * 0.05}><button type="button" onClick={() => goToService(service)}><ChPhoto src={service.cardImage || service.heroImage} alt={service.heading} /><span>{String(index + 1).padStart(2, "0")}</span><h2>{service.heading}</h2><p>{service.subText}</p><ChArrow /></button></ChReveal>)}</section></>;
};

export const CaliHostelItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const images = item.images.length ? item.images : item.image ? [item.image] : [];
  const policy = t.draft?.stayPolicy || {};
  const related = service.items.filter((entry) => entry.key !== item.key).slice(0, 3);
  return <>
    <section className="ch-room-hero"><div className="ch-shell"><button type="button" className="ch-back" onClick={() => goToService(service)}>← Back to rooms</button><ChReveal><p>{item.chips.join(" · ")}</p><h1>{item.title}</h1><strong>{priceWithUnit(item.price, item.priceUnit)}</strong></ChReveal><div className="ch-room-gallery">{images.slice(0, 5).map((src, index) => <button type="button" key={`${src}-${index}`} onClick={() => setViewer(index)}><img src={src} alt={`${item.title} ${index + 1}`} /></button>)}</div></div></section>
    <section className="ch-shell ch-room-detail"><div><ChReveal><ChLabel>Inside the room</ChLabel><h2>A comfortable place to land.</h2><p className="ch-room-description">{item.description}</p></ChReveal>{item.features.length ? <ChReveal><div className="ch-amenity-grid">{item.features.map((feature) => <span key={feature}>✦ {feature}</span>)}</div></ChReveal> : null}<ChReveal><div className="ch-good-to-know"><h3>Good to know</h3><dl>{policy.checkInTime ? <div><dt>Check-in</dt><dd>{formatTime12h(policy.checkInTime)}</dd></div> : null}{policy.checkOutTime ? <div><dt>Check-out</dt><dd>{formatTime12h(policy.checkOutTime)}</dd></div> : null}{policy.minStayNights ? <div><dt>Minimum stay</dt><dd>{policy.minStayNights} night(s)</dd></div> : null}</dl>{Array.isArray(policy.houseRules) ? <ul>{policy.houseRules.map((rule: string) => <li key={rule}>{rule}</li>)}</ul> : null}</div></ChReveal></div>{service.leadEnabled ? <aside className="ch-booking-card"><p>Reserve your spot</p><h3>{item.title}</h3><LeadFormPanel service={service} item={item} /></aside> : null}</section>
    {related.length ? <section className="ch-related"><div className="ch-shell"><ChLabel>Keep exploring</ChLabel><h2>Other rooms, different rhythms.</h2><div className="ch-related-grid">{related.map((other) => <button type="button" key={other.key} onClick={() => t.goToProductItem(service.slug, other.slug)}><ChPhoto src={other.image} alt={other.title} /><h3>{other.title}</h3><span>{priceWithUnit(other.price, other.priceUnit)}</span></button>)}</div></div></section> : null}
    <PhotoViewer images={images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
  </>;
};
