import React from "react";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { groupOpeningHours } from "../templateKit";
import { Icon } from "../shared/TplUI";
import { useTpl } from "../shared/TplContext";
import { useScrolled } from "../motion";

/** A plain bar: the logo on the left, the page links in a row, and a full-height booking block on the right. */
export const TulumHeader: React.FC = () => {
  const { t, draft, primary, profile, openLead, services } = useTpl();
  const hasLead = Boolean(primary?.leadEnabled);
  const cta = () => {
    t.setMobileMenuOpen(false);
    if (hasLead && primary) openLead(primary);
    else t.goToSection("contact");
  };
  const links = (t.navItems || []) as any[];
  const isActive = (item: any) => t.currentSection === resolveSectionFromSlug(item.slug);
  const go = (item: any) => {
    t.setMobileMenuOpen(false);
    if (resolveSectionFromSlug(item.slug) === "products" && services.length === 1) t.goToProductPage(services[0].slug);
    else t.goToSection(item.slug);
  };

  return (
    <header className="tk-header sticky top-0 z-50 h-[80px]">
      <div className="tp-wrap flex h-full items-center justify-between gap-6">
        <button type="button" onClick={() => t.goToSection("home")} aria-label="Go to home" className="flex min-w-0 items-center gap-3 text-left">
          {draft?.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : (
            <>
              <svg width="28" height="30" viewBox="0 0 28 30" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M14 2 26 12v16H2V12Z" /><path d="M9 28V19h10v9" /></svg>
              <span className="tk-brand truncate text-[22px]">{draft?.companyName || "Home"}</span>
            </>
          )}
        </button>

        {/* The reference right-aligns its links in one cluster, with the booking block at the far right edge. */}
        <div className="flex h-full items-center">
          <nav className="hidden items-center gap-5 min-[900px]:flex" aria-label="Main">
            {links.map((item) => (
              <button key={item.slug} type="button" className="tk-navlink" aria-current={isActive(item) ? "page" : undefined} onClick={() => go(item)}>{item.name}</button>
            ))}
          </nav>
          <div className="hidden h-full min-[900px]:ml-10 min-[900px]:-mr-[25px] min-[900px]:block">
            <button type="button" className="tk-cta-block" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
          </div>
          <div className="min-[900px]:hidden">
            <button type="button" className="tk-iconbtn" aria-label={t.mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={t.mobileMenuOpen} onClick={() => t.setMobileMenuOpen((open: boolean) => !open)}>
              {t.mobileMenuOpen ? Icon.close(18) : Icon.menu(18)}
            </button>
          </div>
        </div>
      </div>
      {t.mobileMenuOpen ? (
        <div className="tk-header absolute inset-x-0 top-full border-t border-black/10 px-6 pb-8 pt-4 min-[900px]:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((item) => <button key={item.slug} type="button" className="tk-mobile-link" onClick={() => go(item)}>{item.name}</button>)}
          </nav>
          <button type="button" className="tk-pill tk-pill-solid mt-6" onClick={cta}>{hasLead ? profile.labels.cta : "Contact us"}</button>
        </div>
      ) : null}
    </header>
  );
};

/** The vertical "contact us" tab on the left edge; it jumps straight to the contact page. */
export const TulumSideTab: React.FC = () => {
  const { t, c } = useTpl();
  return (
    <button type="button" className="tk-sidetab" onClick={() => t.goToSection("contact")} aria-label={c("home.sidetab", "Contact us")}>
      {c("home.sidetab", "Contact us")}
    </button>
  );
};

/** Back-to-top button that appears once the page has moved on from the hero. */
export const TulumToTop: React.FC = () => {
  const scrolled = useScrolled(480);
  return (
    <button
      type="button"
      aria-label="Back to top"
      className="tk-totop"
      style={{ opacity: scrolled ? 1 : 0, transform: scrolled ? "translateY(0)" : "translateY(120%)", pointerEvents: scrolled ? "auto" : "none" }}
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

export const TulumFooter: React.FC = () => {
  const { t, draft } = useTpl();
  const hours = groupOpeningHours(draft?.openingHours);
  const name = t.footerCompanyName || draft?.companyName || "";
  return (
    <footer className="tk-footer mt-0 pb-10 pt-20">
      <div className="tp-wrap grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="tk-brand text-[30px]">{name}</p>
          <p className="mt-5 max-w-xs text-[15px] leading-7 opacity-75">{t.footerAddress || draft?.address}</p>
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="tk-eyebrow opacity-60">Call us</p>
          {t.contactPhone ? <p><a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>{t.contactPhone}</a></p> : null}
          {t.contactEmail ? <p><a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a></p> : null}
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="tk-eyebrow opacity-60">Follow us</p>
          <div className="flex flex-wrap gap-4">
            {t.footerSocialLinks.map((social: any) => {
              const Tag: any = social.href ? "a" : "span";
              return <Tag key={social.key} {...(social.href ? { href: social.href, target: "_blank", rel: "noreferrer" } : {})} aria-label={social.key} className="opacity-85 hover:opacity-100">{SOCIAL_ICON[social.key]}</Tag>;
            })}
          </div>
        </div>
        <div className="space-y-3 text-[15px]">
          <p className="tk-eyebrow opacity-60">Hours</p>
          {hours.map((row) => <p key={row.days} className="opacity-80">{row.days}: {row.hours}</p>)}
        </div>
      </div>
      <div className="tp-wrap mt-16 border-t border-white/15 pt-6 text-[13px] opacity-60">
        {t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}
      </div>
    </footer>
  );
};
