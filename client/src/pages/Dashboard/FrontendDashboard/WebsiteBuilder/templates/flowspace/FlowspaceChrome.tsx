import React, { useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { SOCIAL_ICON } from "../socialIcons";
import { useFlowspace } from "./FlowspaceContext";
import { Icon } from "./FlowspaceUI";

const Mark: React.FC = () => {
  const { draft, t } = useFlowspace();
  return (
    <button
      type="button"
      className="fs-brand"
      onClick={() => t.goToSection("home")}
      aria-label="Go home"
    >
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
      ) : (
        <>
          <span className="fs-brand-dot">⌘</span>
          <span>{draft?.companyName || "Lumen Rooms"}</span>
        </>
      )}
    </button>
  );
};

export const FlowspaceHeader: React.FC = () => {
  const { t, draft, navLabel } = useFlowspace();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(36);
  const action = () => t.goToSection("products");
  const links = [
    { label: navLabel("home", "Home"), section: "home" },
    {
      label: navLabel("about", draft?.aboutTitle || "About"),
      section: "about",
    },
    {
      label: navLabel("products", draft?.productTitle || "Services"),
      section: "products",
    },
    { label: navLabel("partner", "Partner"), section: "partner" },
    { label: navLabel("careers", "Careers"), section: "careers" },
    { label: navLabel("contact", "Contact Us"), section: "contact" },
  ];
  return (
    <header
      className={`fs-header ${t.currentSection === "home" ? "fs-header-home" : ""} ${scrolled ? "fs-header-scrolled" : ""}`}
    >
      <div className="fs-shell fs-header-inner">
        <Mark />
        <nav className="fs-nav" aria-label="Primary">
          {links.map((item) => (
            <button
              key={item.section}
              type="button"
              aria-current={
                t.currentSection === item.section ? "page" : undefined
              }
              onClick={() => t.goToSection(item.section)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="fs-pill-btn fs-header-cta"
          onClick={action}
        >
          Find your desk
        </button>
        <button
          type="button"
          className="fs-menu"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          {Icon.menu()}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fs-mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fs-mobile-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="fs-mobile-top">
                <Mark />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                >
                  {Icon.close()}
                </button>
              </div>
              <nav>
                {links.map((item) => (
                  <button
                    key={item.section}
                    type="button"
                    aria-current={
                      t.currentSection === item.section ? "page" : undefined
                    }
                    onClick={() => {
                      t.goToSection(item.section);
                      setOpen(false);
                    }}
                  >
                    {item.label}
                    <span>{Icon.arrow()}</span>
                  </button>
                ))}
              </nav>
              <button
                type="button"
                className="fs-pill-btn"
                onClick={() => {
                  action();
                  setOpen(false);
                }}
              >
                Find your desk {Icon.arrow()}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
};

export const FlowspaceFooter: React.FC = () => {
  const { t, draft, primary, openLead, c } = useFlowspace();
  const social = Object.entries(draft?.socialLinks || {}).filter(
    ([, value]) => value,
  );
  return (
    <footer className="fs-footer">
      <div className="fs-shell">
        <div className="fs-footer-cta">
          <div>
            <p className="fs-kicker">Make room for better work</p>
            <h2>{c("footer.cta", "Your next great meeting starts here.")}</h2>
          </div>
          <button
            type="button"
            className="fs-pill-btn fs-pill-light"
            onClick={() =>
              primary?.leadEnabled && primary
                ? openLead(primary)
                : t.goToSection("contact")
            }
          >
            Book a room {Icon.arrow()}
          </button>
        </div>
        <div className="fs-footer-grid">
          <div>
            <Mark />
            <p>
              {c(
                "footer.about",
                "Flexible meeting rooms designed for clear thinking, useful conversations and teams in motion.",
              )}
            </p>
          </div>
          <div>
            <strong>Navigate</strong>
            {(t.navItems || []).slice(0, 7).map((item: any) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => t.goToSection(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div>
            <strong>Contact</strong>
            {t.contactAddress ? <span>{t.contactAddress}</span> : null}
            {t.contactPhone ? (
              <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                {t.contactPhone}
              </a>
            ) : null}
            {t.contactEmail ? (
              <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
            ) : null}
          </div>
          <div>
            <strong>Follow</strong>
            <div className="fs-socials">
              {social.map(([key, value]) => (
                <a
                  key={key}
                  href={String(value)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={key}
                >
                  {SOCIAL_ICON[key]?.(17) || key.slice(0, 1).toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="fs-footer-bottom">
          <span>
            © {new Date().getFullYear()} {draft?.companyName || "Lumen Rooms"}
          </span>
          <span>Space to think. Room to move.</span>
        </div>
      </div>
    </footer>
  );
};
