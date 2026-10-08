import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, buildTemplateVars, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { getServiceProfile } from "../verticalProfiles";
import { contentCopy, contentImage } from "../templateContent";
import { TplProvider, type TplCtx } from "../shared/TplContext";
import { LeadModal } from "../shared/TplLead";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { WayfarerCareers } from "../wayfarer/WayfarerPages";
import { TulumFooter, TulumHeader, TulumSideTab, TulumToTop } from "./TulumChrome";
import { TulumHome } from "./TulumHome";
import { TulumItemDetail, TulumServicePage, TulumServicesIndex } from "./TulumRentals";
import { TulumAbout, TulumContact, TulumGallery, TulumPartner, TulumTestimonials } from "./TulumPages";
import { TULUM_CSS, TULUM_PALETTE } from "./tulumTheme";

const TulumTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [leadTarget, setLeadTarget] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  // The loading screen shows for about a second and a half, then the page fades in underneath it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  const services = useMemo(() => (draft ? buildServices(draft, t.productPages) : []), [draft, t.productPages]);
  const primary = useMemo(() => resolvePrimaryService(draft, services), [draft, services]);
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(() => openStatus(draft?.openingHours), [draft?.openingHours]);
  const visualProfile = useMemo(() => ({ ...profile, palette: { ...profile.palette, ...TULUM_PALETTE } }), [profile]);
  const themeVars = useMemo(() => buildTemplateVars("tulum", draft, visualProfile), [draft, visualProfile]);

  if (!draft) return <div className="wf tk" style={themeVars}><style>{TULUM_CSS}</style><div className="tp-wrap py-24"><h1 className="tk-h2">Preview</h1><p className="tk-muted mt-2">No preview data found. Go back to Create Website and click Preview.</p></div></div>;

  const openLead: TplCtx["openLead"] = (service, item = null, prefill) => {
    t.openLeadModal({ ...(service.page || {}), ...(item?.raw || {}), name: item?.title || service.name, heading: service.heading, slug: service.slug }, prefill);
    setLeadTarget({ service, item });
  };
  const closeLead = () => { setLeadTarget(null); t.closeLeadModal(); };
  const ctx: TplCtx = {
    t, draft, services, primary, kind, profile, rating, status, openLead,
    goToService: (service, opts) => { const q = new URLSearchParams(opts?.search || {}); if (opts?.category) q.set("cat", opts.category); const qs = q.toString(); if (qs) navigate(`/website-preview/page/products/${service.slug}?${qs}`); else t.goToProductPage(service.slug); },
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    navLabel: (section, fallback) => { const match = (t.navItems || []).find((item: any) => resolveSectionFromSlug(item.slug) === section); return String(match?.name || "").trim() || fallback; },
    c: (key, fallback) => contentCopy(draft, key, fallback),
    photo: (key, fallback) => contentImage(draft, key, fallback),
  };
  const renderProducts = () => {
    const service = services.find((s) => s.slug === t.currentProductSlug);
    if (!service) return <TulumServicesIndex />;
    const item = t.currentItemSlug ? service.items.find((i) => i.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <TulumItemDetail key={item.key} service={service} item={item} /> : <TulumServicePage key={service.key} service={service} />;
  };
  const renderPage = () => {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <TulumAbout /> : <TulumHome />;
      case "products": return t.productsPageEnabled ? renderProducts() : <TulumHome />;
      case "gallery": return t.galleryPageEnabled ? <TulumGallery /> : <TulumHome />;
      case "testimonials": return <TulumTestimonials />;
      case "partner": return t.partnerPageEnabled ? <TulumPartner /> : <TulumHome />;
      case "careers": return t.careersPageEnabled ? <WayfarerCareers /> : <TulumHome />;
      case "contact": return t.contactPageEnabled ? <TulumContact /> : <TulumHome />;
      default: return <TulumHome />;
    }
  };
  const onHome = !t.currentSection || t.currentSection === "home";
  return (
    <TplProvider value={ctx}>
      <div className="wf tk" style={themeVars}>
        <style>{TULUM_CSS}</style>
        {/* Loading screen like the reference: the logo rises in, then the screen lifts away. */}
        <AnimatePresence>
          {!ready ? (
            <motion.div key="tk-preloader" className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "var(--t-bg)" }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -20 }} transition={{ duration: 0.9, ease: "easeOut" }}>
                {draft?.companyLogo ? (
                  <img src={draft.companyLogo} alt="" className="h-12 w-auto object-contain" />
                ) : (
                  <svg width="44" height="48" viewBox="0 0 28 30" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M14 2 26 12v16H2V12Z" /><path d="M9 28V19h10v9" /></svg>
                )}
                <span className="tk-brand text-[20px]">{draft?.companyName || ""}</span>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <TulumHeader />
        <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.9, ease: "easeInOut" }}>{renderPage()}</motion.main>
        <TulumFooter />
        {onHome ? <TulumSideTab /> : null}
        <TulumToTop />
        <LeadModal open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null} />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </TplProvider>
  );
};

export default TulumTemplate;
