import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useWorpace } from "./WorpaceContext";

export const Icon = {
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
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  menu: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.6"
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
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  plus: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  pin: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  users: () => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.87"
        stroke="currentColor"
        strokeWidth="1.5"
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
      />
    </svg>
  ),
};

export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.16 }}
    transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export const Placeholder: React.FC<{ text?: string }> = ({
  text = "Worpace",
}) => <div className="wp-placeholder">{text}</div>;

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="wp-label">
    <span>{children}</span>
    <i />
  </div>
);

export const PageHero: React.FC<{
  title: string;
  eyebrow?: string;
  image?: string;
  children?: React.ReactNode;
}> = ({ title, eyebrow, image, children }) => (
  <section className="wp-page-hero">
    <div className="wp-shell wp-page-hero-inner">
      <div>
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <motion.h1
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {title}
        </motion.h1>
        {children}
      </div>
      {image ? (
        <motion.div
          className="wp-page-hero-photo"
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={image} alt="" />
        </motion.div>
      ) : null}
    </div>
  </section>
);

export const SpaceCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead } = useWorpace();
  const image =
    item.images?.[0] || item.image || service.cardImage || service.heroImage;
  return (
    <motion.article
      className="wp-space-card"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        className="wp-space-image"
        onClick={() => goToItem(service, item)}
      >
        {image ? (
          <img src={image} alt={item.title} />
        ) : (
          <Placeholder text={item.title} />
        )}
        <span>{String(index + 1).padStart(2, "0")}</span>
      </button>
      <div className="wp-space-copy">
        <div>
          <p>{item.category || service.name}</p>
          <h3>{item.title}</h3>
        </div>
        <strong>
          {priceWithUnit(item.price, item.priceUnit) ||
            item.raw?.area ||
            "Flexible access"}
        </strong>
        <p>{item.description}</p>
        <button type="button" onClick={() => openLead(service, item)}>
          Reserve space {Icon.arrow()}
        </button>
      </div>
    </motion.article>
  );
};
