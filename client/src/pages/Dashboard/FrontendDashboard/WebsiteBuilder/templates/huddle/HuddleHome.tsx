import React, { useMemo, useState } from "react";
import { CountUp, Marquee, Reveal, Stagger } from "../motion";
import type { Service, ServiceItem } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { formatTime12h, todayISO } from "../leadForms";
import { contentSteps } from "../templateContent";
import { currencyPrefix } from "../templateKit";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { Icon, StarRow } from "../shared/TplUI";
import { HdHead, RoomRow, ServiceCards, firstOpenHours, priceLine, seatsOf } from "./HuddleUI";

/* ───────────────────────── the booking search ───────────────────────── */

interface Search { date: string; start: string; hours: number; people: number }

const DURATIONS: { hours: number; label: string }[] = [
  { hours: 1, label: "1 hour" },
  { hours: 2, label: "2 hours" },
  { hours: 3, label: "3 hours" },
  { hours: 4, label: "Half day (4 h)" },
  { hours: 8, label: "Full day (8 h)" },
];

/** Start times every 30 minutes from 07:00 to 21:00, as "HH:MM". */
const START_TIMES = Array.from({ length: 29 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** "10:00" + 2 hours = "12:00", never past 23:59. */
const addHours = (start: string, hours: number) => {
  const [h, m] = start.split(":").map(Number);
  const total = Math.min(h * 60 + m + hours * 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** The price for the chosen duration when the room is priced per hour, e.g. "₹1,200". */
export const estimate = (item: ServiceItem, hours: number) => {
  if (!item.price || !/hour|hr/i.test(item.priceUnit || "")) return "";
  const amount = Number(String(item.price).replace(/[^\d.]/g, ""));
  if (!amount) return "";
  return `${currencyPrefix(item.price)}${Math.round(amount * hours).toLocaleString("en-IN")}`;
};

/** What the search fills in on the booking form. */
export const searchPrefill = (search: Search | null) =>
  search
    ? {
        form: { ...(search.people ? { people: String(search.people) } : {}), ...(search.date ? { startDate: search.date } : {}) },
        extras: { time: search.start, endTime: addHours(search.start, search.hours) },
      }
    : undefined;

const BookingPanel: React.FC<{ service: Service; onSearch: (search: Search) => void }> = ({ service, onSearch }) => {
  const { c } = useTpl();
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("10:00");
  const [hours, setHours] = useState(2);
  const [people, setPeople] = useState("4");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch({ date, start, hours, people: Math.max(0, Number(people) || 0) });
  };

  return (
    <form onSubmit={submit} className="hd-panel p-5 md:p-7" aria-label="Find a room">
      <p className="tp-display text-[22px]">{c("home.finder.title", "Find a room")}</p>
      <p className="tp-muted mt-1 text-[14px]">{c("home.finder.sub", "Tell us when and how many. We'll show the rooms that fit.")}</p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="tp-label" htmlFor="hd-find-date">Date</label>
            <input id="hd-find-date" type="date" min={todayISO()} required className="tp-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="tp-label" htmlFor="hd-find-start">Start time</label>
            <select id="hd-find-start" className="tp-input" value={start} onChange={(e) => setStart(e.target.value)}>
              {START_TIMES.map((time) => <option key={time} value={time}>{formatTime12h(time)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className="tp-label" id="hd-find-len">Duration</span>
          <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="hd-find-len">
            {DURATIONS.map((option) => (
              <button key={option.hours} type="button" className="hd-slot" aria-pressed={hours === option.hours} aria-label={option.label} onClick={() => setHours(option.hours)}>
                {option.hours === 4 ? "½ day" : option.hours === 8 ? "Full" : `${option.hours}h`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="tp-label" htmlFor="hd-find-people">People attending</label>
          <input id="hd-find-people" type="number" min={1} className="tp-input" placeholder="e.g. 6" value={people} onChange={(e) => setPeople(e.target.value)} />
        </div>
        <button type="submit" className="tp-btn tp-btn-primary w-full">{c("home.finder.button", "Show available rooms")} {Icon.arrow()}</button>
        <p className="tp-muted text-center text-[12.5px]">{service.leadEnabled ? "You won't be charged. Our team confirms every booking." : ""}</p>
      </div>
    </form>
  );
};

/* ───────────────────────── hero ───────────────────────── */

const Hero: React.FC<{ service: Service | null; onSearch: (search: Search) => void }> = ({ service, onSearch }) => {
  const { t, draft, primary, profile, rating, status, openLead, goToService, c } = useTpl();
  const words = String(draft?.title || draft?.companyName || "").trim().split(/\s+/).filter(Boolean);
  const last = words.length > 3 ? words.pop() : "";
  const head = words.join(" ");
  const rooms = service?.items || [];
  const biggest = Math.max(0, ...rooms.map(seatsOf));
  const cheapest = rooms.filter((r) => r.price).map((r) => priceLine(r))[0];
  const facts = [
    rooms.length ? { value: String(rooms.length), label: rooms.length === 1 ? "room" : "rooms" } : null,
    biggest ? { value: `${biggest}`, label: "seats in the largest" } : null,
    cheapest ? { value: cheapest, label: "starting rate" } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <section className="tp-wrap pt-8 md:pt-14">
      <div className={`grid gap-10 lg:gap-14 ${service?.leadEnabled && t.isSectionEnabled("home_finder") ? "lg:grid-cols-[1.15fr_0.85fr] lg:items-center" : ""}`}>
        <div>
          <Reveal y={10}>
            <div className="flex flex-wrap items-center gap-2">
              {rating.count > 0 ? <span className="tp-chip"><span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.star(13)}</span> {rating.avg.toFixed(1)} · {rating.count} review{rating.count > 1 ? "s" : ""}</span> : null}
              {status ? <span className="tp-chip"><span className="inline-block h-2 w-2 rounded-full" style={{ background: status.open ? "#1fae76" : "#e5484d" }} /> {status.text}</span> : null}
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="tp-h1 mt-6 max-w-3xl">
              {head}{last ? " " : ""}{last ? <span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{last}</span> : null}
            </h1>
          </Reveal>
          {draft?.subTitle ? <Reveal delay={0.12}><p className="tp-lead mt-6 max-w-xl">{draft.subTitle}</p></Reveal> : null}
          <Reveal delay={0.18} className="mt-8 flex flex-wrap gap-3">
            {primary?.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{draft?.CTAButtonText || profile.labels.cta} {Icon.arrow()}</button> : null}
            {primary ? <button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToService(primary)}>{c("home.hero.secondaryCta", "See all rooms")}</button> : null}
          </Reveal>
          {facts.length ? (
            <Reveal delay={0.24}>
              <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t pt-6" style={{ borderColor: "var(--t-line)" }}>
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="tp-muted flex items-center gap-2 text-[12.5px] font-medium">{fact.label}</dt>
                    <dd className="tp-display mt-1 text-[clamp(20px,2.4vw,28px)]">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ) : null}
        </div>

        {service?.leadEnabled && t.isSectionEnabled("home_finder") ? (
          <Reveal delay={0.16} y={24}><BookingPanel service={service} onSearch={onSearch} /></Reveal>
        ) : null}
      </div>
    </section>
  );
};

/** A photo mosaic under the hero: one wide shot and two smaller, with the room essentials laid on top. */
const PhotoBand: React.FC = () => {
  const { t, draft } = useTpl();
  const heroImages: string[] = t.heroImages?.length ? t.heroImages : t.resolvedHomeHeroImage ? [t.resolvedHomeHeroImage] : [];
  const gallery: string[] = [...heroImages, ...(t.homeGalleryItems || []), ...(t.galleryItems || [])].filter(Boolean);
  const photos = Array.from(new Set(gallery)).slice(0, 3);
  const chips = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false).slice(0, 5).map((item) => getInclusionMeta(item));
  if (!photos.length) return null;
  return (
    <section className="tp-wrap pt-10 md:pt-14">
      <Reveal>
        <div className={`grid gap-3 md:gap-4 ${photos.length > 1 ? "md:grid-cols-[1.6fr_1fr]" : ""}`}>
          <div className="hd-tile aspect-[16/10] md:aspect-auto md:min-h-[440px]" style={{ background: "var(--t-surface)" }}>
            <img src={photos[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {chips.length ? (
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-4 md:p-5" style={{ background: "linear-gradient(0deg, rgba(8,12,20,.6), transparent)" }}>
                {chips.map(({ label, icon }) => <span key={label} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ background: "rgba(255,255,255,.94)", color: "#12151b" }}>{icon}{label}</span>)}
              </div>
            ) : null}
          </div>
          {photos.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
              {photos.slice(1).map((src) => <div key={src} className="hd-tile aspect-[4/3] md:aspect-auto md:min-h-[212px]" style={{ background: "var(--t-surface)" }}><img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div>)}
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
};

/* ───────────────────────── logos ───────────────────────── */

const Logos: React.FC = () => {
  const { draft } = useTpl();
  const config = draft?.logoCarousel;
  const logos: string[] = (Array.isArray(config?.logos) ? config.logos : []).map((item: any) => (typeof item === "string" ? item : item?.url || item?.preview || "")).filter(Boolean);
  if (!config?.enabled || !logos.length) return null;
  return (
    <section className="mt-14" style={{ borderTop: "1px solid var(--t-line)", borderBottom: "1px solid var(--t-line)" }}>
      <div className="tp-wrap py-8">
        <p className="tp-muted mb-6 text-center text-[12.5px] font-semibold uppercase tracking-[0.14em]">{config.title || "Trusted by teams at"}</p>
        <Marquee speed={38}>
          {logos.map((src, index) => <img key={`${src}-${index}`} src={src} alt="" className="h-9 w-auto max-w-[150px] object-contain opacity-70 grayscale" loading="lazy" />)}
        </Marquee>
      </div>
    </section>
  );
};

/* ───────────────────────── rooms board ───────────────────────── */

const SIZES: { label: string; min: number; max: number }[] = [
  { label: "1–4", min: 1, max: 4 },
  { label: "5–8", min: 5, max: 8 },
  { label: "9–12", min: 9, max: 12 },
  { label: "13+", min: 13, max: Infinity },
];

const RoomsBoard: React.FC<{ service: Service; search: Search | null; onClear: () => void }> = ({ service, search, onClear }) => {
  const { goToService, openLead, c } = useTpl();
  const [size, setSize] = useState("");
  const sizes = useMemo(() => SIZES.filter((option) => service.items.some((item) => seatsOf(item) >= option.min && seatsOf(item) <= option.max)), [service.items]);
  const chosen = SIZES.find((option) => option.label === size);
  const fits = (item: ServiceItem) => {
    const seats = seatsOf(item);
    if (search?.people && seats && seats < search.people) return false;
    if (chosen && !(seats >= chosen.min && seats <= chosen.max)) return false;
    return true;
  };
  const shown = service.items.filter(fits);
  const list = search ? shown : shown.slice(0, 5);
  const prefill = searchPrefill(search);

  return (
    <section id="hd-rooms" className="tp-section" style={{ paddingTop: 56 }}>
      <div className="tp-wrap">
        <HdHead
          eyebrow={service.profile.labels.listing}
          title={c("home.spaces.title", search ? "Rooms that fit your meeting" : "Pick a room")}
          sub={c("home.spaces.sub", service.subText) || undefined}
          action={<button type="button" className="tp-link" onClick={() => goToService(service)}>See all {service.items.length} <span className="tp-arrow">{Icon.arrow()}</span></button>}
        />

        {search ? (
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] px-4 py-3 text-[14px] font-medium" style={{ background: "color-mix(in srgb, var(--t-accent) 10%, transparent)" }} role="status">
            <span className="inline-flex items-center gap-2">{Icon.clock(15)} {search.date ? new Date(`${search.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Any day"}, {formatTime12h(search.start)} – {formatTime12h(addHours(search.start, search.hours))}</span>
            {search.people ? <span className="inline-flex items-center gap-2">{Icon.users(15)} {search.people} {search.people === 1 ? "person" : "people"}</span> : null}
            <button type="button" className="tp-link ml-auto" onClick={onClear}>Clear</button>
          </div>
        ) : null}

        {sizes.length > 1 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by size">
            <span className="tp-muted mr-1 text-[13px] font-semibold">People</span>
            <button type="button" className="tp-tab" aria-pressed={size === ""} onClick={() => setSize("")}>Any</button>
            {sizes.map((option) => <button key={option.label} type="button" className="tp-tab" aria-pressed={size === option.label} onClick={() => setSize(size === option.label ? "" : option.label)}>{option.label}</button>)}
          </div>
        ) : null}

        {!shown.length ? (
          <div className="tp-soft p-10 text-center">
            <p className="tp-h3">No room fits that exactly</p>
            <p className="tp-muted mx-auto mt-2 max-w-md text-[15px]">Tell us what you need. We can often combine rooms or suggest a nearby time.</p>
            {service.leadEnabled ? <button type="button" className="tp-btn tp-btn-primary mt-6" onClick={() => openLead(service, null, prefill)}>{service.profile.labels.cta}</button> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {list.map((item, index) => (
              <Reveal key={item.key} delay={Math.min(index * 0.05, 0.2)}>
                <RoomRow item={item} service={service} prefill={prefill} />
                {search && estimate(item, search.hours) ? <p className="tp-muted mt-2 pl-1 text-[13px]">About <strong style={{ color: "var(--t-text)" }}>{estimate(item, search.hours)}</strong> for {search.hours} {search.hours === 1 ? "hour" : "hours"}</p> : null}
              </Reveal>
            ))}
          </div>
        )}
        {!search && shown.length > list.length ? (
          <div className="mt-6 text-center"><button type="button" className="tp-btn tp-btn-ghost" onClick={() => goToService(service)}>See all {service.items.length} rooms</button></div>
        ) : null}
      </div>
    </section>
  );
};

/* ───────────────────────── how it works, rates ───────────────────────── */

const STEPS = [
  { title: "Pick a time", body: "Choose a date, a start time and how long you need the room." },
  { title: "Choose a room", body: "Filter by the number of people and pick the one that fits." },
  { title: "Show up and start", body: "We confirm by phone or email. On the day the screen is on and the room is ready." },
];

const HowItWorks: React.FC = () => {
  const { draft, c } = useTpl();
  return (
    <div>
      <HdHead eyebrow="How it works" title={c("home.steps.title", "Booked in three steps")} />
      <ol className="space-y-7">
        {contentSteps(draft, STEPS).map((step, index) => (
          <Reveal key={step.title} delay={index * 0.08}>
            <li className="grid grid-cols-[44px_1fr] gap-4">
              <span className="hd-num flex h-11 w-11 items-center justify-center rounded-[10px] border" style={{ borderColor: "var(--t-line)", background: "var(--t-raised)" }}>{String(index + 1).padStart(2, "0")}</span>
              <div><h3 className="tp-h3 !text-[19px]">{step.title}</h3><p className="tp-muted mt-1.5 text-[15px] leading-relaxed">{step.body}</p></div>
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
  );
};

const Rates: React.FC<{ service: Service }> = ({ service }) => {
  const { goToItem, openLead, c } = useTpl();
  const priced = service.items.filter((item) => item.price);
  if (priced.length < 2) return null;
  return (
    <div>
      <HdHead eyebrow="Rates" title={c("home.rates.title", "Rates at a glance")} sub={c("home.rates.sub", "Clear per-hour pricing. Longer bookings are quoted on request.")} />
      <Reveal>
        <div className="tp-card overflow-hidden">
          <table className="hd-table">
            <thead><tr><th scope="col">Room</th><th scope="col">Fits</th><th scope="col" style={{ textAlign: "right" }}>Rate</th></tr></thead>
            <tbody>
              {priced.slice(0, 6).map((item) => (
                <tr key={item.key}>
                  <td><button type="button" className="text-left font-semibold hover:underline" onClick={() => goToItem(service, item)}>{item.title}</button></td>
                  <td className="tp-muted">{seatsOf(item) ? `${seatsOf(item)}` : "—"}</td>
                  <td className="text-right font-semibold">{service.leadEnabled ? <button type="button" className="hover:underline" title="Book this room" onClick={() => openLead(service, item)}>{priceLine(item)}</button> : priceLine(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
};

/* ───────────────────────── amenities ───────────────────────── */

const Amenities: React.FC = () => {
  const { draft, c } = useTpl();
  const enabled = ((draft?.inclusions as any[]) || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="tp-eyebrow mb-4">Included</p>
          <h2 className="tp-h2">{c("home.amenities.title", "Every room comes ready")}</h2>
          <p className="tp-muted mt-4 max-w-md text-[16px] leading-relaxed">{c("home.amenities.sub", "No setup, no surprises. Everything you need for the meeting is already in the room.")}</p>
        </Reveal>
        <Stagger className="grid gap-3 sm:grid-cols-2">
          {enabled.map((item, index) => {
            const { label, icon } = getInclusionMeta(item);
            return (
              <div key={item?.key || index} className="tp-card flex items-center gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]" style={{ background: "color-mix(in srgb, var(--t-accent) 14%, transparent)", color: "var(--t-accent-fg, var(--t-accent))" }}>{icon}</span>
                <span className="text-[15px] font-semibold leading-snug">{label}</span>
              </div>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
};

/* ───────────────────────── numbers ───────────────────────── */

const Numbers: React.FC = () => {
  const { draft, primary, rating } = useTpl();
  const rooms = primary?.items || [];
  const biggest = Math.max(0, ...rooms.map(seatsOf));
  const hours = firstOpenHours(draft?.openingHours);
  const stats: { value: string; label: string; count?: boolean }[] = [
    rooms.length ? { value: String(rooms.length), label: rooms.length === 1 ? "meeting room" : "meeting rooms", count: true } : null,
    biggest ? { value: String(biggest), label: "people in our largest room", count: true } : null,
    hours ? { value: hours.hours.replace(/:00/g, ""), label: hours.days } : null,
    rating.count ? { value: rating.avg.toFixed(1), label: `average from ${rating.count} review${rating.count > 1 ? "s" : ""}` } : null,
  ].filter(Boolean) as any;
  if (stats.length < 2) return null;
  return (
    <section className="tp-wrap" style={{ paddingBottom: 8 }}>
      <Reveal>
        <div className="tp-dark-panel grid gap-y-8 p-8 md:p-12" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}>
          {stats.slice(0, 4).map((stat, index) => (
            <div key={stat.label} className={`px-1 md:px-6 ${index > 0 ? "md:border-l" : ""}`} style={{ borderColor: "color-mix(in srgb, var(--t-on-ink) 18%, transparent)" }}>
              <p className={`tp-display leading-none ${stat.count ? "text-[clamp(34px,5vw,64px)]" : "text-[clamp(20px,2.4vw,32px)]"}`}>{stat.count ? <CountUp value={stat.value} /> : stat.value}</p>
              <p className="mt-3 text-[13.5px] font-medium opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
};

/* ───────────────────────── about ───────────────────────── */

const About: React.FC = () => {
  const { t, draft, photo, c } = useTpl();
  const blocks: string[] = t.aboutBlocks.map((b: any) => String(typeof b === "string" ? b : b?.text || "").trim()).filter(Boolean);
  const images: string[] = [0, 1].map((i) => photo(`home.community.image${i + 1}`, t.homeGalleryItems[i] || "")).filter(Boolean);
  if (!blocks.length) return null;
  return (
    <section className="tp-section">
      <div className="tp-wrap grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <Reveal>
          {images.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {images.map((src, index) => <div key={src} className={`hd-tile ${index === 0 ? "aspect-[3/4]" : "mt-10 aspect-[3/4]"}`} style={{ background: "var(--t-surface)" }}><img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /></div>)}
            </div>
          ) : <div className="hd-tile aspect-[4/3]" style={{ background: "var(--t-accent)" }} />}
        </Reveal>
        <div>
          <Reveal><p className="tp-eyebrow mb-4">About</p></Reveal>
          <Reveal delay={0.05}><h2 className="tp-h2">{draft?.aboutTitle || `About ${draft?.companyName || "us"}`}</h2></Reveal>
          <Stagger className="mt-6 space-y-4">
            {blocks.slice(0, 2).map((text, index) => <p key={index} className={index === 0 ? "tp-lead" : "tp-muted text-[16px] leading-relaxed"}>{text}</p>)}
          </Stagger>
          <Reveal delay={0.15}><button type="button" className="tp-link mt-8" onClick={() => t.goToSection("about")}>{c("home.about.link", "Read our story")} <span className="tp-arrow">{Icon.arrow()}</span></button></Reveal>
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── reviews ───────────────────────── */

export const HdReview: React.FC<{ item: any }> = ({ item }) => (
  <figure className="tp-card flex h-full flex-col gap-5 p-6">
    <StarRow value={item.rating || 5} size={15} />
    <blockquote className="tp-clamp3 flex-1 text-[16px] leading-relaxed">“{item.text}”</blockquote>
    <figcaption className="flex items-center gap-3 border-t pt-5" style={{ borderColor: "var(--t-line)" }}>
      <span className="tp-display flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-[15px]" style={{ background: "var(--t-accent)", color: "var(--t-accent-text, #fff)" }}>
        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : String(item.name || "?").charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">{item.name}</span>{item.role ? <span className="tp-muted block text-[12.5px]">{item.role}</span> : null}</span>
    </figcaption>
  </figure>
);

const Reviews: React.FC = () => {
  const { t, rating, c } = useTpl();
  const list: any[] = t.testimonials.slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <HdHead
          eyebrow="Reviews"
          title={rating.count ? `${rating.avg.toFixed(1)} out of 5 from ${rating.count} review${rating.count > 1 ? "s" : ""}` : c("home.reviews.title", "What teams say")}
          action={
            <div className="flex flex-wrap gap-3">
              <button type="button" className="tp-btn tp-btn-ghost tp-btn-sm" onClick={() => t.goToSection("testimonials")}>{c("home.reviews.link", "All reviews")}</button>
              {t.showWriteReview ? <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={t.openReviewModal}>{c("home.reviews.write", "Write a review")}</button> : null}
            </div>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {list.map((item, index) => <Reveal key={item.key || index} delay={index * 0.08} className="h-full"><HdReview item={item} /></Reveal>)}
        </div>
      </div>
    </section>
  );
};

/* ───────────────────────── other services, booking desk ───────────────────────── */

const MoreServices: React.FC<{ services: Service[] }> = ({ services }) => {
  const { c } = useTpl();
  if (!services.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <HdHead title={c("home.services.title", "More under one roof")} />
        <ServiceCards services={services} />
      </div>
    </section>
  );
};

/** The closing band: where we are and when we're open on the left, a booking request form on the right. */
const BookingDesk: React.FC = () => {
  const { t, draft, primary, profile, c } = useTpl();
  if (!t.isSectionEnabled("home_contact")) return null;
  const form = primary?.leadEnabled ? primary : null;
  const hours = firstOpenHours(draft?.openingHours);
  const row = (icon: React.ReactNode, text: React.ReactNode) => <p className="flex items-start gap-3 text-[16px] font-medium"><span className="mt-1 shrink-0">{icon}</span><span>{text}</span></p>;

  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-soft grid gap-10 p-6 md:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14" style={{ background: "var(--t-surface)" }}>
            <div className="flex flex-col gap-6">
              <div>
                <p className="tp-eyebrow mb-4">Booking desk</p>
                <h2 className="tp-h2">{c("home.visit.title", form ? profile.labels.leadTitle : draft?.contactTitle || "Come say hello")}</h2>
              </div>
              <div className="space-y-3.5">
                {t.contactAddress ? row(Icon.pin(18), t.contactAddress) : null}
                {t.contactPhone ? row(Icon.phone(18), t.contactPhone) : null}
                {t.contactEmail ? row(Icon.mail(18), <span className="break-all">{t.contactEmail}</span>) : null}
                {hours ? row(Icon.clock(18), `${hours.days}: ${hours.hours}`) : draft?.contactBusinessHours ? row(Icon.clock(18), draft.contactBusinessHours) : null}
              </div>
              {draft?.mapUrl ? <iframe title="Map" src={draft.mapUrl} loading="lazy" className="min-h-[240px] w-full flex-1 border-0" style={{ borderRadius: 12 }} /> : null}
              {!form ? <div><button type="button" className="tp-btn tp-btn-dark" onClick={() => t.goToSection("contact")}>{c("home.contact.button", "Contact us")}</button></div> : null}
            </div>
            {form ? (
              <div className="tp-card p-6 md:p-8">
                <h3 className="tp-h3 mb-1">{c("home.visit.formTitle", "Request a booking")}</h3>
                <p className="tp-muted mb-6 text-[14.5px]">{c("home.visit.formSub", "Share the date and time. We'll confirm the room shortly.")}</p>
                <LeadFormPanel service={form} />
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ───────────────────────── page ───────────────────────── */

export const HuddleHome: React.FC = () => {
  const { t, draft, primary, services } = useTpl();
  const [search, setSearch] = useState<Search | null>(null);
  const others = services.filter((service) => service.key !== primary?.key);
  const showRates = t.isSectionEnabled("home_rates") && primary && primary.items.filter((item) => item.price).length >= 2;
  const showSteps = t.isSectionEnabled("home_steps") && Boolean(primary?.leadEnabled);

  const onSearch = (next: Search) => {
    setSearch(next);
    // Give React a frame to render the filtered list, then bring it into view.
    window.setTimeout(() => document.getElementById("hd-rooms")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <>
      {t.isSectionEnabled("home_hero") ? <><Hero service={primary} onSearch={onSearch} /><PhotoBand /></> : null}
      <Logos />
      {t.isSectionEnabled("home_products") && primary ? <RoomsBoard service={primary} search={search} onClear={() => setSearch(null)} /> : null}
      {showSteps || showRates ? (
        <section className="tp-section" style={{ paddingTop: 24 }}>
          <div className={`tp-wrap grid gap-14 ${showSteps && showRates ? "lg:grid-cols-[0.9fr_1.1fr] lg:gap-20" : ""}`}>
            {showSteps ? <HowItWorks /> : null}
            {showRates && primary ? <Rates service={primary} /> : null}
          </div>
        </section>
      ) : null}
      {t.isSectionEnabled("home_inclusions") ? <Amenities /> : null}
      {t.isSectionEnabled("home_stats") ? <Numbers /> : null}
      {t.isSectionEnabled("home_about") ? <About /> : null}
      {t.isSectionEnabled("home_testimonials") ? <Reviews /> : null}
      {others.length && t.isSectionEnabled("home_products") && t.isSectionEnabled("home_services") ? <MoreServices services={others} /> : null}
      <FaqSection faqs={draft?.faqs} />
      <BookingDesk />
    </>
  );
};

