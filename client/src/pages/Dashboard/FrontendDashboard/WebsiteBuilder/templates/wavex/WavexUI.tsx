import React from "react";
import { Reveal } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { Icon, Placeholder } from "../shared/TplUI";
import { useWavex } from "./WavexContext";

export const priceLine = (item: ServiceItem) =>
  item.price ? priceWithUnit(item.price, item.priceUnit) : "";

export const seatsOf = (item: ServiceItem) =>
  item.capacity || (Number(item.raw?.seats) > 0 ? Number(item.raw.seats) : 0);

export const WxMedia: React.FC<{
  src?: string | { url?: string };
  label: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}> = ({ src, label, className = "", imgClassName = "", eager }) => {
  // Demo and builder data can supply either a URL string or a { url } object.
  const resolved = typeof src === "string" ? src : src?.url || "";
  return (
    <div className={`wx-media ${className}`}>
      {resolved ? (
        <img
          src={resolved}
          alt={label}
          loading={eager ? "eager" : "lazy"}
          className={imgClassName}
        />
      ) : (
        <div className="wx-placeholder">{label}</div>
      )}
    </div>
  );
};

export const WxSectionHead: React.FC<{
  eyebrow?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, body, action }) => (
  <Reveal className="wx-spaces-head">
    <div>
      {eyebrow ? <span className="wx-kicker">{eyebrow}</span> : null}
      <h2 className="wx-title">{title}</h2>
      {body ? <p className="wx-copy" style={{ marginTop: 14 }}>{body}</p> : null}
    </div>
    {action}
  </Reveal>
);

export const WxPageHero: React.FC<{
  index: string;
  title: string;
  body?: string;
  image?: string;
  children?: React.ReactNode;
}> = ({ index, title, body, image, children }) => (
  <section className="wx-page-hero">
    {image ? <img src={image} alt="" /> : null}
    <div className="wx-page-hero-inner">
      <div className="wx-shell">
        <span className="wx-page-index">{index}</span>
        <h1 className="wx-page-title">{title}</h1>
        {body ? <p className="wx-page-body">{body}</p> : null}
        {children}
      </div>
    </div>
  </section>
);

export const WxCrumbs: React.FC<{
  items: { label: string; onClick?: () => void }[];
}> = ({ items }) => (
  <nav className="wx-crumbs" aria-label="Breadcrumb">
    {items.map((crumb, index) => (
      <React.Fragment key={crumb.label}>
        {index > 0 ? <span aria-hidden="true">/</span> : null}
        {crumb.onClick ? (
          <button type="button" onClick={crumb.onClick}>{crumb.label}</button>
        ) : (
          <span aria-current="page">{crumb.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export const WxRoomCard: React.FC<{ item: ServiceItem; service: Service }> = ({
  item,
  service,
}) => {
  const { goToItem, openLead } = useWavex();
  const price = priceLine(item);
  return (
    <article className="wx-space-card">
      <button
        type="button"
        className="wx-space-photo"
        onClick={() => goToItem(service, item)}
        aria-label={`View ${item.title}`}
      >
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? <span className="wx-space-badge">{item.badge}</span> : null}
      </button>
      <div className="wx-space-body">
        <span className="wx-space-cat">{item.category || service.name}</span>
        <h3 className="wx-space-title">
          <button type="button" onClick={() => goToItem(service, item)}>{item.title}</button>
        </h3>
        {item.description ? <p className="wx-space-desc">{item.description}</p> : null}
        <div className="wx-space-foot">
          <div className="wx-space-price">
            {price ? <>From <strong>{price}</strong></> : <strong>Ask for a quote</strong>}
          </div>
          <button
            type="button"
            className="wx-space-go"
            aria-label={`${service.leadEnabled ? "Book" : "View"} ${item.title}`}
            onClick={() =>
              service.leadEnabled ? openLead(service, item) : goToItem(service, item)
            }
          >
            {Icon.arrow(17)}
          </button>
        </div>
      </div>
    </article>
  );
};

export const detailRows = (
  item: ServiceItem,
): [string, string][] => {
  const raw = item.raw || {};
  const seats = seatsOf(item);
  const rows: [string, string | undefined][] = [
    ["Capacity", seats ? `Up to ${seats} people` : undefined],
    ["Rate", priceLine(item) || undefined],
    ["Available", String(raw.accessHours || "").trim() || undefined],
    ["Type", item.category || undefined],
  ];
  return rows.filter(([, value]) => value) as [string, string][];
};
