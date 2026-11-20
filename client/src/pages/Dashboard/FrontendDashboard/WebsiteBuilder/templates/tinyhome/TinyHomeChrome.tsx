import { useRef } from "react";
import { SOCIAL_ICON } from "../socialIcons";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useTinyHome } from "./TinyHomeContext";
import { TinyHomeHours, TinyHomeImage } from "./TinyHomeUI";

function SocialLinks() {
  const { t } = useTinyHome();
  return (
    <div className="tinyhome-socials">
      {t.footerSocialLinks.map(({ key, href }: { key: string; href: string }) => href ? (
        <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={key}>
          <span aria-hidden="true">{SOCIAL_ICON[key] || key.charAt(0).toUpperCase()}</span>
        </a>
      ) : null)}
    </div>
  );
}

export function TinyHomeHeader() {
  const { t, draft, primary, services, c, openLead } = useTinyHome();
  const drawer = useRef<HTMLDialogElement>(null);
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const book = () => {
    drawer.current?.close();
    const heading = document.getElementById("tinyhome-request");
    if (heading) heading.focus();
    else if (booking) openLead(booking);
  };
  const nav = () => t.navItems.map(({ name, slug }: { name: string; slug: string }) => (
    <button type="button" key={slug} aria-current={resolveSectionFromSlug(slug) === t.currentSection ? "page" : undefined}
      onClick={() => {
        drawer.current?.close();
        t.goToSection(slug);
      }}>
      {name}
    </button>
  ));

  return (
    <>
      <a className="tinyhome-skip" href="#tinyhome-main">Skip to content</a>
      <header className="tinyhome-header">
        <div className="tinyhome-shell tinyhome-nav-row">
          <button className="tinyhome-brand" type="button" onClick={() => t.goToSection("home")} aria-label="Home">
            {draft.companyLogo ? <TinyHomeImage src={draft.companyLogo} alt={draft.companyName || "Tiny Home"} eager /> : draft.companyName || "Tiny Home"}
          </button>
          <nav className="tinyhome-desktop-nav" aria-label="Main navigation">{nav()}</nav>
          <div className="tinyhome-header-actions">
            <SocialLinks />
            {booking ? <button type="button" className="tinyhome-button" onClick={book}>{c("booking.cta", "Book a stay")}</button> : null}
            <button type="button" className="tinyhome-menu-toggle" aria-label="Open menu" aria-haspopup="dialog"
              aria-controls="tinyhome-menu" onClick={() => drawer.current?.showModal()}><span aria-hidden="true" /></button>
          </div>
        </div>
      </header>
      <dialog className="tinyhome-dialog tinyhome-drawer" id="tinyhome-menu" aria-label="Site menu" ref={drawer}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <div className="tinyhome-dialog-inner">
          <button type="button" className="tinyhome-dialog-close" aria-label="Close menu" onClick={() => drawer.current?.close()}>×</button>
          <p className="tinyhome-brand">{draft.companyName || "Tiny Home"}</p>
          <nav aria-label="Site menu">{nav()}</nav>
          {booking ? <button type="button" className="tinyhome-button" onClick={book}>{c("booking.cta", "Book a stay")}</button> : null}
          <SocialLinks />
        </div>
      </dialog>
    </>
  );
}

export function TinyHomeFooter() {
  const { t, draft } = useTinyHome();
  return (
    <footer className="tinyhome-footer">
      <div className="tinyhome-shell">
        <div className="tinyhome-footer-grid">
          <div>
            <button type="button" className="tinyhome-brand" onClick={() => t.goToSection("home")}>
              {draft.companyLogo ? <TinyHomeImage src={draft.companyLogo} alt={draft.companyName || "Tiny Home"} /> : draft.companyName || "Tiny Home"}
            </button>
            <SocialLinks />
          </div>
          {t.contactAddress || t.contactEmail || t.contactPhone ? (
            <address>
              {t.contactAddress ? <p>{t.contactAddress}</p> : null}
              {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
              {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
            </address>
          ) : null}
          <TinyHomeHours />
        </div>
        <p className="tinyhome-copyright">{t.footerCopyrightText || "© " + new Date().getFullYear() + " " + (draft.companyName || "Tiny Home")}</p>
      </div>
    </footer>
  );
}
