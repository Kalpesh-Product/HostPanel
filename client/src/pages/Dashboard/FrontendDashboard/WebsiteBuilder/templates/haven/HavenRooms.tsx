import React, { useMemo, useState } from "react";
import { Reveal, Stagger } from "../motion";
import { formatTime12h } from "../leadForms";
import { priceValue, uniqueCategories, type Service, type ServiceItem } from "../serviceAdapter";
import { getInclusionMeta } from "../inclusionIcons";
import { LeadFormPanel } from "../shared/TplLead";
import { FaqSection, PhotoViewer } from "../shared/TplParts";
import { useTpl } from "../shared/TplContext";
import { DietMark, Icon, Placeholder, SectionHead, Spice } from "../shared/TplUI";
import { CardRow, PageHeader, Price, RoomCard, ServiceCards, SpecRow, specsFor } from "./HavenUI";

/* ───────────────────────── tabs, sorting ───────────────────────── */

type Sort = "recommended" | "price-asc" | "price-desc";
type View = "cards" | "compare";
interface Tab { label: string; test: (item: ServiceItem) => boolean }

const CHIP_TABS: Partial<Record<Service["kind"], string[]>> = {
  coLiving: ["Single", "Double sharing", "Triple sharing"],
  hostel: ["Shared dorm", "Private room"],
};

/** Tabs come from the items' own data: categories if there are several, else the kind's main split. */
const buildTabs = (service: Service): Tab[] => {
  const items = service.items;
  const categories = uniqueCategories(items);
  if (categories.length > 1) return categories.map((c) => ({ label: c, test: (item) => item.category === c }));
  const chips = CHIP_TABS[service.kind] || [];
  return chips
    .filter((chip) => {
      const n = items.filter((item) => item.chips.includes(chip)).length;
      return n > 0 && n < items.length;
    })
    .map((chip) => ({ label: chip, test: (item) => item.chips.includes(chip) }));
};

const canCompare = (service: Service) => service.items.length >= 2 && service.kind !== "menu" && service.kind !== "workspace";

/* ───────────────────────── compare table ───────────────────────── */

