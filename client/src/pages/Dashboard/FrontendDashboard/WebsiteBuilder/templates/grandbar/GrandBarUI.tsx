import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useGrandBar } from "./GrandBarContext";

const svg = (children: React.ReactNode, size = 18, viewBox = "0 0 24 24") => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.45"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const GbIcon = {
  arrow: (size = 18) =>
    svg(
      <>
        <path d="M4 12h15" />
        <path d="m14 7 5 5-5 5" />
      </>,
      size,
    ),
  close: (size = 20) =>
    svg(
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>,
      size,
    ),
  menu: (size = 22) =>
    svg(
      <>
        <path d="M4 8h16" />
        <path d="M4 16h16" />
      </>,
      size,
    ),
  glass: (size = 22) =>
    svg(
      <>
        <path d="M5 3h14l-2 7a5.2 5.2 0 0 1-10 0L5 3Z" />
        <path d="M12 15v6" />
        <path d="M8 21h8" />
      </>,
      size,
    ),
  map: (size = 20) =>
    svg(
      <>
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>,
      size,
    ),
  phone: (size = 20) =>
    svg(
      <path d="M7.2 3h2.2l1.1 4-1.8 1.5a15.7 15.7 0 0 0 6.8 6.8l1.5-1.8 4 1.1v2.2a3 3 0 0 1-3.2 3A16.8 16.8 0 0 1 4.2 6.2 3 3 0 0 1 7.2 3Z" />,
      size,
    ),
  clock: (size = 20) =>
    svg(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>,
      size,
    ),
  check: (size = 18) => svg(<path d="m5 12 4 4L19 6" />, size),
};

export const GbImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = "" }) =>
  src ? (
    <img src={src} alt={alt} className={className} loading="lazy" />
  ) : (
    <div className={"gb-placeholder " + className}>
      <span>{alt}</span>
    </div>
  );

export const GbReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.18 }}
    transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export const GbSeal: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { draft } = useGrandBar();
  return (
    <div
      className={compact ? "gb-seal gb-seal-compact" : "gb-seal"}
      aria-label={draft?.companyName || "Grand Bar"}
    >
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
      ) : (
        <>
          <span>{draft?.companyName || "Grand Bar"}</span>
          <i>{GbIcon.glass(compact ? 16 : 22)}</i>
          <small>Cocktail · Kitchen</small>
        </>
      )}
    </div>
  );
};

export const GbPageHero: React.FC<{
  eyebrow?: string;
  title: string;
  body?: string;
  image?: string;
}> = ({ eyebrow, title, body, image }) => (
  <section className="gb-page-hero">
    <div className="gb-frame gb-page-hero-grid">
      <GbReveal className="gb-page-hero-copy">
        {eyebrow ? <p className="gb-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {body ? <p>{body}</p> : null}
      </GbReveal>
      <motion.div
        className="gb-page-hero-media"
        initial={{ clipPath: "inset(100% 0 0 0 round 999px 999px 0 0)" }}
        animate={{ clipPath: "inset(0% 0 0 0 round 999px 999px 0 0)" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <GbImage src={image} alt={title} />
      </motion.div>
    </div>
  </section>
);

export const GbMenuCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead } = useGrandBar();
  return (
    <GbReveal delay={Math.min(index * 0.045, 0.22)}>
      <article className="gb-menu-card">
        <button
          type="button"
          className="gb-menu-card-image"
          onClick={() => goToItem(service, item)}
        >
          <GbImage src={item.image} alt={item.title} />
          <span>0{index + 1}</span>
        </button>
        <div className="gb-menu-card-copy">
          <div>
            <button type="button" onClick={() => goToItem(service, item)}>
              <h3>{item.title}</h3>
            </button>
            {item.price ? (
              <strong>{priceWithUnit(item.price, item.priceUnit)}</strong>
            ) : null}
          </div>
          {item.description ? <p>{item.description}</p> : null}
          {service.leadEnabled ? (
            <button
              type="button"
              className="gb-text-link"
              onClick={() => openLead(service, item)}
            >
              Reserve {GbIcon.arrow(15)}
            </button>
          ) : null}
        </div>
      </article>
    </GbReveal>
  );
};

export const mapSrc = (address: string) =>
  "https://www.google.com/maps?q=" +
  encodeURIComponent(address || "Bengaluru") +
  "&output=embed";
