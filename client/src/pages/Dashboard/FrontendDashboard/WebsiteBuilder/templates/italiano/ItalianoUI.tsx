import { useState } from "react";
import { groupByCategory, type Service } from "../serviceAdapter";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import { useItaliano } from "./ItalianoContext";

export function ItalianoImage({ src, alt = "", eager = false }: { src?: string; alt?: string; eager?: boolean }) {
  return src ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" /> : null;
}

export function ItalianoPageHero({ title, label, image, body }: {
  title: string; label?: string; image?: string; body?: string;
}) {
  return (
    <section className="italiano-page-hero">
      <ItalianoImage src={image} eager />
      <div className="italiano-shell">
        {label ? <p className="italiano-kicker">{label}</p> : null}
        <h1>{title}</h1>
        {body ? <p className="italiano-page-intro">{body}</p> : null}
      </div>
    </section>
  );
}

export function MenuList({ service, limit }: { service: Service; limit?: number }) {
  const { goToItem, c } = useItaliano();
  const groups = groupByCategory(service.items);
  const [category, setCategory] = useState(groups[0]?.category || "");
  const active = groups.find((group) => group.category === category) || groups[0];

  if (!active) return <p className="italiano-empty">{c("menu.empty", "The menu is being prepared.")}</p>;

  return (
    <>
      {groups.length > 1 ? (
        <div className="italiano-menu-tabs" role="group" aria-label="Menu categories">
          {groups.map((group) => (
            <button key={group.category} type="button" aria-pressed={active.category === group.category}
              onClick={() => setCategory(group.category)}>
              {group.category || "Other dishes"}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="italiano-menu-list">
        {active.items.slice(0, limit).map((item) => (
          <li key={item.key}>
            <button type="button" className="italiano-menu-item" onClick={() => goToItem(service, item)}>
              {item.image ? <ItalianoImage src={item.image} /> : null}
              <span>
                <strong>{item.title}</strong>
                {item.description ? <small>{item.description}</small> : null}
                {item.badge || item.dietary ? <em>{item.badge || item.dietary}</em> : null}
              </span>
              {item.price ? <b>{priceWithUnit(item.price, item.priceUnit)}</b> : null}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ItalianoHours() {
  const { draft } = useItaliano();
  const hours = groupOpeningHours(Array.isArray(draft.openingHours) ? draft.openingHours : []);
  if (!hours.length) return null;
  return (
    <dl className="italiano-hours-list">
      {hours.map((row) => <div key={row.days}><dt>{row.days}</dt><dd>{row.hours}</dd></div>)}
    </dl>
  );
}
