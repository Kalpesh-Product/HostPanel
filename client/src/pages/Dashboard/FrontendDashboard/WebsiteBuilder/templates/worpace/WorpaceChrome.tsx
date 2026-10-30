import React, { useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { useWorpace } from "./WorpaceContext";
import { Icon } from "./WorpaceUI";

const Brand: React.FC = () => {
  const { draft, t } = useWorpace();
  return (
    <button
      type="button"
      className="wp-brand"
      onClick={() => t.goToSection("home")}
      aria-label="Go to home"
    >
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
      ) : (
        <>
          <span className="wp-mark">
            <i />
            <i />
            <i />
          </span>
          <b>{draft?.companyName || "Worpace"}</b>
        </>
      )}
    </button>
  );
};

export const WorpaceHeader: React.FC = () => {
  const { t, draft } = useWorpace();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(24);
  // Driven by the business's own configured navigation (same as every other template), so a
  // page like Gallery that's enabled there actually shows up here instead of a fixed guess list.
  const links = ((t.navItems || []) as any[]).map((item) => ({
    slug: item.slug,
    label: item.name,
  }));
  const isActive = (slug: string) =>
    t.currentSection === resolveSectionFromSlug(slug);
  return (
    <>
      <header
        className={`wp-header ${t.currentSection === "home" ? "wp-header-home" : ""} ${scrolled ? "wp-header-scrolled" : ""}`}
      >
        <div className="wp-shell wp-header-inner">
          <Brand />
          <nav>
            {links.map((link, index) => (
              <button
                key={link.slug}
                type="button"
                onClick={() => t.goToSection(link.slug)}
                aria-current={isActive(link.slug) ? "page" : undefined}
              >
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <b>{link.label}</b>
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="wp-cta wp-header-cta"
            onClick={() => t.goToSection("products")}
          >
            {draft?.CTAButtonText || "Get Started"} {Icon.arrow()}
          </button>
          <button
            type="button"
            className="wp-menu"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            {Icon.menu()}
          </button>
        </div>
      </header>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="wp-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              className="wp-mobile-backdrop"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.div
              className="wp-mobile-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <Brand />
                <button type="button" onClick={() => setOpen(false)}>
                  {Icon.close()}
                </button>
              </div>
              <nav>
                {links.map((link, i) => (
                  <button
                    key={link.slug}
                    type="button"
                    aria-current={isActive(link.slug) ? "page" : undefined}
                    onClick={() => {
                      t.goToSection(link.slug);
                      setOpen(false);
                    }}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {link.label}
                    {Icon.arrow()}
                  </button>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const WorpaceFooter: React.FC = () => {
  const { t, draft, services, c } = useWorpace();
  const socials = Object.entries(t.socialLinks || {})
    .filter(([, value]) => value)
    .slice(0, 4);
  return (
    <footer className="wp-footer">
      <div className="wp-shell">
        <div className="wp-footer-cta">
          <h2>{c("footer.cta", "Have questions? Reach out anytime.")}</h2>
          <button
            type="button"
            className="wp-cta wp-cta-light"
            onClick={() => t.goToSection("contact")}
          >
            Get in touch {Icon.arrow()}
          </button>
        </div>
        <div className="wp-footer-grid">
          <div>
            <Brand />
            <p>
              {c(
                "footer.about",
                "A flexible workspace for focused work, useful connections and teams building what comes next.",
              )}
            </p>
            <div className="wp-socials">
              {socials.map(([key, url]) => (
                <a
                  key={key}
                  href={String(url)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={key}
                >
                  {SOCIAL_ICON[key]?.(18) || key.slice(0, 1).toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          <div>
            <strong>Quick links</strong>
            {((t.navItems || []) as any[]).map((item) => (
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
            <strong>Our spaces</strong>
            {services.slice(0, 5).map((service) => (
              <button
                type="button"
                key={service.key}
                onClick={() => t.goToProductPage(service.slug)}
              >
                {service.name}
              </button>
            ))}
          </div>
          <div>
            <strong>Contact</strong>
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                {t.contactPhone}
              </a>
            ) : null}
            {t.contactEmail ? (
              <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
            ) : null}
            {t.contactAddress ? <span>{t.contactAddress}</span> : null}
          </div>
        </div>
        <div className="wp-footer-bottom">
          <span>
            © {new Date().getFullYear()} {draft?.companyName || "Worpace"}
          </span>
          <span>Space to think. People to grow.</span>
        </div>
      </div>
    </footer>
  );
};
