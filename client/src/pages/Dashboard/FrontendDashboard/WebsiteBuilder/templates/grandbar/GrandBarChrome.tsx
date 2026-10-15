import React, { useEffect } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useGrandBar } from "./GrandBarContext";
import { GbIcon, GbSeal } from "./GrandBarUI";

export const GrandBarHeader: React.FC = () => {
  const { t, primary, openLead } = useGrandBar();
  const scrolled = useScrolled(24);
  const menuOpen = Boolean(t.mobileMenuOpen);
  const items = (t.navItems || []).filter((item: any) => !isProductsNavItem(item) || t.productsPageEnabled);
  // The reference keeps the top bar to three links either side of the seal (Home, Our Menus,
  // About) — everything else (Partner, Careers, Contact...) stays reachable from the footer and
  // the mobile overlay, which already lists every page, instead of crowding the desktop bar.
  const coreSlugs = ["home", "products", "about"];
  const leftItems = coreSlugs.map((slug) => items.find((item: any) => resolveSectionFromSlug(item.slug) === slug)).filter(Boolean);
  // The shared nav falls back to the generic label "Services" for the products page;
  // the reference calls that link "Our Menus", which reads right for a bar/restaurant.
  const navLabel = (item: any) => resolveSectionFromSlug(item.slug) === "products" ? "Our Menus" : item.name;
  useEffect(() => { document.body.style.overflow = menuOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menuOpen]);
  const active = (item: any) => t.currentSection === resolveSectionFromSlug(item.slug) || (t.currentSection === "home" && item.slug === "home");
  const reserve = () => primary?.leadEnabled ? openLead(primary) : t.goToSection("contact");
  return <>
    <header className="gb-header" data-scrolled={scrolled ? "true" : "false"}>
      <div className="gb-frame gb-header-inner">
        <nav className="gb-nav gb-nav-left" aria-label="Primary navigation">{leftItems.map((item: any) => <button key={item.slug} type="button" aria-current={active(item) ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>{navLabel(item)}</button>)}</nav>
        <button type="button" className="gb-logo" onClick={() => t.goToSection("home")} aria-label="Go to home"><GbSeal compact/></button>
        <div className="gb-header-right">
          <div className="gb-header-actions"><button type="button" className="gb-outline-button" onClick={reserve}>Book a table</button><button type="button" className="gb-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => t.setMobileMenuOpen((value: boolean) => !value)}>{menuOpen ? GbIcon.close(23) : GbIcon.menu(23)}</button></div>
        </div>
      </div>
    </header>
    <AnimatePresence>
      {menuOpen ? <motion.div className="gb-menu-overlay" initial={{ clipPath: "inset(0 0 100% 0)" }} animate={{ clipPath: "inset(0 0 0% 0)" }} exit={{ clipPath: "inset(0 0 100% 0)" }} transition={{ duration: .62, ease: [0.22, 1, 0.36, 1] }}>
        <div className="gb-menu-overlay-inner"><p className="gb-kicker">Navigate</p><nav>{items.map((item: any, index: number) => <motion.button key={item.slug} type="button" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 + index * .045 }} onClick={() => { t.setMobileMenuOpen(false); t.goToSection(item.slug); }}><span>0{index + 1}</span>{navLabel(item)}</motion.button>)}</nav><button type="button" className="gb-outline-button" onClick={() => { t.setMobileMenuOpen(false); reserve(); }}>Book a table</button></div>
      </motion.div> : null}
    </AnimatePresence>
  </>;
};

export const GrandBarFooter: React.FC = () => {
  const { t, draft, c, primary, openLead } = useGrandBar();
  const hours = groupOpeningHours(draft?.openingHours);
  const items = (t.navItems || []).filter((item: any) => !isProductsNavItem(item) || t.productsPageEnabled);
  const navLabel = (item: any) => resolveSectionFromSlug(item.slug) === "products" ? "Our Menus" : item.name;
  return <footer className="gb-footer">
    <div className="gb-frame"><h2>{c("footer.title", "Connect with us")}</h2>
    <div className="gb-footer-grid">
      <div><button type="button" className="gb-footer-seal" onClick={() => t.goToSection("home")}><GbSeal/></button><p>{c("footer.about", t.aboutIntroBlocks?.[0] || "Cocktails, food and a room made for memorable evenings.")}</p></div>
      <div><p className="gb-footer-label">Explore</p>{items.map((item: any) => <button key={item.slug} type="button" onClick={() => t.goToSection(item.slug)}>{navLabel(item)}</button>)}</div>
      <div><p className="gb-footer-label">Follow us</p>{t.footerSocialLinks.map((social: any) => { const Tag: any = social.href ? "a" : "span"; return <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} className="gb-social"><span>{SOCIAL_ICON[social.key]}</span>{social.key}</Tag>; })}</div>
      <div><p className="gb-footer-label">Find us</p><p>{t.footerAddress || t.contactAddress}</p>{hours.slice(0, 2).map((row) => <p key={row.days}>{row.days}: {row.hours}</p>)}<button type="button" className="gb-outline-button" onClick={() => primary?.leadEnabled ? openLead(primary) : t.goToSection("contact")}>Book a table</button></div>
    </div><div className="gb-footer-bottom"><span>{t.footerCopyrightText || "© " + new Date().getFullYear() + " " + (draft?.companyName || "Grand Bar")}</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button></div></div>
  </footer>;
};
