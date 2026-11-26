import React from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

const navItems = (t: any): any[] =>
  ((t.navItems || []) as any[]).filter(
    (item) => resolveSectionFromSlug(item.slug) !== "testimonials",
  );

export const DestinflowHeader: React.FC = () => {
  const { t, draft, primary, services, openLead, c } = useTpl();
  const ctaLabel = draft?.CTAButtonText || c("header.cta", "Book Now");
  const hasLead = Boolean(primary?.leadEnabled);
  const isHome = t.currentSection === "home" || !t.currentSection;

  // Navigation stays data-driven, exactly like the other HostPanel templates.
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };

  const openNav = (item: any) => {
    t.setMobileMenuOpen(false);
    if (resolveSectionFromSlug(item.slug) === "products" && services.length === 1)
      t.goToProductPage(services[0].slug);
    else t.goToSection(item.slug);
  };

  const navButton = (item: any) => (
    <button
      key={item.slug}
      type="button"
      className="df-navlink"
      aria-current={t.currentSection === resolveSectionFromSlug(item.slug) ? "page" : undefined}
      onClick={() => openNav(item)}
    >
      {item.name}
    </button>
  );

  return (
    <header className={`df-header${isHome ? " df-header-overlay" : ""}`}>
      <div className="df-shell df-header-inner">
        <div className="df-brand-wrap">
          <button type="button" className="df-brand" onClick={() => t.goToSection("home")} aria-label="Go to home">
            {draft?.companyLogo ? (
              <img src={draft.companyLogo} alt={draft.companyName || "Logo"} loading="eager" />
            ) : (
              <span className="truncate">{draft?.companyName || "Home"}</span>
            )}
          </button>
          <span className="df-brand-line" aria-hidden="true" />
        </div>

        <nav className="df-nav" aria-label="Main navigation">
          {navItems(t).map(navButton)}
        </nav>

        <div className="df-header-actions">
          <button type="button" className="df-btn df-btn-light df-header-cta" onClick={cta}>
            {ctaLabel}
            <span aria-hidden="true">{Icon.arrow(16)}</span>
          </button>
          <button
            type="button"
            className="df-nav-menu-button"
            aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={t.mobileMenuOpen}
            onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}
          >
            {t.mobileMenuOpen ? Icon.close(20) : Icon.menu(20)}
          </button>
        </div>
      </div>

      {t.mobileMenuOpen ? (
        <div className="df-mobile-panel">
          <nav aria-label="Mobile navigation">
            {navItems(t).map((item) => (
              <button key={item.slug} type="button" className="df-mobile-link" onClick={() => openNav(item)}>
                {item.name}
              </button>
            ))}
          </nav>
          <button type="button" className="df-btn df-btn-block" style={{ marginTop: 20 }} onClick={cta}>
            {ctaLabel}
            <span aria-hidden="true">{Icon.arrow(16)}</span>
          </button>
        </div>
      ) : null}
    </header>
  );
};

export const DestinflowFooter: React.FC = () => {
  const { t, draft, c } = useTpl();
  const name = t.footerCompanyName || draft?.companyName || "";
  const sections = ["about", "products", "gallery", "contact"] as const;
  const hours = groupOpeningHours(draft?.openingHours);

  return (
    <footer className="df-footer">
      <div className="df-shell">
        <div className="df-footer-grid">
          <div>
            {draft?.companyLogo ? (
              <img className="df-footer-logo" src={draft.companyLogo} alt={name || "Logo"} loading="lazy" />
            ) : (
              <p className="df-footer-brand">{name}</p>
            )}
            <p>{c("footer.tagline", "A comfortable stay, thoughtfully hosted.")}</p>
            <div className="df-socials">
              {t.footerSocialLinks.map((social: any) => {
                const Tag: any = social.href ? "a" : "span";
                return (
                  <Tag
                    key={social.key}
                    {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})}
                    aria-label={social.key}
                  >
                    {SOCIAL_ICON[social.key]}
                  </Tag>
                );
              })}
            </div>
          </div>

          <div>
            <h3>{c("footer.explore.title", "Explore")}</h3>
            <div className="df-footer-list">
              {sections.map((section) => {
                const nav = navItems(t).find((item: any) => resolveSectionFromSlug(item.slug) === section);
                if (!nav) return null;
                return (
                  <button key={section} type="button" onClick={() => t.goToSection(nav.slug)}>
                    {nav.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3>{c("footer.contact.title", "Contact")}</h3>
            <div className="df-footer-list">
              {t.contactPhone ? <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a> : null}
              <p>{t.footerAddress || draft?.address}</p>
            </div>
          </div>

          <div>
            <h3>{c("footer.hours.title", "Opening hours")}</h3>
            <div className="df-footer-list">
              {hours.slice(0, 4).map((row) => (
                <p key={row.days}>{row.days}: {row.hours}</p>
              ))}
              {!hours.length && draft?.contactBusinessHours ? <p>{draft.contactBusinessHours}</p> : null}
            </div>
          </div>
        </div>

        <div className="df-footer-bottom">
          <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span>
          <span>{c("footer.crafted", "Made for memorable stays.")}</span>
        </div>
      </div>
    </footer>
  );
};
