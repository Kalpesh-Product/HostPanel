import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Reveal, Stagger } from "../motion";
import { formatTime12h } from "../leadForms";
import type { Service, ServiceItem } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { priceWithUnit } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, Placeholder } from "../shared/TplUI";
import {
  DfEmpty,
  DfPageHero,
  DfSectionHead,
  DfTextLink,
} from "./DestinflowUI";

const imageOf = (value: any): string =>
  typeof value === "string" ? value : value?.url || "";

export const PolicyPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { draft } = useTpl();
  const policy = draft?.stayPolicy || {};
  const rules: string[] = policy.houseRules || [];
  const facts: Array<[string, string]> = [
    policy.checkInTime && ["Check-in", `From ${formatTime12h(policy.checkInTime)}`],
    policy.checkOutTime && ["Check-out", `Until ${formatTime12h(policy.checkOutTime)}`],
    policy.minStayNights && [
      "Minimum stay",
      `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}`,
    ],
  ].filter(Boolean) as Array<[string, string]>;
  if (!facts.length && !rules.length && !policy.cancellationNote) return null;
  return (
    <div className={compact ? "df-panel" : "df-panel df-panel-dark"} style={compact ? undefined : { marginTop: 64 }}>
      <p className="df-eyebrow">Good to know</p>
      <h2 className={compact ? "df-h3" : "df-h2"}>Before you arrive</h2>
      {facts.length ? (
        <div className="df-contact-grid">
          {facts.map(([label, value]) => (
            <div key={label} className="df-contact-item">
              <span>{label}</span>
              <p>{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {rules.length ? (
        <ul style={{ listStyle: "none", margin: "28px 0 0", padding: 0, display: "grid", gap: 12 }}>
          {rules.map((rule) => (
            <li key={rule} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ marginTop: 4, color: "var(--df-blue)" }}>{Icon.check(16)}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {policy.cancellationNote ? <p style={{ marginTop: 24 }}>{policy.cancellationNote}</p> : null}
    </div>
  );
};

const Inclusions: React.FC<{ inclusions?: any[] }> = ({ inclusions }) => {
  const enabled = (inclusions || []).filter((item: any) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <div className="df-panel" style={{ marginTop: 34 }}>
      <h2 className="df-h3">Included with your stay</h2>
      <Stagger className="df-facility-grid">
        {enabled.slice(0, 8).map((item: any, index: number) => {
          const meta = getInclusionMeta(item);
          return (
            <div key={item?.key || index} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "var(--df-blue)", display: "inline-flex", width: 28 }}>{meta.icon}</span>
              <strong style={{ fontSize: 14 }}>{meta.label}</strong>
            </div>
          );
        })}
      </Stagger>
    </div>
  );
};

const OtherServices: React.FC<{ current: Service }> = ({ current }) => {
  const { t, services, c } = useTpl();
  const others = services.filter((service) => service.key !== current.key);
  if (!others.length) return null;
  return (
    <section className="df-section-tight">
      <div className="df-shell">
        <DfSectionHead
          eyebrow={c("services.other.eyebrow", "Also from us")}
          title={c("services.other.title", "More to explore")}
        />
        <div className="df-feature-grid">
          {others.map((service, index) => (
            <button key={service.key} type="button" className="df-feature" onClick={() => t.goToProductPage(service.slug)}>
              <span className="df-feature-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{service.name}</h3>
              <p>{service.subText || service.heroSubHeading}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, draft, openLead, c } = useTpl();
  const { search } = useLocation();
  const setLeadForm = t.setLeadForm;
  const [selected, setSelected] = useState<number | null>(null);
  const images = service.heroImages.length
    ? service.heroImages
    : service.cardImage
      ? [service.cardImage]
      : service.items.map((item) => item.image).filter(Boolean);

  useEffect(() => {
    const query = new URLSearchParams(search);
    const patch: Record<string, string> = {};
    const start = query.get("in");
    const end = query.get("out");
    const people = query.get("guests");
    if (start) patch.startDate = start;
    if (end) patch.endDate = end;
    if (people) patch.people = people;
    if (Object.keys(patch).length) {
      setLeadForm((prev: any) => ({ ...prev, ...patch }));
    }
  }, [search, setLeadForm]);

  return (
    <>
      <DfPageHero
        eyebrow={c("services.hero.eyebrow", service.profile.labels.listing)}
        title={service.heroHeading}
        text={service.heroSubHeading}
        image={images[0]}
      />

      <section className="df-section-tight">
        <div className="df-shell">
          {service.items.length ? (
            <div className="df-service-layout">
              <div>
                <DfSectionHead
                  eyebrow={c("services.list.eyebrow", "Choose your room")}
                  title={c("services.list.title", "Available rooms")}
                  sub={`${service.items.length} ${service.items.length === 1 ? "room" : "rooms"} to choose from`}
                />
                <div className="df-service-list">
                  {service.items.map((item, index) => (
                    <Reveal key={item.key} delay={Math.min(index * 0.05, 0.25)}>
                      <article className="df-service-row">
                        <button
                          type="button"
                          className="df-service-row-media"
                          onClick={() => setSelected(index)}
                          aria-label={`View photos for ${item.title}`}
                        >
                          {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Placeholder text={item.title} />}
                        </button>
                        <div className="df-service-row-body">
                          <div className="df-room-meta">
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            {item.chips.slice(0, 3).map((chip) => <span key={chip}>{chip}</span>)}
                          </div>
                          <h3 className="df-room-title">{item.title}</h3>
                          {item.description ? <p className="df-room-copy">{item.description}</p> : null}
                          <div className="df-room-bottom">
                            <div className="df-price">
                              <strong>{item.price ? priceWithUnit(item.price, item.priceUnit) : "On request"}</strong>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <button type="button" className="df-btn df-btn-sm" onClick={() => openLead(service, item)}>
                                {c("services.list.book", "Book now")}
                              </button>
                              <button
                                type="button"
                                className="df-btn df-btn-sm df-btn-outline"
                                onClick={() => t.goToProductItem(service.slug, item.slug)}
                              >
                                {c("services.list.details", "Details")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </div>
              {service.leadEnabled ? (
                <aside className="df-panel df-sticky" id="df-enquiry">
                  <p className="df-eyebrow">Reservation</p>
                  <h2 className="df-h3">{c("services.enquiry.title", "Send an enquiry")}</h2>
                  <p>{c("services.enquiry.copy", "Tell us when you'd like to stay and we'll confirm availability.")}</p>
                  <div style={{ marginTop: 22 }}>
                    <LeadFormPanel service={service} />
                  </div>
                </aside>
              ) : null}
            </div>
          ) : (
            <DfEmpty title={c("services.empty.title", "Nothing listed yet")} text={c("services.empty.copy", "Check back soon or send us a message.")} />
          )}
        </div>
      </section>

      <PhotoViewer
        images={
          selected !== null
            ? [service.items[selected]?.image, ...(service.items[selected]?.images || [])].filter(Boolean)
            : []
        }
        index={selected}
        onClose={() => setSelected(null)}
        onChange={setSelected}
      />

      <div className="df-shell"><Inclusions inclusions={draft?.inclusions} /></div>
      <div className="df-shell"><PolicyPanel compact /></div>
      <div className="df-shell"><FaqSection faqs={draft?.faqs} /></div>
      <OtherServices current={service} />
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, draft, c } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const images = [item.image, ...item.images].filter(Boolean);
  const related = service.items.filter((entry) => entry.key !== item.key).slice(0, 3);

  return (
    <>
      <div className="df-shell" style={{ paddingTop: 118 }}>
        <DfTextLink onClick={() => t.goToProductPage(service.slug)}>{c("item.back", "Back to all rooms")}</DfTextLink>
      </div>
      <DfPageHero
        eyebrow={service.name}
        title={item.title}
        text={item.description}
        image={images[0]}
      />

      <section className="df-section-tight">
        <div className="df-shell">
          <div className="df-service-layout">
            <div>
              {images.length ? (
                <Reveal className="df-detail-media">
                  {images.slice(0, 5).map((src, index) => (
                    <button key={`${src}-${index}`} type="button" onClick={() => setViewer(index)} aria-label={`Open photo ${index + 1}`}>
                      <img src={imageOf(src)} alt="" loading="lazy" />
                    </button>
                  ))}
                </Reveal>
              ) : null}
              {item.chips.length || item.features.length ? (
                <div className="df-chip-row">
                  {[...item.chips, ...item.features].slice(0, 8).map((chip) => (
                    <span className="df-chip" key={chip}>{chip}</span>
                  ))}
                </div>
              ) : null}
              {item.description ? (
                <div className="df-panel" style={{ marginTop: 24 }}>
                  <h2 className="df-h3">{c("item.about", "About this room")}</h2>
                  <div className="df-prose"><p>{item.description}</p></div>
                </div>
              ) : null}
            </div>
            <aside className="df-panel df-sticky">
              <p className="df-eyebrow">{service.name}</p>
              <h2 className="df-h3">{service.profile.labels.leadTitle}</h2>
              <p className="df-price" style={{ marginBottom: 20 }}>
                <strong>{item.price ? priceWithUnit(item.price, item.priceUnit) : "On request"}</strong>
              </p>
              {service.leadEnabled ? <LeadFormPanel service={service} item={item} /> : <p>{c("item.contact", "Contact us to check availability.")}</p>}
            </aside>
          </div>
        </div>
      </section>

      <PhotoViewer images={images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      <div className="df-shell"><PolicyPanel compact /></div>
      <div className="df-shell"><FaqSection faqs={draft?.faqs} /></div>
      {related.length ? (
        <section className="df-section-tight">
          <div className="df-shell">
            <DfSectionHead eyebrow={c("item.related.eyebrow", "Keep looking")} title={c("item.related.title", "Other rooms you might like")} />
            <div className="df-grid-3">
              {related.map((entry, index) => (
                <button key={entry.key} type="button" className="df-room" onClick={() => t.goToProductItem(service.slug, entry.slug)}>
                  <span className="df-room-media">
                    {entry.image ? <img src={entry.image} alt="" loading="lazy" /> : <Placeholder text={entry.title} />}
                  </span>
                  <span className="df-room-body" style={{ display: "block" }}>
                    <span className="df-feature-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="df-room-title" style={{ display: "block", marginTop: 8 }}>{entry.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

export const ServicesIndex: React.FC = () => {
  const { t, services, c } = useTpl();
  if (!services.length) {
    return (
      <section className="df-section" style={{ paddingTop: 180 }}>
        <div className="df-shell"><DfEmpty title={c("services.none.title", "Nothing to show yet")} /></div>
      </section>
    );
  }
  if (services.length === 1) return <ServicePage service={services[0]} />;
  return (
    <>
      <DfPageHero
        eyebrow={c("services.index.eyebrow", "What we offer")}
        title={c("services.index.title", "Explore our services")}
        text={c("services.index.sub", "Choose a service to see availability and send a request.")}
      />
      <section className="df-section-tight">
        <div className="df-shell df-feature-grid">
          {services.map((service, index) => (
            <button key={service.key} type="button" className="df-feature" onClick={() => t.goToProductPage(service.slug)}>
              <span className="df-feature-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{service.name}</h3>
              <p>{service.subText || service.heroSubHeading}</p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};
