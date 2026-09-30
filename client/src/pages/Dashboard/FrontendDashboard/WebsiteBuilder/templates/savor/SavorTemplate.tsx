import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "../motion";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, buildTemplateVars, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { getServiceProfile } from "../verticalProfiles";
import { contentCopy, contentImage } from "../templateContent";
import { SavorProvider, type SavorCtx } from "./SavorContext";
import { SAVOR_CSS } from "./savorTheme";
import { SavorFooter, SavorHeader, SavorLightbox, SavorToast } from "./SavorChrome";
import { SavorHome } from "./SavorHome";
import { LeadModal } from "./SavorLead";
import { ItemDetail, ServicePage, ServicesIndex } from "./SavorServices";
import { ReviewModal, SavorAbout, SavorContact, SavorGallery, SavorPartner, SavorTestimonials } from "./SavorPages";
import { SavorCareers } from "./SavorCareers";

/**
 * Savor — the menu-led template. Big type, photo-first cards, a floating pill nav and
 * a reservation flow built into every page. Recommended for cafés, but every service
 * type renders in it (see verticalProfiles.ts / serviceAdapter.ts).
 */
const SavorTemplate: React.FC = () => {
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
  const themeVars = useMemo(() => buildTemplateVars("savor", draft, profile), [draft, profile]);

  if (!draft) {
    return (
      <div className="sv" style={themeVars}>
        <style>{SAVOR_CSS}</style>
        <div className="tp-wrap py-24">
          <h1 className="tp-h3">Preview</h1>
          <p className="tp-muted mt-2">No preview data found. Go back to Create Website and click Preview.</p>
        </div>
      </div>
    );
  }

  const openLead: SavorCtx["openLead"] = (service, item = null, prefill) => {
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

  const ctx: SavorCtx = {
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
    const service = services.find((s) => s.slug === t.currentProductSlug);
    if (!service) return <ServicesIndex />;
    const item = t.currentItemSlug ? service.items.find((i) => i.slug === normalizeSlug(t.currentItemSlug)) : null;
    return item ? <ItemDetail key={item.key} service={service} item={item} /> : <ServicePage key={service.key} service={service} />;
  };

  const renderPage = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <SavorAbout /> : <SavorHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <SavorHome />;
      case "gallery":
        return t.galleryPageEnabled ? <SavorGallery /> : <SavorHome />;
      case "testimonials":
        return <SavorTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <SavorPartner /> : <SavorHome />;
      case "careers":
        return t.careersPageEnabled ? <SavorCareers /> : <SavorHome />;
      case "contact":
        return t.contactPageEnabled ? <SavorContact /> : <SavorHome />;
      default:
        return <SavorHome />;
    }
  };

  return (
    <SavorProvider value={ctx}>
      <div className="sv" style={themeVars}>
        <style>{SAVOR_CSS}</style>
        <SavorHeader />
        <motion.main key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          {renderPage()}
        </motion.main>
        <SavorFooter />
        <LeadModal open={Boolean(leadTarget)} onClose={closeLead} service={leadTarget?.service || null} item={leadTarget?.item || null} />
        <ReviewModal />
        <SavorLightbox />
        <SavorToast />
      </div>
    </SavorProvider>
  );
};

export default SavorTemplate;
