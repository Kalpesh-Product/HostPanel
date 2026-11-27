import React, { useState } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import { formatTime12h } from "../leadForms";
import { LeadFormPanel } from "../shared/TplLead";
import { MessageForm } from "../shared/TplForms";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";
import {
  OrchardHeading,
  OrchardPageHero,
  OrchardPhoto,
  OrchardPlanCard,
  OrchardTextLink,
} from "./OrchardUI";

export const OrchardServicePage: React.FC<{ service: Service }> = ({
  service,
}) => {
  const { c } = useTpl();
  const items = service.items;
  return (
    <>
      <OrchardPageHero
        eyebrow={c("services.page.eyebrow", "Rooms & stays")}
        title={service.heroHeading || service.heading}
        text={
          service.heroSubHeading ||
          c(
            "services.page.sub",
            "Choose the room that fits your stay. Every option includes the same thoughtful shared spaces and a team that knows the neighbourhood.",
          )
        }
        image={service.heroImage}
      />
      <section className="ol-section">
        <div className="ol-shell">
          {items.length ? (
            <div className="ol-plans-grid">
              {items.map((item, index) => (
                <OrchardPlanCard
                  key={item.key}
                  service={service}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <p className="ol-lead">
              {c(
                "services.page.empty",
                "Rooms will appear here as soon as they are added.",
              )}
            </p>
          )}
        </div>
      </section>
      {service.page?.faqEnabled !== false ? (
        <FaqSection faqs={service.page?.faqs} />
      ) : null}
    </>
  );
};

export const OrchardServicesIndex: React.FC = () => {
  const { services, draft, goToService, c, photo } = useTpl();
  if (services.length === 1)
    return <OrchardServicePage service={services[0]} />;
  if (!services.length)
    return (
      <>
        <OrchardPageHero
          eyebrow={c("services.index.eyebrow", "Explore")}
          title={draft?.productTitle || c("services.index.title", "What we offer")}
          text={c(
            "services.index.sub",
            "Everything the house has to offer, in one place.",
          )}
        />
        <section className="ol-section">
          <div className="ol-shell">
            <p className="ol-lead">
              {c(
                "services.index.empty",
                "Services will appear here as soon as they are added.",
              )}
            </p>
          </div>
        </section>
      </>
    );
  return (
    <>
      <OrchardPageHero
        eyebrow={c("services.index.eyebrow", "Explore the house")}
        title={draft?.productTitle || c("services.index.title", "Choose your stay")}
        text={c(
          "services.index.sub",
          "Every option is designed around the same idea: a comfortable room, a good shared table and a neighbourhood worth exploring.",
        )}
        image={services[0]?.heroImage}
      />
      <section className="ol-section">
        <div className="ol-shell ol-index-grid">
          {services.map((service, index) => (
            <button
              key={service.key}
              type="button"
              className="ol-index-card"
              onClick={() => goToService(service)}
            >
              <img
                src={photo(
                  `services.index.image${index + 1}`,
                  service.cardImage || service.heroImage,
                )}
                alt={service.heading}
                loading="lazy"
              />
              <div className="ol-index-card-body">
                <span className="ol-eyebrow">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2>{service.heading}</h2>
                <p>{service.subText}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export const OrchardItemDetail: React.FC<{
  service: Service;
  item: ServiceItem;
}> = ({ service, item }) => {
  const { t, draft, goToService, c } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const images = [...new Set([item.image, ...item.images].filter(Boolean))];
  const activePhoto = images[selectedPhoto] ? selectedPhoto : 0;
  const policy = draft?.stayPolicy || {};
  const related = service.items
    .filter((entry) => entry.key !== item.key)
    .slice(0, 3);

  return (
    <>
      <OrchardPageHero
        eyebrow={item.chips.join(" · ") || c("services.detail.eyebrow", "Your room")}
        title={item.title}
        text={item.description}
      />
      <div className="ol-shell ol-section-tight">
        <div className="ol-detail-grid">
          {images.length > 0 ? (
            <section className="ol-detail-gallery" aria-label={`${item.title} photos`}>
              <button
                type="button"
                className="ol-detail-photo"
                onClick={() => setViewer(activePhoto)}
                aria-label={`Enlarge photo ${activePhoto + 1} of ${item.title}`}
              >
                <img src={images[activePhoto]} alt={`${item.title} photo ${activePhoto + 1}`} />
              </button>
              {images.length > 1 ? (
                <div className="ol-detail-thumbnails">
                  {images.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSelectedPhoto(index)}
                      aria-label={`Show photo ${index + 1} of ${item.title}`}
                      aria-pressed={index === activePhoto}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
          <div>
            <OrchardHeading
              eyebrow={c("services.detail.eyebrow", "Inside the room")}
              title={c("services.detail.title", "A space that feels considered.")}
              small
            />
            <p className="ol-lead">{item.description}</p>
            {item.features.length ? (
              <div className="ol-detail-list">
                {item.features.map((feature) => (
                  <div key={feature}>
                    {Icon.check(15)}
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="ol-good-to-know">
              <h3>{c("services.detail.goodToKnow", "Good to know")}</h3>
              <dl>
                {policy.checkInTime ? (
                  <div>
                    <dt>{c("services.detail.checkIn", "Check-in")}</dt>
                    <dd>{formatTime12h(policy.checkInTime)}</dd>
                  </div>
                ) : null}
                {policy.checkOutTime ? (
                  <div>
                    <dt>{c("services.detail.checkOut", "Check-out")}</dt>
                    <dd>{formatTime12h(policy.checkOutTime)}</dd>
                  </div>
                ) : null}
                {policy.minStayNights ? (
                  <div>
                    <dt>{c("services.detail.minStay", "Minimum stay")}</dt>
                    <dd>{policy.minStayNights} night(s)</dd>
                  </div>
                ) : null}
              </dl>
              {policy.cancellationNote ? (
                <p>{policy.cancellationNote}</p>
              ) : null}
            </div>
            <div className="mt-8">
              <OrchardTextLink onClick={() => goToService(service)}>
                {c("services.detail.back", "Back to all rooms")}
              </OrchardTextLink>
            </div>
          </div>
        </div>
        <section className="ol-detail-card" aria-labelledby="ol-detail-reserve-title">
          <p className="ol-eyebrow">
            {c("services.detail.reserve", "Reserve your stay")}
          </p>
          <h3 id="ol-detail-reserve-title">{item.title}</h3>
          {service.leadEnabled ? (
            <LeadFormPanel service={service} item={item} />
          ) : (
            <MessageForm
              inquiryType="Room enquiry"
              submitLabel={c("services.detail.submit", "Send enquiry")}
              success="Thanks — we will be in touch shortly."
            />
          )}
        </section>
      </div>
      {related.length ? (
        <section className="ol-section ol-section-soft">
          <div className="ol-shell">
            <OrchardHeading
              eyebrow={c("services.detail.relatedEyebrow", "Keep exploring")}
              title={c("services.detail.related", "Other rooms, same attention to detail.")}
              small
            />
            <div className="ol-plans-grid">
              {related.map((other, index) => (
                <OrchardPlanCard
                  key={other.key}
                  service={service}
                  item={other}
                  index={index}
                />
              ))}
            </div>
            <div className="mt-8">
              <OrchardTextLink onClick={() => t.goToProductPage(service.slug)}>
                {c("services.detail.viewAll", "View all rooms")}
              </OrchardTextLink>
            </div>
          </div>
        </section>
      ) : null}
      <PhotoViewer
        images={images}
        index={viewer}
        onClose={() => setViewer(null)}
        onChange={setViewer}
      />
    </>
  );
};

/** Kept as a named export so the root renderer can import the same shape as other templates. */
export const OrchardStayRow: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => (
  <OrchardPlanCard service={service} item={item} index={index} />
);

/** Used by pages that want a simple photo link into a room. */
export const OrchardRoomPhoto: React.FC<{ service: Service; item: ServiceItem }> = ({
  service,
  item,
}) => {
  const { goToItem } = useTpl();
  return (
    <button type="button" onClick={() => goToItem(service, item)}>
      <OrchardPhoto src={item.image} alt={item.title} />
    </button>
  );
};
