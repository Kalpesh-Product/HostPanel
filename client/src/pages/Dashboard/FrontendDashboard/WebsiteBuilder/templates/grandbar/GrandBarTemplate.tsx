import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { buildThemeVars } from "../templateTheme";
import { contentCopy, contentImage } from "../templateContent";
import { getServiceProfile } from "../verticalProfiles";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { GrandBarBooking } from "./GrandBarBooking";
import { GrandBarFooter, GrandBarHeader } from "./GrandBarChrome";
import { GrandBarProvider, type GrandBarCtx } from "./GrandBarContext";
import { GrandBarHome } from "./GrandBarHome";
import { GrandBarAbout, GrandBarCareers, GrandBarContact, GrandBarGallery, GrandBarPartner, GrandBarTestimonials, ItemDetail, ServicePage, ServicesIndex } from "./GrandBarPages";
import { GRAND_BAR_REFINEMENT_CSS } from "./grandBarRefinement";
import { GRAND_BAR_CSS } from "./grandBarTheme";

const Loader: React.FC<{ name: string }> = ({ name }) => <motion.div className="gb-loader" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .62 }}><motion.div initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .65 }}><span>{name}</span><i/><small>Cocktail · Kitchen</small></motion.div></motion.div>;

const GrandBarTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leadTarget, setLeadTarget] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  const companyName = draft?.companyName;
  const companyLogo = draft?.companyLogo;

  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 1100); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!leadTarget) return; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, [leadTarget]);
  useEffect(() => {
    if (!companyName && !companyLogo) return;
    const previousTitle = document.title;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const previousIcon = favicon?.href || "";
    document.title = companyName || "Grand Bar";
    if (favicon && companyLogo) favicon.href = companyLogo;
    return () => { document.title = previousTitle; if (favicon) favicon.href = previousIcon; };
  }, [companyName, companyLogo]);

  const services = useMemo(() => draft ? buildServices(draft, t.productPages) : [], [draft, t.productPages]);
  const primary = useMemo(() => resolvePrimaryService(draft, services), [draft, services]);
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(() => openStatus(draft?.openingHours), [draft?.openingHours]);
  const themeVars = useMemo(() => buildThemeVars("grandbar", draft?.styleConfig) || {}, [draft?.styleConfig]);
  const themeCss = useMemo(() => GRAND_BAR_CSS.replace(/\n\+/g, "\n") + GRAND_BAR_REFINEMENT_CSS, []);

  if (!draft) return <div className="gb" style={themeVars}><style>{themeCss}</style><div className="gb-frame gb-empty">No preview data found.</div></div>;

  const openLead: GrandBarCtx["openLead"] = (service, item = null, prefill) => {
    t.openLeadModal({ ...(service.page || {}), ...(item?.raw || {}), name: item?.title || service.name, heading: service.heading, slug: service.slug }, prefill);
    setLeadTarget({ service, item });
  };
  const closeLead = () => { setLeadTarget(null); t.closeLeadModal(); };
  const ctx: GrandBarCtx = {
    t, draft, services, primary, kind, profile, rating, status, openLead,
    goToService: (service, opts) => {
      const params = new URLSearchParams(opts?.search || {});
      if (opts?.category) params.set("cat", opts.category);
      const query = params.toString();
      if (query) navigate("/website-preview/page/products/" + service.slug + "?" + query);
      else t.goToProductPage(service.slug);
    },
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    navLabel: (section, fallback) => {
      const match = (t.navItems || []).find((item: any) => resolveSectionFromSlug(item.slug) === section);
      return String(match?.name || "").trim() || fallback;
    },
    c: (key, fallback) => contentCopy(draft, key, fallback),
    photo: (key, fallback) => contentImage(draft, key, fallback),
  };

  const renderProducts = () => {
    const service = services.find((entry) => entry.slug === t.currentProductSlug);
    if (!service) return <ServicesIndex/>;
    const item = t.currentItemSlug ? service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <ItemDetail key={item.key} service={service} item={item}/> : <ServicePage key={service.key} service={service}/>;
  };
  const renderPage = () => {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <GrandBarAbout/> : <GrandBarHome/>;
      case "products": return t.productsPageEnabled ? renderProducts() : <GrandBarHome/>;
      case "gallery": return t.galleryPageEnabled ? <GrandBarGallery/> : <GrandBarHome/>;
      case "testimonials": return <GrandBarTestimonials/>;
      case "partner": return t.partnerPageEnabled ? <GrandBarPartner/> : <GrandBarHome/>;
      case "careers": return t.careersPageEnabled ? <GrandBarCareers/> : <GrandBarHome/>;
      case "contact": return t.contactPageEnabled ? <GrandBarContact/> : <GrandBarHome/>;
      default: return <GrandBarHome/>;
    }
  };

  return <GrandBarProvider value={ctx}><div className={"gb gb-page-" + t.currentSection} style={themeVars}><style>{themeCss}</style><AnimatePresence>{loading ? <Loader name={draft.companyName || "Grand Bar"}/> : null}</AnimatePresence><GrandBarHeader/><AnimatePresence mode="wait" initial={false}><motion.main key={location.pathname + location.search} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .48, ease: [0.22, 1, 0.36, 1] }}>{renderPage()}</motion.main></AnimatePresence><GrandBarFooter/><GrandBarBooking open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null}/><ReviewModal/><Lightbox/><Toast/></div></GrandBarProvider>;
};

export default GrandBarTemplate;