const CompareTable: React.FC<{ service: Service; items: ServiceItem[] }> = ({ service, items }) => {
  const { goToItem, openLead } = useTpl();
  const specMaps = items.map((item) => specsFor(service, item));
  const labels: string[] = [];
  specMaps.forEach((specs) => specs.forEach((spec) => { if (!labels.includes(spec.label)) labels.push(spec.label); }));
  const sticky: React.CSSProperties = { position: "sticky", left: 0, background: "var(--t-raised)", zIndex: 1 };

  return (
    <div className="tp-card overflow-x-auto" style={{ borderRadius: 28 }}>
      <table className="hv-table" style={{ minWidth: 150 + items.length * 210 }}>
        <thead>
          <tr>
            <th style={{ ...sticky, background: "var(--t-surface)", width: 150 }} />
            {items.map((item) => (
              <th key={item.key}>
                <button type="button" className="flex items-center gap-3 text-left" onClick={() => goToItem(service, item)}>
                  <span className="tp-fill h-11 w-11 shrink-0 rounded-full">{item.image ? <img src={item.image} alt="" /> : <Placeholder text={item.title} />}</span>
                  <span className="tp-display text-[17px] leading-tight">{item.title}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" style={sticky}>Price</th>
            {items.map((item) => <td key={item.key}><Price item={item} size={22} align="left" /></td>)}
          </tr>
          {labels.map((label) => (
            <tr key={label}>
              <th scope="row" style={sticky}>{label}</th>
              {items.map((item, i) => {
                const value = specMaps[i].find((spec) => spec.label === label)?.value;
                return <td key={item.key} className={value ? "font-semibold" : "tp-muted"}>{value || "—"}</td>;
              })}
            </tr>
          ))}
          {service.leadEnabled ? (
            <tr>
              <th style={{ ...sticky, borderBottom: 0 }} />
              {items.map((item) => (
                <td key={item.key} style={{ borderBottom: 0 }}>
                  <button type="button" className="tp-btn tp-btn-primary tp-btn-sm" onClick={() => openLead(service, item)}>{service.profile.labels.itemCta}</button>
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};

/* ───────────────────────── house info, included ───────────────────────── */

export const HouseInfo: React.FC<{ kind?: string }> = ({ kind }) => {
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
    <Reveal>
      <div className={`tp-soft grid gap-8 p-7 md:p-10 ${rules.length ? "md:grid-cols-[0.75fr_1.25fr] md:gap-14" : ""}`} style={{ borderRadius: 32 }}>
        <div>
          <h2 className="tp-h3 mb-5">House rules & info</h2>
          {facts.length ? (
            <dl className="space-y-3">
              {facts.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b pb-3 text-[15px]" style={{ borderColor: "var(--t-line)" }}>
                  <dt className="tp-muted">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {policy.cancellationNote ? <p className="tp-muted mt-5 text-[14.5px] leading-relaxed"><strong style={{ color: "var(--t-text)" }}>Notice.</strong> {policy.cancellationNote}</p> : null}
        </div>
        {rules.length ? (
          <ul className="grid content-start gap-x-8 gap-y-4 sm:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-3 text-[15.5px] leading-snug">
                <span className="hv-spec-icon !h-7 !w-7">{Icon.check(14)}</span>
                {rule}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Reveal>
  );
};

const Included: React.FC<{ inclusions?: any[] }> = ({ inclusions }) => {
  const enabled = (inclusions || []).filter((item) => item?.enabled !== false);
  if (!enabled.length) return null;
  return (
    <div>
      <h2 className="tp-h3 mb-6">What's included</h2>
      <Stagger className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
        {enabled.map((item, index) => {
          const { label, icon } = getInclusionMeta(item);
          return <div key={item?.key || index} className="hv-spec"><span className="hv-spec-icon">{icon}</span><span className="text-[14.5px] font-semibold leading-snug">{label}</span></div>;
        })}
      </Stagger>
    </div>
  );
};

/** Links to the business's other services, so a resident on the rooms page can still find the café. */
const OtherServices: React.FC<{ current: Service }> = ({ current }) => {
  const { services } = useTpl();
  const others = services.filter((s) => s.key !== current.key);
  if (!others.length) return null;
  return (
    <section className="tp-wrap py-14">
      <SectionHead eyebrow="Also from us" title="More under one roof" />
      <ServiceCards services={others} />
    </section>
  );
};

/* ───────────────────────── service page ───────────────────────── */

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { t, openLead } = useTpl();
  const [tab, setTab] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [view, setView] = useState<View>("cards");
  const page = service.page || {};
  const stay = service.kind === "coLiving" || service.kind === "hostel" || service.kind === "workation";

  const tabs = useMemo(() => buildTabs(service), [service]);
  const compare = canCompare(service);
  const filtered = useMemo(() => {
    let list = tab ? service.items.filter((item) => tabs.find((x) => x.label === tab)?.test(item)) : service.items;
    if (sort === "price-asc") list = [...list].sort((a, b) => priceValue(a) - priceValue(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => (priceValue(b) === Infinity ? -1 : priceValue(b)) - (priceValue(a) === Infinity ? -1 : priceValue(a)));
    return list;
  }, [service.items, tabs, tab, sort]);

  return (
    <>
      <PageHeader eyebrow={service.profile.labels.listing} title={service.heroHeading} sub={service.heroSubHeading} image={service.heroImage} crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: service.name }]} />

      <section className="tp-wrap py-10 md:py-14">
        {service.items.length > 1 ? (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
              {tabs.length ? <button type="button" className="tp-tab" aria-pressed={tab === ""} onClick={() => setTab("")}>All</button> : null}
              {tabs.map((x) => <button key={x.label} type="button" className="tp-tab" aria-pressed={tab === x.label} onClick={() => setTab(tab === x.label ? "" : x.label)}>{x.label}</button>)}
              {!tabs.length ? <p className="tp-muted text-[15px]"><strong style={{ color: "var(--t-text)" }}>{filtered.length}</strong> {filtered.length === 1 ? service.profile.labels.item : service.profile.labels.items}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="hv-sort">Sort by</label>
              <select id="hv-sort" className="tp-input !w-auto !rounded-full !py-2.5 !pr-9 text-[14px] font-semibold" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
              {compare ? (
                <div className="flex gap-1.5" role="group" aria-label="View">
                  <button type="button" className="tp-tab" aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button>
                  <button type="button" className="tp-tab" aria-pressed={view === "compare"} onClick={() => setView("compare")}>Compare</button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!service.items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">We're getting this ready — check back soon.</p>
        ) : view === "compare" && compare ? (
          <CompareTable service={service} items={filtered} />
        ) : (
          <CardRow>
            {filtered.map((item, index) => <RoomCard key={item.key} item={item} service={service} index={index} />)}
          </CardRow>
        )}
        {service.items.length && !filtered.length ? (
          <div className="py-14 text-center">
            <p className="tp-h3">Nothing matches that filter</p>
            <button type="button" className="tp-btn tp-btn-ghost mt-4" onClick={() => setTab("")}>Show everything</button>
          </div>
        ) : null}
      </section>

      <div className="tp-wrap flex flex-col gap-10 pb-6 md:gap-14">
        {stay ? <HouseInfo kind={service.kind} /> : null}
        {page.inclusionsEnabled !== false ? <Included inclusions={page.inclusions} /> : null}
        {service.leadEnabled ? (
          <Reveal>
            <div className="tp-accent-panel flex flex-wrap items-center justify-between gap-5 p-7 md:p-10">
              <div>
                <h2 className="tp-h3" style={{ color: "inherit" }}>Not sure which one is right?</h2>
                <p className="mt-1.5 text-[15.5px] opacity-90">Tell us what you're after and we'll help you choose.</p>
              </div>
              <button type="button" className="tp-btn tp-btn-light" onClick={() => openLead(service)}>{service.profile.labels.cta}</button>
            </div>
          </Reveal>
        ) : null}
      </div>
      <OtherServices current={service} />
      {page.faqEnabled !== false ? <FaqSection faqs={page.faqs} /> : null}
    </>
  );
};

/* ───────────────────────── item detail ───────────────────────── */

/** Long descriptions collapse behind "Read more" past ~7 lines. */
const Prose: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const long = text.length > 480;
  return (
    <>
      <p className="tp-lead whitespace-pre-line" style={long && !open ? { display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>{text}</p>
      {long ? <button type="button" className="tp-link mt-3" onClick={() => setOpen((v) => !v)}>{open ? "Show less" : "Read more"}</button> : null}
    </>
  );
};

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { t, goToService } = useTpl();
  const [viewer, setViewer] = useState<number | null>(null);
  const specs = specsFor(service, item);
  const stay = service.kind === "coLiving" || service.kind === "hostel" || service.kind === "workation";
  const related = service.items.filter((o) => o.key !== item.key && (item.category ? o.category === item.category : true)).slice(0, 3);
  const includes: string[] = Array.isArray(item.raw?.inclusions) ? item.raw.inclusions : [];
  const chips = item.chips.filter((chip) => !chip.startsWith("Available"));

  return (
    <div className="pt-[100px] md:pt-[124px]">
      <div className="tp-wrap">
        <nav aria-label="Breadcrumb" className="tp-muted mb-5 flex flex-wrap items-center gap-2 text-[13.5px]">
          <button type="button" className="hover:underline" onClick={() => t.goToSection("home")}>Home</button><span aria-hidden="true">/</span>
          <button type="button" className="hover:underline" onClick={() => goToService(service)}>{service.name}</button><span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: "var(--t-text)" }}>{item.title}</span>
        </nav>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <h1 className="tp-h1" style={{ fontSize: "clamp(34px, 4.6vw, 58px)" }}>{item.title}</h1>
              <DietMark diet={item.dietary} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {item.badge ? <span className="tp-chip" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{item.badge}</span> : null}
              <Spice level={item.spiceLevel} />
              {chips.map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
            </div>
          </div>
        </div>
      </div>

      {item.images.length > 1 ? (
        <Reveal>
          <div className="hv-snap hv-bleed pb-2">
            {item.images.map((src, index) => (
              <button key={`${src}-${index}`} type="button" onClick={() => setViewer(index)} aria-label={`Open photo ${index + 1}`} className="tp-zoom h-[280px] w-[84vw] sm:h-[360px] sm:w-[62vw] md:h-[440px] md:w-[560px]" style={{ borderRadius: 32 }}>
                <img src={src} alt={index === 0 ? item.title : ""} />
              </button>
            ))}
          </div>
        </Reveal>
      ) : (
        <div className="tp-wrap">
          <Reveal>
            {item.image ? (
              <button type="button" onClick={() => setViewer(0)} aria-label="Open photo" className="tp-zoom block aspect-[16/8] w-full" style={{ borderRadius: 32 }}><img src={item.image} alt={item.title} /></button>
            ) : (
              <div className="tp-soft flex h-64 items-center justify-center overflow-hidden" style={{ borderRadius: 32 }}><Placeholder text={item.title} /></div>
            )}
          </Reveal>
        </div>
      )}

      <div className="tp-wrap mt-12 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <div className="flex flex-col gap-12">
          {specs.length ? (
            <Reveal>
              <h2 className="tp-h3 mb-6">At a glance</h2>
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{specs.map((spec) => <SpecRow key={spec.label} spec={spec} />)}</div>
            </Reveal>
          ) : null}
          {item.description ? (
            <Reveal>
              <div className={specs.length ? "hv-rule pt-10" : ""}>
                <h2 className="tp-h3 mb-5">About this {service.profile.labels.item}</h2>
                <Prose text={item.description} />
              </div>
            </Reveal>
          ) : null}
          {item.features.length || includes.length ? (
            <Reveal>
              <div className="hv-rule pt-10">
                <h2 className="tp-h3 mb-5">{includes.length && !item.features.length ? "What's included" : "Highlights"}</h2>
                <ul className="flex flex-wrap gap-2.5">
                  {[...item.features, ...includes].map((feature) => (
                    <li key={feature} className="tp-chip tp-chip-accent !px-4 !py-2 !text-[14px]">{Icon.check(14)} {feature}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ) : null}
          {stay ? <HouseInfo kind={service.kind} /> : null}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          {service.leadEnabled ? (
            <Reveal>
              <div className="tp-card p-6 md:p-8" style={{ boxShadow: "0 30px 60px -38px color-mix(in srgb, var(--t-text) 55%, transparent)" }}>
                <div className="mb-6 flex items-end justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--t-line)" }}>
                  <div><p className="tp-muted text-[12.5px] font-semibold">{stay ? "Starting from" : "Price"}</p></div>
                  <Price item={item} size={34} />
                </div>
                <h2 className="tp-h3 mb-5">{service.profile.labels.leadTitle}</h2>
                <LeadFormPanel service={service} item={item} />
              </div>
            </Reveal>
          ) : null}
        </aside>
      </div>

      {related.length ? (
        <section className="tp-wrap mt-20">
          <SectionHead title={service.kind === "menu" ? "You might also like" : `More ${service.profile.labels.items}`} />
          <CardRow>{related.map((other, index) => <RoomCard key={other.key} item={other} service={service} index={index} />)}</CardRow>
        </section>
      ) : null}
      <OtherServices current={service} />
      <PhotoViewer images={item.images} index={viewer} onClose={() => setViewer(null)} onChange={setViewer} />
    </div>
  );
};

/* ───────────────────────── services index ───────────────────────── */

export const ServicesIndex: React.FC = () => {
  const { services, draft, t, goToService } = useTpl();
  if (!services.length) {
    return (
      <>
        <PageHeader title="Services" sub="We're putting the finishing touches on this page." />
        <div className="h-24" />
      </>
    );
  }
  if (services.length === 1) return <ServicePage service={services[0]} />;
  return (
    <>
      <PageHeader eyebrow="What we offer" title={draft?.productTitle || "Our services"} sub="Pick where you'd like to start." crumbs={[{ label: "Home", onClick: () => t.goToSection("home") }, { label: "Services" }]} />
      <section className="tp-wrap flex flex-col gap-14 py-12 md:gap-20 md:py-16">
        {services.map((service, index) => (
          <Reveal key={service.key}>
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
              <button type="button" onClick={() => goToService(service)} aria-label={`Explore ${service.heading}`} className={`hv-arch tp-zoom block aspect-[5/4] w-full ${index % 2 ? "md:order-2" : ""}`}>
                {service.cardImage ? <img src={service.cardImage} alt="" loading="lazy" /> : <Placeholder text={service.heading} />}
              </button>
              <div>
                <p className="tp-eyebrow mb-4">{service.profile.labels.tag}</p>
                <h2 className="tp-h2">{service.heading}</h2>
                {service.subText ? <p className="tp-lead mt-4">{service.subText}</p> : null}
                <p className="tp-muted mt-3 text-[14.5px]">{service.items.length} {service.items.length === 1 ? service.profile.labels.item : service.profile.labels.items}</p>
                <button type="button" className="tp-btn tp-btn-primary mt-7" onClick={() => goToService(service)}>Explore {Icon.arrow(15)}</button>
              </div>
            </div>
          </Reveal>
        ))}
      </section>
    </>
  );
};
