import React, { useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { useWorkhub } from "./WorkhubContext";
import { WhIcon } from "./WorkhubUI";

const Brand: React.FC = () => {
  const { draft, t } = useWorkhub();
  return (
    <button
      type="button"
      className="wh-brand"
      onClick={() => t.goToSection("home")}
      aria-label="Go home"
    >
      {draft?.companyLogo ? (
        <img src={draft.companyLogo} alt={draft.companyName || "Logo"} />
      ) : null}
      <span className="wh-brand-name">
        {draft?.companyName || "WorkHub"}
      </span>
      <i className="wh-brand-tag">Meeting
        <br />
        Rooms
      </i>
    </button>
  );
};

export const WorkhubHeader: React.FC = () => {
  const { t, draft, navLabel, primary, openLead } = useWorkhub();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(28);
  const enabled = (flag?: boolean) => flag !== false;
  const links: [string, string][] = [
    ["home", navLabel("home", "Home")],
    ["about", navLabel("about", draft?.aboutTitle || "About")],
    ["products", navLabel("products", draft?.productTitle || "Services")],
    ["gallery", navLabel("gallery", "Gallery")],
    ["partner", navLabel("partner", "Partner")],
    ["careers", navLabel("careers", "Careers")],
    ["contact", navLabel("contact", "Contact")],
  ].filter(([section]) => {
    if (section === "products") return enabled(t.productsPageEnabled);
    if (section === "gallery") return enabled(t.galleryPageEnabled);
    if (section === "about") return enabled(t.aboutPageEnabled);
    if (section === "partner") return enabled(t.partnerPageEnabled);
    if (section === "careers") return enabled(t.careersPageEnabled);
    if (section === "contact") return enabled(t.contactPageEnabled);
    return true;
  }) as [string, string][];
  const book = () => {
    if (primary?.leadEnabled) openLead(primary);
    else t.goToSection("contact");
  };
  const go = (section: string) => {
    t.goToSection(section);
    setOpen(false);
  };
  return (
    <>
      <header className={`wh-header ${scrolled ? "wh-header-scrolled" : ""}`}>
        <div className="wh-shell wh-header-inner">
          <Brand />
          <nav className="wh-nav" aria-label="Main navigation">
            {links.map(([section, label]) => (
              <button
                key={section}
                type="button"
                className={
                  t.currentSection === section ? "wh-nav-active" : undefined
                }
                aria-current={
                  t.currentSection === section ? "page" : undefined
                }
                onClick={() => go(section)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="wh-header-actions">
            <button
              type="button"
              className="wh-menu"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              {WhIcon.menu()}
            </button>
            <button type="button" className="wh-btn wh-header-cta" onClick={book}>
              Book Room
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="wh-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="wh-drawer-backdrop"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            />
            <motion.div
              className="wh-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="wh-drawer-head">
                <Brand />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  {WhIcon.close()}
                </button>
              </div>
              <nav aria-label="Mobile navigation">
                {links.map(([section, label], index) => (
                  <button
                    key={section}
                    type="button"
                    aria-current={t.currentSection === section ? "page" : undefined}
                    onClick={() => go(section)}
                  >
                    <span>0{index + 1}</span>
                    {label}
                    {WhIcon.arrow()}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                className="wh-btn wh-drawer-cta"
                onClick={() => {
                  book();
                  setOpen(false);
                }}
              >
                Book Room {WhIcon.arrow()}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const WorkhubFooter: React.FC = () => {
  const { t, draft, c } = useWorkhub();
  return (
    <footer className="wh-footer">
      <div className="wh-shell">
        <div className="wh-footer-top">
          <div>
            <p className="wh-eyebrow">Stay connected</p>
            <h2>Let’s Keep in Touch with Us!</h2>
            <p>
              {c(
                "footer.about",
                "Contact us today to explore the possibilities of our dynamic workspace. Your ideal meeting room is just a message or call away.",
              )}
            </p>
            <div className="wh-footer-contact">
              {t.contactPhone ? (
                <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
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
            <form
              className="wh-newsletter"
              onSubmit={(event) => {
                event.preventDefault();
                t.goToSection("contact");
              }}
            >
              <label className="wh-sr" htmlFor="wh-newsletter">
                Email address
              </label>
              <input
                id="wh-newsletter"
                type="email"
                placeholder="Subscribe to our Newsletter"
                required
              />
              <button type="submit" aria-label="Continue to contact">
                {WhIcon.arrow()}
              </button>
            </form>
          </div>
          <div className="wh-footer-links">
            <div>
              <strong>Company</strong>
              <button type="button" onClick={() => t.goToSection("home")}>
                Home
              </button>
              <button type="button" onClick={() => t.goToSection("about")}>
                About
              </button>
              <button type="button" onClick={() => t.goToSection("careers")}>
                Careers
              </button>
            </div>
            <div>
              <strong>Explore</strong>
              <button type="button" onClick={() => t.goToSection("products")}>
                Services
              </button>
              <button type="button" onClick={() => t.goToSection("gallery")}>
                Gallery
              </button>
              <button type="button" onClick={() => t.goToSection("testimonials")}>
                Testimonials
              </button>
            </div>
            <div>
              <strong>Connect</strong>
              <button type="button" onClick={() => t.goToSection("partner")}>
                Partner
              </button>
              <button type="button" onClick={() => t.goToSection("contact")}>
                Contact
              </button>
              <button type="button" onClick={() => t.goToSection("contact")}>
                Enquire
              </button>
            </div>
          </div>
        </div>
        <div className="wh-footer-bottom">
          <span>
            © {new Date().getFullYear()} {draft?.companyName || "WorkHub"}
          </span>
          <span>Made for better meetings</span>
        </div>
      </div>
    </footer>
  );
};
