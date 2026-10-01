import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours, priceWithUnit } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";
import { Squiggle, cheapestItem } from "./CameliaUI";

/** A plain top bar, sticky in normal flow — a centred wordmark with the menu split left/right of
 * it, not a floating pill and not a left-logo bar. Matches the boutique-hotel reference. */
export const CameliaHeader: React.FC = () => {
  const { t, draft, services, primary, profile, openLead } = useTpl();
  const [servicesOpen, setServicesOpen] = useState(false);
  // No background of its own over the hero — the hero's own photo/video shows straight through,
  // white text on top. Measures the hero's actual rendered edge (not a guessed pixel offset,
  // since its height varies by aspect ratio and viewport) so the swap to the solid bar happens
  // exactly once it's scrolled past, not partway through. Other pages have no hero behind the
  // header, so it's solid from the start.
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    if (t.currentSection !== "home") return;
    const check = () => {
      const hero = document.getElementById("cm-hero");
      setPastHero(hero ? hero.getBoundingClientRect().bottom <= 80 : true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [t.currentSection]);
  const transparent = t.currentSection === "home" && !pastHero;
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

  // The logo itself is the way home, so — unlike the other templates' nav — "Home" isn't
  // repeated as a text link. Every other page link sits on the left of the centred wordmark;
  // the right side is reserved for the phone number and CTA only, matching the reference.
  const menuItems = (t.navItems || []).filter((item: any) => resolveSectionFromSlug(item.slug) !== "home");

  const navLink = (item: any) => {
    if (isProductsNavItem(item) && t.productsPageEnabled && services.length > 1) {
      return (
        <div key={item.slug} className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
          <button type="button" className="cm-navlink inline-flex items-center gap-1" aria-expanded={servicesOpen} aria-current={t.currentSection === "products" ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
            {item.name} {Icon.chevron(12)}
          </button>
          <AnimatePresence>
            {servicesOpen ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }} className="absolute left-1/2 top-full w-60 -translate-x-1/2 pt-3">
                <div className="tp-card p-2">
                  {services.map((service) => (
                    <button key={service.key} type="button" className="block w-full rounded-sm px-4 py-2.5 text-left text-[14.5px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--t-accent)_14%,transparent)]" onClick={() => { setServicesOpen(false); t.goToProductPage(service.slug); }}>
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
      <button key={item.slug} type="button" className="cm-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
        {item.name}
      </button>
    );
  };

  return (
    <>
      {/* No load animation — checked the reference directly, its navbar has no inline opacity
          or transform and nothing triggers one on load, so this renders at full opacity immediately. */}
      <header className={`sticky top-0 z-50 ${transparent ? "cm-bar-transparent" : "cm-bar"}`}>
        <div className="cm-nav-wrap grid h-[80px] grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {menuItems.map(navLink)}
          </nav>

          <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center text-left lg:justify-self-center">
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[150px] object-contain" />
            ) : (
              <span className="cm-logotype truncate text-[24px]">{(draft?.companyName || "Home").toUpperCase()}</span>
            )}
          </button>

          <div className="hidden items-center justify-end gap-5 lg:flex">
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`} className="cm-navlink inline-flex items-center gap-2">
                {Icon.phone(15)} {t.contactPhone}
              </a>
            ) : null}
            <button type="button" className="tp-btn tp-btn-dark tp-btn-sm inline-flex items-center gap-2" onClick={cta}>
              {Icon.bell(15)} {hasLead ? profile.labels.cta : "Contact us"}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 lg:hidden">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center"
              style={{ background: transparent ? "rgba(255,255,255,.18)" : "color-mix(in srgb, var(--t-text) 8%, transparent)", color: transparent ? "#fff" : "inherit" }}
              aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={t.mobileMenuOpen}
              onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}
            >
              {t.mobileMenuOpen ? Icon.close(20) : Icon.menu()}
            </button>
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
                <motion.div key={item.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + index * 0.04, duration: 0.4 }} className="cm-rule">
                  <button type="button" className="tp-display w-full py-4 text-left text-[30px]" style={{ color: isActive(item) ? "var(--cm-ink-accent)" : undefined }} onClick={() => t.goToSection(item.slug)}>
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
export const CameliaStickyBar: React.FC = () => {
  const { t, primary, profile, openLead } = useTpl();
  const cheapest = cheapestItem(primary);
  if (!primary?.leadEnabled || t.currentSection === "contact" || t.mobileMenuOpen) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div className="cm-pill flex items-center justify-between gap-3 rounded-full py-2 pl-6 pr-2">
        <div className="min-w-0">
          {cheapest ? <p className="tp-muted text-[11px] font-semibold">Starting from</p> : null}
          <p className="tp-display truncate text-[18px] leading-tight">{cheapest ? priceWithUnit(cheapest.price, cheapest.priceUnit) : primary.name}</p>
        </div>
        <button type="button" className="tp-btn tp-btn-primary !px-5 !py-3" onClick={() => openLead(primary)}>{profile.labels.cta}</button>
      </div>
    </div>
  );
};

export const CameliaFooter: React.FC = () => {
  const { t, draft } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";

  return (
    <footer className="cm-band mt-20 pb-10 pt-20">
      <div className="tp-wrap flex flex-col items-center text-center">
        {draft?.companyLogo ? (
          <img src={draft.companyLogo} alt={name || "Logo"} className="h-11 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        ) : (
          <p className="cm-logotype text-[32px]">{name.toUpperCase()}</p>
        )}
        <Squiggle className="mt-4 opacity-60" style={{ color: "var(--t-accent-light, var(--t-accent))" }} />

        <div className="mt-9 flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          {t.contactEmail ? (
            <a href={`mailto:${t.contactEmail}`} className="flex flex-col items-center gap-3">
              <span className="cm-icon-btn">{Icon.mail(18)}</span>
              <span className="text-[13px] font-semibold tracking-wide opacity-90">{t.contactEmail}</span>
            </a>
          ) : null}
          <div className="text-[15.5px] leading-relaxed opacity-85">
            {t.footerAddress || draft?.address}
          </div>
          {t.contactPhone ? (
            <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`} className="flex flex-col items-center gap-3">
              <span className="cm-icon-btn">{Icon.phone(18)}</span>
              <span className="text-[13px] font-semibold tracking-wide opacity-90">{t.contactPhone}</span>
            </a>
          ) : null}
        </div>

        {hours.length ? (
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-1 text-[13px] opacity-70">
            {hours.map((row) => <span key={row.days}>{row.days}: {row.hours}</span>)}
          </div>
        ) : null}

        {t.footerSocialLinks.length ? (
          <div className="mt-8 flex gap-3">
            {t.footerSocialLinks.map((social: any) => {
              const Tag: any = social.href ? "a" : "span";
              return (
                <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="cm-icon-btn !h-10 !w-10">
                  {SOCIAL_ICON[social.key]}
                </Tag>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="tp-wrap mt-14 flex flex-wrap items-center justify-center gap-3 pt-6 text-[13px] opacity-60" style={{ borderTop: "1px solid color-mix(in srgb, var(--t-on-ink) 16%, transparent)" }}>
        <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span>
      </div>
    </footer>
  );
};
