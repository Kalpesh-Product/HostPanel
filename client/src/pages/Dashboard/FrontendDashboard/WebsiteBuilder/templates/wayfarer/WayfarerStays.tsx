import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, Reveal, motion } from "../motion";
import { formatTime12h, nightsBetween, todayISO } from "../leadForms";
import { priceValue, uniqueCategories, type Service, type ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import type { ServiceKind } from "../verticalProfiles";
import { getInclusionMeta } from "../inclusionIcons";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, SectionHead, Spice } from "../shared/TplUI";
import { Mosaic, PhotoViewer, ServiceCards, StayCard, WfBanner, isStayKind, useStayParams, type StayParams } from "./WayfarerUI";

/* ───────────────────────── facets (filters built from the items' own data) ───────────────────────── */

type Sort = "recommended" | "price-asc" | "price-desc";
interface FacetOption { label: string; test: (item: ServiceItem) => boolean }
interface Facet { label: string; options: FacetOption[] }

const CHIP_FACETS: Partial<Record<ServiceKind, [string, string[]][]>> = {
  hostel: [
    ["Room type", ["Shared dorm", "Private room"]],
    ["Who can book", ["Mixed", "Female only", "Male only"]],
    ["Beds", ["Bunk beds", "Single beds"]],
    ["Bathroom", ["Attached bath", "Shared bath"]],
  ],
  coLiving: [
    ["Occupancy", ["Single", "Double sharing", "Triple sharing"]],
    ["Bathroom", ["Attached bath", "Shared bath"]],
    ["Comforts", ["AC", "Furnished"]],
  ],
};

const buildFacets = (service: Service): Facet[] => {
  const items = service.items;
  const facets: Facet[] = [];
  // An option is only useful if some, but not all, items have it.
  const useful = (test: (item: ServiceItem) => boolean) => {
    const n = items.filter(test).length;
    return n > 0 && n < items.length;
  };
  const chipTest = (chip: string) => (item: ServiceItem) => item.chips.includes(chip);

  const categories = uniqueCategories(items);
  if (categories.length > 1) {
    facets.push({ label: "Category", options: categories.map((c) => ({ label: c, test: (item: ServiceItem) => item.category === c })) });
  }
  (CHIP_FACETS[service.kind] || []).forEach(([label, chips]) => {
    const options = chips.filter((chip) => useful(chipTest(chip))).map((chip) => ({ label: chip, test: chipTest(chip) }));
    if (options.length) facets.push({ label, options });
  });
  if (service.kind === "menu") {
    const diets: [string, (i: ServiceItem) => boolean][] = [
      ["Vegetarian", (i) => i.dietary === "veg" || i.dietary === "vegan"],
      ["Non-veg", (i) => i.dietary === "non-veg" || i.dietary === "egg"],
    ];
    const options = diets.filter(([, test]) => useful(test)).map(([label, test]) => ({ label, test }));
    if (options.length) facets.push({ label: "Diet", options });
  }
  // Fallback: the most useful tags. Packages have none worth filtering on ("7 nights" and the like).
  if (!facets.length && service.kind !== "workation") {
    const counts = new Map<string, number>();
    items.forEach((item) => item.chips.forEach((chip) => counts.set(chip, (counts.get(chip) || 0) + 1)));
    const options = Array.from(counts.keys())
      .filter((chip) => useful(chipTest(chip)))
      .slice(0, 8)
      .map((chip) => ({ label: chip, test: chipTest(chip) }));
    if (options.length) facets.push({ label: service.kind === "meeting" ? "Capacity" : "Features", options });
  }
  return facets;
};

/* ───────────────────────── sidebar ───────────────────────── */

