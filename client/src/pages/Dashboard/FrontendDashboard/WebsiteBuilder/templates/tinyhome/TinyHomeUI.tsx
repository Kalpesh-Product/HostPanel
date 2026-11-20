import { groupOpeningHours } from "../templateKit";
import { useTinyHome } from "./TinyHomeContext";

export function TinyHomeImage({ src, alt = "", eager = false }: { src?: string; alt?: string; eager?: boolean }) {
  return src ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" /> : null;
}

export function TinyHomePageHero({ title, label, image, body }: {
  title: string; label?: string; image?: string; body?: string;
}) {
  return (
    <section className="tinyhome-page-hero">
      <TinyHomeImage src={image} eager />
      <div className="tinyhome-shell">
        {label ? <p className="tinyhome-kicker">{label}</p> : null}
        <h1>{title}</h1>
        {body ? <p className="tinyhome-page-intro">{body}</p> : null}
      </div>
    </section>
  );
}

export function TinyHomeHours() {
  const { draft } = useTinyHome();
  const hours = groupOpeningHours(Array.isArray(draft.openingHours) ? draft.openingHours : []);
  if (!hours.length) return null;
  return (
    <dl className="tinyhome-hours-list">
      {hours.map((row) => <div key={row.days}><dt>{row.days}</dt><dd>{row.hours}</dd></div>)}
    </dl>
  );
}
