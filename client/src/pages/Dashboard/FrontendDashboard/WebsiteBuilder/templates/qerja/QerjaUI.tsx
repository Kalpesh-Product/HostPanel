import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { useQerja } from "./QerjaContext";
import { qerjaPrice } from "./qerjaPricing";

export const QIcon = {
  arrow: (size = 18) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h13m-5-6 6 6-6 6"
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
        strokeWidth="1.8"
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
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  check: () => (
    <svg
      width="17"
      height="17"
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
  quote: () => (
    <svg
      width="44"
      height="34"
      viewBox="0 0 44 34"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 34V20.7C0 7.8 6.2 1.1 18.6 0v7.2c-5.8.7-8.8 3.6-9 8.7H18V34H0Zm25.4 0V20.7C25.4 7.8 31.6 1.1 44 0v7.2c-5.8.7-8.8 3.6-9 8.7h8.4V34h-18Z"
        fill="currentColor"
      />
    </svg>
  ),
};
export const QReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.14 }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);
export const QEyebrow: React.FC<{
  children: React.ReactNode;
  light?: boolean;
}> = ({ children, light }) => (
  <p className={`qj-eyebrow ${light ? "is-light" : ""}`}>
    <i />
    {children}
  </p>
);
export const QPlaceholder: React.FC<{ text?: string }> = ({
  text = "Qerja",
}) => <div className="qj-placeholder">{text}</div>;
export const QPageHero: React.FC<{
  title: string;
  eyebrow?: string;
  image?: string;
  children?: React.ReactNode;
}> = ({ title, eyebrow, image, children }) => (
  <section
    className="qj-page-hero"
    style={
      image
        ? {
            backgroundImage: `linear-gradient(90deg,rgba(0,46,42,.92),rgba(0,46,42,.55)),url(${image})`,
          }
        : undefined
    }
  >
    <div className="qj-shell">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        {eyebrow ? <QEyebrow light>{eyebrow}</QEyebrow> : null}
        <h1>{title}</h1>
        {children}
      </motion.div>
    </div>
  </section>
);
export const QSpaceCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead } = useQerja();
  const image =
    item.images?.[0] || item.image || service.cardImage || service.heroImage;
  return (
    <motion.article
      className="qj-space-card"
      whileHover={{ y: -7 }}
      transition={{ duration: 0.3 }}
    >
      <button
        className="qj-space-photo"
        type="button"
        onClick={() => goToItem(service, item)}
      >
        {image ? (
          <img src={image} alt={item.title} />
        ) : (
          <QPlaceholder text={item.title} />
        )}
        <span>0{index + 1}</span>
      </button>
      <div>
        <small>{item.category || service.name}</small>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <strong>{qerjaPrice(item, index)}</strong>
        <div className="qj-card-actions">
          <button type="button" onClick={() => goToItem(service, item)}>
            View details {QIcon.arrow()}
          </button>
          <button type="button" onClick={() => openLead(service, item)}>
            Reserve
          </button>
        </div>
      </div>
    </motion.article>
  );
};