/** Dates + guests for a stay. Drives the per-room totals; it does not check live availability. */
const StayBox: React.FC<{ dates: StayParams; setDates: (next: StayParams) => void }> = ({ dates, setDates }) => {
  const nights = nightsBetween(dates.checkIn, dates.checkOut);
  const guests = Math.max(1, Number(dates.guests) || 1);
  const touched = Boolean(dates.checkIn || dates.checkOut || dates.guests);
  const setGuests = (n: number) => setDates({ ...dates, guests: String(Math.max(1, n)) });
  return (
    <div className="tp-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[15px] font-bold">Your stay</p>
        {touched ? (
          <button type="button" className="tp-link !text-[12px]" onClick={() => setDates({ checkIn: "", checkOut: "", guests: "" })}>
            Clear
          </button>
        ) : null}
      </div>
      <div className="space-y-4">
        <div>
          <label className="tp-label" htmlFor="wf-checkin">Check-in</label>
          <input
            id="wf-checkin"
            type="date"
            className="tp-input"
            min={todayISO()}
            value={dates.checkIn}
            onChange={(e) => setDates({ ...dates, checkIn: e.target.value, checkOut: dates.checkOut && e.target.value > dates.checkOut ? "" : dates.checkOut })}
          />
        </div>
        <div>
          <label className="tp-label" htmlFor="wf-checkout">Check-out</label>
          <input id="wf-checkout" type="date" className="tp-input" min={dates.checkIn || todayISO()} value={dates.checkOut} onChange={(e) => setDates({ ...dates, checkOut: e.target.value })} />
        </div>
        <div>
          <span className="tp-label">Guests</span>
          <div className="flex items-center justify-between rounded-[10px] border p-1" style={{ borderColor: "var(--t-line)" }}>
            <button type="button" aria-label="Fewer guests" className="tp-btn tp-btn-ghost tp-btn-sm !px-3.5" disabled={guests <= 1} onClick={() => setGuests(guests - 1)}>−</button>
            <span className="text-[15px] font-bold" aria-live="polite">{guests}</span>
            <button type="button" aria-label="More guests" className="tp-btn tp-btn-ghost tp-btn-sm !px-3.5" onClick={() => setGuests(guests + 1)}>+</button>
          </div>
        </div>
      </div>
      {nights ? (
        <div className="tp-soft mt-5 px-4 py-3 text-[13px] font-semibold">
          {nights} night{nights > 1 ? "s" : ""} · {guests} guest{guests > 1 ? "s" : ""}
        </div>
      ) : (
        <p className="tp-muted mt-5 text-[13px] leading-relaxed">Pick your dates to see the total for each room.</p>
      )}
      <p className="tp-muted mt-3 text-[12px] leading-relaxed">Prices are estimates. Our team confirms availability once you send a request.</p>
    </div>
  );
};

