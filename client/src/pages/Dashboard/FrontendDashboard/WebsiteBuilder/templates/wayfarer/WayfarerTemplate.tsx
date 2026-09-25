import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "../motion";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, buildTemplateVars, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { getServiceProfile } from "../verticalProfiles";
import { TplProvider, type TplCtx } from "../shared/TplContext";
import { LeadModal } from "../shared/TplLead";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { WAYFARER_CSS } from "./wayfarerTheme";
import { StickyBookBar, WayfarerFooter, WayfarerHeader } from "./WayfarerChrome";
import { WayfarerHome } from "./WayfarerHome";
import { ItemDetail, ServicePage, ServicesIndex } from "./WayfarerStays";
import { WayfarerAbout, WayfarerCareers, WayfarerContact, WayfarerGallery, WayfarerPartner, WayfarerTestimonials } from "./WayfarerPages";

/**
 * Wayfarer — the booking-led template. A full-bleed hero with a search bar, results-style
 * stay lists with filters, a sticky booking card and a sticky mobile "Book now" bar.
 * Recommended for hostels; every service type renders in it.
 */
const WayfarerTemplate: React.FC = () => {
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
  const themeVars = useMemo(() => buildTemplateVars("wayfarer", draft, profile), [draft, profile]);

  if (!draft) {
    return (
      <div className="wf" style={themeVars}>
        <style>{WAYFARER_CSS}</style>
        <div className="tp-wrap py-24">
          <h1 className="tp-h3">Preview</h1>
          <p className="tp-muted mt-2">No preview data found. Go back to Create Website and click Preview.</p>
        </div>
      </div>
    );
  }

  const openLead: TplCtx["openLead"] = (service, item = null, prefill) => {
    t.openLeadModal(
      { ...(service.page || {}), ...(item?.raw || {}), name: item?.title || service.name, heading: service.heading, slug: service.slug },
      prefill,
    );
    setLeadTarget({ service, item });
  };
  const closeLead = () => {
    setLeadTarget(null);
    t.closeLeadModal();
  };

  const ctx: TplCtx = {
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
      const q = new URLSearchParams(opts?.search || {});
      if (opts?.category) q.set("cat", opts.category);
      const qs = q.toString();
      if (qs) navigate(`/website-preview/page/products/${service.slug}?${qs}`);
      else t.goToProductPage(service.slug);
    },
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    navLabel: (section, fallback) => {
      const match = (t.navItems || []).find((item: any) => resolveSectionFromSlug(item.slug) === section);
      return String(match?.name || "").trim() || fallback;
    },
  };

  const isDetail = t.currentSection === "products" && Boolean(t.currentItemSlug) && services.some((s) => s.slug === t.currentProductSlug);
  const heroOnHome = t.currentSection === "home" && t.isSectionEnabled("home_hero");

  const renderProducts = () => {
    const service = services.find((s) => s.slug === t.currentProductSlug);
    if (!service) return <ServicesIndex />;
    const item = t.currentItemSlug ? service.items.find((i) => i.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <ItemDetail key={item.key} service={service} item={item} /> : <ServicePage key={service.key} service={service} />;
  };

  const renderPage = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <WayfarerAbout /> : <WayfarerHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <WayfarerHome />;
      case "gallery":
        return t.galleryPageEnabled ? <WayfarerGallery /> : <WayfarerHome />;
      case "testimonials":
        return <WayfarerTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <WayfarerPartner /> : <WayfarerHome />;
      case "careers":
        return t.careersPageEnabled ? <WayfarerCareers /> : <WayfarerHome />;
      case "contact":
        return t.contactPageEnabled ? <WayfarerContact /> : <WayfarerHome />;
      default:
        return <WayfarerHome />;
    }
  };

  return (
    <TplProvider value={ctx}>
      <div className="wf" style={themeVars}>
        <style>{WAYFARER_CSS}</style>
        <WayfarerHeader forceSolid={isDetail || (t.currentSection === "home" && !heroOnHome)} />
        <motion.main key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          {renderPage()}
        </motion.main>
        <WayfarerFooter />
        <StickyBookBar />
        <LeadModal open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null} />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </TplProvider>
  );
};

export default WayfarerTemplate;
