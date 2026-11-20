import React from "react";
import { Reveal } from "../motion";
import { priceWithUnit } from "../templateKit";
import type { Service, ServiceItem } from "../serviceAdapter";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

/** Small, Orchard-specific atoms. The shared tp-* atoms stay available for forms. */

export const OrchardEyebrow: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <p className={`ol-eyebrow ${className}`.trim()}>{children}</p>
);

export const OrchardHeading: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  small?: boolean;
  className?: string;
}> = ({ eyebrow, title, sub, action, small, className = "" }) => (
  <Reveal
    className={`flex flex-wrap items-end justify-between gap-6 ${className}`.trim()}
  >
    <div className="max-w-3xl">
      {eyebrow ? <OrchardEyebrow>{eyebrow}</OrchardEyebrow> : null}
      <h2 className={`ol-heading ${small ? "ol-heading-sm" : ""}`.trim()}>
        {title}
      </h2>
      {sub ? <p className="ol-lead">{sub}</p> : null}
    </div>
    {action}
  </Reveal>
);

export const OrchardPageHero: React.FC<{
  eyebrow?: string;
  title: string;
  text?: string;
  image?: string;
}> = ({ eyebrow, title, text, image }) => (
  <>
    <section className="ol-pagehero">
      <div className="ol-shell">
        {eyebrow ? <OrchardEyebrow>{eyebrow}</OrchardEyebrow> : null}
        <h1>{title}</h1>
        {text ? <p>{text}</p> : null}
      </div>
    </section>
    {image ? (
      <div className="ol-shell">
        <OrchardPhoto
          src={image}
          alt={title}
          className="ol-pagehero-media"
          eager
        />
      </div>
    ) : null}
  </>
);

export const OrchardPhoto: React.FC<{
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}> = ({ src, alt, className = "", eager }) => (
  <div className={`ol-photo ${className}`.trim()}>
    {src ? (
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    ) : (
      <Placeholder text={alt || "Photo"} />
    )}
  </div>
);

export const OrchardTextLink: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
}> = ({ children, onClick }) => (
  <button type="button" className="ol-textlink" onClick={onClick}>
    {children}
    <span aria-hidden="true">{Icon.arrow(15)}</span>
  </button>
);

export const OrchardSpecs: React.FC<{ values: string[] }> = ({ values }) => {
  const list = values.filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="ol-plan-specs">
      {list.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  );
};

/** One room/floor-plan card, used on the home page and on service pages. */
export const OrchardPlanCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead, c } = useTpl();
  return (
    <article className="ol-plan-card">
      <button
        type="button"
        className="ol-plan-media"
        onClick={() => goToItem(service, item)}
        aria-label={`View ${item.title}`}
      >
        <img src={item.image} alt={item.title} loading="lazy" />
        {item.badge ? <span className="ol-plan-badge">{item.badge}</span> : null}
      </button>
      <div className="ol-plan-body">
        <div className="ol-plan-title">
          <h3>{item.title}</h3>
          <span className="ol-plan-index">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        {item.description ? (
          <p className="ol-plan-copy">{item.description}</p>
        ) : null}
        <OrchardSpecs values={item.chips} />
        {item.price ? (
          <p className="ol-plan-price">
            <strong>{priceWithUnit(item.price, item.priceUnit)}</strong>
          </p>
        ) : null}
        <div className="ol-plan-actions">
          <button
            type="button"
            className="ol-btn"
            onClick={() => openLead(service, item)}
          >
            {c("home.plans.enquire", "Enquire")}
          </button>
          <button
            type="button"
            className="ol-textlink"
            onClick={() => goToItem(service, item)}
          >
            {c("home.plans.details", "Details")}
          </button>
        </div>
      </div>
    </article>
  );
};

export const OrchardContactItems: React.FC = () => {
  const { t, draft } = useTpl();
  const items: Array<{ label: string; value: string; href?: string }> = [];
  if (t.contactAddress || draft?.address)
    items.push({ label: "Visit us", value: t.contactAddress || draft?.address });
  if (t.contactPhone)
    items.push({
      label: "Call us",
      value: t.contactPhone,
      href: `tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`,
    });
  if (t.contactEmail)
    items.push({
      label: "Email us",
      value: t.contactEmail,
      href: `mailto:${t.contactEmail}`,
    });
  return (
    <div className="ol-contact-grid">
      {items.map((item) => (
        <div key={item.label} className="ol-contact-item">
          <span>{item.label}</span>
          {item.href ? <a href={item.href}>{item.value}</a> : <p>{item.value}</p>}
        </div>
      ))}
    </div>
  );
};

export const OrchardReviews: React.FC<{ limit?: number }> = ({ limit }) => {
  const { t } = useTpl();
  const reviews = (t.testimonials || []).slice(0, limit || 4) as any[];
  if (!reviews.length) return null;
  return (
    <div className="ol-review-grid">
      {reviews.map((review, index) => (
        <figure key={review.key || index} className="ol-review">
          <StarRow value={Number(review.rating) || 5} size={13} />
          <blockquote>
            {review.text || review.comment || review.review || review.message}
          </blockquote>
          <figcaption>
            {review.name || review.customerName || "Guest"}
            {review.role ? (
              <span className="opacity-60"> · {review.role}</span>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </div>
  );
};
