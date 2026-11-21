import React from "react";
import { AnimatePresence, motion } from "../motion";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { Icon } from "../shared/TplUI";
import { useWavex } from "./WavexContext";

const brandMark = (name: string) =>
  String(name || "W").trim().charAt(0).toUpperCase();

export const WavexHeader: React.FC = () => {
  const { t, draft, primary, profile, openLead } = useWavex();

  const book = () => {
    t.setMobileMenuOpen(false);
    if (primary?.leadEnabled) openLead(primary);
    else t.goToSection("contact");
  };

  const active = (item: any) =>
    t.currentSection === resolveSectionFromSlug(item.slug) ||
    (t.currentSection === "home" && item.slug === "home");

  return (
    <>
      <header className="wx-header">
        <div className="wx-shell wx-header-inner">
          <button
            type="button"
            className="wx-brand"
            onClick={() => t.goToSection("home")}
            aria-label="Go to home"
          >
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
            ) : (
              <>
                <span className="wx-brand-mark" aria-hidden="true">{brandMark(draft?.companyName)}</span>
                <span>{draft?.companyName || "WaveX"}</span>
              </>
            )}
          </button>

          <nav className="wx-nav" aria-label="Main navigation">
            {t.navItems.map((item: any) => (
              <button
                key={item.slug}
                type="button"
                className="wx-nav-link"
                aria-current={active(item) ? "page" : undefined}
                onClick={() => t.goToSection(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </nav>

          <div className="wx-header-actions">
            <button type="button" className="wx-btn wx-btn-sm" onClick={book}>
              {primary?.leadEnabled ? profile.labels.cta : "Get in touch"}
            </button>
            <button
              type="button"
              className="wx-menu"
              aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={Boolean(t.mobileMenuOpen)}
              onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}
            >
              {t.mobileMenuOpen ? Icon.close(20) : Icon.menu(22)}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {t.mobileMenuOpen ? (
          <motion.div
            className="wx-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              className="wx-drawer-backdrop"
              aria-label="Close menu"
              onClick={() => t.setMobileMenuOpen(false)}
            />
            <motion.div
              className="wx-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="wx-drawer-head">
                <span className="wx-brand">{draft?.companyName || "WaveX"}</span>
                <button
                  type="button"
                  className="wx-drawer-close"
                  aria-label="Close menu"
                  onClick={() => t.setMobileMenuOpen(false)}
                >
                  {Icon.close(20)}
                </button>
              </div>
              <nav className="wx-drawer-nav" aria-label="Mobile navigation">
                {t.navItems.map((item: any) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => t.goToSection(item.slug)}
                  >
                    {item.name}
                    <span aria-hidden="true">{Icon.arrow(15)}</span>
                  </button>
                ))}
              </nav>
              <button type="button" className="wx-btn" onClick={book}>
                {primary?.leadEnabled ? profile.labels.cta : "Get in touch"}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const WavexStickyBar: React.FC = () => {
  const { t, primary, profile, openLead } = useWavex();
  if (t.currentSection === "contact" || t.mobileMenuOpen) return null;
  return (
    <div className="wx-sticky-bar">
      <button
        type="button"
        className="wx-btn wx-btn-outline"
        onClick={() => t.goToSection("products")}
      >
        Find a room
      </button>
      <button
        type="button"
        className="wx-btn"
        onClick={() => (primary?.leadEnabled ? openLead(primary) : t.goToSection("contact"))}
      >
        {primary?.leadEnabled ? profile.labels.cta : "Get in touch"}
      </button>
    </div>
  );
};

export const WavexFooter: React.FC = () => {
  const { t, draft, services, primary, profile, openLead, c } = useWavex();
  const name = t.footerCompanyName || draft?.companyName || "WaveX";
  const hours = groupOpeningHours(draft?.openingHours);
  const links = (t.navItems || []).filter(
    (item: any) => !isProductsNavItem(item) || !services.length || t.productsPageEnabled,
  );

  const cta = () => {
    if (primary?.leadEnabled) openLead(primary);
    else t.goToSection("contact");
  };

  return (
    <footer className="wx-footer">
      <div className="wx-shell">
        <div className="wx-footer-panel">
          <div className="wx-footer-cta">
            <div>
              <span className="wx-kicker">WaveX</span>
              <h2>{c("footer.cta", "Your next meeting starts here.")}</h2>
            </div>
            <button type="button" className="wx-btn" onClick={cta}>
              {primary?.leadEnabled ? profile.labels.cta : "Get in touch"}
              {Icon.arrow(17)}
            </button>
          </div>

          <div className="wx-footer-grid">
            <div className="wx-footer-brand">
              {name}
              {draft?.subTitle ? <p>{draft.subTitle}</p> : null}
              {t.footerSocialLinks.length ? (
                <div className="wx-socials" style={{ marginTop: 22 }}>
                  {t.footerSocialLinks.map((social: any) => {
                    const Tag: any = social.href ? "a" : "span";
                    return (
                      <Tag
                        key={social.key}
                        {...(social.href
                          ? { href: social.href, target: "_blank", rel: "noreferrer" }
                          : {})}
                        aria-label={social.key}
                      >
                        {SOCIAL_ICON[social.key]}
                      </Tag>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="wx-footer-col">
              <strong>Explore</strong>
              {links.map((item: any) => (
                <button key={item.slug} type="button" onClick={() => t.goToSection(item.slug)}>
                  {item.name}
                </button>
              ))}
            </div>

            <div className="wx-footer-col">
              <strong>Rooms</strong>
              {services.length ? (
                services.slice(0, 6).map((service) => (
                  <button key={service.key} type="button" onClick={() => t.goToService(service)}>
                    {service.name}
                  </button>
                ))
              ) : (
                <button type="button" onClick={() => t.goToSection("products")}>
                  View all rooms
                </button>
              )}
            </div>

            <div className="wx-footer-col">
              <strong>Visit</strong>
              {t.footerAddress ? <p style={{ lineHeight: 1.7 }}>{t.footerAddress}</p> : null}
              {t.contactPhone ? (
                <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a>
              ) : null}
              {t.contactEmail ? <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a> : null}
              {hours.length ? (
                <div style={{ marginTop: 10 }}>
                  {hours.map((row) => (
                    <p key={row.days} style={{ lineHeight: 1.7 }}>
                      {row.days}: {row.hours}
                    </p>
                  ))}
                </div>
              ) : draft?.contactBusinessHours ? (
                <p style={{ marginTop: 10 }}>{draft.contactBusinessHours}</p>
              ) : null}
            </div>
          </div>

          <div className="wx-footer-bottom">
            <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span>
            <span>Made for good meetings.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