const Sidebar: React.FC<{
  service: Service;
  stay: boolean;
  dates: StayParams;
  setDates: (next: StayParams) => void;
  facets: Facet[];
  selected: Record<string, string[]>;
  toggle: (group: string, option: string) => void;
  sort: Sort;
  setSort: (sort: Sort) => void;
  clear: () => void;
  dirty: boolean;
}> = ({ service, stay, dates, setDates, facets, selected, toggle, sort, setSort, clear, dirty }) => (
  <div className="flex flex-col gap-4">
    {stay ? <StayBox dates={dates} setDates={setDates} /> : null}
    {facets.map((facet) => (
      <div key={facet.label} className="tp-card p-4">
        <p className="mb-3 text-[13px] font-bold">{facet.label}</p>
        <ul className="space-y-2">
          {facet.options.map((option) => {
            const checked = (selected[facet.label] || []).includes(option.label);
            const count = service.items.filter(option.test).length;
            return (
              <li key={option.label}>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-[14px]">
                  <span className="flex items-center gap-2.5">
                    <input type="checkbox" checked={checked} onChange={() => toggle(facet.label, option.label)} className="h-4 w-4" style={{ accentColor: "var(--t-accent)" }} />
                    {option.label}
                  </span>
                  <span className="tp-muted text-[12px]">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
    <div className="tp-card p-4">
      <label className="tp-label" htmlFor="wf-sort">Sort by</label>
      <select id="wf-sort" className="tp-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
        <option value="recommended">Recommended</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
      {dirty ? <button type="button" className="tp-link mt-3" onClick={clear}>Clear all filters</button> : null}
    </div>
  </div>
);

/* ───────────────────────── policy panel ───────────────────────── */

export const PolicyPanel: React.FC<{ compact?: boolean; kind?: string }> = ({ compact, kind }) => {
  const { draft } = useTpl();
  const policy = draft?.stayPolicy || {};
  const rules: string[] = policy.houseRules || [];
  const facts: [string, string][] = [
    policy.checkInTime && ["Check-in", `From ${formatTime12h(policy.checkInTime)}`],
    policy.checkOutTime && ["Check-out", `Until ${formatTime12h(policy.checkOutTime)}`],
    policy.minStayNights && kind !== "coLiving" && ["Minimum stay", `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}`],
  ].filter(Boolean) as [string, string][];
  if (!facts.length && !rules.length && !policy.cancellationNote) return null;
  return (
    <div className={compact ? "tp-card p-5 md:p-6" : "tp-card p-6 md:p-9"}>
      <h2 className={compact ? "tp-h3 mb-4 !text-[18px]" : "tp-h3 mb-6"}>Good to know</h2>
      {facts.length ? (
        <dl className={compact ? "mb-5 grid grid-cols-3 gap-2" : "mb-8 grid gap-3 sm:grid-cols-3"}>
          {facts.map(([label, value]) => (
            <div key={label} className={compact ? "tp-soft px-3 py-2.5" : "tp-soft px-4 py-3.5"}>
              <dt className="tp-muted text-[10.5px] font-bold uppercase tracking-wider">{label}</dt>
              <dd className={compact ? "mt-0.5 text-[14px] font-bold" : "mt-1 text-[16px] font-bold"}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rules.length ? (
        <div>
          <h3 className={compact ? "mb-3 text-[14px]" : "mb-4 text-[15px]"}>House rules</h3>
          <ul className={compact ? "grid gap-x-8 gap-y-2.5 sm:grid-cols-2" : "grid gap-x-10 gap-y-4 sm:grid-cols-2"}>
            {rules.map((rule) => (
              <li key={rule} className={compact ? "flex items-start gap-2.5 text-[14px] leading-snug" : "flex items-start gap-3 text-[15px] leading-relaxed"}>
                <span className="mt-0.5 shrink-0" style={{ color: "var(--t-secondary-fg, var(--t-accent-fg, var(--t-accent)))" }}>{Icon.check(compact ? 15 : 16)}</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {policy.cancellationNote ? (
        <div className={compact ? "tp-soft mt-5 flex items-start gap-3 px-3.5 py-3 text-[13px] leading-relaxed" : "tp-soft mt-8 flex items-start gap-3 px-4 py-3.5 text-[14px] leading-relaxed"}>
          <span className="mt-0.5 shrink-0" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.clock(15)}</span>
          <span><strong>Cancellation.</strong> {policy.cancellationNote}</span>
        </div>
      ) : null}
    </div>
  );
};

const Inclusions: React.FC<{ inclusions?: any[] }> = ({ inclusions }) => {
  const enabled = (inclusions || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <div className="tp-card p-6 md:p-8">
      <h2 className="tp-h3 mb-5">Included</h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-6">
        {enabled.map((item, index) => {
          const { label, icon } = getInclusionMeta(item);
          return <div key={item?.key || index} className="flex flex-col items-center gap-2 text-center"><span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{icon}</span><span className="tp-muted text-[11px] font-bold uppercase tracking-wider">{label}</span></div>;
        })}
      </div>
    </div>
  );
};

/** Links to the business's other services, so a guest on the hostel page can still find the café. */
const OtherServices: React.FC<{ current: Service }> = ({ current }) => {
  const { services, c } = useTpl();
  const others = services.filter((s) => s.key !== current.key);
  if (!others.length) return null;
  return (
    <section className="tp-wrap pb-10 pt-6">
      <SectionHead eyebrow={c("services.other.eyebrow", "Also from us")} title={c("services.other.title", "More to explore")} />
      <ServiceCards services={others} />
    </section>
  );
};

/* ───────────────────────── service page ───────────────────────── */

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, openLead, c } = useTpl();
  const { search } = useLocation();
  const fromUrl = useStayParams();
  const stay = isStayKind(service);
  const [dates, setDates] = useState<StayParams>(fromUrl);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<Sort>("recommended");
  const page = service.page || {};

  useEffect(() => {
    const q = new URLSearchParams(search);
    setDates({ checkIn: q.get("in") || "", checkOut: q.get("out") || "", guests: q.get("guests") || "" });
  }, [search]);

  const facets = useMemo(() => buildFacets(service), [service]);
  const filtered = useMemo(() => {
    let list = service.items.filter((item) =>
      facets.every((facet) => {
        const chosen = selected[facet.label] || [];
        return !chosen.length || facet.options.some((o) => chosen.includes(o.label) && o.test(item));
      }),
    );
    if (sort === "price-asc") list = [...list].sort((a, b) => priceValue(a) - priceValue(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => (priceValue(b) === Infinity ? -1 : priceValue(b)) - (priceValue(a) === Infinity ? -1 : priceValue(a)));
    return list;
  }, [service.items, facets, selected, sort]);

  const toggle = (group: string, option: string) =>
    setSelected((prev) => {
      const current = prev[group] || [];
      return { ...prev, [group]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option] };
    });
  const dirty = Object.values(selected).some((list) => list.length) || sort !== "recommended";
  const clear = () => { setSelected({}); setSort("recommended"); };

  const sidebar = (
    <Sidebar service={service} stay={stay} dates={dates} setDates={setDates} facets={facets} selected={selected} toggle={toggle} sort={sort} setSort={setSort} clear={clear} dirty={dirty} />
  );
  const hasSidebar = stay || facets.length > 0 || service.items.length > 2;

  return (
    <>
      <WfBanner
        eyebrow={service.profile.labels.listing}
        title={service.heroHeading}
        sub={service.heroSubHeading}
        image={service.heroImage}
        crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: service.name }]}
      />
      <section className={`tp-wrap grid gap-8 py-8 md:py-12 ${hasSidebar ? "lg:grid-cols-[264px_1fr]" : ""}`}>
        {hasSidebar ? (
          <aside>
            <details className="tp-card p-4 lg:hidden">
              <summary className="cursor-pointer text-[14px] font-bold">Filters{stay ? " & dates" : ""}</summary>
              <div className="mt-4">{sidebar}</div>
            </details>
            <div className="hidden lg:sticky lg:top-24 lg:block">{sidebar}</div>
          </aside>
        ) : null}
        <div>
          <p className="tp-muted mb-4 text-[14px]" aria-live="polite">
            <strong style={{ color: "var(--t-text)" }}>{filtered.length}</strong> {filtered.length === 1 ? service.profile.labels.item : service.profile.labels.items}
            {stay && dates.checkIn && dates.checkOut ? " · totals shown for your dates" : ""}
          </p>
          {!service.items.length ? (
            <p className="tp-muted py-16 text-center text-[16px]">We're getting this ready — check back soon.</p>
          ) : (
            <motion.div layout className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, index) => <StayCard key={item.key} item={item} service={service} index={index} dates={stay || service.kind === "coLiving" ? dates : undefined} />)}
              </AnimatePresence>
            </motion.div>
          )}
          {service.items.length && !filtered.length ? (
            <div className="py-14 text-center">
              <p className="tp-h3">Nothing matches those filters</p>
              <button type="button" className="tp-btn tp-btn-ghost mt-4" onClick={clear}>Clear filters</button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="tp-wrap flex flex-col gap-6 pb-6">
        {stay || service.kind === "coLiving" ? <PolicyPanel kind={service.kind} /> : null}
        {page.inclusionsEnabled !== false ? <Inclusions inclusions={page.inclusions} /> : null}
        {service.leadEnabled ? (
          <div className="tp-accent-panel flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
            <div>
              <h2 className="tp-h3" style={{ color: "inherit" }}>{c("services.cta.title", "Can't find the right fit?")}</h2>
              <p className="mt-1 text-[15px] opacity-90">{c("services.cta.sub", "Tell us what you need and we'll help.")}</p>
            </div>
            <button type="button" className="tp-btn tp-btn-light" onClick={() => openLead(service)}>{service.profile.labels.cta}</button>
          </div>
        ) : null}
      </div>
      <OtherServices current={service} />
      {page.faqEnabled !== false ? <FaqSection faqs={page.faqs} /> : null}
    </>
  );
};

/** Body text that keeps a long description tidy: collapses past ~7 lines behind "Read more". */
const Prose: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const long = text.length > 480;
  return (
    <>
      <p
        className="tp-lead whitespace-pre-line"
        style={long && !open ? { display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </p>
      {long ? (
        <button type="button" className="tp-link mt-3" onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Read more"}
        </button>
      ) : null}
    </>
  );
};

/* ───────────────────────── item detail ───────────────────────── */

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService, goToItem, c } = useTpl();
  const params = useStayParams();
  const [viewer, setViewer] = useState<number | null>(null);
  const stay = isStayKind(service);
  const priceLine = priceWithUnit(item.price, item.priceUnit);

  // The hook resets the lead form when an item opens and then sets the selected product;
  // fill the searched dates in once that has happened.
  useEffect(() => {
    if (!t.selectedLeadProduct || !(params.checkIn || params.checkOut || params.guests)) return;
    t.setLeadForm((prev: any) => ({
      ...prev,
      startDate: prev.startDate || params.checkIn,
      endDate: prev.endDate || params.checkOut,
      people: prev.people || params.guests,
    }));
  }, [t.selectedLeadProduct]);

  const related = service.items.filter((o) => o.key !== item.key && (item.category ? o.category === item.category : true)).slice(0, 3);
  const facts: [string, string][] = [];
  if (item.raw?.deposit) facts.push(["Security deposit", String(item.raw.deposit)]);
  if (item.raw?.duration) facts.push(["Duration", String(item.raw.duration)]);
  if (item.raw?.inclusions?.length) facts.push(["Includes", item.raw.inclusions.join(", ")]);

  return (
    <div className="pt-[68px]">
      <div className="tp-wrap pt-6">
        <nav aria-label="Breadcrumb" className="tp-muted mb-4 flex flex-wrap items-center gap-2 text-[13px]">
          <button type="button" className="hover:underline" onClick={() => t.goToSection("home")}>Home</button><span aria-hidden="true">/</span>
          <button type="button" className="hover:underline" onClick={() => goToService(service)}>{service.name}</button><span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: "var(--t-text)" }}>{item.title}</span>
        </nav>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tp-h1" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{item.title}</h1>
              <DietMark diet={item.dietary} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.badge ? <span className="tp-chip" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{item.badge}</span> : null}
              <Spice level={item.spiceLevel} />
              {item.chips.map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
            </div>
          </div>
        </div>
        {item.images.length ? (
          <Reveal><Mosaic images={item.images} onOpen={setViewer} alt={item.title} /></Reveal>
        ) : (
          <div className="tp-soft flex h-64 items-center justify-center overflow-hidden"><Placeholder text={item.title} /></div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          <div className="flex flex-col gap-8">
            {item.description || item.features.length ? (
              <Reveal>
                <div className="tp-card p-6 md:p-9">
                  {item.description ? (
                    <>
                      <h2 className="tp-h3 mb-4">About this {service.profile.labels.item}</h2>
                      <Prose text={item.description} />
                    </>
                  ) : null}
                  {item.features.length ? (
                    <div className={item.description ? "mt-8 border-t pt-7" : ""} style={{ borderColor: "var(--t-line)" }}>
                      <h3 className="mb-4 text-[16px]">Highlights</h3>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {item.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-3 text-[15px]">
                            <span className="wf-fact-icon !h-8 !w-8">{Icon.check(16)}</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Reveal>
            ) : null}
            {facts.length ? (
              <Reveal>
                <dl className="tp-card divide-y" style={{ borderColor: "var(--t-line)" }}>
                  {facts.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 px-5 py-3.5 text-[14px]" style={{ borderColor: "var(--t-line)" }}><dt className="tp-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>
                  ))}
                </dl>
              </Reveal>
            ) : null}
            {stay || service.kind === "coLiving" ? <PolicyPanel compact kind={service.kind} /> : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {service.leadEnabled ? (
              <Reveal>
                <div className="tp-card p-6" style={{ boxShadow: "0 24px 50px -30px color-mix(in srgb, var(--t-text) 50%, transparent)" }}>
                  {priceLine ? (
                    <div className="mb-5 border-b pb-5" style={{ borderColor: "var(--t-line)" }}>
                      {stay ? <p className="tp-muted text-[11px] font-semibold uppercase tracking-wider">From</p> : null}
                      <p className="tp-display text-[30px]">{priceLine}</p>
                    </div>
                  ) : null}
                  <h2 className="tp-h3 mb-4">{service.profile.labels.leadTitle}</h2>
                  <LeadFormPanel service={service} item={item} />
                </div>
              </Reveal>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <div className="mt-16">
            <SectionHead title={c("services.related.title", service.kind === "menu" ? "You might also like" : `More ${service.profile.labels.items}`)} />
            <div className="flex flex-col gap-4">
              {related.map((other, index) => <StayCard key={other.key} item={other} service={service} index={index} />)}
            </div>
          </div>
        ) : null}
      </div>
      <OtherServices current={service} />
      <PhotoViewer images={item.images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
      <div className="h-16" />
    </div>
  );
};

/* ───────────────────────── services index ───────────────────────── */

export const ServicesIndex: React.FC = () => {
  const { services, draft, t, goToService, c } = useTpl();
  if (!services.length) {
    return (
      <>
        <WfBanner title="Services" sub="We're putting the finishing touches on this page." />
        <div className="h-24" />
      </>
    );
  }
  if (services.length === 1) return <ServicePage service={services[0]} />;
  return (
    <>
      <WfBanner eyebrow={c("services.index.eyebrow", "What we offer")} title={draft?.productTitle || "Our services"} sub={c("services.index.sub", "Pick where you'd like to start.")} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Services" }]} />
      <section className="tp-wrap flex flex-col gap-4 py-10">
        {services.map((service, index) => (
          <Reveal key={service.key} delay={index * 0.06}>
            <button type="button" onClick={() => goToService(service)} className="tp-card tp-card-hover grid w-full overflow-hidden text-left md:grid-cols-[340px_1fr_auto]">
              <div className="tp-zoom tp-fill aspect-[16/9] md:aspect-auto md:h-[190px]">
                {service.cardImage ? <img src={service.cardImage} alt={service.heading} loading="lazy" /> : <Placeholder text={service.heading} />}
              </div>
              <div className="flex flex-col justify-center gap-2 p-6">
                <p className="tp-eyebrow">{service.profile.labels.tag}</p>
                <h2 className="tp-h3">{service.heading}</h2>
                {service.subText ? <p className="tp-muted text-[14px]">{service.subText}</p> : null}
                <p className="tp-muted text-[13px]">{service.items.length} {service.items.length === 1 ? service.profile.labels.item : service.profile.labels.items}</p>
              </div>
              <div className="flex items-center p-6 md:pr-8"><span className="tp-btn tp-btn-primary tp-btn-sm">View {Icon.arrow(14)}</span></div>
            </button>
          </Reveal>
        ))}
      </section>
    </>
  );
};
