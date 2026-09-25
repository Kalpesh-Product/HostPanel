import React from "react";
import { Reveal, motion } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useSavor } from "./SavorContext";
import { DietMark, Icon, Placeholder, Spice } from "../shared/TplUI";

// Shared atoms live in ../shared/TplUI; re-exported so Savor's files keep importing from here.
export { Icon, SectionHead, Placeholder, StarRow, DietMark, Spice } from "../shared/TplUI";

/* ───────────────────────── cards ───────────────────────── */

interface CardProps {
  item: ServiceItem;
  service: Service;
  index?: number;
}

/** A menu dish: photo first, price prominent. */
export const DishCard: React.FC<CardProps> = ({ item, service, index = 0 }) => {
  const { goToItem, openLead } = useSavor();
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="tp-card tp-card-hover flex flex-col overflow-hidden"
      onClick={() => goToItem(service, item)}
    >
      <div className="tp-zoom relative aspect-[4/3]">
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? (
          <span className="tp-chip tp-chip-accent absolute left-3 top-3" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>
            {item.badge}
          </span>
        ) : null}
        {item.dietary ? (
          <span className="absolute right-3 top-3"><DietMark diet={item.dietary} /></span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[19px] leading-tight">{item.title}</h3>
          {item.price ? <span className="tp-display shrink-0 text-[18px]" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{item.price}</span> : null}
        </div>
        {item.description ? <p className="tp-muted tp-clamp2 text-[14px] leading-relaxed">{item.description}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="inline-flex items-center gap-2"><Spice level={item.spiceLevel} />{item.features.slice(0, 1).map((f) => <span key={f} className="tp-chip">{f}</span>)}</span>
          {service.leadEnabled ? (
            <button
              type="button"
              className="tp-link"
              onClick={(event) => {
                event.stopPropagation();
                openLead(service, item, { extras: { notes: `Would like to try: ${item.title}` } });
              }}
            >
              Reserve <span className="tp-arrow">{Icon.arrow(14)}</span>
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

/** Any non-menu offering (room, dorm, package, service) in Savor's card style. */
export const OfferCard: React.FC<CardProps> = ({ item, service, index = 0 }) => {
  const { goToItem, openLead } = useSavor();
  const priceLine = priceWithUnit(item.price, item.priceUnit);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="tp-card tp-card-hover flex flex-col overflow-hidden"
      onClick={() => goToItem(service, item)}
    >
      <div className="tp-zoom relative aspect-[16/10]">
        {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <Placeholder text={item.title} />}
        {item.badge ? (
          <span className="tp-chip absolute left-3 top-3" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{item.badge}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-[21px] leading-tight">{item.title}</h3>
        {item.chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {item.chips.slice(0, 4).map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
          </div>
        ) : null}
        {item.description ? <p className="tp-muted tp-clamp2 text-[14px] leading-relaxed">{item.description}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            {priceLine ? <p className="tp-display text-[20px]" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{priceLine}</p> : <p className="tp-muted text-[13px]">Ask for pricing</p>}
          </div>
          {service.leadEnabled ? (
            <button
              type="button"
              className="tp-btn tp-btn-dark tp-btn-sm"
              onClick={(event) => {
                event.stopPropagation();
                openLead(service, item);
              }}
            >
              {service.profile.labels.itemCta}
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

export const ItemCard: React.FC<CardProps> = (props) =>
  props.service.profile.presenter === "menu" ? <DishCard {...props} /> : <OfferCard {...props} />;

/** Photo-forward tile for a whole service (used on the home page and the services index). */
export const ServiceTile: React.FC<{ service: Service; index?: number; wide?: boolean }> = ({ service, index = 0, wide }) => {
  const { goToService } = useSavor();
  return (
    <Reveal delay={index * 0.08}>
      <button
        type="button"
        onClick={() => goToService(service)}
        className="tp-card tp-card-hover group relative block w-full overflow-hidden text-left"
        style={{ borderRadius: 30 }}
      >
        <div className={`tp-zoom relative aspect-[4/3] ${wide ? "md:aspect-[21/9]" : "md:aspect-[16/11]"}`}>
          {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.05) 60%)" }} />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] opacity-80">{service.profile.labels.tag}</p>
            <h3 className="mt-1 text-[28px] md:text-[34px]">{service.heading}</h3>
            {service.subText ? <p className="tp-clamp2 mt-2 max-w-md text-[14px] opacity-85">{service.subText}</p> : null}
            <span className="mt-4 inline-flex items-center gap-2 text-[14px] font-bold">
              Explore <span className="transition-transform group-hover:translate-x-1">{Icon.arrow(16)}</span>
            </span>
          </div>
        </div>
      </button>
    </Reveal>
  );
};

/**
 * A set of service tiles. One service is a full-width tile; two or more sit in a centred grid
 * (three across, or two across on the services page) so a short last row is centred.
 */
export const TileGrid: React.FC<{ services: Service[]; cols?: 2 | 3 }> = ({ services, cols = 3 }) => {
  if (!services.length) return null;
  if (services.length === 1) return <ServiceTile service={services[0]} wide />;
  const width =
    cols === 3
      ? "w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc((100%-2.5rem)/3)]"
      : "w-full md:w-[calc(50%-0.625rem)]";
  return (
    <div className="flex flex-wrap justify-center gap-5">
      {services.map((service, index) => (
        <div key={service.key} className={width}>
          <ServiceTile service={service} index={index} />
        </div>
      ))}
    </div>
  );
};
