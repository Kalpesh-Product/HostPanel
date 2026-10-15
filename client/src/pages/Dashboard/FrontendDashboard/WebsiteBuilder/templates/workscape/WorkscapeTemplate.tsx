import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { buildThemeVars } from "../templateTheme";
import { contentCopy, contentImage } from "../templateContent";
import { getServiceProfile } from "../verticalProfiles";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { Lightbox, Toast } from "../shared/TplParts";
import { ReviewModal } from "../shared/TplForms";
import { WorkscapeProvider, type WorkscapeCtx } from "./WorkscapeContext";
import { WorkscapeHeader, WorkscapeFooter } from "./WorkscapeChrome";
import { WorkscapeBooking } from "./WorkscapeBooking";
import { WorkscapeHome } from "./WorkscapeHome";
import { ItemDetail, ServicePage, ServicesIndex, WorkscapeAbout, WorkscapeCareers, WorkscapeContact, WorkscapeGallery, WorkscapePartner, WorkscapeTestimonials } from "./WorkscapePages";
import { WORKSCAPE_CSS } from "./workscapeTheme";

const Loader: React.FC<{ name: string }> = ({ name }) => <motion.div className="wks-loader" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .55 }}><motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}><span>{name}</span><i/></motion.div></motion.div>;

const WorkscapeTemplate: React.FC = () => {
  const t = useWebsiteTemplateData(); const { draft } = t; const location = useLocation(); const navigate = useNavigate();
  const companyName = draft?.companyName; const companyLogo = draft?.companyLogo;
  const [loading, setLoading] = useState(true); const [leadTarget, setLeadTarget] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 920); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!companyName && !companyLogo) return; const previousTitle = document.title; const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]'); const previousIcon = favicon?.href || ""; document.title = companyName || "Workscape"; if (favicon && companyLogo) favicon.href = companyLogo; return () => { document.title = previousTitle; if (favicon) favicon.href = previousIcon; }; }, [companyName, companyLogo]);
  const services = useMemo(() => draft ? buildServices(draft, t.productPages) : [], [draft, t.productPages]);
  const primary = useMemo(() => resolvePrimaryService(draft, services), [draft, services]); const kind = resolvePrimaryKind(draft, primary); const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]); const status = useMemo(() => openStatus(draft?.openingHours), [draft?.openingHours]); const themeVars = useMemo(() => buildThemeVars("workscape", draft?.styleConfig) || {}, [draft?.styleConfig]);
  if (!draft) return <div className="wks" style={themeVars}><style>{WORKSCAPE_CSS}</style><div className="wks-shell wks-empty">No preview data found.</div></div>;
  const openLead: WorkscapeCtx["openLead"] = (service, item = null, prefill) => { t.openLeadModal({ ...(service.page || {}), ...(item?.raw || {}), name: item?.title || service.name, heading: service.heading, slug: service.slug }, prefill); setLeadTarget({ service, item }); };
  const closeLead = () => { setLeadTarget(null); t.closeLeadModal(); };
  const ctx: WorkscapeCtx = { t, draft, services, primary, kind, profile, rating, status, openLead, goToService: (service, opts) => { const params = new URLSearchParams(opts?.search || {}); if (opts?.category) params.set("cat", opts.category); const query = params.toString(); if (query) navigate(`/website-preview/page/products/${service.slug}?${query}`); else t.goToProductPage(service.slug); }, goToItem: (service, item) => t.goToProductItem(service.slug, item.slug), navLabel: (section, fallback) => { const match = (t.navItems || []).find((item: any) => resolveSectionFromSlug(item.slug) === section); return String(match?.name || "").trim() || fallback; }, c: (key, fallback) => contentCopy(draft, key, fallback), photo: (key, fallback) => contentImage(draft, key, fallback) };
  const renderProducts = () => { const service = services.find((entry) => entry.slug === t.currentProductSlug); if (!service) return <ServicesIndex/>; const item = t.currentItemSlug ? service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug)) : null; return item ? <ItemDetail key={item.key} service={service} item={item}/> : <ServicePage key={service.key} service={service}/>; };
  const renderPage = () => { switch (t.currentSection) { case "about": return t.aboutPageEnabled ? <WorkscapeAbout/> : <WorkscapeHome/>; case "products": return t.productsPageEnabled ? renderProducts() : <WorkscapeHome/>; case "gallery": return t.galleryPageEnabled ? <WorkscapeGallery/> : <WorkscapeHome/>; case "testimonials": return <WorkscapeTestimonials/>; case "partner": return t.partnerPageEnabled ? <WorkscapePartner/> : <WorkscapeHome/>; case "careers": return t.careersPageEnabled ? <WorkscapeCareers/> : <WorkscapeHome/>; case "contact": return t.contactPageEnabled ? <WorkscapeContact/> : <WorkscapeHome/>; default: return <WorkscapeHome/>; } };
  return <WorkscapeProvider value={ctx}><div className={`wks wks-page-${t.currentSection}`} style={themeVars}><style>{WORKSCAPE_CSS}</style><AnimatePresence>{loading ? <Loader name={draft.companyName || "Workscape"}/> : null}</AnimatePresence><WorkscapeHeader/><motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .42 }}>{renderPage()}</motion.main><WorkscapeFooter/><WorkscapeBooking open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null}/><ReviewModal/><Lightbox/><Toast/></div></WorkscapeProvider>;
};

export default WorkscapeTemplate;
