import React, { useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { useWorkscape } from "./WorkscapeContext";
import { WksIcon, WksImage } from "./WorkscapeUI";

const Brand: React.FC = () => {
  const { draft, t } = useWorkscape();
  return (
    <button
      type="button"
      className="wks-brand"
      onClick={() => t.goToSection("home")}
      aria-label="Go home"
    >
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
      ) : (
        <span>{draft?.companyName || "Workscape"}</span>
      )}
      <i>
        <b>◎</b> Best Meeting
        <br />
        Space 2026
      </i>
    </button>
  );
};

export const WorkscapeHeader: React.FC = () => {
  const { t, draft, navLabel, primary, openLead } = useWorkscape();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(28);
  const links = [
    ["home", navLabel("home", "Home")],
    ["about", navLabel("about", draft?.aboutTitle || "About")],
    ["products", navLabel("products", draft?.productTitle || "Services")],
    ["gallery", navLabel("gallery", "Gallery")],
    ["partner", navLabel("partner", "Partner")],
    ["careers", navLabel("careers", "Careers")],
    ["contact", navLabel("contact", "Contact")],
  ];
  const book = () =>
    primary?.leadEnabled && primary
      ? openLead(primary)
      : t.goToSection("contact");
  const go = (section: string) => {
    t.goToSection(section);
    setOpen(false);
  };
  return (
    <header className={`wks-header ${scrolled ? "wks-header-scrolled" : ""}`}>
      <div className="wks-shell wks-header-inner">
        <Brand />
        <div className="wks-header-actions">
          <button
            type="button"
            className="wks-menu"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            {WksIcon.menu()}
          </button>
          <button type="button" className="wks-book" onClick={book}>
            Book Room
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="wks-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="wks-drawer-backdrop"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.div
              className="wks-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <Brand />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  {WksIcon.close()}
                </button>
              </div>
              <nav>
                {links.map(([section, label], index) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => go(section)}
                  >
                    <span>0{index + 1}</span>
                    {label}
                    {WksIcon.arrow()}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                className="wks-book"
                onClick={() => {
                  book();
                  setOpen(false);
                }}
              >
                Book Room
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
};

export const WorkscapeFooter: React.FC = () => {
  const { t, draft, c } = useWorkscape();
  const image = t.galleryItems?.[4] || t.galleryItems?.[0] || t.homeHeroImage;
  return (
    <footer className="wks-footer">
      <div className="wks-shell">
        <div className="wks-footer-card">
          <div className="wks-footer-copy">
            <h2>{c("home.contact.title", "Let’s Keep in Touch with Us!")}</h2>
            <p>
              {c(
                "home.contact.body",
                "Contact us today to explore the possibilities of our dynamic workspace. Your ideal meeting room is just a message or call away.",
              )}
            </p>
            <div className="wks-footer-contact">
              {t.contactPhone ? (
                <a
                  href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}
                >
                  <span>Phone</span>
                  <b>{t.contactPhone}</b>
                </a>
              ) : null}
              {t.contactEmail ? (
                <a href={`mailto:${t.contactEmail}`}>
                  <span>Email</span>
                  <b>{t.contactEmail}</b>
                </a>
              ) : null}
              {t.contactAddress ? (
                <div>
                  <span>Address</span>
                  <b>{t.contactAddress}</b>
                </div>
              ) : null}
            </div>
            <div className="wks-footer-links">
              <div>
                <strong>Company</strong>
                <button onClick={() => t.goToSection("home")}>Home</button>
                <button onClick={() => t.goToSection("about")}>About</button>
                <button onClick={() => t.goToSection("careers")}>
                  Careers
                </button>
              </div>
              <div>
                <strong>Explore</strong>
                <button onClick={() => t.goToSection("products")}>
                  Spaces
                </button>
                <button onClick={() => t.goToSection("gallery")}>
                  Gallery
                </button>
                <button onClick={() => t.goToSection("partner")}>
                  Partner
                </button>
              </div>
            </div>
            <small>
              © {new Date().getFullYear()} {draft?.companyName || "Workscape"}
            </small>
          </div>
          <div className="wks-footer-visual">
            <WksImage src={image} alt="Workspace community" />
            <span className="wks-footer-mark">✣</span>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                t.goToSection("contact");
              }}
            >
              <label htmlFor="wks-newsletter">Newsletter</label>
              <div>
                <input
                  id="wks-newsletter"
                  type="email"
                  placeholder="Enter your email..."
                />
                <button type="submit" aria-label="Continue to contact">
                  →
                </button>
              </div>
            </form>
            <button
              type="button"
              className="wks-footer-brand"
              onClick={() => t.goToSection("home")}
            >
              {draft?.companyName || "Workscape"}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
