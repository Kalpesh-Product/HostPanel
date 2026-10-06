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
import { TravigoFooter, TravigoHeader } from "./TravigoChrome";
import { TravigoHome } from "./TravigoHome";
import { TravigoItemDetail, TravigoServicePage, TravigoServicesIndex } from "./TravigoRooms";
import { TravigoAbout, TravigoContact, TravigoGallery, TravigoPartner, TravigoTestimonials } from "./TravigoPages";
import { TRAVIGO_CSS } from "./travigoTheme";

const TravigoTemplate: React.FC = () => {
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
  const visualProfile = useMemo(() => ({ ...profile, palette: { ...profile.palette, bg: "#f5f3ed", text: "#111111", accent: "#111111", secondary: "#d8ff48" } }), [profile]);
  const themeVars = useMemo(() => buildTemplateVars("travigo", draft, visualProfile), [draft, visualProfile]);

  if (!draft) return <div className="wf trv" style={themeVars}><style>{TRAVIGO_CSS}</style><div className="tp-wrap py-24"><h1 className="tp-h3">Preview</h1><p className="tp-muted mt-2">No preview data found. Go back to Create Website and click Preview.</p></div></div>;

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
  const renderProducts = () => { const service = services.find((s) => s.slug === t.currentProductSlug); if (!service) return <TravigoServicesIndex />; const item = t.currentItemSlug ? service.items.find((i) => i.slug === normalizeSlug(t.currentItemSlug)) : null; return item ? <TravigoItemDetail key={item.key} service={service} item={item} /> : <TravigoServicePage key={service.key} service={service} />; };
  const renderPage = () => {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <TravigoAbout /> : <TravigoHome />;
      case "products": return t.productsPageEnabled ? renderProducts() : <TravigoHome />;
      case "gallery": return t.galleryPageEnabled ? <TravigoGallery /> : <TravigoHome />;
      case "testimonials": return <TravigoTestimonials />;
      case "partner": return t.partnerPageEnabled ? <TravigoPartner /> : <TravigoHome />;
      case "careers": return t.careersPageEnabled ? <WayfarerCareers /> : <TravigoHome />;
      case "contact": return t.contactPageEnabled ? <TravigoContact /> : <TravigoHome />;
      default: return <TravigoHome />;
    }
  };
  return <TplProvider value={ctx}><div className="wf trv" style={themeVars}><style>{TRAVIGO_CSS}</style><TravigoHeader /><motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .45 }}>{renderPage()}</motion.main><TravigoFooter /><LeadModal open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null} /><ReviewModal /><Lightbox /><Toast /></div></TplProvider>;
};

export default TravigoTemplate;
