import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "../motion";
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
import { LodgeFooter, LodgeHeader, LodgeToTop } from "./LodgeChrome";
import { LodgeHome } from "./LodgeHome";
import { LodgeItemDetail, LodgeServicesIndex, LodgeServicePage } from "./LodgeRentals";
import { LodgeAbout, LodgeContact, LodgeGallery, LodgePartner, LodgeTestimonials } from "./LodgePages";
import { LODGE_CSS, LODGE_PALETTE } from "./lodgeTheme";

const LodgeTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [leadTarget, setLeadTarget] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  const services = useMemo(() => (draft ? buildServices(draft, t.productPages) : []), [draft, t.productPages]);
  const primary = useMemo(() => resolvePrimaryService(draft, services), [draft, services]);
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(() => openStatus(draft?.openingHours), [draft?.openingHours]);
  const visualProfile = useMemo(() => ({ ...profile, palette: { ...profile.palette, ...LODGE_PALETTE } }), [profile]);
  const themeVars = useMemo(() => buildTemplateVars("lodge", draft, visualProfile), [draft, visualProfile]);

  if (!draft) {
    return (
      <div className="wf ld" style={themeVars}>
        <style>{LODGE_CSS}</style>
        <div className="ld-loading">
          <div className="ld-loading-mark">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M16 4 29 27H3Z" /><path d="M10.5 18h11" /></svg>
          </div>
          <div className="ld-loading-bar"><span /></div>
        </div>
      </div>
    );
  }

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
    if (!service) return <LodgeServicesIndex />;
    const item = t.currentItemSlug ? service.items.find((i) => i.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <LodgeItemDetail key={item.key} service={service} item={item} /> : <LodgeServicePage key={service.key} service={service} />;
  };
  const renderPage = () => {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <LodgeAbout /> : <LodgeHome />;
      case "products": return t.productsPageEnabled ? renderProducts() : <LodgeHome />;
      case "gallery": return t.galleryPageEnabled ? <LodgeGallery /> : <LodgeHome />;
      case "testimonials": return <LodgeTestimonials />;
      case "partner": return t.partnerPageEnabled ? <LodgePartner /> : <LodgeHome />;
      case "careers": return t.careersPageEnabled ? <WayfarerCareers /> : <LodgeHome />;
      case "contact": return t.contactPageEnabled ? <LodgeContact /> : <LodgeHome />;
      default: return <LodgeHome />;
    }
  };
  return (
    <TplProvider value={ctx}>
      <div className="wf ld" style={themeVars}>
        <style>{LODGE_CSS}</style>
        <LodgeHeader />
        <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>{renderPage()}</motion.main>
        <LodgeFooter />
        <LodgeToTop />
        <LeadModal open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null} />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </TplProvider>
  );
};

export default LodgeTemplate;
