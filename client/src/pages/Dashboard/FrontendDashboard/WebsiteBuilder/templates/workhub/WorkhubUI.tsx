import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useWorkhub } from "./WorkhubContext";

export const WhIcon = {
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
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 6h18M3 12h18M3 18h18"
        stroke="currentColor"
        strokeWidth="1.6"
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
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  pin: (size = 16) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
};

export const WhReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.14 }}
    transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export const WhImage: React.FC<{
  src?: any;
  alt?: string;
  className?: string;
}> = ({ src, alt = "", className }) => {
  const resolvedSrc =
    typeof src === "string" ? src : src?.url || src?.src || "";
  return resolvedSrc ? (
    <img
      className={`wh-image ${className || ""}`.trim()}
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
    />
  ) : (
    <div className={`wh-placeholder ${className || ""}`.trim()}>
      <span>WORKHUB</span>
    </div>
  );
};

export const WhSectionHead: React.FC<{
  label: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}> = ({ label, title, body, action }) => (
  <div className="wh-section-head">
    <div>
      <p className="wh-label">{label}</p>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
    {action ? <div>{action}</div> : null}
  </div>
);

export const WhSpaceCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead } = useWorkhub();
  return (
    <WhReveal className="wh-card-wrap" delay={Math.min(index * 0.06, 0.24)}>
      <article className="wh-room-card">
        <button
          type="button"
          className="wh-room-photo"
          onClick={() => goToItem(service, item)}
          aria-label={`View ${item.title}`}
        >
          <WhImage src={item.image} alt={item.title} />
          <span>0{index + 1}</span>
        </button>
        <div className="wh-room-copy">
          <p className="wh-label">
            {item.category || service.profile.labels.item}
          </p>
          <h3>{item.title}</h3>
          <p>
            {item.description ||
              "A bright, fully equipped room designed for focused work and useful conversations."}
          </p>
          <div className="wh-room-meta">
            <span>
              {item.capacity
                ? `Up to ${item.capacity} people`
                : item.chips[0] || "Flexible setup"}
            </span>
            {item.price ? (
              <strong>{priceWithUnit(item.price, item.priceUnit)}</strong>
            ) : null}
          </div>
          <div className="wh-room-actions">
            <button
              type="button"
              className="wh-textlink"
              onClick={() => goToItem(service, item)}
            >
              View room {WhIcon.arrow()}
            </button>
            {service.leadEnabled ? (
              <button
                type="button"
                className="wh-btn"
                onClick={() => openLead(service, item)}
              >
                Book now
              </button>
            ) : null}
          </div>
        </div>
      </article>
    </WhReveal>
  );
};

export const WhPageHero: React.FC<{
  title: string;
  image?: string;
  number?: string;
  body?: string;
  variant?: "default" | "detail" | "contact";
}> = ({ title, image, number = "01", body, variant = "default" }) => (
  <section className="wh-page-hero">
    <div className="wh-shell">
      <div className={`wh-page-media wh-page-media-${variant}`}>
        <WhImage src={image} alt={title} />
        <span className="wh-page-no">{number}</span>
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
        </motion.h1>
        {body ? <p>{body}</p> : null}
        <span className="wh-page-pause" aria-hidden="true">
          Ⅱ
        </span>
      </div>
    </div>
  </section>
);
