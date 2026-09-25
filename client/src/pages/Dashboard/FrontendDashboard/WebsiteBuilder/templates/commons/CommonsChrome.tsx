import React, { useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

/** A sticky white header. */
export const CommonsHeader: React.FC = () => {
  const { t, draft, services, primary, profile, openLead } = useTpl();
  const [servicesOpen, setServicesOpen] = useState(false);
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };
  const isActive = (item: any) =>
    t.currentSection === resolveSectionFromSlug(item.slug) || (t.currentSection === "home" && item.slug === "home");

  return (
    <>
      <header className="cw-header sticky top-0 z-50">
        <div className="tp-wrap flex h-[68px] items-center justify-between gap-6">
          <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center text-left">
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[160px] object-contain" />
            ) : (
              <span className="tp-display truncate text-[22px]">{draft?.companyName || "Home"}<span style={{ color: "var(--t-accent)" }}>.</span></span>
            )}
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {t.navItems.map((item: any) => {
              if (isProductsNavItem(item) && t.productsPageEnabled && services.length > 1) {
                return (
                  <div key={item.slug} className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                    <button type="button" className="cw-navlink inline-flex items-center gap-1" aria-expanded={servicesOpen} aria-current={t.currentSection === "products" ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                      {item.name} {Icon.chevron(12)}
                    </button>
                    <AnimatePresence>
                      {servicesOpen ? (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full w-60 pt-2">
                          <div className="tp-card p-1.5" style={{ borderRadius: 12 }}>
                            {services.map((service) => (
                              <button key={service.key} type="button" className="block w-full rounded-lg px-3.5 py-2.5 text-left text-[14.5px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--t-accent)_25%,transparent)]" onClick={() => { setServicesOpen(false); t.goToProductPage(service.slug); }}>
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
                <button key={item.slug} type="button" className="cw-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" className="tp-btn tp-btn-primary hidden !py-2.5 sm:inline-flex" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[10px] border-2 lg:hidden" style={{ borderColor: "var(--t-text)" }} aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
              {t.mobileMenuOpen ? Icon.close(20) : Icon.menu()}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {t.mobileMenuOpen ? (
            <motion.div
              className="absolute inset-x-0 top-full max-h-[calc(100vh-110px)] overflow-y-auto lg:hidden"
              style={{ background: "var(--t-bg)", borderBottom: "1px solid var(--t-line)", boxShadow: "0 30px 40px -30px rgba(0,0,0,.4)" }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              aria-label="Menu"
            >
              <nav className="tp-wrap flex flex-col py-2">
                {t.navItems.map((item: any) => (
                  <div key={item.slug} className="border-b" style={{ borderColor: "var(--t-line)" }}>
                    <button type="button" className="tp-display flex w-full items-center justify-between py-4 text-left text-[20px]" style={{ background: isActive(item) ? "linear-gradient(transparent 62%, color-mix(in srgb, var(--t-accent) 70%, transparent) 62%)" : undefined, width: "fit-content" }} onClick={() => t.goToSection(item.slug)}>{item.name}</button>
                    {isProductsNavItem(item) && t.productsPageEnabled && services.length > 1 ? (
                      <ul className="mb-3 space-y-0.5 pl-3">
                        {services.map((service) => (
                          <li key={service.key}><button type="button" className="tp-muted w-full py-2 text-left text-[16px] font-semibold" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button></li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </nav>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
};

/** On phones a full-width button stays at the bottom, so a visit is always one tap away. */
export const CommonsStickyBar: React.FC = () => {
  const { t, primary, profile, openLead } = useTpl();
  if (!primary?.leadEnabled || t.currentSection === "contact" || t.mobileMenuOpen) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 p-3 lg:hidden" style={{ background: "var(--t-raised)", borderColor: "var(--t-text)" }}>
      <button type="button" className="tp-btn tp-btn-primary w-full" onClick={() => openLead(primary)}>{profile.labels.cta} {Icon.arrow(16)}</button>
    </div>
  );
};

export const CommonsFooter: React.FC = () => {
  const { t, draft, services, primary, profile, openLead } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  // Several services get their own column (so the footer stays short); "Services" itself then
  // leaves the Explore list and becomes that column's heading.
  const showServices = services.length > 1 && t.productsPageEnabled;
  const links = (t.navItems || []).filter((item: any) => (isProductsNavItem(item) ? t.productsPageEnabled && !showServices : true));
  const heading = "mb-5 text-[12px] font-bold uppercase tracking-[0.14em] opacity-60";

  return (
    <footer className="mt-10 pb-20 lg:pb-0" style={{ background: "var(--t-ink)", color: "var(--t-on-ink)" }}>
      <div className="tp-wrap">
        <div className="flex flex-wrap items-center justify-between gap-6 border-b py-12 md:py-16" style={{ borderColor: "color-mix(in srgb, var(--t-on-ink) 16%, transparent)" }}>
          <h2 className="tp-display max-w-2xl text-[clamp(28px,4vw,50px)]">Ready to work from somewhere better?</h2>
          {primary?.leadEnabled ? (
            <button type="button" className="tp-btn tp-btn-primary" onClick={() => openLead(primary)}>{profile.labels.cta} {Icon.arrow(16)}</button>
          ) : (
            <button type="button" className="tp-btn tp-btn-primary" onClick={() => t.goToSection("contact")}>Contact us {Icon.arrow(16)}</button>
          )}
        </div>

        <div className={`grid gap-10 py-12 sm:grid-cols-2 ${showServices ? "lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.1fr]" : "lg:grid-cols-[1.4fr_1fr_1.2fr]"}`}>
          <div>
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={name || "Logo"} className="h-9 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            ) : (
              <p className="tp-display text-[26px]">{name}<span style={{ color: "var(--t-accent)" }}>.</span></p>
            )}
            {draft?.subTitle ? <p className="mt-4 max-w-xs text-[14.5px] leading-relaxed opacity-70">{draft.subTitle}</p> : null}
            {t.footerSocialLinks.length ? (
              <div className="mt-6 flex gap-2">
                {t.footerSocialLinks.map((social: any) => {
                  const Tag: any = social.href ? "a" : "span";
                  return (
                    <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="flex h-10 w-10 items-center justify-center rounded-[10px] transition hover:opacity-100" style={{ background: "color-mix(in srgb, var(--t-on-ink) 14%, transparent)" }}>
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
              {links.map((item: any) => <li key={item.slug}><button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToSection(item.slug)}>{item.name}</button></li>)}
            </ul>
          </div>

          {showServices ? (
            <div>
              <button type="button" className={`${heading} inline-flex items-center gap-1.5 transition hover:opacity-100`} onClick={() => t.goToSection("products")}>Services {Icon.arrow(12)}</button>
              <ul className="space-y-3 text-[15px]">
                {services.map((service) => <li key={service.key}><button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button></li>)}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t py-6 text-[13.5px] opacity-70" style={{ borderColor: "color-mix(in srgb, var(--t-on-ink) 16%, transparent)" }}>
          <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span>
        </div>
      </div>
    </footer>
  );
};
