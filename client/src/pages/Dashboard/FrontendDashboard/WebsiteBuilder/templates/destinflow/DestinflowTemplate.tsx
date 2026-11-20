import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "../motion";
import {
  normalizeSlug,
  resolveSectionFromSlug,
  useWebsiteTemplateData,
} from "../useWebsiteTemplateData";
import {
  buildServices,
  type Service,
  type ServiceItem,
} from "../serviceAdapter";
import {
  averageRating,
  buildTemplateVars,
  openStatus,
  resolvePrimaryKind,
  resolvePrimaryService,
} from "../templateKit";
import { getServiceProfile } from "../verticalProfiles";
import { contentCopy, contentImage } from "../templateContent";
import { TplProvider, type TplCtx } from "../shared/TplContext";
import { LeadModal } from "../shared/TplLead";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { DESTINFLOW_CSS } from "./destinflowTheme";
import { DestinflowFooter, DestinflowHeader } from "./DestinflowChrome";
import { DestinflowHome } from "./DestinflowHome";
import {
  ItemDetail,
  ServicePage,
  ServicesIndex,
} from "./DestinflowStays";
import {
  DestinflowAbout,
  DestinflowCareers,
  DestinflowContact,
  DestinflowGallery,
  DestinflowPartner,
  DestinflowTestimonials,
} from "./DestinflowPages";

/**
 * DestinFlow — a calm, editorial hostel template inspired by the reference site:
 * a blue photographic hero, a booking bar, room cards, a dining story, a pale-blue
 * facilities band, guest feedback and a dark gallery strip. It follows the same
 * HostPanel template contract as Wayfarer and the other common templates.
 */
const DestinflowTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [leadTarget, setLeadTarget] = useState<{
    service: Service;
    item: ServiceItem | null;
  } | null>(null);

  const services = useMemo(
    () => (draft ? buildServices(draft, t.productPages) : []),
    [draft, t.productPages],
  );
  const primary = useMemo(
    () => resolvePrimaryService(draft, services),
    [draft, services],
  );
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(
    () => openStatus(draft?.openingHours),
    [draft?.openingHours],
  );
  const themeVars = useMemo(
    () => buildTemplateVars("destinflow", draft, profile),
    [draft, profile],
  );

  if (!draft) {
    return (
      <div className="df" style={themeVars}>
        <style>{DESTINFLOW_CSS}</style>
        <div className="df-shell" style={{ padding: "120px 0" }}>
          <h1 className="df-h3">Preview</h1>
          <p>No preview data found. Go back to Create Website and click Preview.</p>
        </div>
      </div>
    );
  }

  const openLead: TplCtx["openLead"] = (service, item = null, prefill) => {
    t.openLeadModal(
      {
        ...(service.page || {}),
        ...(item?.raw || {}),
        name: item?.title || service.name,
        heading: service.heading,
        slug: service.slug,
      },
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
      const query = new URLSearchParams(opts?.search || {});
      if (opts?.category) query.set("cat", opts.category);
      const qs = query.toString();
      if (qs) navigate(`/website-preview/page/products/${service.slug}?${qs}`);
      else t.goToProductPage(service.slug);
    },
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    navLabel: (section, fallback) => {
      const match = (t.navItems || []).find(
        (item: any) => resolveSectionFromSlug(item.slug) === section,
      );
      return String(match?.name || "").trim() || fallback;
    },
    c: (key, fallback) => contentCopy(draft, key, fallback),
    photo: (key, fallback) => contentImage(draft, key, fallback),
  };

  const renderProducts = () => {
    const service = services.find((entry) => entry.slug === t.currentProductSlug);
    if (!service) return <ServicesIndex />;
    const item = t.currentItemSlug
      ? service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug))
      : null;
    return item ? (
      <ItemDetail key={item.key} service={service} item={item} />
    ) : (
      <ServicePage key={service.key} service={service} />
    );
  };

  const renderPage = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <DestinflowAbout /> : <DestinflowHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <DestinflowHome />;
      case "gallery":
        return t.galleryPageEnabled ? <DestinflowGallery /> : <DestinflowHome />;
      case "testimonials":
        return <DestinflowTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <DestinflowPartner /> : <DestinflowHome />;
      case "careers":
        return t.careersPageEnabled ? <DestinflowCareers /> : <DestinflowHome />;
      case "contact":
        return t.contactPageEnabled ? <DestinflowContact /> : <DestinflowHome />;
      default:
        return <DestinflowHome />;
    }
  };

  return (
    <TplProvider value={ctx}>
      <div className="df" style={themeVars}>
        <style>{DESTINFLOW_CSS}</style>
        <DestinflowHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderPage()}
        </motion.main>
        {t.isSectionEnabled("home_footer") ? <DestinflowFooter /> : null}
        <LeadModal
          open={Boolean(leadTarget)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </TplProvider>
  );
};

export default DestinflowTemplate;
