import React from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";

/** The reference's header: wordmark on the left, the page links centred, search and the booking
 * button on the right. Its own header rather than Wayfarer's, so the two read differently. */
export const TravigoHeader: React.FC = () => {
  const { t, draft, primary, profile, openLead, services } = useTpl();
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };
  const isActive = (item: any) => t.currentSection === resolveSectionFromSlug(item.slug);
  const links = (t.navItems || []) as any[];
  const navButton = (item: any) => (
    <button
      key={item.slug}
      type="button"
      className="trv-navlink"
      aria-current={isActive(item) ? "page" : undefined}
      onClick={() => {
        t.setMobileMenuOpen(false);
        if (resolveSectionFromSlug(item.slug) === "products" && services.length === 1) t.goToProductPage(services[0].slug);
        else t.goToSection(item.slug);
      }}
    >
      {item.name}
    </button>
  );

  return (
    <header className="trv-header sticky top-0 z-50">
      <div className="tp-wrap grid h-[56px] grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center justify-self-start text-left">
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-8 w-auto max-w-[160px] object-contain" />
          ) : (
            <span className="trv-wordmark truncate">{draft?.companyName || "Home"}</span>
          )}
        </button>

        <nav className="hidden items-center justify-center gap-9 lg:flex" aria-label="Main">
          {links.map(navButton)}
        </nav>

        <div className="flex items-center justify-end gap-3">
          <button type="button" className="trv-iconbtn" aria-label="Search rooms" onClick={() => (services.length ? t.goToProductPage(services[0].slug) : t.goToSection("products"))}>{Icon.search(17)}</button>
          <button type="button" className="tp-btn tp-btn-primary tp-btn-sm hidden lg:inline-flex" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
          <div className="lg:hidden">
            <button type="button" className="trv-iconbtn" aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
              {t.mobileMenuOpen ? Icon.close(18) : Icon.menu(18)}
            </button>
          </div>
        </div>
      </div>
      {t.mobileMenuOpen ? (
        <div className="border-t border-black/10 bg-[var(--t-bg)] px-6 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">{links.map((item) => <button key={item.slug} type="button" className="trv-mobile-link text-left" onClick={() => { t.setMobileMenuOpen(false); t.goToSection(item.slug); }}>{item.name}</button>)}</nav>
          <button type="button" className="tp-btn tp-btn-primary mt-6 w-full" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
        </div>
      ) : null}
    </header>
  );
};

export const TravigoFooter: React.FC = () => {
  const { t, draft } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  return (
    <footer className="trv-footer mt-24 border-t border-black/10 pb-10 pt-14">
      <div className="tp-wrap grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="trv-wordmark text-[26px]">{name}</p>
          <p className="tp-muted mt-4 max-w-sm text-[15px] leading-7">{t.footerAddress || draft?.address}</p>
        </div>
        <div className="space-y-2 text-[15px]">
          {t.contactPhone ? <p><a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></p> : null}
          {t.contactEmail ? <p><a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p> : null}
          <div className="flex gap-3 pt-2">
            {t.footerSocialLinks.map((social: any) => {
              const Tag: any = social.href ? "a" : "span";
              return <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="trv-iconbtn">{SOCIAL_ICON[social.key]}</Tag>;
            })}
          </div>
        </div>
        <div className="space-y-1 text-[14px] opacity-75">
          {hours.map((row) => <p key={row.days}>{row.days}: {row.hours}</p>)}
        </div>
      </div>
      <div className="tp-wrap mt-12 border-t border-black/10 pt-6 text-[13px] opacity-60">
        {t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}
      </div>
    </footer>
  );
};
