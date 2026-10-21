import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useBrixspace } from "./BrixspaceContext";

export const BxIcon = {
  arrow: (size = 18) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  menu: () => (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  close: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  check: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  play: () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
};

export const BxReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 42 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.14 }}
    transition={{ duration: 0.78, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);
export const BxImage: React.FC<{
  src?: any;
  alt?: string;
  className?: string;
}> = ({ src, alt = "", className }) => {
  const url = typeof src === "string" ? src : src?.url || src?.src || "";
  return url ? (
    <img className={className} src={url} alt={alt} loading="lazy" />
  ) : (
    <div className={`bx-placeholder ${className || ""}`}>
      <span>BRIXSPACE</span>
    </div>
  );
};
export const BxSectionHead: React.FC<{
  eyebrow?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  light?: boolean;
}> = ({ eyebrow, title, body, action, light }) => (
  <BxReveal className={`bx-section-head ${light ? "bx-light" : ""}`}>
    <div>
      {eyebrow ? <p className="bx-kicker">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
    {action ? <div>{action}</div> : null}
  </BxReveal>
);

export const BxRoomCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead } = useBrixspace();
  const isMenu = service.kind === "menu";
  const detailLabel = isMenu
    ? "View menu item"
    : `View ${service.profile.labels.item}`;
  const meta = isMenu
    ? item.dietary || item.category || item.chips[0] || "Freshly prepared"
    : item.capacity
      ? `Up to ${item.capacity} people`
      : item.chips[0] || "Flexible setup";

  return (
    <BxReveal delay={Math.min(index * 0.06, 0.24)} className="bx-room-wrap">
      <article className="bx-room-card">
        <button
          type="button"
          className="bx-room-photo"
          onClick={() => goToItem(service, item)}
        >
          <BxImage src={item.image} alt={item.title} />
          <span className="bx-room-no">0{index + 1}</span>
          <span className="bx-room-arrow">{BxIcon.arrow()}</span>
        </button>
        <div className="bx-room-copy">
          <div>
            <p className="bx-kicker">
              {item.category || service.profile.labels.tag}
            </p>
            <h3>{item.title}</h3>
          </div>
          <p>
            {item.description ||
              (isMenu
                ? "Made with fresh ingredients and served with care."
                : `A thoughtfully prepared ${service.profile.labels.item} for the way you work.`)}
          </p>
          <div className="bx-room-meta">
            <span>{meta}</span>
            <strong>
              {item.price
                ? priceWithUnit(item.price, item.priceUnit)
                : "On request"}
            </strong>
          </div>
          <div className="bx-room-actions">
            <button type="button" onClick={() => goToItem(service, item)}>
              {detailLabel} {BxIcon.arrow()}
            </button>
            {service.leadEnabled ? (
              <button type="button" onClick={() => openLead(service, item)}>
                {service.profile.labels.itemCta}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    </BxReveal>
  );
};

export const BxPageHero: React.FC<{
  title: string;
  image?: any;
  eyebrow?: string;
  body?: string;
}> = ({ title, image, eyebrow, body }) => (
  <section className="bx-page-hero">
    <div className="bx-shell">
      <div className="bx-page-hero-media">
        <BxImage src={image} alt={title} />
        <div className="bx-page-shade" />
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow ? <p className="bx-kicker">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {body ? <p>{body}</p> : null}
        </motion.div>
      </div>
    </div>
  </section>
);
