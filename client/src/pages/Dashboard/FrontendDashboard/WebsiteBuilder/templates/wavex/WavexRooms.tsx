import React, { useState } from "react";
import { Reveal } from "../motion";
import {
  type Service,
  type ServiceItem,
} from "../serviceAdapter";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { Icon } from "../shared/TplUI";
import { useWavex } from "./WavexContext";
import {
  WxCrumbs,
  WxMedia,
  WxPageHero,
  WxRoomCard,
  WxSectionHead,
  detailRows,
  priceLine,
  seatsOf,
} from "./WavexUI";

export const ServicesIndex: React.FC = () => {
  const { t, services, draft, c } = useWavex();
  return (
    <>
      <WxPageHero
        index="01 / Rooms"
        title={draft?.pageHeroHeading || c("home.spaces.title", "Our Space & memberships")}
        body={draft?.subTitle || c("home.spaces.body", "Find the room that fits the work in front of you.")}
        image={t.homeHeroImage || services[0]?.heroImage || ""}
      />
      <section className="wx-section">
        <div className="wx-shell">
          <WxSectionHead
            eyebrow="Book a room"
            title={c("services.index.title", "Find a room / desk")}
            body={c("services.index.body", "Every space is ready when you are — choose a size, then tell us when you need it.")}
          />
          {services.length ? (
            <div className="wx-space-grid wx-services-index-grid">
              {services.map((service, index) => (
                <Reveal key={service.key} delay={Math.min(index * 0.06, 0.3)}>
                  <button
                    type="button"
                    className="wx-space-card"
                    style={{ width: "100%", color: "inherit", padding: 0, border: 0, cursor: "pointer" }}
                    onClick={() => t.goToProductPage(service.slug)}
                  >
                    <WxMedia className="wx-space-photo" src={service.cardImage || service.heroImage} label={service.name} />
                    <div className="wx-space-body">
                      <span className="wx-space-cat">{service.profile.labels.tag}</span>
                      <h3 className="wx-space-title">{service.heading}</h3>
                      <p className="wx-space-desc">{service.subText}</p>
                      <div className="wx-space-foot">
                        <span className="wx-space-price">
                          {service.items.length ? <strong>{service.items.length} rooms</strong> : <strong>Explore</strong>}
                        </span>
                        <span className="wx-space-go">{Icon.arrow(17)}</span>
                      </div>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="wx-empty">Rooms are being prepared. Please check back soon.</div>
          )}
        </div>
      </section>
    </>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, openLead, c } = useWavex();

  return (
    <>
      <WxPageHero
        index="Rooms / Collection"
        title={service.heroHeading || service.name}
        body={service.heroSubHeading || service.subText}
        image={service.heroImage || service.cardImage || service.items[0]?.image}
      >
        {service.leadEnabled ? (
          <button
            type="button"
            className="wx-btn"
            style={{ marginTop: 26 }}
            onClick={() => openLead(service)}
          >
            {service.profile.labels.cta} {Icon.arrow(16)}
          </button>
        ) : null}
      </WxPageHero>

      <WxCrumbs items={[
        { label: "Home", onClick: () => t.goToSection("home") },
        { label: "Rooms", onClick: () => t.goToSection("products") },
        { label: service.name },
      ]} />

      <section className="wx-section" style={{ paddingTop: 34 }}>
        <div className="wx-shell">
          {service.items.length ? (
            <div className="wx-space-grid">
              {service.items.map((item, index) => (
                <Reveal key={item.key} delay={Math.min(index * 0.05, 0.3)}>
                  <WxRoomCard item={item} service={service} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="wx-empty">We're getting this room ready.</div>
          )}
        </div>
      </section>

      {service.leadEnabled ? (
        <section className="wx-section-tight">
          <div className="wx-shell">
            <Reveal className="wx-contact-form wx-contact-form-solo">
              <span className="wx-kicker">Booking</span>
              <h3 style={{ marginTop: 12 }}>
                {c("services.cta.title", "Not sure which room you need?")}
              </h3>
              <p>
                {c(
                  "services.cta.sub",
                  "Tell us the number of people and what the meeting is for. We'll suggest a room.",
                )}
              </p>
              <LeadFormPanel service={service} compact />
            </Reveal>
          </div>
        </section>
      ) : null}

      {service.page?.faqEnabled !== false ? <FaqSection faqs={service.page?.faqs} /> : null}
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { t, goToService, openLead, c } = useWavex();
  const [viewer, setViewer] = useState<number | null>(null);
  const photos = item.images?.length ? item.images : item.image ? [item.image] : [];
  const facts = detailRows(item);
  const price = priceLine(item);
  const seats = seatsOf(item);
  const highlights = Array.from(new Set([...item.features, ...(item.raw?.inclusions || [])])).filter(Boolean);
  const related = service.items.filter((other) => other.key !== item.key).slice(0, 3);

  return (
    <>
      <WxCrumbs items={[
        { label: "Home", onClick: () => t.goToSection("home") },
        { label: service.name, onClick: () => goToService(service) },
        { label: item.title },
      ]} />
      <section className="wx-section" style={{ paddingTop: 34 }}>
        <div className="wx-shell wx-detail-grid">
          <div>
            <Reveal>
              <span className="wx-kicker">{item.category || service.name}</span>
              <h1 className="wx-title" style={{ marginTop: 14 }}>{item.title}</h1>
              {item.badge ? <span className="tp-chip tp-chip-accent" style={{ marginTop: 14 }}>{item.badge}</span> : null}
            </Reveal>
            {photos.length ? (
              <Reveal delay={0.08} className="wx-detail-photos">
                {photos.slice(0, 4).map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    aria-label={`Open photo ${index + 1}`}
                    onClick={() => setViewer(index)}
                  >
                    <img src={src} alt={index === 0 ? item.title : ""} loading={index === 0 ? "eager" : "lazy"} />
                  </button>
                ))}
              </Reveal>
            ) : (
              <div className="wx-placeholder" style={{ minHeight: 260, marginTop: 24 }}>{item.title}</div>
            )}
            {item.description ? (
              <Reveal className="wx-prose">
                <p style={{ marginTop: 28 }}>{item.description}</p>
              </Reveal>
            ) : null}
            {facts.length ? (
              <Reveal className="wx-facts">
                {facts.map(([label, value]) => (
                  <div className="wx-fact" key={label}><span>{label}</span><b>{value}</b></div>
                ))}
              </Reveal>
            ) : null}
          </div>

          <Reveal delay={0.1} className="wx-aside">
            <span className="wx-kicker">Book a room</span>
            <h3>{item.title}</h3>
            <p className="wx-copy">
              {price ? `From ${price}` : "Ask for a quote"}{seats ? ` · Up to ${seats} people` : ""}
            </p>
            {highlights.length ? (
              <ul className="wx-bullets">
                {highlights.slice(0, 6).map((feature) => (
                  <li key={String(feature)}><i>{Icon.check(12)}</i>{String(feature)}</li>
                ))}
              </ul>
            ) : null}
            {service.leadEnabled ? (
              <button type="button" className="wx-btn" onClick={() => openLead(service, item)}>
                {service.profile.labels.itemCta}
              </button>
            ) : (
              <button type="button" className="wx-btn wx-btn-outline" onClick={() => t.goToSection("contact")}>
                Enquire
              </button>
            )}
            {service.leadEnabled ? (
              <div style={{ marginTop: 24 }}>
                <LeadFormPanel service={service} item={item} compact />
              </div>
            ) : null}
          </Reveal>
        </div>
        {related.length ? (
          <div className="wx-shell wx-related-rooms">
            <WxSectionHead title={c("room.related.title", "More rooms like this")} />
            <div className="wx-room-grid wx-related-grid">
              {related.map((room) => (
                <div className="wx-room" key={room.key}>
                  <WxMedia className="wx-room-photo" src={room.image} label={room.title} />
                  <div className="wx-room-body">
                    <h3>{room.title}</h3>
                    <p>{room.description}</p>
                    <div className="wx-room-actions">
                      <button type="button" className="wx-btn wx-btn-sm" onClick={() => t.goToProductItem(service.slug, room.slug)}>
                        View room
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <PhotoViewer images={photos} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
    </>
  );
};
