import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
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
  openStatus,
  resolvePrimaryKind,
  resolvePrimaryService,
} from "../templateKit";
import { buildThemeVars } from "../templateTheme";
import { getServiceProfile } from "../verticalProfiles";
import { contentCopy, contentImage } from "../templateContent";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { FlowspaceProvider, type FlowspaceCtx } from "./FlowspaceContext";
import { FlowspaceHeader, FlowspaceFooter } from "./FlowspaceChrome";
import { FlowspaceHome } from "./FlowspaceHome";
import { FLOWSPACE_CSS } from "./flowspaceTheme";
import {
  FlowspaceAbout,
  FlowspaceCareers,
  FlowspaceContact,
  FlowspaceGallery,
  FlowspacePartner,
  FlowspaceTestimonials,
  ItemDetail,
  ServicePage,
  ServicesIndex,
} from "./FlowspacePages";
import { FlowspaceLeadModal } from "./FlowspaceBooking";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <motion.div
    className="fs-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div
      className="fs-loader-mark"
      initial={{ scale: 0.6, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <i />
      <span>{name}</span>
    </motion.div>
    <div className="fs-loader-line">
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
    </div>
  </motion.div>
);

/** Flowspace — a warm, editorial meeting-room template with lime accents and motion-led space discovery. */
const FlowspaceTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leadTarget, setLeadTarget] = useState<{
    service: Service;
    item: ServiceItem | null;
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 900);
    return () => window.clearTimeout(timer);
  }, []);
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
    () => buildThemeVars("flowspace", draft?.styleConfig) || {},
    [draft?.styleConfig],
  );

  if (!draft)
    return (
      <div className="fs" style={themeVars}>
        <style>{FLOWSPACE_CSS}</style>
        <div className="fs-shell py-24">
          <h1>Preview</h1>
          <p>
            No preview data found. Go back to Create Website and click Preview.
          </p>
        </div>
      </div>
    );

  const openLead: FlowspaceCtx["openLead"] = (
    service,
    item = null,
    prefill,
  ) => {
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
  const ctx: FlowspaceCtx = {
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
      const params = new URLSearchParams(opts?.search || {});
      if (opts?.category) params.set("cat", opts.category);
      const query = params.toString();
      if (query)
        navigate(`/website-preview/page/products/${service.slug}?${query}`);
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
    const service = services.find(
      (entry) => entry.slug === t.currentProductSlug,
    );
    if (!service) return <ServicesIndex />;
    const item = t.currentItemSlug
      ? service.items.find(
          (entry) => entry.slug === normalizeSlug(t.currentItemSlug),
        )
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
        return t.aboutPageEnabled ? <FlowspaceAbout /> : <FlowspaceHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <FlowspaceHome />;
      case "gallery":
        return t.galleryPageEnabled ? <FlowspaceGallery /> : <FlowspaceHome />;
      case "testimonials":
        return <FlowspaceTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <FlowspacePartner /> : <FlowspaceHome />;
      case "careers":
        return t.careersPageEnabled ? <FlowspaceCareers /> : <FlowspaceHome />;
      case "contact":
        return t.contactPageEnabled ? <FlowspaceContact /> : <FlowspaceHome />;
      default:
        return <FlowspaceHome />;
    }
  };

  return (
    <FlowspaceProvider value={ctx}>
      <div className="fs" style={themeVars}>
        <style>{FLOWSPACE_CSS}</style>
        <AnimatePresence>
          {loading ? (
            <Loader name={draft.companyName || "Lumen Rooms"} />
          ) : null}
        </AnimatePresence>
        <FlowspaceHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          {renderPage()}
        </motion.main>
        <FlowspaceFooter />
        <FlowspaceLeadModal
          open={Boolean(leadTarget)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </FlowspaceProvider>
  );
};

export default FlowspaceTemplate;
