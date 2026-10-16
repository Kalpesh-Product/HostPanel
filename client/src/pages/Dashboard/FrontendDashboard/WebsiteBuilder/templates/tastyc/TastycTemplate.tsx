import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { buildThemeVars } from "../templateTheme";
import { getServiceProfile } from "../verticalProfiles";
import { contentCopy, contentImage } from "../templateContent";
import { LeadFormPanel } from "../shared/TplLead";
import { TastycProvider, useTastyc, type TastycCtx } from "./TastycContext";
import { TASTYC_CSS } from "./tastycTheme";
import { TastycFooter, TastycHeader, TastycLightbox, TastycToast } from "./TastycChrome";
import { TastycHome } from "./TastycHome";
import { ItemDetail, ReviewModal, ServicePage, ServicesIndex, TastycAbout, TastycCareers, TastycContact, TastycGallery, TastycPartner, TastycTestimonials } from "./TastycPages";
import { Icon } from "./TastycUI";

const TastycLoader: React.FC<{ name: string }> = ({ name }) => <motion.div className="tc-loader" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .55 }}><div className="tc-loader-rings"><span/><span/></div><div className="tc-loader-brand">{name}</div></motion.div>;

const TastycReservation: React.FC<{ target: { service: Service; item: ServiceItem | null } | null; onClose: () => void }> = ({ target, onClose }) => {
  const { draft, c } = useTastyc();
  const image = target?.service?.heroImage || draft?.heroImages?.[0] || "";
  return <AnimatePresence>{target ? <motion.div className="tc-reservation-shell" role="dialog" aria-modal="true" aria-label="Reserve a table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <button type="button" className="tc-reservation-backdrop" aria-label="Close reservation" onClick={onClose}/>
    <motion.div className="tc-reservation-modal" initial={{ opacity: 0, y: 42, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28 }} transition={{ duration: .48, ease: [0.22, 1, 0.36, 1] }}>
      <button type="button" className="tc-reservation-close" aria-label="Close" onClick={onClose}>{Icon.close()}</button>
      <div className="tc-reservation-intro" style={image ? { backgroundImage: `url(${image})` } : undefined}><p className="tc-kicker !text-[#e38a3d]">{c("reservation.eyebrow", "Reservation")}</p><h2>{c("reservation.title", "Your table is waiting")}</h2><p>{c("reservation.body", "Choose your date, time and party size. Our team will confirm your table shortly.")}</p></div>
      <div className="tc-reservation-form"><p className="tc-kicker">{target.service.name}</p><h3>{c("reservation.formTitle", "Book a table")}</h3><LeadFormPanel service={target.service} item={target.item}/></div>
    </motion.div>
  </motion.div> : null}</AnimatePresence>;
};

/** Tastyc — an editorial coffee-house template inspired by dark roast tones, elegant type and menu-first browsing. */
const TastycTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leadTarget, setLeadTarget] = useState<{ service: Service; item: ServiceItem | null } | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 1050); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!leadTarget) return; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, [leadTarget]);

  const services = useMemo(() => (draft ? buildServices(draft, t.productPages) : []), [draft, t.productPages]);
  const primary = useMemo(() => resolvePrimaryService(draft, services), [draft, services]);
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(() => openStatus(draft?.openingHours), [draft?.openingHours]);
  const themeVars = useMemo(() => buildThemeVars("tastyc", draft?.styleConfig) || {}, [draft?.styleConfig]);

  if (!draft) return <div className="tc" style={themeVars}><style>{TASTYC_CSS}</style><div className="tc-wrap py-24"><h1 className="tc-h3">Preview</h1><p className="tc-muted mt-2">No preview data found. Go back to Create Website and click Preview.</p></div></div>;

  const openLead: TastycCtx["openLead"] = (service, item = null, prefill) => {
    t.openLeadModal({ ...(service.page || {}), ...(item?.raw || {}), name: item?.title || service.name, heading: service.heading, slug: service.slug }, prefill);
    setLeadTarget({ service, item });
  };
  const closeLead = () => { setLeadTarget(null); t.closeLeadModal(); };

  const ctx: TastycCtx = {
    t,
    draft,
    services,
    primary,
    kind,
    profile,
    rating,
    status,
    openLead,
    goToService: (service, opts) => {
      if (opts?.category) navigate(`/website-preview/page/products/${service.slug}?cat=${encodeURIComponent(opts.category)}`);
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
    if (!service) return <ServicesIndex />;
    const item = t.currentItemSlug ? service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <ItemDetail key={item.key} service={service} item={item} /> : <ServicePage key={service.key} service={service} />;
  };

  const renderPage = () => {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <TastycAbout /> : <TastycHome />;
      case "products": return t.productsPageEnabled ? renderProducts() : <TastycHome />;
      case "gallery": return t.galleryPageEnabled ? <TastycGallery /> : <TastycHome />;
      case "testimonials": return <TastycTestimonials />;
      case "partner": return t.partnerPageEnabled ? <TastycPartner /> : <TastycHome />;
      case "careers": return t.careersPageEnabled ? <TastycCareers /> : <TastycHome />;
      case "contact": return t.contactPageEnabled ? <TastycContact /> : <TastycHome />;
      default: return <TastycHome />;
    }
  };

  return (
    <TastycProvider value={ctx}>
      <div className="tc" style={themeVars}>
        <style>{TASTYC_CSS}</style>
        <AnimatePresence>{loading ? <TastycLoader name={draft.companyName || "Coffee House"}/> : null}</AnimatePresence>
        <TastycHeader />
        <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5 }}>{renderPage()}</motion.main>
        <TastycFooter />
        <TastycReservation target={leadTarget} onClose={closeLead}/>
        <ReviewModal />
        <TastycLightbox />
        <TastycToast />
      </div>
    </TastycProvider>
  );
};

export default TastycTemplate;
