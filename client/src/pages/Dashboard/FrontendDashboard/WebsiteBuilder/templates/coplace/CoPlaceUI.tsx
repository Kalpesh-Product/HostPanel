import { groupOpeningHours } from "../templateKit";
import { useCoPlace } from "./CoPlaceContext";

export function CoPlaceImage({ src, alt = "", eager = false }: { src?: string; alt?: string; eager?: boolean }) {
  return src ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" /> : null;
}

export function CoPlacePageHero({ title, label, image, body }: {
  title: string; label?: string; image?: string; body?: string;
}) {
  return (
    <section className="coplace-page-hero">
      <CoPlaceImage src={image} eager />
      <div className="coplace-shell">
        {label ? <p className="coplace-kicker">{label}</p> : null}
        <h1>{title}</h1>
        {body ? <p className="coplace-page-intro">{body}</p> : null}
      </div>
    </section>
  );
}

export function CoPlaceHours() {
  const { draft } = useCoPlace();
  const hours = groupOpeningHours(Array.isArray(draft.openingHours) ? draft.openingHours : []);
  if (!hours.length) return null;
  return (
    <dl className="coplace-hours-list">
      {hours.map((row) => <div key={row.days}><dt>{row.days}</dt><dd>{row.hours}</dd></div>)}
    </dl>
  );
}
