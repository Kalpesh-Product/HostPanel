import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { SOCIAL_ICON } from "../socialIcons";
import { getMediaSrc, resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useItaliano } from "./ItalianoContext";
import { ItalianoHours, ItalianoImage } from "./ItalianoUI";

export function ItalianoHeader() {
  const { t, draft, services, openLead, c } = useItaliano();
  const booking = services.find((service) => service.kind === "menu" && service.leadEnabled);
  const { pathname } = useLocation();
  const menu = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const logo = getMediaSrc(draft.companyLogo);
  const brand = draft.companyName || "Italiano";

  useEffect(() => {
    menu.current?.close();
  }, [pathname]);

  const goTo = (slug: string) => {
    menu.current?.close();
    t.goToSection(slug);
  };

  const book = () => {
    menu.current?.close();
    const heading = document.getElementById("italiano-reservation-title");
    if (heading) heading.focus();
    else if (booking) openLead(booking);
  };

  const headerRow = (expanded: boolean) => (
    <div className="italiano-shell italiano-header-row">
      <button type="button" className="italiano-crest" onClick={() => goTo("home")} aria-label="Go to homepage">
        <span aria-hidden="true">✧</span>
      </button>
      <button type="button" className="italiano-wordmark" onClick={() => goTo("home")} aria-label="Home">
        {logo ? <ItalianoImage src={logo} alt={brand} eager /> : brand}
      </button>
      <div className="italiano-header-actions">
        {booking ? <button type="button" className="italiano-header-book" onClick={book}>{c("booking.cta", "Book a table")}</button> : null}
        <button type="button" className="italiano-menu-toggle" aria-label={expanded ? "Close menu" : "Open menu"}
          aria-expanded={expanded || menuOpen} aria-controls="italiano-site-menu" autoFocus={expanded}
          onClick={() => {
            if (expanded) menu.current?.close();
            else {
              menu.current?.showModal();
              setMenuOpen(true);
            }
          }}>
          <span aria-hidden="true"><i /><i /><i /></span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <a className="italiano-skip" href="#italiano-main">Skip to content</a>
      <header className="italiano-header">{headerRow(false)}</header>
      <dialog id="italiano-site-menu" className="italiano-navigation" aria-label="Site menu" ref={menu}
        onClose={() => setMenuOpen(Boolean(menu.current?.open))}>
        <div className="italiano-navigation-head">{headerRow(true)}</div>
        <div className="italiano-navigation-surface">
          <nav aria-label="Site menu">
            {t.navItems.map(({ name, slug }: { name: string; slug: string }) => {
              const section = resolveSectionFromSlug(slug);
              return (
                <button key={slug} type="button" aria-current={section === t.currentSection ? "page" : undefined}
                  onClick={() => goTo(slug)}>
                  {section === "products" && name === "Services" ? "Menu" : name}
                </button>
              );
            })}
          </nav>
          {booking ? <button type="button" className="italiano-button italiano-navigation-book" onClick={book}>{c("booking.cta", "Book a table")}</button> : null}
        </div>
      </dialog>
    </>
  );
}


function SocialLinks() {
  const { t } = useItaliano();
  return (
    <div className="italiano-socials">
      {t.footerSocialLinks.map(({ key, href }: { key: string; href: string }) => href ? (
        <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={key}>
          <span aria-hidden="true">{SOCIAL_ICON[key] || key.slice(0, 1).toUpperCase()}</span>
        </a>
      ) : null)}
    </div>
  );
}

export function ItalianoFooter() {
  const { t, draft, c } = useItaliano();
  const newsletter = c("footer.newsletter", "");
  const logo = getMediaSrc(draft.companyLogo);
  const brand = draft.companyName || "Italiano";
  const description = c("footer.description", draft.subTitle || "");
  const linkGroups = [
    { title: "Explore", links: t.navItems.filter(({ slug }) => ["home", "about", "products", "contact"].includes(resolveSectionFromSlug(slug))) },
    { title: "More pages", links: t.navItems.filter(({ slug }) => !["home", "about", "products", "contact"].includes(resolveSectionFromSlug(slug))) },
  ];
  return (
    <footer className="italiano-footer">
      <div className="italiano-shell">
        {/^https?:\/\//i.test(newsletter) ? (
          <div className="italiano-newsletter">
            <h2>{c("footer.newsletter.title", "News from our kitchen")}</h2>
            <a className="italiano-button" href={newsletter} target="_blank" rel="noreferrer">Subscribe ↗</a>
          </div>
        ) : null}
        <div className="italiano-footer-grid">
          <div className="italiano-footer-identity">
            <button type="button" className="italiano-footer-brand" onClick={() => t.goToSection("home")}>
              {logo ? <ItalianoImage src={logo} alt={brand} /> : brand}
            </button>
            {description ? <p>{description}</p> : null}
            <SocialLinks />
          </div>
          <div className="italiano-footer-columns">
            {linkGroups.filter(({ links }) => links.length).map(({ title, links }) => (
              <nav className="italiano-footer-links" key={title} aria-label={title}>
                <h3>{title}</h3>
                {links.map(({ name, slug }) => {
                  const section = resolveSectionFromSlug(slug);
                  return (
                    <button key={slug} type="button" onClick={() => t.goToSection(slug)}
                      aria-current={section === t.currentSection ? "page" : undefined}>
                      {section === "products" && name === "Services" ? "Menu" : name}
                    </button>
                  );
                })}
              </nav>
            ))}
            {draft.openingHours?.length ? <div><h3>Opening hours</h3><ItalianoHours /></div> : null}
            {t.contactAddress || t.contactEmail || t.contactPhone ? (
              <div><h3>Contact</h3>
                <address className="italiano-footer-contact">
                  {t.contactAddress ? <p>{t.contactAddress}</p> : null}
                  {t.contactPhone ? <a href={"tel:" + t.contactPhone}><Phone aria-hidden="true" />{t.contactPhone}</a> : null}
                  {t.contactEmail ? <a href={"mailto:" + t.contactEmail}><Mail aria-hidden="true" />{t.contactEmail}</a> : null}
                </address>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="italiano-footer-bottom">
        <p className="italiano-shell">{t.footerCopyrightText || "© " + new Date().getFullYear() + " " + brand}</p>
      </div>
    </footer>
  );
}
