import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";
import { cheapestItem } from "./HavenUI";

/** A floating pill that stays put while the page scrolls under it. */
export const HavenHeader: React.FC = () => {
  const { t, draft, services, primary, profile, openLead } = useTpl();
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
      <header className="fixed inset-x-0 top-3 z-50 md:top-4">
        <div className="tp-wrap">
          <div className="hv-pill flex h-[58px] items-center justify-between gap-4 rounded-full pl-6 pr-2">
            <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center text-left">
              {draft?.companyLogo ? (
                <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-8 w-auto max-w-[140px] object-contain" />
              ) : (
                <span className="tp-display truncate text-[21px]">{draft?.companyName || "Home"}</span>
              )}
            </button>

            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
              {t.navItems.map((item: any) => {
                if (isProductsNavItem(item) && t.productsPageEnabled && services.length > 1) {
                  return (
                    <div key={item.slug} className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                      <button type="button" className="hv-navlink inline-flex items-center gap-1" aria-expanded={servicesOpen} aria-current={t.currentSection === "products" ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                        {item.name} {Icon.chevron(12)}
                      </button>
                      <AnimatePresence>
                        {servicesOpen ? (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }} className="absolute left-1/2 top-full w-60 -translate-x-1/2 pt-3">
                            <div className="tp-card p-2" style={{ borderRadius: 22 }}>
                              {services.map((service) => (
                                <button key={service.key} type="button" className="block w-full rounded-2xl px-4 py-2.5 text-left text-[14.5px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--t-accent)_14%,transparent)]" onClick={() => { setServicesOpen(false); t.goToProductPage(service.slug); }}>
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
                  <button key={item.slug} type="button" className="hv-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button type="button" className="tp-btn tp-btn-primary tp-btn-sm hidden !py-2.5 sm:inline-flex" onClick={cta}>
                {hasLead ? profile.labels.cta : "Contact us"}
              </button>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full lg:hidden" style={{ background: "color-mix(in srgb, var(--t-text) 8%, transparent)" }} aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
                {t.mobileMenuOpen ? Icon.close(20) : Icon.menu()}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {t.mobileMenuOpen ? (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto px-7 pb-10 pt-28 lg:hidden"
            style={{ background: "var(--t-bg)", color: "var(--t-text)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-label="Menu"
          >
            <nav className="flex flex-col">
              {t.navItems.map((item: any, index: number) => (
                <motion.div key={item.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + index * 0.04, duration: 0.4 }} className="hv-rule">
                  <button type="button" className="tp-display w-full py-4 text-left text-[30px]" style={{ color: isActive(item) ? "var(--hv-ink-accent)" : undefined }} onClick={() => t.goToSection(item.slug)}>
                    {item.name}
                  </button>
                  {isProductsNavItem(item) && t.productsPageEnabled && services.length > 1 ? (
                    <ul className="mb-4 space-y-1 pl-1">
                      {services.map((service) => (
                        <li key={service.key}>
                          <button type="button" className="tp-muted w-full py-1.5 text-left text-[17px] font-medium" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </motion.div>
              ))}
            </nav>
            <button type="button" className="tp-btn tp-btn-primary mt-8 w-full" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

/** A floating pill at the bottom of phones, so a visit or enquiry is always one tap away. */
export const HavenStickyBar: React.FC = () => {
  const { t, primary, profile, openLead } = useTpl();
  const cheapest = cheapestItem(primary);
  if (!primary?.leadEnabled || t.currentSection === "contact" || t.mobileMenuOpen) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div className="hv-pill flex items-center justify-between gap-3 rounded-full py-2 pl-6 pr-2">
        <div className="min-w-0">
          {cheapest ? <p className="tp-muted text-[11px] font-semibold">Starting from</p> : null}
          <p className="tp-display truncate text-[18px] leading-tight">{cheapest ? priceWithUnit(cheapest.price, cheapest.priceUnit) : primary.name}</p>
        </div>
        <button type="button" className="tp-btn tp-btn-primary !px-5 !py-3" onClick={() => openLead(primary)}>{profile.labels.cta}</button>
      </div>
    </div>
  );
};

export const HavenFooter: React.FC = () => {
  const { t, draft, services } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  // Several services get their own column (so the footer stays short); "Services" itself then
  // leaves the Explore list and becomes that column's heading.
  const showServices = services.length > 1 && t.productsPageEnabled;
  const links = (t.navItems || []).filter((item: any) => (isProductsNavItem(item) ? t.productsPageEnabled && !showServices : true));
  const heading = "mb-5 text-[12.5px] font-semibold tracking-wide opacity-60";

  return (
    <footer className="relative mt-20 overflow-hidden pb-24 lg:pb-0" style={{ background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
      <div className="tp-wrap grid gap-12 pb-12 pt-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={name || "Logo"} className="h-10 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <p className="tp-display text-[30px]">{name}</p>
          )}
          {draft?.subTitle ? <p className="mt-4 max-w-sm text-[15px] leading-relaxed opacity-70">{draft.subTitle}</p> : null}
          {t.footerSocialLinks.length ? (
            <div className="mt-6 flex gap-2">
              {t.footerSocialLinks.map((social: any) => {
                const Tag: any = social.href ? "a" : "span";
                return (
                  <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-100" style={{ background: "color-mix(in srgb, var(--t-on-ink) 14%, transparent)" }}>
                    {SOCIAL_ICON[social.key]}
                  </Tag>
                );
              })}
            </div>
          ) : null}
        </div>

        <div>
          <p className={heading}>Explore</p>
          <ul className="space-y-3 text-[15px]">
            {links.map((item: any) => (
              <li key={item.slug}><button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToSection(item.slug)}>{item.name}</button></li>
            ))}
          </ul>
        </div>

        {showServices ? (
          <div>
            <button type="button" className={`${heading} inline-flex items-center gap-1.5 transition hover:opacity-100`} onClick={() => t.goToSection("products")}>Services {Icon.arrow(12)}</button>
            <ul className="space-y-3 text-[15px]">
              {services.map((service) => (
                <li key={service.key}><button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button></li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className={heading}>Visit us</p>
          <div className="space-y-3 text-[15px] opacity-90">
            {t.footerAddress ? <p className="flex items-start gap-3"><span className="mt-1 shrink-0">{Icon.pin(15)}</span>{t.footerAddress}</p> : null}
            {t.contactPhone ? <p className="flex items-center gap-3">{Icon.phone(15)} {t.contactPhone}</p> : null}
            {t.contactEmail ? <p className="flex items-center gap-3 break-all">{Icon.mail(15)} {t.contactEmail}</p> : null}
          </div>
          {hours.length ? (
            <ul className="mt-5 space-y-1.5 text-[14px]">
              {hours.map((row) => <li key={row.days} className="flex justify-between gap-4"><span className="opacity-65">{row.days}</span><span className="font-semibold">{row.hours}</span></li>)}
            </ul>
          ) : draft?.contactBusinessHours ? <p className="mt-5 text-[14px] opacity-75">{draft.contactBusinessHours}</p> : null}
        </div>
      </div>

      {name && !draft?.companyLogo ? (
        <p aria-hidden="true" className="tp-display pointer-events-none select-none whitespace-nowrap text-center leading-[0.8]" style={{ fontSize: `min(${Math.max(5, Math.min(15, Math.floor(150 / Math.max(name.length, 1))))}vw, 210px)`, opacity: 0.07, marginBottom: "-0.09em" }}>
          {name}
        </p>
      ) : null}

      <div className="relative" style={{ borderTop: "1px solid color-mix(in srgb, var(--t-on-ink) 16%, transparent)" }}>
        <div className="tp-wrap flex flex-wrap items-center justify-between gap-3 py-5 text-[13.5px] opacity-70">
          <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span>
        </div>
      </div>
    </footer>
  );
};
