import React from "react";
import { useScrolled } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { useTpl } from "../shared/TplContext";
import { Icon } from "../shared/TplUI";

export const CaliHostelHeader: React.FC = () => {
  const { t, draft, primary, services, openLead } = useTpl();
  const links = (t.navItems || []) as any[];
  const go = (item: any) => { t.setMobileMenuOpen(false); if (resolveSectionFromSlug(item.slug) === "products" && services.length === 1) t.goToProductPage(services[0].slug); else t.goToSection(item.slug); };
  const book = () => { t.setMobileMenuOpen(false); primary?.leadEnabled ? openLead(primary) : t.goToSection("contact"); };
  return <header className="ch-header"><div className="ch-nav-shell"><button type="button" className="ch-brand" onClick={() => t.goToSection("home")}>{draft?.companyLogo ? <img src={draft.companyLogo} alt="" /> : <span className="ch-brand-mark">{String(draft?.companyName || "M").charAt(0)}</span>}<span>{draft?.companyName || "Marea House"}</span></button><nav className="ch-desktop-nav" aria-label="Main navigation">{links.map((item) => <button key={item.slug} type="button" className={t.currentSection === resolveSectionFromSlug(item.slug) ? "is-active" : ""} onClick={() => go(item)}>{item.name}</button>)}</nav><button type="button" className="ch-book-nav" onClick={book}>Book your stay</button><button type="button" className="ch-menu" aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} onClick={() => t.setMobileMenuOpen((v: boolean) => !v)}>{t.mobileMenuOpen ? Icon.close(18) : Icon.menu(18)}</button></div>{t.mobileMenuOpen ? <div className="ch-mobile-panel">{links.map((item, index) => <button key={item.slug} type="button" onClick={() => go(item)}><span>{String(index + 1).padStart(2, "0")}</span>{item.name}</button>)}<button type="button" className="ch-mobile-book" onClick={book}>Book your stay</button></div> : null}</header>;
};

/** Back-to-top button that slides in once the page has moved on from the hero. */
export const CaliHostelToTop: React.FC = () => {
  const scrolled = useScrolled(480);
  return (
    <button
      type="button"
      aria-label="Back to top"
      className="ch-totop"
      style={{ opacity: scrolled ? 1 : 0, transform: scrolled ? "translateY(0)" : "translateY(130%)", pointerEvents: scrolled ? "auto" : "none" }}
      onClick={() => {
        const scroller = document.getElementById("scrollable-content");
        if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>{Icon.chevron(18)}</span>
    </button>
  );
};

export const CaliHostelFooter: React.FC = () => {
  const { t, draft } = useTpl();
  const name = t.footerCompanyName || draft?.companyName || "Marea House";
  return <footer className="ch-footer"><div className="ch-shell"><div className="ch-footer-title"><span>STAY</span><strong>{name}</strong><span>CURIOUS</span></div><div className="ch-footer-grid"><div><p className="ch-footer-kicker">Find us</p><p>{t.footerAddress || draft?.address}</p></div><div><p className="ch-footer-kicker">Say hello</p>{t.contactPhone ? <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a> : null}{t.contactEmail ? <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a> : null}</div><div><p className="ch-footer-kicker">Follow the trip</p><div className="ch-socials">{t.footerSocialLinks.map((s: any) => { const Tag: any = s.href ? "a" : "span"; return <Tag key={s.key} {...(s.href ? { href: s.href, target: "_blank", rel: "noreferrer" } : {})}>{SOCIAL_ICON[s.key]}</Tag>; })}</div></div></div><div className="ch-footer-bottom"><span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}</span><span>Sleep well. Wander farther.</span></div></div></footer>;
};
