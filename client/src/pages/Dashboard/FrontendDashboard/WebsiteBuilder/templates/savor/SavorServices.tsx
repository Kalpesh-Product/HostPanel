import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, Reveal, Stagger, motion } from "../motion";
import { groupByCategory, priceValue, uniqueCategories, type Service, type ServiceItem } from "../serviceAdapter";
import { priceWithUnit } from "../templateKit";
import { InclusionsStrip } from "./SavorHome";
import { LeadFormPanel } from "./SavorLead";
import { DietMark, Icon, ItemCard, Placeholder, SectionHead, Spice, TileGrid } from "./SavorUI";
import { useSavor } from "./SavorContext";
import { FaqSection } from "../shared/TplParts";

export { FaqSection };

/* ───────────────────────── page header ───────────────────────── */

const PageHero: React.FC<{ title: string; sub?: string; eyebrow?: string; image?: string; children?: React.ReactNode }> = ({
  title,
  sub,
  eyebrow,
  image,
  children,
}) => (
  <section className="px-3 pt-24 md:px-6 md:pt-28">
    <div className="tp-wrap !max-w-[1320px] !px-0">
      <div className="relative overflow-hidden" style={{ borderRadius: 40, background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
        {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /> : null}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--t-ink) 85%, transparent), transparent)" }} />
        <div className="relative px-6 py-14 md:px-14 md:py-20">
          {eyebrow ? <Reveal y={10}><p className="tp-eyebrow mb-3" style={{ color: "var(--t-accent-light, var(--t-accent))" }}>{eyebrow}</p></Reveal> : null}
          <Reveal delay={0.06}><h1 className="tp-h1" style={{ fontSize: "clamp(38px, 6vw, 72px)" }}>{title}</h1></Reveal>
          {sub ? <Reveal delay={0.12}><p className="mt-4 max-w-xl text-[17px] leading-relaxed opacity-85">{sub}</p></Reveal> : null}
          {children ? <Reveal delay={0.18} className="mt-7">{children}</Reveal> : null}
        </div>
      </div>
    </div>
  </section>
);

/* ───────────────────────── menu page ───────────────────────── */

type Diet = "all" | "veg" | "non-veg";
type Sort = "recommended" | "price-asc" | "price-desc" | "name";

