import React from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";
import { useScrolled } from "../motion";

/** A plain white bar: the business name centred, the page links split either side of it, the booking button on the right. */
export const LodgeHeader: React.FC = () => {
  const { t, draft, primary, profile, openLead, services } = useTpl();
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };
  const isActive = (item: any) => t.currentSection === resolveSectionFromSlug(item.slug);
  const links = (t.navItems || []) as any[];
  const half = Math.ceil(links.length / 2);
  const go = (item: any) => {
    t.setMobileMenuOpen(false);
    if (resolveSectionFromSlug(item.slug) === "products" && services.length === 1) t.goToProductPage(services[0].slug);
    else t.goToSection(item.slug);
  };

  return (
    <header className="ld-header sticky top-0 z-50 h-[80px]">
      <div className="tp-wrap grid h-full grid-cols-[1fr_auto] items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {/* Links split either side of a centred logo, so the bar reads differently from a left-logo header. */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {links.slice(0, half).map((item) => (
            <button key={item.slug} type="button" className="ld-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => go(item)}>{item.name}</button>
          ))}
        </nav>

        <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center justify-self-start gap-3 text-left lg:justify-self-center">
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[180px] object-contain" />
          ) : (
            <>
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M16 4 29 27H3Z" /><path d="M10.5 18h11" /></svg>
              <span className="truncate text-[18px] font-bold tracking-[-.02em]">{draft?.companyName || "Home"}</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-end gap-8">
          <nav className="hidden items-center gap-8 lg:flex" aria-label="More">
            {links.slice(half).map((item) => (
              <button key={item.slug} type="button" className="ld-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => go(item)}>{item.name}</button>
            ))}
          </nav>
          {/* Wrapped so the hidden/lg:block pair wins: .ld-btn sets its own display and would beat "hidden". */}
          <div className="hidden lg:block">
            <button type="button" className="ld-btn ld-btn-accent ld-btn-sm" onClick={cta}>
              {hasLead ? profile.labels.cta : "Contact us"}
            </button>
          </div>
          <div className="lg:hidden">
            <button type="button" className="ld-iconbtn" aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
              {t.mobileMenuOpen ? Icon.close(18) : Icon.menu(18)}
            </button>
          </div>
        </div>
      </div>
      {t.mobileMenuOpen ? (
        <div className="ld-header absolute inset-x-0 top-full border-t border-black/10 px-6 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((item) => <button key={item.slug} type="button" className="ld-mobile-link" onClick={() => go(item)}>{item.name}</button>)}
          </nav>
          <button type="button" className="ld-btn ld-btn-accent mt-6" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
        </div>
      ) : null}
    </header>
  );
};

/** Back-to-top button that slides in once the page has moved on from the hero. */
export const LodgeToTop: React.FC = () => {
  const scrolled = useScrolled(480);
  return (
    <button
      type="button"
      aria-label="Back to top"
      className="ld-totop"
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

export const LodgeFooter: React.FC = () => {
  const { t, draft } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  return (
    <footer className="ld-dark ld-footer mt-0 pb-10 pt-20">
      <div className="tp-wrap grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-[22px] font-bold tracking-[-.02em]">{name}</p>
          <p className="mt-5 max-w-xs text-[15px] leading-7 opacity-70">{t.footerAddress || draft?.address}</p>
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="text-[12px] uppercase tracking-[.14em] opacity-55">Inquiries</p>
          {t.contactPhone ? <p><a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></p> : null}
          {t.contactEmail ? <p><a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p> : null}
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="text-[12px] uppercase tracking-[.14em] opacity-55">Follow us</p>
          <div className="flex flex-wrap gap-4">
            {t.footerSocialLinks.map((social: any) => {
              const Tag: any = social.href ? "a" : "span";
              return <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="opacity-85 hover:opacity-100">{SOCIAL_ICON[social.key]}</Tag>;
            })}
          </div>
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="text-[12px] uppercase tracking-[.14em] opacity-55">Hours</p>
          {hours.map((row) => <p key={row.days} className="opacity-80">{row.days}: {row.hours}</p>)}
        </div>
      </div>
      <div className="tp-wrap mt-16 border-t border-white/15 pt-6 text-[13px] opacity-60">
        {t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}
      </div>
    </footer>
  );
};
