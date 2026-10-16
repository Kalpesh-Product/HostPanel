import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { Lightbox, Toast } from "../shared/TplParts";
import { useTastyc } from "./TastycContext";
import { Icon } from "./TastycUI";

const Logo: React.FC = () => {
  const { draft, t } = useTastyc();
  return (
    <button type="button" className="tc-logo" onClick={() => t.goToSection("home")} aria-label="Go to home">
      {draft?.companyLogo ? <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-12 w-auto max-w-[190px] object-contain brightness-0 invert" /> : <>{draft?.companyName || "Ember & Oak"}<span className="mt-2 block text-[8px] font-semibold uppercase tracking-[.38em] opacity-65">Coffee House</span></>}
    </button>
  );
};

export const TastycHeader: React.FC = () => {
  const { t, services, primary, profile, openLead } = useTastyc();
  const scrolled = useScrolled(24);
  const [servicesOpen, setServicesOpen] = useState(false);
  const menuOpen: boolean = t.mobileMenuOpen;
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = hasLead ? profile.labels.cta : "Contact";

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const active = (item: any) => t.currentSection === resolveSectionFromSlug(item.slug) || (t.currentSection === "home" && item.slug === "home");
  const act = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };

  return (
    <>
      <header className="tc-header" data-scrolled={scrolled ? "true" : "false"}>
        <div className="tc-wrap tc-header-inner">
          <Logo />
          <nav className="tc-nav" aria-label="Main navigation">
            {t.navItems.map((item: any) => {
              if (isProductsNavItem(item) && t.productsPageEnabled && services.length > 1) {
                return (
                  <div key={item.slug} className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                    <button type="button" className="tc-nav-link inline-flex items-center gap-1" aria-expanded={servicesOpen} aria-current={t.currentSection === "products" ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>
                      {item.name} {Icon.chevron()}
                    </button>
                    <AnimatePresence>
                      {servicesOpen ? (
                        <motion.div className="tc-dropdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                          {services.map((service) => <button key={service.key} type="button" onClick={() => { setServicesOpen(false); t.goToProductPage(service.slug); }}>{service.name}</button>)}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              }
              return <button key={item.slug} type="button" className="tc-nav-link" aria-current={active(item) ? "page" : undefined} onClick={() => t.goToSection(item.slug)}>{item.name}</button>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" className="tc-nav-cta hidden md:inline-flex items-center" onClick={act}>{cta}</button>
            <button type="button" className="flex h-11 w-11 items-center justify-center border border-white/25 lg:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => t.setMobileMenuOpen((value: boolean) => !value)}>
              {menuOpen ? Icon.close() : Icon.menu()}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div className="tc-mobile-panel" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {t.navItems.map((item: any, index: number) => (
                <motion.button key={item.slug} type="button" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .035 }} className="tc-serif border-b border-white/15 py-4 text-left text-[32px]" onClick={() => { t.setMobileMenuOpen(false); t.goToSection(item.slug); }}>{item.name}</motion.button>
              ))}
            </nav>
            {services.length > 1 ? <div className="mt-7 flex flex-wrap gap-2">{services.map((service) => <button key={service.key} type="button" className="border border-white/20 px-3 py-2 text-[10px] uppercase tracking-widest" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button>)}</div> : null}
            <button type="button" className="tc-btn tc-btn-primary mt-8 w-full" onClick={act}>{cta}</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const TastycFooter: React.FC = () => {
  const { t, draft, services, c } = useTastyc();
  const hours = groupOpeningHours(draft?.openingHours);
  const links = (t.navItems || []).filter((item: any) => !isProductsNavItem(item) || t.productsPageEnabled);
  return (
    <footer className="tc-footer">
      <div className="tc-wrap tc-footer-grid">
        <div>
          <Logo />
          <p className="mt-6 max-w-xs text-[13px] leading-6 text-white/55">{c("footer.about", t.aboutIntroBlocks?.[0] || "Coffee, food and time well spent — served fresh every day.")}</p>
          {t.footerSocialLinks.length ? <div className="mt-6 flex gap-3">{t.footerSocialLinks.map((social: any) => { const Tag: any = social.href ? "a" : "span"; return <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} className="flex h-10 w-10 items-center justify-center border border-white/15" aria-label={social.key}>{SOCIAL_ICON[social.key]}</Tag>; })}</div> : null}
        </div>
        <div>
          <p className="tc-footer-title">Explore</p>
          <ul className="space-y-3 text-[13px]">{links.map((item: any) => <li key={item.slug}><button type="button" onClick={() => t.goToSection(item.slug)}>{item.name}</button></li>)}</ul>
        </div>
        <div>
          <p className="tc-footer-title">{services.length > 1 ? "Our menu" : "Contact"}</p>
          {services.length > 1 ? <ul className="space-y-3 text-[13px]">{services.map((service) => <li key={service.key}><button type="button" onClick={() => t.goToProductPage(service.slug)}>{service.name}</button></li>)}</ul> : <div className="space-y-3 text-[13px] text-white/70">{t.contactPhone ? <a className="block" href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a> : null}{t.contactEmail ? <a className="block break-all" href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a> : null}{t.footerAddress ? <p>{t.footerAddress}</p> : null}</div>}
        </div>
        <div>
          <p className="tc-footer-title">Working hours</p>
          {hours.length ? <ul className="space-y-3 text-[12px]">{hours.map((row) => <li key={row.days} className="flex justify-between gap-4 border-b border-white/10 pb-3"><span className="text-white/55">{row.days}</span><span>{row.hours}</span></li>)}</ul> : <p className="text-[13px] text-white/55">{draft?.contactBusinessHours || "Contact us for today's hours."}</p>}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="tc-wrap flex flex-col justify-between gap-3 py-5 text-[10px] uppercase tracking-[.15em] text-white/45 sm:flex-row">
          <span>{t.footerCopyrightText || `© ${new Date().getFullYear()} ${t.footerCompanyName || draft?.companyName || "Coffee House"}`}</span>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button>
        </div>
      </div>
    </footer>
  );
};

export const TastycLightbox = Lightbox;
export const TastycToast = Toast;