const MenuPage: React.FC<{ service: Service }> = ({ service }) => {
  const location = useLocation();
  const initialCat = new URLSearchParams(location.search).get("cat") || "";
  const [category, setCategory] = useState(initialCat);
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState<Diet>("all");
  const [sort, setSort] = useState<Sort>("recommended");

  useEffect(() => {
    setCategory(new URLSearchParams(location.search).get("cat") || "");
  }, [location.search]);

  const categories = useMemo(() => uniqueCategories(service.items), [service.items]);
  const hasDiet = service.items.some((item) => item.dietary);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = service.items.filter((item) => {
      if (category && item.category !== category) return false;
      if (diet === "veg" && !(item.dietary === "veg" || item.dietary === "vegan")) return false;
      if (diet === "non-veg" && item.dietary !== "non-veg" && item.dietary !== "egg") return false;
      if (q && !`${item.title} ${item.description} ${item.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => priceValue(a) - priceValue(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => (priceValue(b) === Infinity ? -1 : priceValue(b)) - (priceValue(a) === Infinity ? -1 : priceValue(a)));
    if (sort === "name") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [service.items, category, diet, query, sort]);

  const filtering = Boolean(category || query || diet !== "all" || sort !== "recommended");
  const grouped = !filtering && categories.length > 1;
  const clear = () => {
    setCategory("");
    setQuery("");
    setDiet("all");
    setSort("recommended");
  };

  return (
    <section className="pb-6">
      <div className="sticky top-[76px] z-30 py-3 md:top-[84px]" style={{ background: "color-mix(in srgb, var(--t-bg) 92%, transparent)", backdropFilter: "blur(10px)" }}>
        <div className="tp-wrap flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 tp-muted">{Icon.search()}</span>
              <input className="tp-input !pl-11" placeholder={`Search the ${service.profile.labels.listing.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
            </div>
            {hasDiet ? (
              <div className="flex gap-2" role="group" aria-label="Dietary filter">
                {([["all", "All"], ["veg", "Veg"], ["non-veg", "Non-veg"]] as [Diet, string][]).map(([value, label]) => (
                  <button key={value} type="button" className="tp-tab" aria-pressed={diet === value} onClick={() => setDiet(value)}>{label}</button>
                ))}
              </div>
            ) : null}
            <select className="tp-input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">A – Z</option>
            </select>
          </div>
          {categories.length > 1 ? (
            <div className="tp-scroll-x !pb-1" role="group" aria-label="Categories">
              <button type="button" className="tp-tab" aria-pressed={!category} onClick={() => setCategory("")}>All</button>
              {categories.map((name) => (
                <button key={name} type="button" className="tp-tab" aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="tp-wrap pt-8">
        {!service.items.length ? (
          <p className="tp-muted py-16 text-center text-[16px]">The menu is being prepared — check back soon.</p>
        ) : grouped ? (
          groupByCategory(service.items).map((group) => (
            <div key={group.category || "other"} className="mb-14">
              {group.category ? (
                <Reveal><h2 className="tp-h3 mb-6 flex items-center gap-4">{group.category}<span className="h-px flex-1" style={{ background: "var(--t-line)" }} /></h2></Reveal>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item, index) => <ItemCard key={item.key} item={item} service={service} index={index} />)}
              </div>
            </div>
          ))
        ) : (
          <>
            <p className="tp-muted mb-5 text-[13px]" aria-live="polite">{filtered.length} {filtered.length === 1 ? service.profile.labels.item : service.profile.labels.items}</p>
            <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, index) => <ItemCard key={item.key} item={item} service={service} index={index} />)}
              </AnimatePresence>
            </motion.div>
            {!filtered.length ? (
              <div className="py-16 text-center">
                <p className="tp-h3">Nothing matches that</p>
                <button type="button" className="tp-btn tp-btn-ghost mt-5" onClick={clear}>Clear filters</button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
};

/* ───────────────────────── card grid (rooms, dorms, packages, services) ───────────────────────── */

const OffersPage: React.FC<{ service: Service }> = ({ service }) => {
  const [active, setActive] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("recommended");

  // Filter chips come from what the items actually have, so there's nothing to configure.
  const chipOptions = useMemo(() => {
    const counts = new Map<string, number>();
    service.items.forEach((item) => item.chips.forEach((chip) => counts.set(chip, (counts.get(chip) || 0) + 1)));
    // Counts and dates ("6 beds", "Min 3 months", "Available Nov 1") describe one item, so they
    // make poor filters; keep the descriptive tags.
    const measure = /^(\d+ (beds|nights)|Min \d+|Available |Up to \d+|Per person$)/;
    return Array.from(counts.entries())
      .filter(([chip, count]) => count < service.items.length && !measure.test(chip))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([chip]) => chip);
  }, [service.items]);

  const filtered = useMemo(() => {
    let list = service.items.filter((item) => active.every((chip) => item.chips.includes(chip)));
    if (sort === "price-asc") list = [...list].sort((a, b) => priceValue(a) - priceValue(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => (priceValue(b) === Infinity ? -1 : priceValue(b)) - (priceValue(a) === Infinity ? -1 : priceValue(a)));
    return list;
  }, [service.items, active, sort]);

  const toggle = (chip: string) => setActive((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));

  return (
    <section className="tp-wrap pt-10 pb-6">
      {service.items.length > 2 ? (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {chipOptions.map((chip) => (
            <button key={chip} type="button" className="tp-tab" aria-pressed={active.includes(chip)} onClick={() => toggle(chip)}>{chip}</button>
          ))}
          <select className="tp-input !ml-auto !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      ) : null}
      {!service.items.length ? (
        <p className="tp-muted py-16 text-center text-[16px]">We're getting this ready — check back soon.</p>
      ) : (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, index) => <ItemCard key={item.key} item={item} service={service} index={index} />)}
          </AnimatePresence>
        </motion.div>
      )}
      {service.items.length && !filtered.length ? (
        <div className="py-16 text-center">
          <p className="tp-h3">No match for those filters</p>
          <button type="button" className="tp-btn tp-btn-ghost mt-5" onClick={() => setActive([])}>Clear filters</button>
        </div>
      ) : null}
    </section>
  );
};

/* ───────────────────────── policies + inline booking ───────────────────────── */

const PolicyBlock: React.FC = () => {
  const { draft } = useSavor();
  const policy = draft?.stayPolicy || {};
  const rules: string[] = policy.houseRules || [];
  const facts = [
    policy.checkInTime && ["Check-in", policy.checkInTime],
    policy.checkOutTime && ["Check-out", policy.checkOutTime],
    policy.minStayNights && ["Minimum stay", `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}`],
  ].filter(Boolean) as [string, string][];
  if (!facts.length && !rules.length && !policy.cancellationNote) return null;
  return (
    <section className="tp-wrap pt-6 pb-4">
      <Reveal>
        <div className="tp-soft grid gap-8 p-7 md:grid-cols-[1fr_1.3fr] md:p-10">
          <div>
            <p className="tp-eyebrow mb-3">Before you book</p>
            <h2 className="tp-h3">Stay policy</h2>
            {facts.length ? (
              <dl className="mt-5 space-y-3">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b pb-3" style={{ borderColor: "var(--t-line)" }}>
                    <dt className="tp-muted text-[14px]">{label}</dt>
                    <dd className="text-[14px] font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {policy.cancellationNote ? <p className="tp-muted mt-4 text-[14px]">{policy.cancellationNote}</p> : null}
          </div>
          {rules.length ? (
            <ul className="grid content-start gap-3 sm:grid-cols-2">
              {rules.map((rule) => (
                <li key={rule} className="flex items-start gap-3 text-[15px]">
                  <span className="mt-0.5 shrink-0" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.check()}</span>
                  {rule}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
};

const InlineBooking: React.FC<{ service: Service }> = ({ service }) => {
  if (!service.leadEnabled) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 40 }}>
      <div className="tp-wrap">
        <Reveal>
          <div className="tp-card grid gap-8 p-6 md:grid-cols-[0.8fr_1.2fr] md:gap-14 md:p-12" style={{ borderRadius: 36 }}>
            <div>
              <p className="tp-eyebrow mb-3">{service.name}</p>
              <h2 className="tp-h2" style={{ fontSize: "clamp(30px, 4vw, 46px)" }}>{service.profile.labels.leadTitle}</h2>
              <p className="tp-muted mt-4 text-[16px] leading-relaxed">
                {service.kind === "menu" ? "Tell us when you're coming and how many — we'll take it from there." : "Share a few details and our team will get back to you quickly."}
              </p>
            </div>
            <LeadFormPanel service={service} />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/** Links to the business's other services, so a guest on one page can still find the rest. */
const MoreFromUs: React.FC<{ current: Service }> = ({ current }) => {
  const { services } = useSavor();
  const others = services.filter((s) => s.key !== current.key);
  if (!others.length) return null;
  return (
    <section className="tp-section" style={{ paddingTop: 24 }}>
      <div className="tp-wrap">
        <SectionHead eyebrow="More from us" title="Also here" />
        <TileGrid services={others} cols={3} />
      </div>
    </section>
  );
};

/* ───────────────────────── service page ───────────────────────── */

export const ServicePage: React.FC<{ service: Service }> = ({ service }) => {
  const { openLead } = useSavor();
  const page = service.page || {};
  const stay = service.kind === "hostel" || service.kind === "coLiving";
  return (
    <>
      <PageHero
        eyebrow={service.profile.labels.listing}
        title={service.heroHeading}
        sub={service.heroSubHeading}
        image={service.heroImage}
      >
        {service.leadEnabled ? (
          <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(service)}>
            {page.heroButtonText || service.profile.labels.cta} {Icon.arrow()}
          </button>
        ) : null}
      </PageHero>
      {service.profile.presenter === "menu" ? <MenuPage service={service} /> : <OffersPage service={service} />}
      {stay ? <PolicyBlock /> : null}
      {page.inclusionsEnabled !== false ? <InclusionsStrip inclusions={page.inclusions} /> : null}
      <InlineBooking service={service} />
      <MoreFromUs current={service} />
      {page.faqEnabled !== false ? <FaqSection faqs={page.faqs} /> : null}
    </>
  );
};

/* ───────────────────────── item detail ───────────────────────── */

export const ItemDetail: React.FC<{ service: Service; item: ServiceItem }> = ({ service, item }) => {
  const { goToService, goToItem } = useSavor();
  const [shot, setShot] = useState(0);
  useEffect(() => setShot(0), [item.key]);
  const images = item.images.length ? item.images : [];
  const priceLine = priceWithUnit(item.price, item.priceUnit);
  const related = service.items.filter((other) => other.key !== item.key && (item.category ? other.category === item.category : true)).slice(0, 3);
  const facts: [string, string][] = [];
  if (item.raw?.deposit) facts.push(["Security deposit", String(item.raw.deposit)]);
  if (item.raw?.duration) facts.push(["Duration", String(item.raw.duration)]);
  if (item.raw?.inclusions?.length) facts.push(["Includes", item.raw.inclusions.join(", ")]);

  return (
    <div className="pt-24 md:pt-32">
      <div className="tp-wrap">
        <button type="button" className="tp-link mb-6" onClick={() => goToService(service)}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>{Icon.arrow()}</span> {service.name}
        </button>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <Reveal y={20}>
              <div className="relative aspect-[4/3] overflow-hidden" style={{ borderRadius: 36 }}>
                <AnimatePresence mode="wait">
                  {images[shot] ? (
                    <motion.img key={images[shot]} src={images[shot]} alt={item.title} className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
                  ) : (
                    <div className="absolute inset-0"><Placeholder text={item.title} /></div>
                  )}
                </AnimatePresence>
                {item.badge ? <span className="tp-chip absolute left-4 top-4" style={{ background: "var(--t-accent)", color: "var(--t-accent-text,#fff)" }}>{item.badge}</span> : null}
              </div>
            </Reveal>
            {images.length > 1 ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {images.map((src, index) => (
                  <button key={src} type="button" onClick={() => setShot(index)} aria-label={`Photo ${index + 1}`} className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 transition" style={{ borderColor: index === shot ? "var(--t-accent)" : "transparent", opacity: index === shot ? 1 : 0.7 }}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <Reveal className="mt-8">
              <div className="flex items-start justify-between gap-4">
                <h1 className="tp-h1" style={{ fontSize: "clamp(32px, 4.4vw, 54px)" }}>{item.title}</h1>
                <DietMark diet={item.dietary} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Spice level={item.spiceLevel} />
                {item.chips.map((chip) => <span key={chip} className="tp-chip">{chip}</span>)}
              </div>
              {priceLine ? <p className="tp-display mt-5 text-[30px]" style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{priceLine}</p> : null}
              {item.description ? <p className="tp-lead mt-5 whitespace-pre-line">{item.description}</p> : null}
              {item.features.length ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[15px]">
                      <span style={{ color: "var(--t-accent-fg, var(--t-accent))" }}>{Icon.check()}</span>{feature}
                    </li>
                  ))}
                </ul>
              ) : null}
              {facts.length ? (
                <dl className="mt-6 space-y-2">
                  {facts.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b py-2 text-[14px]" style={{ borderColor: "var(--t-line)" }}>
                      <dt className="tp-muted">{label}</dt><dd className="font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            {service.leadEnabled ? (
              <Reveal>
                <div className="tp-card p-6 md:p-8" style={{ borderRadius: 32 }}>
                  <h2 className="tp-h3 mb-1">{service.profile.labels.leadTitle}</h2>
                  <p className="tp-muted mb-5 text-[14px]">{item.title}</p>
                  <LeadFormPanel service={service} item={item} />
                </div>
              </Reveal>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <div className="mt-20">
            <SectionHead title={service.kind === "menu" ? "You might also like" : `More ${service.profile.labels.items}`} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other, index) => <ItemCard key={other.key} item={other} service={service} index={index} />)}
            </div>
          </div>
        ) : null}
      </div>
      {service.kind === "hostel" || service.kind === "coLiving" ? <PolicyBlock /> : null}
      <MoreFromUs current={service} />
      <div className="h-16" />
    </div>
  );
};

/* ───────────────────────── services index ───────────────────────── */

export const ServicesIndex: React.FC = () => {
  const { services, draft } = useSavor();
  if (!services.length) {
    return (
      <>
        <PageHero title="Services" sub="We're putting the finishing touches on this page." />
        <div className="h-24" />
      </>
    );
  }
  if (services.length === 1) return <ServicePage service={services[0]} />;
  return (
    <>
      <PageHero eyebrow="What we do" title={draft?.productTitle || "Our services"} sub="Pick where you'd like to start." />
      <section className="tp-section" style={{ paddingTop: 48 }}>
        <div className="tp-wrap">
          <TileGrid services={services} cols={2} />
        </div>
      </section>
    </>
  );
};
