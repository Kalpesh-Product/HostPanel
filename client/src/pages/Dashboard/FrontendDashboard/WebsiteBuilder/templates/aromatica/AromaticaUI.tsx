import React from "react";
import { motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useAromatica } from "./AromaticaContext";

export const AromaArrow = ({ size = 18 }: { size?: number }) => (
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AromaImage: React.FC<{
  src?: any;
  alt?: string;
  className?: string;
  eager?: boolean;
}> = ({ src, alt = "", className, eager }) => {
  const url = typeof src === "string" ? src : src?.url || src?.src || "";
  return url ? (
    <img
      className={className}
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
    />
  ) : null;
};

export const AromaReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 36 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export const AromaProductCard: React.FC<{
  service: Service;
  item: ServiceItem;
  index: number;
}> = ({ service, item, index }) => {
  const { goToItem, openLead } = useAromatica();
  return (
    <AromaReveal
      className="aroma-product-wrap"
      delay={Math.min(index * 0.06, 0.24)}
    >
      <article className="aroma-product-card">
        <button
          type="button"
          className="aroma-product-photo"
          onClick={() => goToItem(service, item)}
        >
          <AromaImage src={item.image} alt={item.title} />
          <span>0{index + 1}</span>
        </button>
        <div className="aroma-product-copy">
          <p className="aroma-kicker">{item.category || "House roast"}</p>
          <h3>
            <button type="button" onClick={() => goToItem(service, item)}>
              {item.title}
            </button>
          </h3>
          <p>
            {item.description ||
              "A carefully sourced coffee, roasted to reveal its natural sweetness."}
          </p>
          <div>
            <strong>
              {item.price
                ? priceWithUnit(item.price, item.priceUnit)
                : "Ask our barista"}
            </strong>
            <span className="aroma-product-actions">
              {service.leadEnabled ? (
                <button
                  type="button"
                  className="aroma-product-reserve"
                  onClick={() => openLead(service, item)}
                >
                  Reserve
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => goToItem(service, item)}
                aria-label={`View ${item.title}`}
              >
                <AromaArrow />
              </button>
            </span>
          </div>
        </div>
      </article>
    </AromaReveal>
  );
};

export const AromaPageHero: React.FC<{
  eyebrow: string;
  title: string;
  body?: string;
  image?: any;
}> = ({ eyebrow, title, body, image }) => {
  const imageUrl =
    typeof image === "string" ? image : image?.url || image?.src || "";

  return (
    <section className={`aroma-page-hero${imageUrl ? "" : " without-media"}`}>
      <div
        className={`aroma-shell aroma-page-hero-grid${imageUrl ? "" : " without-media"}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
        >
          <p className="aroma-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          {body ? <p className="aroma-lead">{body}</p> : null}
        </motion.div>
        {imageUrl ? (
          <motion.div
            className="aroma-page-hero-media"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <AromaImage src={imageUrl} alt={title} eager />
          </motion.div>
        ) : null}
      </div>
    </section>
  );
};
