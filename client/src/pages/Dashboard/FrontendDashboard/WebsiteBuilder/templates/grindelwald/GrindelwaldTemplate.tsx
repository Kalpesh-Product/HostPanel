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
import { GrindelwaldFooter, GrindelwaldHeader } from "./GrindelwaldChrome";
import { GrindelwaldHome } from "./GrindelwaldHome";
import { GrindelwaldItemDetail, GrindelwaldServicePage, GrindelwaldServicesIndex } from "./GrindelwaldRentals";
import { GrindelwaldAbout, GrindelwaldContact, GrindelwaldGallery, GrindelwaldPartner, GrindelwaldTestimonials } from "./GrindelwaldPages";
import { GRINDELWALD_CSS, GRINDELWALD_PALETTE } from "./grindelwaldTheme";

const GrindelwaldTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [leadTarget, setLeadTarget] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  // The loading screen shows briefly, like the reference's own page weight, then lifts away.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1400);
    return () => window.clearTimeout(timer);
  }, []);
  const services = useMemo(() => (draft ? buildServices(draft, t.productPages) : []), [draft, t.productPages]);
  const primary = useMemo(() => resolvePrimaryService(draft, services), [draft, services]);
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(() => openStatus(draft?.openingHours), [draft?.openingHours]);
  const visualProfile = useMemo(() => ({ ...profile, palette: { ...profile.palette, ...GRINDELWALD_PALETTE } }), [profile]);
  const themeVars = useMemo(() => buildTemplateVars("grindelwald", draft, visualProfile), [draft, visualProfile]);

  if (!draft) return <div className="wf gw" style={themeVars}><style>{GRINDELWALD_CSS}</style><div className="tp-wrap py-24"><h1 className="gw-h2">Preview</h1><p className="gw-muted mt-2">No preview data found. Go back to Create Website and click Preview.</p></div></div>;

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
    if (!service) return <GrindelwaldServicesIndex />;
    const item = t.currentItemSlug ? service.items.find((i) => i.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <GrindelwaldItemDetail key={item.key} service={service} item={item} /> : <GrindelwaldServicePage key={service.key} service={service} />;
  };
  const renderPage = () => {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <GrindelwaldAbout /> : <GrindelwaldHome />;
      case "products": return t.productsPageEnabled ? renderProducts() : <GrindelwaldHome />;
      case "gallery": return t.galleryPageEnabled ? <GrindelwaldGallery /> : <GrindelwaldHome />;
      case "testimonials": return <GrindelwaldTestimonials />;
      case "partner": return t.partnerPageEnabled ? <GrindelwaldPartner /> : <GrindelwaldHome />;
      case "careers": return t.careersPageEnabled ? <WayfarerCareers /> : <GrindelwaldHome />;
      case "contact": return t.contactPageEnabled ? <GrindelwaldContact /> : <GrindelwaldHome />;
      default: return <GrindelwaldHome />;
    }
  };
  return (
    <TplProvider value={ctx}>
      <div className="wf gw" style={themeVars}>
        <style>{GRINDELWALD_CSS}</style>
        <AnimatePresence>
          {!ready ? (
            <motion.div key="gw-preloader" className="gw-preloader" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}>
                {draft?.companyLogo ? (
                  <img src={draft.companyLogo} alt="" className="h-12 w-auto object-contain" />
                ) : (
                  <svg width="26" height="30" viewBox="0 0 28 30" fill="none" stroke="var(--t-accent)" strokeWidth="1.4" aria-hidden="true"><path d="M14 2 26 12v16H2V12Z" /></svg>
                )}
                <span className="gw-brand text-[22px]" style={{ color: "var(--t-accent)" }}>{draft?.companyName || ""}</span>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <GrindelwaldHeader />
        <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: "easeInOut" }}>{renderPage()}</motion.main>
        <GrindelwaldFooter />
        <LeadModal open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null} />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </TplProvider>
  );
};

export default GrindelwaldTemplate;
