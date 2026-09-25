import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { formatTime12h } from "../leadForms";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import { priceValue } from "../serviceAdapter";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

/** Cheapest priced item of the main service, for the sticky mobile bar. */
export const useFromPrice = () => {
  const { primary } = useTpl();
  if (!primary) return "";
  const priced = primary.items.filter((item) => priceValue(item) !== Infinity);
  if (!priced.length) return "";
  const cheapest = priced.reduce((best, item) => (priceValue(item) < priceValue(best) ? item : best));
  return priceWithUnit(cheapest.price, cheapest.priceUnit);
};

export const WayfarerHeader: React.FC<{ forceSolid?: boolean }> = ({ forceSolid }) => {
  const { t, draft, services, primary, profile, openLead } = useTpl();
  const scrolled = useScrolled(24);
  const solid = scrolled || Boolean(forceSolid) || t.mobileMenuOpen;
  const [servicesOpen, setServicesOpen] = useState(false);
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };

  useEffect(() => {
    document.body.style.overflow = t.mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [t.mobileMenuOpen]);

  const isActive = (item: any) =>
    t.currentSection === resolveSectionFromSlug(item.slug) || (t.currentSection === "home" && item.slug === "home");

  return (
    <>
      <header className="wf-header fixed inset-x-0 top-0 z-50" data-solid={solid}>
        <div className="tp-wrap flex h-[68px] items-center justify-between gap-6">
          <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex items-center text-left">
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[150px] object-contain" />
            ) : (
              <span className="tp-display text-[20px]">{draft?.companyName || "Home"}</span>
            )}
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {t.navItems.map((item: any) => {
              if (isProductsNavItem(item) && t.productsPageEnabled && services.length > 1) {
                return (
                  <div key={item.slug} className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                    <button type="button" className="wf-navlink inline-flex items-center gap-1" aria-expanded={servicesOpen} aria-current={t.currentSection === "products" ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                      {item.name} {Icon.chevron(12)}
                    </button>
                    <AnimatePresence>
                      {servicesOpen ? (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full w-60 pt-2">
                          <div className="tp-card p-1.5" style={{ color: "var(--t-text)" }}>
                            {services.map((service) => (
                              <button key={service.key} type="button" className="block w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--t-accent)_12%,transparent)]" onClick={() => { setServicesOpen(false); t.goToProductPage(service.slug); }}>
                                {service.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <button key={item.slug} type="button" className="wf-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`} className="hidden items-center gap-2 text-[14px] font-semibold opacity-90 xl:inline-flex">
                {Icon.phone(15)} {t.contactPhone}
              </a>
            ) : null}
            <button type="button" className="tp-btn tp-btn-primary tp-btn-sm hidden sm:inline-flex" onClick={cta}>
              {hasLead ? profile.labels.cta : "Contact us"}
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg lg:hidden" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }} aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
              {t.mobileMenuOpen ? Icon.close(20) : Icon.menu()}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {t.mobileMenuOpen ? (
          <>
            <motion.div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(8,10,12,.55)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => t.setMobileMenuOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col overflow-y-auto px-6 pb-8 pt-24 lg:hidden"
              style={{ background: "var(--t-bg)", color: "var(--t-text)" }}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Menu"
            >
              <nav className="flex flex-col">
                {t.navItems.map((item: any) => (
                  <div key={item.slug} className="border-b" style={{ borderColor: "var(--t-line)" }}>
                    <button type="button" className="tp-display w-full py-4 text-left text-[22px]" style={{ color: isActive(item) ? "var(--t-accent)" : undefined }} onClick={() => t.goToSection(item.slug)}>
                      {item.name}
                    </button>
                    {isProductsNavItem(item) && t.productsPageEnabled && services.length > 1 ? (
                      <ul className="mb-4 ml-1 space-y-1 border-l pl-4" style={{ borderColor: "var(--t-line)" }}>
                        {services.map((service) => (
                          <li key={service.key}>
                            <button type="button" className="tp-muted w-full py-2 text-left text-[16px] font-semibold" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </nav>
              <button type="button" className="tp-btn tp-btn-primary mt-8 w-full" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};

/** Sticks to the bottom on phones so booking is always one tap away. */
export const StickyBookBar: React.FC = () => {
  const { t, primary, profile, openLead } = useTpl();
  const from = useFromPrice();
  if (!primary?.leadEnabled || t.currentSection === "contact" || t.mobileMenuOpen) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-4 py-3 lg:hidden" style={{ background: "var(--t-raised)", borderColor: "var(--t-line)", boxShadow: "0 -10px 30px -18px rgba(0,0,0,.4)" }}>
      <div className="min-w-0">
        {from ? <p className="tp-muted text-[11px] font-semibold uppercase tracking-wider">From</p> : null}
        <p className="tp-display truncate text-[18px]">{from || primary.name}</p>
      </div>
      <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{profile.labels.itemCta}</button>
    </div>
  );
};

export const WayfarerFooter: React.FC = () => {
  const { t, draft, services } = useTpl();
  const policy = draft?.stayPolicy || {};
  const hours = groupOpeningHours(draft?.openingHours);
  // Several services get their own column (so the footer stays short); "Services" itself then
  // leaves the Explore list and becomes that column's heading.
  const showServices = services.length > 1 && t.productsPageEnabled;
  const links = (t.navItems || []).filter((item: any) => (isProductsNavItem(item) ? t.productsPageEnabled && !showServices : true));
  const stayFacts: [string, string][] = [
    policy.checkInTime && ["Check-in", formatTime12h(policy.checkInTime)],
    policy.checkOutTime && ["Check-out", formatTime12h(policy.checkOutTime)],
    policy.minStayNights && ["Minimum stay", `${policy.minStayNights} night${policy.minStayNights > 1 ? "s" : ""}`],
  ].filter(Boolean) as [string, string][];

  return (
    <footer className="mt-16 pb-16 lg:pb-0" style={{ background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
      <div className={`tp-wrap grid gap-10 py-14 ${showServices ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_0.8fr_0.9fr_1fr_1fr]" : "md:grid-cols-[1.4fr_1fr_1fr_1.2fr]"}`}>
        <div>
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <p className="tp-display text-[24px]">{t.footerCompanyName || draft?.companyName}</p>
          )}
          {t.footerAddress ? <p className="mt-4 max-w-xs text-[14px] leading-relaxed opacity-70">{t.footerAddress}</p> : null}
          {t.footerSocialLinks.length ? (
            <div className="mt-5 flex gap-2">
              {t.footerSocialLinks.map((social: any) => {
                const Tag: any = social.href ? "a" : "span";
                return (
                  <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:opacity-100" style={{ background: "color-mix(in srgb, var(--t-on-ink) 14%, transparent)" }}>
                    {SOCIAL_ICON[social.key]}
                  </Tag>
                );
              })}
            </div>
          ) : null}
        </div>
        <div>
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] opacity-60">Explore</p>
          <ul className="space-y-2.5 text-[14px]">
            {links.map((item: any) => (
              <li key={item.slug}>
                <button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToSection(item.slug)}>{item.name}</button>
              </li>
            ))}
          </ul>
        </div>
        {showServices ? (
          <div>
            <button type="button" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] opacity-60 transition hover:opacity-100" onClick={() => t.goToSection("products")}>
              Services {Icon.arrow(12)}
            </button>
            <ul className="space-y-2.5 text-[14px]">
              {services.map((service) => (
                <li key={service.key}>
                  <button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] opacity-60">{stayFacts.length ? "Stay info" : "Hours"}</p>
          {stayFacts.length ? (
            <ul className="space-y-2 text-[14px]">
              {stayFacts.map(([label, value]) => (
                <li key={label} className="flex justify-between gap-4"><span className="opacity-70">{label}</span><span className="font-semibold">{value}</span></li>
              ))}
            </ul>
          ) : hours.length ? (
            <ul className="space-y-2 text-[14px]">
              {hours.map((row) => <li key={row.days} className="flex justify-between gap-4"><span className="opacity-70">{row.days}</span><span className="font-semibold">{row.hours}</span></li>)}
            </ul>
          ) : (
            <p className="text-[14px] opacity-85">{draft?.contactBusinessHours || "Reception is here to help."}</p>
          )}
          {policy.cancellationNote ? <p className="mt-4 text-[13px] leading-relaxed opacity-70">{policy.cancellationNote}</p> : null}
        </div>
        <div>
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] opacity-60">Contact</p>
          <div className="space-y-2.5 text-[14px] opacity-90">
            {t.contactPhone ? <p className="flex items-center gap-2">{Icon.phone(15)} {t.contactPhone}</p> : null}
            {t.contactEmail ? <p className="flex items-center gap-2 break-all">{Icon.mail(15)} {t.contactEmail}</p> : null}
          </div>
        </div>
      </div>
      <div className="tp-wrap flex flex-wrap items-center justify-between gap-3 border-t py-5 text-[13px] opacity-70" style={{ borderColor: "color-mix(in srgb, var(--t-on-ink) 18%, transparent)" }}>
        <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${t.footerCompanyName || draft?.companyName || ""}`}</span>
      </div>
    </footer>
  );
};
