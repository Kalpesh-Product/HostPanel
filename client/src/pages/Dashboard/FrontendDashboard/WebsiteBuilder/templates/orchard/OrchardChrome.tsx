import React from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

const navItems = (t: any): any[] => (t.navItems || []) as any[];

export const OrchardHeader: React.FC = () => {
  const { t, draft, primary, openLead, services, c } = useTpl();
  const ctaLabel = draft?.CTAButtonText || c("header.cta", "Schedule a Tour");
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };
  const openNav = (item: any) => {
    t.setMobileMenuOpen(false);
    if (
      resolveSectionFromSlug(item.slug) === "products" &&
      services.length === 1
    )
      t.goToProductPage(services[0].slug);
    else t.goToSection(item.slug);
  };
  const navButton = (item: any) => (
    <button
      key={item.slug}
      type="button"
      className="ol-navlink"
      aria-current={
        t.currentSection === resolveSectionFromSlug(item.slug)
          ? "page"
          : undefined
      }
      onClick={() => openNav(item)}
    >
      {item.name}
    </button>
  );

  return (
    <header className="ol-header">
      <div className="ol-shell ol-header-inner">
        <button
          type="button"
          className="ol-brand"
          onClick={() => t.goToSection("home")}
          aria-label="Go to home"
        >
          {draft?.companyLogo ? (
            <img
              src={draft.companyLogo}
              alt={draft.companyName || "Logo"}
              loading="eager"
            />
          ) : (
            <span className="truncate">{draft?.companyName || "Home"}</span>
          )}
        </button>

        <nav className="ol-nav" aria-label="Main navigation">
          {navItems(t).map(navButton)}
        </nav>

        <div className="ol-header-actions">
          <button
            type="button"
            className="ol-btn ol-header-cta"
            onClick={cta}
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            className="ol-iconbtn"
            aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={t.mobileMenuOpen}
            onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}
          >
            {t.mobileMenuOpen ? Icon.close(18) : Icon.menu(18)}
          </button>
        </div>
      </div>

      {t.mobileMenuOpen ? (
        <div className="ol-mobile-panel">
          <nav aria-label="Mobile navigation">
            {navItems(t).map((item) => (
              <button
                key={item.slug}
                type="button"
                className="ol-mobile-link"
                onClick={() => openNav(item)}
              >
                {item.name}
              </button>
            ))}
          </nav>
          <button type="button" className="ol-btn w-full mt-6" onClick={cta}>
            {ctaLabel}
          </button>
        </div>
      ) : null}
    </header>
  );
};

export const OrchardFooter: React.FC = () => {
  const { t, draft, c } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  const sections = ["about", "products", "gallery", "contact"] as const;

  return (
    <footer className="ol-footer">
      <div className="ol-shell">
        <div className="ol-footer-grid">
          <div>
            <p className="ol-footer-brand">{name}</p>
            <p className="mt-5 max-w-sm text-[14px]">
              {t.footerAddress || draft?.address}
            </p>
            <div className="ol-socials">
              {t.footerSocialLinks.map((social: any) => {
                const Tag: any = social.href ? "a" : "span";
                return (
                  <Tag
                    key={social.key}
                    {...(social.href
                      ? {
                          href: social.href,
                          target: "_blank",
                          rel: "noreferrer",
                        }
                      : {})}
                    aria-label={social.key}
                  >
                    {SOCIAL_ICON[social.key]}
                  </Tag>
                );
              })}
            </div>
          </div>

          <div className="ol-footer-col">
            <h3>{c("footer.explore.title", "Explore")}</h3>
            {sections.map((section) => {
              const nav = navItems(t).find(
                (item: any) => resolveSectionFromSlug(item.slug) === section,
              );
              if (!nav) return null;
              return (
                <button key={section} type="button" onClick={() => t.goToSection(nav.slug)}>
                  {nav.name}
                </button>
              );
            })}
          </div>

          <div className="ol-footer-col">
            <h3>{c("footer.contact.title", "Connect")}</h3>
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                {t.contactPhone}
              </a>
            ) : null}
            {t.contactEmail ? (
              <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
            ) : null}
            <p>{c("footer.hours.label", "Mon–Fri 9 AM – 6:30 PM")}</p>
          </div>

          <div className="ol-footer-col">
            <h3>{c("footer.visit.title", "Find us")}</h3>
            <p>{t.footerAddress || draft?.address}</p>
            {hours.slice(0, 4).map((row) => (
              <p key={row.days}>
                {row.days}: {row.hours}
              </p>
            ))}
          </div>
        </div>

        <div className="ol-footer-bottom">
          <span>
            {t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}
          </span>
          <span>{c("footer.tagline", "Designed for distinction.")}</span>
        </div>
      </div>
    </footer>
  );
};
