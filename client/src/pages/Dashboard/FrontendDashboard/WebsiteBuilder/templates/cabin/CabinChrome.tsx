import { useRef, useState } from "react";
import { SOCIAL_ICON } from "../socialIcons";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useCabin } from "./CabinContext";
import { CabinHours, CabinImage } from "./CabinUI";

function SocialLinks() {
  const { t } = useCabin();
  return <div className="cabin-socials">
    {t.footerSocialLinks.map(({ key, href }: { key: string; href: string; }) => href ? (
      <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={key}>
        <span aria-hidden="true">{SOCIAL_ICON[key] || key.charAt(0).toUpperCase()}</span>
      </a>
    ) : null)}
  </div>;
}

export function CabinHeader() {
  const { t, draft, primary, services, c, openLead } = useCabin();
  const drawer = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const book = () => {
    drawer.current?.close();
    if (booking) openLead(booking);
  };
  const nav = () => t.navItems.map(({ name, slug }: { name: string; slug: string; }) => (
    <button type="button" key={slug} aria-current={resolveSectionFromSlug(slug) === t.currentSection ? "page" : undefined}
      onClick={() => {
        drawer.current?.close();
        t.goToSection(slug);
      }}>{name}<span aria-hidden="true">↗</span>
    </button>
  ));

  return <>
    <a className="cabin-skip" href="#cabin-main">Skip to content</a>
    <header className="cabin-header">
      <button className="cabin-brand" type="button" onClick={() => t.goToSection("home")} aria-label="Home">
        {draft.companyLogo ? <CabinImage src={draft.companyLogo} alt={draft.companyName || "Cabin"} eager /> : draft.companyName || "Cabin"}
      </button>
      <nav className="cabin-desktop-nav" aria-label="Main navigation">{nav()}</nav>
      <div className="cabin-header-actions">
        {booking ? <button type="button" className="cabin-header-book" onClick={book}>{c("booking.cta", "Book a stay")} <span aria-hidden="true">↗</span>
        </button> : null}
        <button type="button" className="cabin-menu-toggle" aria-label="Open menu" aria-haspopup="dialog"
          aria-expanded={menuOpen} aria-controls="cabin-menu" onClick={() => {
            drawer.current?.showModal();
            setMenuOpen(true);
          }}>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>
    </header>
    <dialog className="cabin-dialog cabin-drawer" id="cabin-menu" aria-label="Site menu" ref={drawer}
      onClose={() => setMenuOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="cabin-dialog-inner">
        <div className="cabin-drawer-top">
          <p className="cabin-brand">{draft.companyName || "Cabin"}</p>
          <button type="button" className="cabin-dialog-close" aria-label="Close menu" onClick={() => drawer.current?.close()}>×</button>
        </div>
        <nav aria-label="Site menu">{nav()}</nav>
        {booking ? <button type="button" className="cabin-button" onClick={book}>{c("booking.cta", "Book a stay")} ↗</button> : null}
        <SocialLinks />
      </div>
    </dialog>
  </>;
}

export function CabinFooter() {
  const { t, draft, c } = useCabin();
  return <footer className="cabin-footer">
    <div className="cabin-shell">
      <div className="cabin-footer-grid">
        <div className="cabin-footer-intro">
          <button type="button" className="cabin-brand" onClick={() => t.goToSection("home")}>
            {draft.companyLogo ? <CabinImage src={draft.companyLogo} alt={draft.companyName || "Cabin"} /> : draft.companyName || "Cabin"}
          </button>
          <h2>{c("footer.title", "Get in touch with us")}</h2>
          {c("footer.body", draft.subTitle || "") ? <p>{c("footer.body", draft.subTitle || "")}</p> : null}
          <SocialLinks />
        </div>
        <nav aria-label="Footer navigation">
          <h3>{c("footer.navigation", "Explore")}</h3>
          {t.navItems.map(({ name, slug }: { name: string; slug: string; }) => <button key={slug} type="button" onClick={() => t.goToSection(slug)}>{name}</button>)}
        </nav>
        <div>
          <h3>{c("footer.contact", "Visit us")}</h3>
          <address>
            {t.contactAddress ? <p>{t.contactAddress}</p> : null}
            {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
            {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
          </address>
          <CabinHours />
        </div>
      </div>
      <p className="cabin-copyright">{t.footerCopyrightText || "© " + new Date().getFullYear() + " " + (draft.companyName || "Cabin")}</p>
    </div>
  </footer>;
}
