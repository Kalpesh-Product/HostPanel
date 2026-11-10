import React, { useState } from "react";
import { AnimatePresence, motion, useScrolled } from "../motion";
import { resolveSectionFromSlug } from "../useWebsiteTemplateData";
import { SOCIAL_ICON } from "../socialIcons";
import { useCobox } from "./CoboxContext";
import { CCtaButton, CEyebrow, CIcon } from "./CoboxUI";

const Brand: React.FC<{ light?: boolean }> = ({ light }) => {
  const { draft } = useCobox();
  const name = draft?.companyName || "Cobox";
  return (
    <span className="cbx-brand">
      <span className="cbx-brand-tile">
        {draft?.companyLogo ? (
          <img src={draft.companyLogo} alt={name} />
        ) : (
          name.trim().charAt(0).toUpperCase()
        )}
      </span>
      <span className="cbx-brand-name" style={light ? { color: "#fff" } : undefined}>
        {name}
      </span>
    </span>
  );
};

export const CoboxHeader: React.FC = () => {
  const { t } = useCobox();
  const scrolled = useScrolled(24);
  const [open, setOpen] = useState(false);
  const links = ((t.navItems || []) as any[]).map((item) => ({
    slug: item.slug,
    label: item.name,
  }));
  const cta = () => t.goToSection("contact");
  return (
    <>
      <div className={`cbx-headwrap ${scrolled ? "is-scrolled" : ""}`}>
        <header className="cbx-headbar">
          <button
            type="button"
            onClick={() => t.goToSection("home")}
            aria-label="Go to home"
            style={{ background: "none", padding: 0 }}
          >
            <Brand />
          </button>
          <nav className="cbx-nav" aria-label="Main navigation">
            {links.map((link) => (
              <button
                type="button"
                key={link.slug}
                aria-current={
                  t.currentSection === resolveSectionFromSlug(link.slug)
                    ? "page"
                    : undefined
                }
                onClick={() => t.goToSection(link.slug)}
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="cbx-headend">
            <CCtaButton onClick={cta}>Schedule a Free Tour</CCtaButton>
            <button
              type="button"
              className="cbx-burger"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              {CIcon.menu()}
            </button>
          </div>
        </header>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="cbx-drawer"
            style={{ position: "fixed", inset: 0, zIndex: 80 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(8,24,28,.6)",
                backdropFilter: "blur(4px)",
              }}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: "min(360px, 88vw)",
                background: "var(--cbx-dark)",
                color: "#fff",
                padding: "22px 24px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Brand light />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  style={{ color: "#fff" }}
                >
                  {CIcon.close()}
                </button>
              </div>
              <nav
                aria-label="Mobile navigation"
                style={{ display: "grid", gap: 2, marginTop: 10 }}
              >
                {links.map((link, index) => (
                  <button
                    type="button"
                    key={link.slug}
                    onClick={() => {
                      t.goToSection(link.slug);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 0",
                      borderBottom: "1px solid rgba(255,255,255,.14)",
                      color: "#fff",
                      fontSize: 17,
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,.45)",
                        letterSpacing: ".12em",
                      }}
                    >
                      0{index + 1}
                    </span>
                    {link.label}
                    <span style={{ marginLeft: "auto", color: "var(--t-accent)" }}>
                      {CIcon.arrow(16)}
                    </span>
                  </button>
                ))}
              </nav>
              <CCtaButton
                className="mt-auto"
                onClick={() => {
                  setOpen(false);
                  cta();
                }}
              >
                Schedule a Free Tour
              </CCtaButton>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const CoboxFooter: React.FC = () => {
  const { t, draft, services, c } = useCobox();
  const socials = Object.entries(t.socialLinks || {}).filter(([, value]) => value);
  const quick = ((t.navItems || []) as any[]).slice(0, 5);
  return (
    <footer className="cbx-footer">
      <div className="cbx-shell">
        <div className="cbx-footer-box">
          <button
            type="button"
            onClick={() => t.goToSection("home")}
            style={{ background: "none", padding: 0, textAlign: "left" }}
          >
            <span className="cbx-footer-brand">
              <span className="cbx-brand-tile">
                {draft?.companyLogo ? (
                  <img src={draft.companyLogo} alt={draft?.companyName || "Logo"} />
                ) : (
                  String(draft?.companyName || "Cobox").trim().charAt(0).toUpperCase()
                )}
              </span>
              <span className="cbx-brand-name">{draft?.companyName || "Cobox"}</span>
            </span>
          </button>
          {t.contactPhone ? (
            <div className="cbx-footer-contact">
              <i>{CIcon.phone()}</i>
              <div>
                <h4>Contact</h4>
                <a href={`tel:${String(t.contactPhone).replace(/[^\d+]/g, "")}`}>
                  {t.contactPhone}
                </a>
              </div>
            </div>
          ) : null}
          {t.contactEmail ? (
            <div className="cbx-footer-contact">
              <i>{CIcon.mail()}</i>
              <div>
                <h4>E-mail</h4>
                <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
              </div>
            </div>
          ) : null}
          {t.contactAddress ? (
            <div className="cbx-footer-contact">
              <i>{CIcon.pin()}</i>
              <div>
                <h4>Address</h4>
                <span>{t.contactAddress}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="cbx-footer-grid">
          <div>
            <CEyebrow light>{c("footer.eyebrow", "Our community")}</CEyebrow>
            <p>
              {c(
                "footer.about",
                `We are more than just a workspace — we're a thriving community where professionals, startups and innovators come together to collaborate, create and grow.`
              )}
            </p>
            <div className="cbx-socials">
              {socials.slice(0, 4).map(([key, url]) => (
                <a
                  key={key}
                  href={String(url)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={key}
                >
                  {SOCIAL_ICON[key] || key.slice(0, 1).toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4>Quick links</h4>
            <div className="cbx-footer-links">
              {quick.map((item) => (
                <button
                  type="button"
                  key={item.slug}
                  onClick={() => t.goToSection(item.slug)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>Services</h4>
            <div className="cbx-footer-links">
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
          </div>
          <div>
            <h4>Subscribe to our newsletter</h4>
            <form
              className="cbx-news"
              onSubmit={(event) => {
                event.preventDefault();
                t.goToSection("contact");
              }}
            >
              <input
                type="email"
                required
                placeholder="Email Address*"
                aria-label="Email Address"
              />
              <button type="submit" aria-label="Subscribe">
                {CIcon.send()}
              </button>
            </form>
            <p className="cbx-footer-note">
              * Subscribe now for workspace tips and community updates.
            </p>
          </div>
        </div>

        <div className="cbx-footer-bottom">
          <span>
            © {new Date().getFullYear()} {draft?.companyName || "Cobox"}. All rights
            reserved.
          </span>
          <div>
            <button type="button" onClick={() => t.goToSection("contact")}>
              Terms &amp; conditions
            </button>
            <button type="button" onClick={() => t.goToSection("contact")}>
              Privacy policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
