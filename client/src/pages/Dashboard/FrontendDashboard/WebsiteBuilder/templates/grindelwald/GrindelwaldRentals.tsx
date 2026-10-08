import React, { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";
import { Eyebrow, PageHero, Reveal } from "./GrindelwaldUI";
import { GrindelwaldCheckRow } from "./GrindelwaldPages";
import { GrindelwaldCallToAction, GrindelwaldRoomCard } from "./GrindelwaldHome";

/** The units listing for one service: the reference's own cabin-card grid, with its "Our unique
 * rooms" subheading, then a closing help band. */
export const GrindelwaldServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { c } = useTpl();
  return (
    <>
      <PageHero title={service.heading || "Our Cabins"} sub={service.subText || undefined} />
      <section className="tp-section">
        {service.items.length ? (
          <>
            <div className="tp-wrap text-center">
              <Reveal from="left"><h2 className="gw-h2 mx-auto max-w-3xl">{c("home.rooms.title", "Our unique rooms within the retreat")}</h2></Reveal>
            </div>
            <div className="tp-wrap mt-20 grid gap-10 md:grid-cols-3">
              {service.items.map((item, index) => <GrindelwaldRoomCard key={item.key} item={item} index={index} service={service} />)}
            </div>
          </>
        ) : (
          <p className="gw-muted border-y py-16 text-center">Units are being prepared.</p>
        )}
      </section>
      {service.page?.faqEnabled !== false ? <FaqSection faqs={service.page?.faqs} /> : null}
      <GrindelwaldCallToAction />
    </>
  );
};

export const GrindelwaldServicesIndex: React.FC = () => {
  const { services, draft, goToService, c } = useTpl();
  if (services.length === 1) return <GrindelwaldServicePage service={services[0]} />;
  return (
    <>
      <PageHero title={draft?.productTitle || "Our Cabins"} />
      <section className="tp-wrap pb-24 pt-20">
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
          {services.map((service) => (
            <button key={service.key} type="button" onClick={() => goToService(service)} className="gw-unit group text-left">
              <div className="gw-unit-media aspect-[16/10]">
                {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
              </div>
              <div className="flex items-end justify-between gap-4 pt-5">
                <div>
                  <p className="gw-muted text-[13px]">{service.items.length} {service.profile.labels.items}</p>
                  <h2 className="gw-h3 mt-1">{service.heading}</h2>
                </div>
                <span className="mb-1">{Icon.arrow(20)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <GrindelwaldCallToAction />
    </>
  );
};

/** One unit: a photo strip, the key facts, the description and features, and a booking card. */
export const GrindelwaldItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService, c } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const images = item.images.length ? item.images : item.image ? [item.image] : [];
  const related = service.items.filter((other) => other.key !== item.key).slice(0, 3);
  const features = item.features || [];
  const beds = Number(item.capacity) || 0;
  return (
    <div>
      <section className="tp-wrap pb-10 pt-12 md:pt-16">
        <nav className="gw-muted mb-6 flex flex-wrap gap-2 text-[13px]">
          <button type="button" onClick={() => t.goToSection("home")}>Home</button><span>/</span>
          <button type="button" onClick={() => goToService(service)}>{service.name}</button><span>/</span>
          <span>{item.title}</span>
        </nav>
        <Reveal from="left"><h1 className="gw-h1 max-w-4xl">{item.title}</h1></Reveal>
        <Reveal delay={0.05}><p className="gw-muted mt-4 text-[18px]" style={{ fontFamily: "'Cormorant Upright', serif" }}>{priceWithUnit(item.price, item.priceUnit)}</p></Reveal>
        {images.length ? (
          <Reveal delay={0.08}>
            <div className="mt-12 grid grid-cols-1 gap-5 md:h-[560px] md:grid-cols-[1.5fr_1fr] md:grid-rows-3">
              {images.slice(0, 4).map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setViewer(index)}
                  className={`gw-tile block w-full ${index === 0 ? "h-[300px] md:row-span-3 md:h-full" : "h-[200px] md:h-full"}`}
                >
                  <img src={src} alt={`${item.title} photo ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </Reveal>
        ) : null}
      </section>
      <section className="tp-wrap grid grid-cols-1 gap-14 pb-24 pt-10 lg:grid-cols-[1fr_400px] lg:gap-20">
        <div>
          <Reveal from="left"><Eyebrow>{c("services.about.title", "About this unit")}</Eyebrow></Reveal>
          {beds ? <Reveal delay={0.04}><p className="gw-muted mt-4 text-[15px]">{c("home.units.sleeps", "Sleeps")} {beds}</p></Reveal> : null}
          {item.description ? <Reveal delay={0.05}><p className="gw-muted mt-6 whitespace-pre-line text-[16px] leading-8">{item.description}</p></Reveal> : null}
          {features.length ? (
            <Reveal delay={0.1}>
              <h2 className="gw-h2 mt-14">{c("services.amenities.title", "Amenities")}</h2>
              <ul className="mt-7 grid gap-4 sm:grid-cols-2">
                {features.map((feature) => <GrindelwaldCheckRow key={feature} label={feature} />)}
              </ul>
            </Reveal>
          ) : null}
          {/* Key facts and a second photo row fill the column beside the booking card. */}
          <Reveal delay={0.12}>
            <div className="mt-14 grid grid-cols-2 gap-x-10 gap-y-6 border-t pt-10" style={{ borderColor: "color-mix(in srgb,var(--t-text) 22%,transparent)" }}>
              {beds ? <div><p className="gw-eyebrow gw-muted">{c("home.units.sleeps", "Sleeps")}</p><p className="gw-h3 mt-2">{beds}</p></div> : null}
              {item.raw?.area ? <div><p className="gw-eyebrow gw-muted">{c("home.units.area", "Total area")}</p><p className="gw-h3 mt-2">{item.raw.area}</p></div> : null}
              {item.price ? <div><p className="gw-eyebrow gw-muted">{c("services.rate", "Rate")}</p><p className="gw-h3 mt-2">{priceWithUnit(item.price, item.priceUnit)}</p></div> : null}
            </div>
          </Reveal>
          {images.length > 1 ? (
            <Reveal delay={0.14}>
              <div className="mt-12 grid grid-cols-2 gap-5">
                {images.slice(1, 3).map((src, index) => (
                  <button key={`${src}-${index}`} type="button" className="gw-tile block aspect-[4/3] w-full" onClick={() => setViewer(index + 1)}>
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </Reveal>
          ) : null}
        </div>
        {service.leadEnabled ? (
          <Reveal from="right" delay={0.08} className="lg:sticky lg:top-24 lg:self-start">
            <div className="gw-review-card">
              <p className="gw-eyebrow">{c("services.book.title", "Reserve")}</p>
              <p className="gw-h3 mt-2">{item.title}</p>
              <p className="gw-muted mb-6 mt-2 text-[14px]">{service.profile.labels.leadTitle}</p>
              <LeadFormPanel service={service} item={item} />
            </div>
          </Reveal>
        ) : null}
      </section>
      {related.length ? (
        <section className="gw-band-soft tp-section">
          <div className="tp-wrap">
            <h2 className="gw-h2 mb-12 text-center">{c("services.related.title", "More units")}</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {related.map((other, index) => <GrindelwaldRoomCard key={other.key} item={other} index={index} service={service} />)}
            </div>
          </div>
        </section>
      ) : null}
      <PhotoViewer images={images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
    </div>
  );
};
