import React, { useEffect } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { isProductsNavItem } from "../templateNavigation";
import { SOCIAL_ICON } from "../socialIcons";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { useAromatica } from "./AromaticaContext";
import { AromaArrow } from "./AromaticaUI";

const RoastMark = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path
      d="M31 7c7 5 6 11 0 16-5 4-6 9-2 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M18 16c1 7 6 10 12 9 8-1 14 3 14 10 0 8-8 14-17 12-7-2-11-8-9-14"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M11 28c-2 13 7 25 21 27 12 2 23-5 26-16M10 39c6-3 11-2 15 2M43 14c7 3 11 9 11 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const Wordmark = () => {
  const { draft } = useAromatica();
  return (
    <span className="aroma-wordmark">
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt="" />
      ) : (
        <RoastMark />
      )}
      <b title={draft?.companyName || "Aromatica"}>
        {draft?.companyName || "Aromatica"}
      </b>
    </span>
  );
};

export const AromaticaHeader: React.FC = () => {
  const { t, primary, openLead } = useAromatica();
  const scrolled = useScrolled(20);
  const open = Boolean(t.mobileMenuOpen);
  const items = (t.navItems || []).filter(
    (item: any) => !isProductsNavItem(item) || t.productsPageEnabled,
  );
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const reserve = () =>
    primary ? openLead(primary) : t.goToSection("contact");
  const label = (item: any) =>
    resolveSectionFromSlug(item.slug) === "products" ? "Menu" : item.name;
  return (
    <>
      <header
        className="aroma-header"
        data-scrolled={scrolled ? "true" : "false"}
      >
        <div className="aroma-shell aroma-header-inner">
          <button
            type="button"
            className="aroma-logo"
            onClick={() => t.goToSection("home")}
          >
            <Wordmark />
          </button>
          <nav aria-label="Primary navigation">
            {items.slice(0, 7).map((item: any) => (
              <button
                type="button"
                key={item.slug}
                aria-current={
                  t.currentSection === resolveSectionFromSlug(item.slug)
                    ? "page"
                    : undefined
                }
                onClick={() => t.goToSection(item.slug)}
              >
                {label(item)}
              </button>
            ))}
          </nav>
          <button type="button" className="aroma-header-cta" onClick={reserve}>
            Reserve a table
          </button>
          <button
            type="button"
            className="aroma-menu-toggle"
            onClick={() => t.setMobileMenuOpen((value: boolean) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="aroma-mobile-menu"
            initial={{ clipPath: "circle(0% at 92% 6%)" }}
            animate={{ clipPath: "circle(145% at 92% 6%)" }}
            exit={{ clipPath: "circle(0% at 92% 6%)" }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          >
            <Wordmark />
            <nav>
              {items.map((item: any, index: number) => (
                <motion.button
                  type="button"
                  key={item.slug}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + index * 0.045 }}
                  onClick={() => {
                    t.setMobileMenuOpen(false);
                    t.goToSection(item.slug);
                  }}
                >
                  <span>0{index + 1}</span>
                  {label(item)}
                </motion.button>
              ))}
            </nav>
            <button
              className="aroma-header-cta"
              type="button"
              onClick={() => {
                t.setMobileMenuOpen(false);
                reserve();
              }}
            >
              Reserve a table <AromaArrow />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const AromaticaFooter: React.FC = () => {
  const { t, draft, c } = useAromatica();
  const items = (t.navItems || []).filter(
    (item: any) => !isProductsNavItem(item) || t.productsPageEnabled,
  );
  return (
    <footer className="aroma-footer">
      <div className="aroma-shell">
        <div className="aroma-footer-top">
          <Wordmark />
          <nav>
            {items.slice(0, 5).map((item: any) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => t.goToSection(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="aroma-footer-grid">
          <div>
            <p>{c("footer.location", "Bengaluru —")}</p>
            <p>{t.footerAddress || t.contactAddress}</p>
          </div>
          <div>
            <a href={`tel:${t.contactPhone}`}>{t.contactPhone}</a>
            <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
          </div>
          <div>
            <p>Get fresh updates.</p>
            <button type="button" onClick={() => t.goToSection("contact")}>
              Just subscribe
            </button>
          </div>
        </div>
        <div className="aroma-footer-bottom">
          <span>
            {t.footerCopyrightText ||
              `© ${new Date().getFullYear()} ${draft?.companyName || "Aromatica"}. All rights reserved.`}
          </span>
          <div>
            {t.footerSocialLinks.map((social: any) => {
              const Tag: any = social.href ? "a" : "span";
              return (
                <Tag
                  key={social.key}
                  aria-label={social.key}
                  {...(social.href
                    ? { href: social.href, target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {SOCIAL_ICON[social.key]}
                </Tag>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};
