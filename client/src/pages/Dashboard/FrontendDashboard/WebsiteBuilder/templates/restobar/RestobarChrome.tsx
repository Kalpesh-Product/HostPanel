import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { SOCIAL_ICON } from "../socialIcons";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useRestobar } from "./RestobarContext";
import { RestobarHours, RestobarImage } from "./RestobarUI";

export function RestobarHeader() {
  const { t, draft, services, openLead, c } = useRestobar();
  const booking = services.find((service) => service.kind === "menu" && service.leadEnabled);
  const { pathname } = useLocation();
  const drawer = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);

  const book = () => {
    drawer.current?.close();
    const heading = document.getElementById("resto-reservation-title");
    if (heading) heading.focus();
    else if (booking) openLead(booking);
  };

  const nav = (mobile: boolean) => t.navItems.map((item: { name: string; slug: string }) => (
    <button key={item.slug} type="button"
      aria-current={resolveSectionFromSlug(item.slug) === t.currentSection ? "page" : undefined}
      onClick={() => {
        if (mobile) drawer.current?.close();
        t.goToSection(item.slug);
      }}>
      {item.name}
    </button>
  ));

  return (
    <>
      <a className="resto-skip" href="#resto-main">Skip to content</a>
      <header className="resto-header">
        <div className="resto-shell resto-masthead">
          {t.contactAddress ? (
            <a className="resto-location" href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(t.contactAddress)}
              target="_blank" rel="noreferrer">
              <span aria-hidden="true">⌖</span>
              <span><b>{c("header.location", "Our location")}</b><small>{t.contactAddress}</small></span>
            </a>
          ) : null}
          <button type="button" className="resto-wordmark" onClick={() => t.goToSection("home")} aria-label="Home">
            {draft.companyLogo ? <RestobarImage src={draft.companyLogo} alt={draft.companyName || "Restobar"} eager /> : draft.companyName || "Restobar"}
          </button>
          {booking ? <button type="button" className="resto-button resto-header-book" onClick={book}>{c("booking.cta", "Book a table")}</button> : null}
        </div>
        <div className="resto-nav-bar">
          <div className="resto-shell resto-nav-row">
            <div className="resto-header-socials"><SocialLinks /></div>
            <nav className="resto-desktop-nav" aria-label="Main navigation">{nav(false)}</nav>
            <button type="button" className="resto-menu-toggle" aria-label="Open menu" aria-expanded={menuOpen}
              aria-controls="resto-mobile-menu" onClick={() => {
                drawer.current?.showModal();
                setMenuOpen(true);
              }}><span aria-hidden="true" /></button>
          </div>
        </div>
      </header>
      <dialog id="resto-mobile-menu" className="resto-dialog resto-drawer" aria-label="Site menu" ref={drawer}
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}>
        <div className="resto-drawer-inner">
          <div className="resto-drawer-head">
            <button type="button" className="resto-drawer-brand" onClick={() => {
              drawer.current?.close();
              t.goToSection("home");
            }} aria-label="Home">
              {draft.companyLogo ? <RestobarImage src={draft.companyLogo} alt={draft.companyName || "Restobar"} /> : draft.companyName || "Restobar"}
            </button>
            <button type="button" className="resto-dialog-close" aria-label="Close menu" autoFocus onClick={() => drawer.current?.close()}>×</button>
          </div>
          <nav aria-label="Site menu">{nav(true)}</nav>
          {booking ? <button type="button" className="resto-button" onClick={book}>{c("booking.cta", "Book a table")}</button> : null}
          <div className="resto-drawer-details">
            <SocialLinks labeled />
            {t.contactPhone || t.contactEmail ? (
              <address className="resto-drawer-contact">
                {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
                {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
              </address>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}

function SocialLinks({ labeled = false }: { labeled?: boolean }) {
  const { t } = useRestobar();
  return (
    <div className="resto-socials">
      {t.footerSocialLinks.map(({ key, href }: { key: string; href: string }) => href ? (
        <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={labeled ? undefined : key}>
          <span aria-hidden="true">{SOCIAL_ICON[key] || key.slice(0, 1).toUpperCase()}</span>
          {labeled ? key.charAt(0).toUpperCase() + key.slice(1) : null}
        </a>
      ) : null)}
    </div>
  );
}

export function RestobarFooter() {
  const { t, draft, c } = useRestobar();
  const newsletter = c("footer.newsletter", "");
  return (
    <footer className="resto-footer">
      <div className="resto-shell">
        {/^https?:\/\//i.test(newsletter) ? (
          <div className="resto-newsletter">
            <h2>{c("footer.newsletter.title", "News from our kitchen")}</h2>
            <a className="resto-button" href={newsletter} target="_blank" rel="noreferrer">Subscribe ↗</a>
          </div>
        ) : null}
        <div className="resto-footer-grid">
          <div>
            <button type="button" className="resto-footer-brand" onClick={() => t.goToSection("home")}>
              {draft.companyLogo ? <RestobarImage src={draft.companyLogo} alt={draft.companyName || "Restobar"} /> : draft.companyName || "Restobar"}
            </button>
            <SocialLinks />
          </div>
          {t.contactEmail || t.contactPhone ? (
            <div><h3>Contact us</h3>
              {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
            </div>
          ) : null}
          {t.contactAddress ? <div><h3>Address</h3><p>{t.contactAddress}</p></div> : null}
          {draft.openingHours?.length ? <div><h3>Opening hours</h3><RestobarHours /></div> : null}
        </div>
        <p className="resto-copyright">{t.footerCopyrightText || "© " + new Date().getFullYear() + " " + (draft.companyName || "Restobar")}</p>
      </div>
    </footer>
  );
}
