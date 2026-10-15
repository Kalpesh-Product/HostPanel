import React from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

/** The reference's bar: the first links on the left, the logo in the middle, the rest and a booking link on the right. */
export const GrindelwaldHeader: React.FC = () => {
  const { t, draft, primary, openLead, services } = useTpl();
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };
  const links = (t.navItems || []) as any[];
  const half = Math.ceil(links.length / 2);
  const left = links.slice(0, half);
  const right = links.slice(half);
  const isActive = (item: any) => t.currentSection === resolveSectionFromSlug(item.slug);
  const go = (item: any) => {
    t.setMobileMenuOpen(false);
    if (resolveSectionFromSlug(item.slug) === "products" && services.length === 1) t.goToProductPage(services[0].slug);
    else t.goToSection(item.slug);
  };
  const linkButton = (item: any) => (
    <button key={item.slug} type="button" className="gw-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => go(item)}>{item.name}</button>
  );

  return (
    <header className="gw-header sticky top-0 z-50 h-[80px]">
      <div className="tp-wrap grid h-full grid-cols-[1fr_auto] items-center gap-6 min-[900px]:grid-cols-[1fr_auto_1fr]">
        <nav className="hidden items-center gap-8 min-[900px]:flex" aria-label="Main">{left.map(linkButton)}</nav>
        <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center justify-center gap-2 text-left min-[900px]:justify-self-center">
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : (
            <>
              <svg width="22" height="26" viewBox="0 0 28 30" fill="none" stroke="var(--t-accent)" strokeWidth="2" aria-hidden="true"><path d="M14 2 26 12v16H2V12Z" /></svg>
              <span className="gw-brand truncate text-[24px]" style={{ color: "var(--t-accent)" }}>{draft?.companyName || "Home"}</span>
            </>
          )}
        </button>
        <div className="hidden items-center justify-end gap-8 min-[900px]:flex">
          {right.map(linkButton)}
          <button type="button" className="gw-cta-block" onClick={cta}>{hasLead ? "Reserve" : "Contact us"}</button>
        </div>
        <div className="flex justify-end min-[900px]:hidden">
          <button type="button" className="gw-iconbtn" aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
            {t.mobileMenuOpen ? Icon.close(18) : Icon.menu(18)}
          </button>
        </div>
      </div>
      {t.mobileMenuOpen ? (
        <div className="gw-header absolute inset-x-0 top-full px-6 pb-8 pt-4 min-[900px]:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((item) => <button key={item.slug} type="button" className="gw-mobile-link" onClick={() => go(item)}>{item.name}</button>)}
          </nav>
          <button type="button" className="gw-pill gw-pill-solid mt-6" onClick={cta}>{hasLead ? "Reserve" : "Contact us"}</button>
        </div>
      ) : null}
    </header>
  );
};

export const GrindelwaldFooter: React.FC = () => {
  const { t, draft } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  return (
    <footer className="gw-footer pb-8 pt-20">
      <div className="tp-wrap grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="gw-brand text-[30px]" style={{ color: "var(--t-accent)" }}>{name}</p>
          <p className="mt-5 max-w-xs text-[15px] leading-7 opacity-80">{t.footerAddress || draft?.address}</p>
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="gw-eyebrow opacity-60">Call us</p>
          {t.contactPhone ? <p><a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></p> : null}
          {t.contactEmail ? <p><a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p> : null}
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="gw-eyebrow opacity-60">Follow us</p>
          <div className="flex flex-wrap gap-4">
            {t.footerSocialLinks.map((social: any) => {
              const Tag: any = social.href ? "a" : "span";
              return <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="opacity-85 hover:opacity-100">{SOCIAL_ICON[social.key]}</Tag>;
            })}
          </div>
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="gw-eyebrow opacity-60">Hours</p>
          {hours.map((row) => <p key={row.days} className="opacity-80">{row.days}: {row.hours}</p>)}
        </div>
      </div>
      <div className="tp-wrap mt-16 border-t border-white/15 pt-6 text-[13px] opacity-60">
        {t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}
      </div>
    </footer>
  );
};
