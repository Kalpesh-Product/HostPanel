import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "./SavorUI";
import { useSavor } from "./SavorContext";

const Logo: React.FC<{ light?: boolean }> = ({ light }) => {
  const { draft, t } = useSavor();
  return (
    <button type="button" onClick={() => t.goToSection("home")} className="flex items-center gap-2 text-left" aria-label="Go to home">
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[150px] object-contain md:h-10" />
      ) : (
        <span className="tp-display text-[22px]" style={{ color: light ? "inherit" : undefined }}>
          {draft?.companyName || "Home"}
        </span>
      )}
    </button>
  );
};

export const SavorHeader: React.FC = () => {
  const { t, services, primary, profile, openLead } = useSavor();
  const scrolled = useScrolled(20);
  const [servicesOpen, setServicesOpen] = useState(false);
  const menuOpen: boolean = t.mobileMenuOpen;
  const hasLead = Boolean(primary && primary.leadEnabled);
  const ctaLabel = hasLead ? profile.labels.cta : "Get in touch";
  const onCta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (item: any) =>
    t.currentSection === resolveSectionFromSlug(item.slug) || (t.currentSection === "home" && item.slug === "home");

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
        <div
          className="tp-header-pill mx-auto flex max-w-[1240px] items-center justify-between gap-4 rounded-full px-4 md:px-6"
          style={{
            background: "color-mix(in srgb, var(--t-raised) 88%, transparent)",
            backdropFilter: "blur(14px) saturate(1.4)",
            border: "1px solid var(--t-line)",
            paddingTop: scrolled ? 8 : 12,
            paddingBottom: scrolled ? 8 : 12,
            boxShadow: scrolled ? "0 18px 40px -22px color-mix(in srgb, var(--t-text) 55%, transparent)" : "none",
          }}
        >
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {t.navItems.map((item: any) => {
              if (isProductsNavItem(item) && t.productsPageEnabled && services.length > 1) {
                return (
                  <div
                    key={item.slug}
                    className="relative"
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                  >
                    <button
                      type="button"
                      className="tp-navlink inline-flex items-center gap-1"
                      aria-current={t.currentSection === "products" ? "page" : undefined}
                      aria-expanded={servicesOpen}
                      onClick={() => t.goToSection(item.slug)}
                    >
                      {item.name} {Icon.chevron(12)}
                    </button>
                    <AnimatePresence>
                      {servicesOpen ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-1/2 top-full w-64 -translate-x-1/2 pt-3"
                        >
                          <div className="tp-card p-2" style={{ borderRadius: 22 }}>
                            {services.map((service) => (
                              <button
                                key={service.key}
                                type="button"
                                className="tp-navlink block w-full !rounded-2xl text-left"
                                onClick={() => {
                                  setServicesOpen(false);
                                  t.goToProductPage(service.slug);
                                }}
                              >
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
                <button
                  key={item.slug}
                  type="button"
                  className="tp-navlink"
                  aria-current={isActive(item) ? "page" : undefined}
                  onClick={() => t.goToSection(item.slug)}
                >
                  {item.name}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" className="tp-btn tp-btn-primary tp-btn-sm hidden sm:inline-flex" onClick={onCta}>
              {ctaLabel}
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
              style={{ background: "color-mix(in srgb, var(--t-text) 8%, transparent)" }}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}
            >
              {menuOpen ? Icon.close(20) : Icon.menu()}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="fixed inset-0 z-40 overflow-y-auto px-6 pb-10 pt-28 lg:hidden"
            style={{ background: "var(--t-bg)" }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {t.navItems.map((item: any, index: number) => (
                <motion.button
                  key={item.slug}
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.04 }}
                  className="tp-display border-b py-4 text-left text-[30px]"
                  style={{ borderColor: "var(--t-line)", color: isActive(item) ? "var(--t-accent)" : undefined }}
                  onClick={() => t.goToSection(item.slug)}
                >
                  {item.name}
                </motion.button>
              ))}
            </nav>
            {services.length > 1 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {services.map((service) => (
                  <button key={service.key} type="button" className="tp-tab" aria-pressed="false" onClick={() => t.goToProductPage(service.slug)}>
                    {service.name}
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" className="tp-btn tp-btn-primary mt-8 w-full" onClick={onCta}>
              {ctaLabel}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const SavorFooter: React.FC = () => {
  const { t, draft, services } = useSavor();
  const hours = groupOpeningHours(draft?.openingHours);
  const links = (t.navItems || []).filter((item: any) => !isProductsNavItem(item) || t.productsPageEnabled);
  return (
    <footer className="tp-dark-panel mx-3 mb-3 mt-10 md:mx-6 md:mb-6" style={{ borderRadius: 36 }}>
      <div className="tp-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-20">
        <div>
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-10 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <p className="tp-display text-[30px]">{t.footerCompanyName || draft?.companyName}</p>
          )}
          {t.footerAddress ? <p className="mt-4 max-w-xs text-[14px] leading-relaxed opacity-70">{t.footerAddress}</p> : null}
          {t.footerSocialLinks.length ? (
            <div className="mt-5 flex gap-2">
              {t.footerSocialLinks.map((social: any) => {
                const Tag: any = social.href ? "a" : "span";
                return (
                  <Tag
                    key={social.key}
                    {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})}
                    aria-label={social.key}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-110"
                    style={{ background: "color-mix(in srgb, var(--t-on-ink) 14%, transparent)" }}
                  >
                    {SOCIAL_ICON[social.key]}
                  </Tag>
                );
              })}
            </div>
          ) : null}
        </div>
        <div>
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] opacity-60">Explore</p>
          <ul className="space-y-2.5 text-[15px]">
            {links.map((item: any) => (
              <li key={item.slug}>
                <button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToSection(item.slug)}>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] opacity-60">{services.length > 1 ? "What we do" : "Visit us"}</p>
          {services.length > 1 ? (
            <ul className="space-y-2.5 text-[15px]">
              {services.map((service) => (
                <li key={service.key}>
                  <button type="button" className="opacity-85 transition hover:opacity-100" onClick={() => t.goToProductPage(service.slug)}>
                    {service.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2.5 text-[15px] opacity-85">
              {t.contactPhone ? <p>{t.contactPhone}</p> : null}
              {t.contactEmail ? <p className="break-all">{t.contactEmail}</p> : null}
            </div>
          )}
        </div>
        <div>
          <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] opacity-60">Hours</p>
          {hours.length ? (
            <ul className="space-y-2 text-[14px]">
              {hours.map((row) => (
                <li key={row.days} className="flex justify-between gap-4">
                  <span className="opacity-70">{row.days}</span>
                  <span className="text-right font-semibold">{row.hours}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] opacity-85">{draft?.contactBusinessHours || "Get in touch for opening times."}</p>
          )}
        </div>
      </div>
      <div className="tp-wrap flex flex-wrap items-center justify-between gap-3 border-t py-6 text-[13px] opacity-70" style={{ borderColor: "color-mix(in srgb, var(--t-on-ink) 18%, transparent)" }}>
        <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${t.footerCompanyName || draft?.companyName || ""}`}</span>
      </div>
    </footer>
  );
};


export { Lightbox as SavorLightbox, Toast as SavorToast } from "../shared/TplParts";
