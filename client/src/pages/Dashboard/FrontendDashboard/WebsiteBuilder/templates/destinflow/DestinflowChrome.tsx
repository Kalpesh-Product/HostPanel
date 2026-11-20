import React, { useState } from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

const navItems = (t: any): any[] => (t.navItems || []) as any[];

// The reference header shows Home / About / Rooms / Pages / Contact. HostPanel's
// navigation is data-driven, so the extra pages stay reachable from the Pages menu.
const headerNav = (t: any, c: (key: string, fallback: string) => string) => {
  const items = navItems(t).map((item) => ({
    ...item,
    section: resolveSectionFromSlug(item.slug),
  }));
  const primary = items.filter((item) =>
    ["home", "about", "products", "contact"].includes(item.section),
  );
  const pages = items.filter(
    (item) => !["home", "about", "products", "contact"].includes(item.section),
  );
  const find = (section: string) => primary.find((item) => item.section === section);
  const rooms = find("products");
  const links = [
    find("home"),
    find("about"),
    rooms
      ? {
          ...rooms,
          name: c("header.rooms", rooms.name === "Services" ? "Rooms" : rooms.name),
        }
      : null,
    pages.length ? { slug: "pages", name: c("header.pages", "Pages"), section: "pages" } : null,
    find("contact"),
  ].filter(Boolean) as any[];
  return { links, pages };
};

export const DestinflowHeader: React.FC = () => {
  const { t, draft, primary, services, c } = useTpl();
  const ctaLabel = draft?.CTAButtonText || c("header.cta", "Book Now");
  const isHome = t.currentSection === "home" || !t.currentSection;
  const { links, pages } = headerNav(t, c);
  const [pagesOpen, setPagesOpen] = useState(false);

  const cta = () => {
    t.setMobileMenuOpen(false);
    if (primary) t.goToProductPage(primary.slug);
    else t.goToSection("contact");
  };

  const openNav = (item: any) => {
    t.setMobileMenuOpen(false);
    setPagesOpen(false);
    if (item.section === "pages") return;
    const section = resolveSectionFromSlug(item.slug);
    if (section === "products" && services.length === 1) t.goToProductPage(services[0].slug);
    else t.goToSection(item.slug);
  };

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
          {links.map((item) =>
            item.section === "pages" ? (
              <div key="pages" className={`df-nav-dropdown${pagesOpen ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="df-navlink df-nav-dropdown-toggle"
                  aria-expanded={pagesOpen}
                  onClick={() => setPagesOpen((open: boolean) => !open)}
                >
                  {item.name}
                  <span className="df-nav-star" aria-hidden="true">{Icon.star(12)}</span>
                </button>
                <div className="df-nav-dropdown-list">
                  {pages.map((page) => (
                    <button
                      key={page.slug}
                      type="button"
                      className="df-nav-dropdown-link"
                      onClick={() => openNav(page)}
                    >
                      {page.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                key={item.slug}
                type="button"
                className="df-navlink"
                aria-current={t.currentSection === item.section ? "page" : undefined}
                onClick={() => openNav(item)}
              >
                {item.name}
              </button>
            ),
          )}
        </nav>

        <div className="df-header-actions">
          {!isHome && t.contactPhone ? (
            <a className="df-header-phone" href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
              {t.contactPhone}
            </a>
          ) : null}
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
  const [email, setEmail] = useState("");
  const name = t.footerCompanyName || draft?.companyName || "";
  const sections = ["about", "products", "gallery", "contact"] as const;
  const hours = groupOpeningHours(draft?.openingHours);
  const gallery = (t.galleryItems || []).slice(0, 6) as string[];

  const subscribe = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    t.showSuccessPopup(c("footer.newsletter.success", "Thanks for subscribing."));
    setEmail("");
  };

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
            <h3 style={{ marginTop: 30 }}>{c("footer.newsletter.title", "Subscribe to our newsletter")}</h3>
            <form className="df-newsletter" onSubmit={subscribe}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                aria-label="Email address"
              />
              <button type="submit" aria-label="Subscribe">{Icon.arrow(16)}</button>
            </form>
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

        {gallery.length ? (
          <div className="df-instagram-grid" aria-label="Photo highlights">
            {gallery.map((src, index) => (
              <img key={`${src}-${index}`} src={src} alt="" loading="lazy" />
            ))}
          </div>
        ) : null}

        <div className="df-footer-bottom">
          <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span>
          <span>{c("footer.crafted", "Made for memorable stays.")}</span>
        </div>
      </div>
    </footer>
  );
};
