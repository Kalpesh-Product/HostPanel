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
import { WorpaceProvider, type WorpaceCtx } from "./WorpaceContext";
import { WorpaceHeader, WorpaceFooter } from "./WorpaceChrome";
import { WorpaceHome } from "./WorpaceHome";
import { WORPACE_CSS } from "./worpaceTheme";
import {
  ItemDetail,
  ServicePage,
  ServicesIndex,
  WorpaceAbout,
  WorpaceCareers,
  WorpaceContact,
  WorpaceGallery,
  WorpacePartner,
  WorpaceTestimonials,
} from "./WorpacePages";
import { WorpaceLeadModal } from "./WorpaceBooking";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <motion.div
    className="wp-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.55 }}
  >
    <motion.div
      className="wp-loader-word"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="wp-mark">
        <i />
        <i />
        <i />
      </span>
      <b>{name}</b>
    </motion.div>
    <div>
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
    </div>
  </motion.div>
);

/** Worpace — a high-contrast editorial co-working template inspired by the supplied reference. */
const WorpaceTemplate: React.FC = () => {
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
    const timer = window.setTimeout(() => setLoading(false), 850);
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
    () => buildThemeVars("worpace", draft?.styleConfig) || {},
    [draft?.styleConfig],
  );
  if (!draft)
    return (
      <div className="wp" style={themeVars}>
        <style>{WORPACE_CSS}</style>
        <div className="wp-shell wp-empty">
          <h1>Preview</h1>
          <p>
            No preview data found. Go back to Create Website and click Preview.
          </p>
        </div>
      </div>
    );
  const openLead: WorpaceCtx["openLead"] = (service, item = null, prefill) => {
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
  const ctx: WorpaceCtx = {
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
        return t.aboutPageEnabled ? <WorpaceAbout /> : <WorpaceHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <WorpaceHome />;
      case "gallery":
        return t.galleryPageEnabled ? <WorpaceGallery /> : <WorpaceHome />;
      case "testimonials":
        return <WorpaceTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <WorpacePartner /> : <WorpaceHome />;
      case "careers":
        return t.careersPageEnabled ? <WorpaceCareers /> : <WorpaceHome />;
      case "contact":
        return t.contactPageEnabled ? <WorpaceContact /> : <WorpaceHome />;
      default:
        return <WorpaceHome />;
    }
  };
  return (
    <WorpaceProvider value={ctx}>
      <div className="wp" style={themeVars}>
        <style>{WORPACE_CSS}</style>
        <AnimatePresence>
          {loading ? <Loader name={draft.companyName || "Worpace"} /> : null}
        </AnimatePresence>
        <WorpaceHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.42 }}
        >
          {renderPage()}
        </motion.main>
        <WorpaceFooter />
        <WorpaceLeadModal
          open={Boolean(leadTarget)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </WorpaceProvider>
  );
};

export default WorpaceTemplate;
