import { useRef } from "react";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useCoPlace } from "./CoPlaceContext";
import { CoPlaceHours, CoPlaceImage } from "./CoPlaceUI";

function SocialLinks() {
  const { t } = useCoPlace();
  return (
    <div className="coplace-socials">
      {t.footerSocialLinks.map(({ key, href }: { key: string; href: string }) => href ? (
        <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={key}>
          <span aria-hidden="true">{SOCIAL_ICON[key] || key.charAt(0).toUpperCase()}</span>
        </a>
      ) : null)}
    </div>
  );
}

export function CoPlaceHeader() {
  const { t, draft, primary, services, c, openLead } = useCoPlace();
  const drawer = useRef<HTMLDialogElement>(null);
  const hours = groupOpeningHours(Array.isArray(draft.openingHours) ? draft.openingHours : []);
  const booking = primary?.leadEnabled ? primary : services.find((service) => service.leadEnabled);
  const book = () => {
    drawer.current?.close();
    if (booking) openLead(booking);
  };
  const bookingLabel = booking?.kind === "workspace" && draft.tourBooking?.enabled !== false
    ? c("booking.cta", "Book a tour") : c("booking.enquire", "Enquire now");
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
      <a className="coplace-skip" href="#coplace-main">Skip to content</a>
      <header className="coplace-header">
        <div className="coplace-shell coplace-utility">
          <SocialLinks />
          <div>
            {t.contactPhone ? <a href={"tel:" + t.contactPhone}>{t.contactPhone}</a> : null}
            {hours.length ? <span>{hours[0].days} · {hours[0].hours}</span> : null}
            {t.contactEmail ? <a href={"mailto:" + t.contactEmail}>{t.contactEmail}</a> : null}
          </div>
        </div>
        <div className="coplace-shell coplace-nav-row">
          <button className="coplace-brand" type="button" onClick={() => t.goToSection("home")} aria-label="Home">
            {draft.companyLogo ? <CoPlaceImage src={draft.companyLogo} alt={draft.companyName || "CoPlace"} eager /> : <><span className="coplace-mark" aria-hidden="true" />{draft.companyName || "CoPlace"}</>}
          </button>
          <nav className="coplace-desktop-nav" aria-label="Main navigation">{nav()}</nav>
          <div className="coplace-header-actions">
            {booking ? <button type="button" className="coplace-button" onClick={book}>{bookingLabel}</button> : null}
            <button type="button" className="coplace-menu-toggle" aria-label="Open menu" aria-haspopup="dialog"
              aria-controls="coplace-menu" onClick={() => drawer.current?.showModal()}><span aria-hidden="true" /></button>
          </div>
        </div>
      </header>
      <dialog className="coplace-dialog coplace-drawer" id="coplace-menu" aria-label="Site menu" ref={drawer}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <div className="coplace-dialog-inner">
          <button type="button" className="coplace-dialog-close" aria-label="Close menu" onClick={() => drawer.current?.close()}>×</button>
          <p className="coplace-brand">{draft.companyName || "CoPlace"}</p>
          <nav aria-label="Site menu">{nav()}</nav>
          {booking ? <button type="button" className="coplace-button" onClick={book}>{bookingLabel}</button> : null}
          <SocialLinks />
        </div>
      </dialog>
    </>
  );
}

export function CoPlaceFooter() {
  const { t, draft, c } = useCoPlace();
  const newsletter = c("footer.newsletter.url", "");
  return (
    <footer className="coplace-footer">
      <div className="coplace-shell">
        {/^https?:\/\//i.test(newsletter) ? <div className="coplace-newsletter">
          <h2>{c("footer.newsletter.title", "Updates from our workspace")}</h2>
          <a className="coplace-button" href={newsletter} target="_blank" rel="noreferrer">Subscribe ↗</a>
        </div> : null}
        <div className="coplace-footer-grid">
          <div>
            <button type="button" className="coplace-brand" onClick={() => t.goToSection("home")}>
              {draft.companyLogo ? <CoPlaceImage src={draft.companyLogo} alt={draft.companyName || "CoPlace"} /> : draft.companyName || "CoPlace"}
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
          <CoPlaceHours />
        </div>
        <p className="coplace-copyright">{t.footerCopyrightText || "© " + new Date().getFullYear() + " " + (draft.companyName || "CoPlace")}</p>
      </div>
    </footer>
  );
}
