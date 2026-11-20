import React from "react";
import { Reveal } from "../motion";
import { priceWithUnit } from "../templateKit";
import type { Service, ServiceItem } from "../serviceAdapter";
import { Icon, Placeholder, StarRow } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

/** Small, DestinFlow-specific atoms. Shared `tp-*` primitives remain available for forms. */

export const DfSectionHead: React.FC<{
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  light?: boolean;
  center?: boolean;
}> = ({ eyebrow, title, sub, action, light, center }) => (
  <Reveal className={center ? "df-gallery-head" : "df-head-row"}>
    <div className="df-head-row-copy" style={center ? { marginInline: "auto" } : undefined}>
      {eyebrow ? <p className="df-eyebrow">{eyebrow}</p> : null}
      <h2 className="df-h2" style={light ? { color: "#fff" } : undefined}>
        {title}
      </h2>
      {sub ? (
        <p className="df-lead" style={light ? { color: "rgba(255,255,255,.72)" } : undefined}>
          {sub}
        </p>
      ) : null}
    </div>
    {action}
  </Reveal>
);

export const DfPhoto: React.FC<{
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  onClick?: () => void;
}> = ({ src, alt, className = "", eager, onClick }) => {
  if (onClick) {
    return (
      <button type="button" className={`df-photo ${className}`.trim()} onClick={onClick} aria-label={alt}>
        {src ? <img src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" /> : <Placeholder text={alt} />}
      </button>
    );
  }
  return (
    <div className={`df-photo ${className}`.trim()}>
      {src ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" /> : <Placeholder text={alt} />}
    </div>
  );
};

export const DfPageHero: React.FC<{
  eyebrow?: string;
  title: string;
  text?: string;
  image?: string;
}> = ({ eyebrow, title, text, image }) => (
  <>
    <section className="df-pagehero">
      <div className="df-shell">
        {eyebrow ? <p className="df-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {text ? <p>{text}</p> : null}
      </div>
    </section>
    {image ? (
      <div className="df-shell">
        <div className="df-pagehero-media">
          <img src={image} alt="" loading="eager" decoding="async" />
        </div>
      </div>
    ) : null}
  </>
);

export const DfTextLink: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({
  children,
  onClick,
}) => (
  <button type="button" className="df-textlink" onClick={onClick}>
    {children}
    <span aria-hidden="true">{Icon.arrow(15)}</span>
  </button>
);

export const DfRoomCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index?: number;
}> = ({ service, item, index = 0 }) => {
  const { goToItem, openLead, c } = useTpl();
  const specs = item.chips.length ? item.chips.slice(0, 2) : item.features.slice(0, 2);
  return (
    <article className="df-room">
      <button
        type="button"
        className="df-room-media"
        onClick={() => goToItem(service, item)}
        aria-label={`View ${item.title}`}
      >
        {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <Placeholder text={item.title} />}
        {item.badge ? <span className="df-room-badge">{item.badge}</span> : null}
        {specs.length ? (
          <span
            className="df-room-badge"
            style={{ left: "auto", right: 14, top: 14, background: "rgba(255,255,255,.92)", color: "#151819" }}
          >
            {specs[0]}
          </span>
        ) : null}
      </button>
      <div className="df-room-body">
        <div className="df-room-meta">
          {index >= 0 ? <span>{String(index + 1).padStart(2, "0")}</span> : null}
          {specs.slice(1).map((spec) => (
            <span key={spec}>{spec}</span>
          ))}
          {item.capacity ? <span>{Icon.users(14)} {item.capacity} guests</span> : null}
        </div>
        <h3 className="df-room-title">{item.title}</h3>
        {item.description ? <p className="df-room-copy">{item.description}</p> : null}
        <div className="df-room-bottom">
          <div className="df-price">
            {item.price ? <strong>{priceWithUnit(item.price, item.priceUnit)}</strong> : <strong>On request</strong>}
            {item.price && item.priceUnit ? <span> / {item.priceUnit}</span> : null}
          </div>
          <button type="button" className="df-btn" onClick={() => openLead(service, item)}>
            {c("home.rooms.book", "Book Now")}
          </button>
        </div>
      </div>
    </article>
  );
};

export const DfReviewCard: React.FC<{ item: any; wide?: boolean }> = ({ item, wide }) => {
  const name = item?.name || item?.customerName || "Guest";
  const role = item?.jobPosition || item?.role || "";
  const text = item?.text || item?.comment || item?.review || item?.message || item?.testimony || "";
  const image = typeof item?.image === "string" ? item.image : item?.image?.url || "";
  return (
    <figure className="df-review" style={wide ? { minHeight: 220 } : undefined}>
      <div className="df-review-stars">
        <StarRow value={Number(item?.rating) || 5} size={15} />
      </div>
      <blockquote>“{text}”</blockquote>
      <figcaption>
        <span className="df-review-avatar">
          {image ? <img src={image} alt="" loading="lazy" /> : name.charAt(0).toUpperCase()}
        </span>
        <span>
          <strong>{name}</strong>
          {role ? <span>{role}</span> : null}
        </span>
      </figcaption>
    </figure>
  );
};

export const DfContactItems: React.FC = () => {
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
    items.push({ label: "Email us", value: t.contactEmail, href: `mailto:${t.contactEmail}` });
  return (
    <div className="df-contact-grid">
      {items.map((item) => (
        <div key={item.label} className="df-contact-item">
          <span>{item.label}</span>
          {item.href ? <a href={item.href}>{item.value}</a> : <p>{item.value}</p>}
        </div>
      ))}
    </div>
  );
};

export const DfEmpty: React.FC<{ title: string; text?: string }> = ({ title, text }) => (
  <div className="df-empty">
    <h3>{title}</h3>
    {text ? <p className="df-lead" style={{ marginInline: "auto" }}>{text}</p> : null}
  </div>
);
