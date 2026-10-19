import React, { useState } from "react";
import { AnimatePresence, motion } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { useBrixspace } from "./BrixspaceContext";
import { BxIcon } from "./BrixspaceUI";

export const BrixspaceHeader: React.FC = () => {
  const { t, draft, services, primary, profile, kind, openLead } =
    useBrixspace();
  const [drop, setDrop] = useState(false);
  const active = (item: any) =>
    t.currentSection === resolveSectionFromSlug(item.slug) ||
    (t.currentSection === "home" && item.slug === "home");
  const cta = () =>
    primary?.leadEnabled ? openLead(primary) : t.goToSection("contact");
  const isMenu = kind === "menu";
  const primaryLabel = profile.labels.cta;
  const secondaryLabel = isMenu ? "View Menu" : "Enquire";
  const secondaryAction = () => t.goToSection(isMenu ? "products" : "contact");
  return (
    <header className="bx-header">
      <div className="bx-shell bx-header-inner">
        <button
          className="bx-brand"
          type="button"
          onClick={() => t.goToSection("home")}
        >
          {draft.companyLogo ? (
            <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
          ) : (
            <>
              <span aria-hidden="true" />
              <strong>
                {draft.companyName || "Brix Rooms"}
                <i>.</i>
              </strong>
            </>
          )}
        </button>
        <nav className="bx-nav" aria-label="Main navigation">
          {t.navItems.map((item: any) =>
            isProductsNavItem(item) && t.productsPageEnabled ? (
              <div
                key={item.slug}
                className="bx-nav-drop"
                onMouseEnter={() => setDrop(true)}
                onMouseLeave={() => setDrop(false)}
              >
                <button
                  type="button"
                  className={active(item) ? "active" : ""}
                  onClick={() => t.goToSection(item.slug)}
                >
                  {item.name}
                  <span className="bx-plus"></span>
                </button>
                <AnimatePresence>
                  {drop && services.length > 1 ? (
                    <motion.div
                      className="bx-dropdown"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                    >
                      {services.map((service) => (
                        <button
                          type="button"
                          key={service.key}
                          onClick={() => {
                            setDrop(false);
                            t.goToProductPage(service.slug);
                          }}
                        >
                          {service.name}
                          {BxIcon.arrow(14)}
                        </button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <button
                key={item.slug}
                type="button"
                className={active(item) ? "active" : ""}
                onClick={() => t.goToSection(item.slug)}
              >
                {item.name}
              </button>
            ),
          )}
        </nav>
        <div className="bx-header-actions">
          <button type="button" className="bx-book" onClick={cta}>
            {primaryLabel} {BxIcon.arrow(15)}
          </button>
          <button
            type="button"
            className="bx-enquire"
            onClick={secondaryAction}
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            className="bx-menu"
            onClick={() => t.setMobileMenuOpen((v: boolean) => !v)}
            aria-label="Toggle menu"
          >
            {t.mobileMenuOpen ? BxIcon.close() : BxIcon.menu()}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {t.mobileMenuOpen ? (
          <motion.nav
            className="bx-mobile"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {t.navItems.map((item: any) => (
              <button
                type="button"
                key={item.slug}
                onClick={() => t.goToSection(item.slug)}
              >
                {item.name}
                {isProductsNavItem(item) ? <span></span> : null}
              </button>
            ))}
            <div className="bx-mobile-actions">
              <button type="button" className="bx-book" onClick={cta}>
                {primaryLabel}
              </button>
              <button
                type="button"
                className="bx-enquire"
                onClick={secondaryAction}
              >
                {secondaryLabel}
              </button>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
};

export const BrixspaceFooter: React.FC = () => {
  const { t, draft, primary, profile, kind, openLead, c } = useBrixspace();
  const name = t.footerCompanyName || draft.companyName || "Brix Rooms";
  const isMenu = kind === "menu";
  return (
    <footer className="bx-footer">
      <div className="bx-shell">
        <div className="bx-footer-cta">
          <div>
            <p className="bx-kicker">
              {isMenu ? "Join us at the table" : "Start a conversation"}
            </p>
            <h2>
              {c(
                "footer.cta",
                isMenu
                  ? "Good food tastes better together."
                  : "Ready to meet where you belong?",
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={() =>
              primary?.leadEnabled
                ? openLead(primary)
                : t.goToSection("contact")
            }
          >
            {profile.labels.cta} {BxIcon.arrow()}
          </button>
        </div>
        <div className="bx-footer-grid">
          <div>
            <button
              className="bx-brand bx-brand-light"
              type="button"
              onClick={() => t.goToSection("home")}
            >
              <span aria-hidden="true" />
              <strong>
                {name}
                <i>.</i>
              </strong>
            </button>
            <p>
              {c(
                "footer.about",
                isMenu
                  ? "Fresh plates, thoughtful coffee and warm hospitality from the first order to the last sip."
                  : "Thoughtful meeting rooms, reliable technology and hospitality that keeps every conversation moving.",
              )}
            </p>
            {t.footerSocialLinks.length ? (
              <div className="bx-social">
                {t.footerSocialLinks.map((s: any) => {
                  const Tag: any = s.href ? "a" : "span";
                  return (
                    <Tag
                      key={s.key}
                      {...(s.href
                        ? { href: s.href, target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {SOCIAL_ICON[s.key]}
                    </Tag>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div>
            <p className="bx-footer-label">Explore</p>
            {t.navItems.map((item: any) => (
              <button
                type="button"
                key={item.slug}
                onClick={() => t.goToSection(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div>
            <p className="bx-footer-label">Contact</p>
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                {t.contactPhone}
              </a>
            ) : null}
            {t.contactEmail ? (
              <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
            ) : null}
            <p>{t.footerAddress}</p>
          </div>
        </div>
        <div className="bx-footer-bottom">
          <span>
            {t.footerCopyrightText || `© ${new Date().getFullYear()} ${name}`}
          </span>
          <span>
            {isMenu
              ? "Made fresh. Served warmly."
              : "Space to connect. Room to grow."}
          </span>
        </div>
      </div>
    </footer>
  );
};
