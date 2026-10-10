import React, { useState } from "react";
import { Stagger } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { getInclusionMeta } from "../inclusionIcons";
import { formatTime12h } from "../leadForms";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";
import { CardRow, Label, SlideIn } from "./LodgeUI";

/** Check-in/out, house rules and the cancellation note, sourced from the business's own
    `stayPolicy` settings — kept out of the Amenities list since it's policy, not a feature. */
const PolicyPanel: React.FC = () => {
  const { draft } = useTpl();
  const policy = draft?.stayPolicy || {};
  const rules: string[] = policy.houseRules || [];
  const facts: [string, string][] = [
    policy.checkInTime && ["Check-in", `From ${formatTime12h(policy.checkInTime)}`],
    policy.checkOutTime && ["Check-out", `Until ${formatTime12h(policy.checkOutTime)}`],
    policy.minStayNights && ["Minimum stay", `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}`],
  ].filter(Boolean) as [string, string][];
  if (!facts.length && !rules.length && !policy.cancellationNote) return null;
  return (
    <SlideIn delay={0.14}>
      <h2 className="ld-h2 mt-14">Good to know</h2>
      {facts.length ? (
        <dl className="mt-7 grid gap-5 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="ld-muted text-[12px] uppercase tracking-[.12em]">{label}</dt>
              <dd className="mt-1 text-[17px] font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rules.length ? (
        <div className={facts.length ? "mt-9" : "mt-7"}>
          <h3 className="text-[15px]">House rules</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span className="ld-check mt-0.5 shrink-0" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {policy.cancellationNote ? (
        <div className="ld-amenity mt-7 flex items-start gap-3 rounded-xl px-5 py-4 text-[14px] leading-relaxed">
          <span className="mt-0.5 shrink-0" aria-hidden="true">{Icon.clock(16)}</span>
          <span><strong>Cancellation.</strong> {policy.cancellationNote}</span>
        </div>
      ) : null}
    </SlideIn>
  );
};

const PageIntro: React.FC<{ eyebrow: string; title: string; sub?: string }> = ({ eyebrow, title, sub }) => (
  <section className="tp-wrap pb-12 pt-14 md:pb-16 md:pt-20">
    <SlideIn><Label>{eyebrow}</Label></SlideIn>
    <SlideIn delay={0.05}><h1 className="ld-h2-lg mt-6 max-w-4xl">{title}</h1></SlideIn>
    {sub ? <SlideIn delay={0.1}><p className="ld-muted mt-6 max-w-xl text-[16px] leading-7">{sub}</p></SlideIn> : null}
  </section>
);

const RentalCard: React.FC<{ service: Service; item: ServiceItem; index: number }> = ({ service, item, index }) => {
  const { goToItem, openLead } = useTpl();
  const beds = Number(item.capacity) || 0;
  return (
    <SlideIn delay={Math.min(index * 0.06, 0.24)} className="ld-rental">
      <button type="button" className="ld-rental-media block w-full" onClick={() => goToItem(service, item)}>
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
      </button>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          {item.chips.length || beds ? <p className="ld-muted text-[13px]">{[beds ? `${beds} guests` : "", ...item.chips.slice(0, 2)].filter(Boolean).join(" · ")}</p> : null}
          <button type="button" className="mt-1 text-left" onClick={() => goToItem(service, item)}><h2 className="text-[22px] leading-tight">{item.title}</h2></button>
        </div>
        <p className="shrink-0 pt-1 text-[16px] font-medium">{priceWithUnit(item.price, item.priceUnit) || "Ask"}</p>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <button type="button" className="ld-link text-[14px]" onClick={() => goToItem(service, item)}>View details <span aria-hidden="true">{Icon.arrow(14)}</span></button>
        {service.leadEnabled ? <button type="button" className="ld-muted text-[14px] underline underline-offset-4" onClick={() => openLead(service, item)}>Book</button> : null}
      </div>
    </SlideIn>
  );
};

/** The rentals listing (or the one service's rentals when the business sells just one kind). */
export const LodgeServicePage: React.FC<{ service: Service }> = ({ service }) => (
  <>
    <PageIntro eyebrow={service.profile.labels.tag} title={service.heading || `Latest ${service.profile.labels.items}`} sub={service.subText || undefined} />
    <section className="tp-wrap pb-24">
      {service.items.length ? (
        <CardRow>
          {service.items.map((item, index) => <RentalCard key={item.key} service={service} item={item} index={index} />)}
        </CardRow>
      ) : (
        <p className="ld-muted border-y py-16 text-center">Our {service.profile.labels.items} are being prepared.</p>
      )}
    </section>
    {service.page?.faqEnabled !== false ? <FaqSection faqs={service.page?.faqs} /> : null}
  </>
);

export const LodgeServicesIndex: React.FC = () => {
  const { services, draft, goToService } = useTpl();
  if (services.length === 1) return <LodgeServicePage service={services[0]} />;
  return (
    <>
      <PageIntro eyebrow="Explore" title={draft?.productTitle || "What we offer"} />
      <section className="tp-wrap pb-24">
        <Stagger className="grid gap-x-7 gap-y-12 md:grid-cols-2">
          {services.map((service) => (
            <button key={service.key} type="button" onClick={() => goToService(service)} className="ld-rental group text-left">
              <div className="ld-rental-media aspect-[16/10]">
                {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
              </div>
              <div className="flex items-end justify-between gap-4 pt-5">
                <div>
                  <p className="ld-muted text-[13px]">{service.items.length} {service.profile.labels.items}</p>
                  <h2 className="mt-1 text-[26px]">{service.heading}</h2>
                </div>
                <span className="mb-1">{Icon.arrow(20)}</span>
              </div>
            </button>
          ))}
        </Stagger>
      </section>
    </>
  );
};

export const LodgeItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService, c } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const images = item.images.length ? item.images : item.image ? [item.image] : [];
  const related = service.items.filter((other) => other.key !== item.key).slice(0, 3);
  const features = item.features.length ? item.features : [];
  const beds = Number(item.capacity) || 0;
  return (
    <div>
      <section className="tp-wrap pb-10 pt-10 md:pt-14">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[13px]">
          <button type="button" className="ld-muted transition-colors hover:text-[var(--t-text)]" onClick={() => t.goToSection("home")}>Home</button>
          <span className="ld-muted" aria-hidden="true">{">"}</span>
          <button type="button" className="ld-muted transition-colors hover:text-[var(--t-text)]" onClick={() => goToService(service)}>{service.name}</button>
          <span className="ld-muted" aria-hidden="true">{">"}</span>
          <span className="font-medium">{item.title}</span>
        </nav>
        <SlideIn><h1 className="ld-h2-lg max-w-4xl">{item.title}</h1></SlideIn>
        <SlideIn delay={0.05}><p className="ld-muted mt-4 text-[16px]">{priceWithUnit(item.price, item.priceUnit)}</p></SlideIn>
        {/* Four photos: one large, three stacked, with real gutters between them. */}
        {images.length ? (
          <SlideIn delay={0.08}>
            <div className="mt-14 grid grid-cols-1 gap-6 md:h-[600px] md:grid-cols-[1.5fr_1fr] md:grid-rows-3">
              {images.slice(0, 4).map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setViewer(index)}
                  className={`ld-rental-media block w-full overflow-hidden !rounded-2xl ${index === 0 ? "h-[300px] md:row-span-3 md:h-full" : "h-[200px] md:h-full"}`}
                >
                  <img src={src} alt={`${item.title} photo ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </SlideIn>
        ) : null}
      </section>
      {/* Key facts in a ruled strip, then the story and amenity tiles beside a booking card. */}
      <section className="tp-wrap pb-24">
        <SlideIn>
          <div className="ld-facts grid grid-cols-2 overflow-hidden rounded-2xl md:grid-cols-4">
            {[
              ["Price", priceWithUnit(item.price, item.priceUnit) || "On request"],
              ["Guests", beds ? String(beds) : "—"],
              ["Bathroom", item.raw?.bathroom === "ensuite" ? "Ensuite" : item.raw?.bathroom === "shared" ? "Shared" : "—"],
              ["Room type", item.chips[0] || "—"],
            ].map(([label, value]) => (
              <div key={label} className="ld-fact px-6 py-6">
                <p className="text-[12px] uppercase tracking-[.12em] opacity-60">{label}</p>
                <p className="mt-2 text-[22px] font-medium tracking-[-.01em]">{value}</p>
              </div>
            ))}
          </div>
        </SlideIn>
        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-[1fr_400px] lg:gap-20">
          <div>
            <SlideIn><Label>{c("services.about.title", `About this ${service.profile.labels.item}`)}</Label></SlideIn>
            {item.description ? <SlideIn delay={0.05}><p className="ld-muted mt-6 whitespace-pre-line text-[16px] leading-8">{item.description}</p></SlideIn> : null}
            {features.length ? (
              <SlideIn delay={0.1}>
                <h2 className="ld-h2 mt-14">{c("services.amenities.title", "Amenities")}</h2>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
                    <li key={feature} className="ld-amenity flex items-center gap-4 rounded-xl px-5 py-4 text-[15px]">
                      <span className="ld-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </SlideIn>
            ) : null}
            <PolicyPanel />
          </div>
          {service.leadEnabled ? (
            <SlideIn delay={0.08} className="lg:sticky lg:top-24 lg:self-start">
              <div className="ld-booking overflow-hidden rounded-2xl">
                <div className="ld-booking-head px-7 py-6">
                  <p className="text-[12px] uppercase tracking-[.14em] opacity-70">{c("services.book.title", service.profile.labels.itemCta)}</p>
                  <p className="mt-1 text-[22px] font-medium">{item.title}</p>
                </div>
                <div className="p-7">
                  <p className="ld-muted mb-6 text-[14px]">{service.profile.labels.leadTitle}</p>
                  <LeadFormPanel service={service} item={item} />
                </div>
              </div>
            </SlideIn>
          ) : null}
        </div>
      </section>
      {related.length ? (
        <section className="tp-soft tp-section pt-0">
          <div className="tp-wrap">
            <h2 className="ld-h2 mb-10">{c("services.related.title", `More ${service.profile.labels.items}`)}</h2>
            <CardRow>
              {related.map((other, index) => <RentalCard key={other.key} service={service} item={other} index={index} />)}
            </CardRow>
          </div>
        </section>
      ) : null}
      <PhotoViewer images={images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
    </div>
  );
};
