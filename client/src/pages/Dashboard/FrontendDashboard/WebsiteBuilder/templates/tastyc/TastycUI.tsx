import React from "react";
import { Reveal } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { useTastyc } from "./TastycContext";

const svg = (children: React.ReactNode, size = 18, viewBox = "0 0 24 24") => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icon = {
  arrow: (size = 18) => svg(<><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>, size),
  back: (size = 18) => svg(<><path d="M19 12H5"/><path d="m10 7-5 5 5 5"/></>, size),
  menu: (size = 22) => svg(<><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>, size),
  close: (size = 22) => svg(<><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>, size),
  chevron: (size = 14) => svg(<path d="m7 10 5 5 5-5"/>, size),
  star: (size = 18) => svg(<path d="m12 2.5 2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.32l-5.8 3.05 1.11-6.47-4.7-4.58 6.49-.94L12 2.5Z"/>, size),
  clock: (size = 18) => svg(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, size),
  phone: (size = 18) => svg(<path d="M7.2 3h2.2l1.1 4-1.8 1.5a15.7 15.7 0 0 0 6.8 6.8l1.5-1.8 4 1.1v2.2a3 3 0 0 1-3.2 3A16.8 16.8 0 0 1 4.2 6.2 3 3 0 0 1 7.2 3Z"/>, size),
  map: (size = 18) => svg(<><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>, size),
  plus: (size = 18) => svg(<><path d="M12 5v14"/><path d="M5 12h14"/></>, size),
};

export const Placeholder: React.FC<{ text?: string }> = ({ text }) => (
  <div className="tc-placeholder flex h-full w-full items-center justify-center px-5 text-center">
    <span className="tc-serif text-[24px]">{text || "Coffee house"}</span>
  </div>
);

export const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  copy?: string;
  light?: boolean;
  align?: "left" | "center";
}> = ({ eyebrow, title, copy, light, align = "left" }) => (
  <Reveal className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
    {eyebrow ? <p className={`tc-kicker ${light ? "text-[#d88a4c]" : ""}`}>{eyebrow}</p> : null}
    <h2 className={`tc-h2 mt-3 ${light ? "text-white" : ""}`}>{title}</h2>
    {copy ? <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${light ? "text-white/65" : "tc-muted"} ${align === "center" ? "mx-auto" : ""}`}>{copy}</p> : null}
  </Reveal>
);

export const RatingStars: React.FC<{ value?: number }> = ({ value = 5 }) => (
  <span className="inline-flex gap-1 text-[#d47a36]" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= Math.round(value) ? "" : "opacity-25"}>{Icon.star(15)}</span>)}
  </span>
);

export const MenuRow: React.FC<{ service: Service; item: ServiceItem; index?: number }> = ({ service, item, index = 0 }) => {
  const { goToItem, openLead } = useTastyc();
  return (
    <Reveal delay={Math.min(index * 0.04, 0.22)}>
      <article className="tc-menu-row group">
        <button type="button" className="tc-menu-thumb" onClick={() => goToItem(service, item)} aria-label={`View ${item.title}`}>
          {item.image ? <img src={item.image} alt="" loading="lazy" /> : <Placeholder text={item.title} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <button type="button" className="tc-menu-name text-left" onClick={() => goToItem(service, item)}>{item.title}</button>
            <span className="tc-dots" />
            {item.price ? <span className="tc-price">{priceWithUnit(item.price, item.priceUnit)}</span> : null}
          </div>
          {item.description ? <p className="tc-muted mt-1 line-clamp-2 text-[13px] leading-6">{item.description}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.category ? <span className="tc-tag">{item.category}</span> : null}
            {item.badge ? <span className="tc-tag tc-tag-accent">{item.badge}</span> : null}
            {service.leadEnabled ? <button type="button" className="tc-order-link" onClick={() => openLead(service, item)}>Reserve</button> : null}
          </div>
        </div>
      </article>
    </Reveal>
  );
};

export const ServiceTile: React.FC<{ service: Service }> = ({ service }) => {
  const { goToService } = useTastyc();
  return (
    <button type="button" className="tc-service-tile group" onClick={() => goToService(service)}>
      <div className="absolute inset-0">
        {service.heroImage ? <img src={service.heroImage} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <Placeholder text={service.name} />}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-left text-white md:p-8">
        <p className="tc-kicker text-[#e09357]">{service.profile.labels.listing}</p>
        <h3 className="tc-serif mt-2 text-[34px] leading-none">{service.name}</h3>
        <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em]">Explore {Icon.arrow(14)}</span>
      </div>
    </button>
  );
};
