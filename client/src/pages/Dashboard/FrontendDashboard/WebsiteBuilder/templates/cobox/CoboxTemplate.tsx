import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "../motion";
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
import { CoboxProvider, type CoboxCtx } from "./CoboxContext";
import { CoboxFooter, CoboxHeader } from "./CoboxChrome";
import { CoboxHome } from "./CoboxHome";
import { COBOX_CSS } from "./coboxTheme";
import {
  CoboxAbout,
  CoboxCareers,
  CoboxContact,
  CoboxGallery,
  CoboxPartner,
  CoboxTestimonials,
  ItemDetail,
  ServicePage,
  ServicesIndex,
} from "./CoboxPages";
import { CoboxLeadModal } from "./CoboxBooking";
import { CoboxCursor } from "./CoboxCursor";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <Motion.div
    className="cbx-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.45 }}
  >
    <Motion.div
      className="cbx-loader-box"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="cbx-loader-mark">
        {String(name || "Cobox").trim().charAt(0).toUpperCase()}
      </span>
      <b>{name || "Cobox"}</b>
      <small>Space to create</small>
      <em />
    </Motion.div>
  </Motion.div>
);

const CoboxTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [leadTarget, setLeadTarget] = useState<{
    service: Service;
    item: ServiceItem | null;
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 750);
    return () => window.clearTimeout(timer);
  }, []);

  const services = useMemo(
    () => (draft ? buildServices(draft, t.productPages) : []),
    [draft, t.productPages]
  );
  const primary = useMemo(
    () => resolvePrimaryService(draft, services),
    [draft, services]
  );
  const kind = resolvePrimaryKind(draft, primary);
  const profile = getServiceProfile(kind);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(
    () => openStatus(draft?.openingHours),
    [draft?.openingHours]
  );
  const themeVars = useMemo(
    () => buildThemeVars("cobox", draft?.styleConfig) || {},
    [draft?.styleConfig]
  );

  if (!draft) {
    return (
      <div className="cbx" style={themeVars}>
        <style>{COBOX_CSS}</style>
        <div className="cbx-shell cbx-empty" style={{ marginTop: 120 }}>
          <h1 style={{ marginBottom: 10 }}>Preview</h1>
          <p>
            No preview data found. Go back to Create Website and click Preview.
          </p>
        </div>
      </div>
    );
  }

  const openLead: CoboxCtx["openLead"] = (service, item = null, prefill) => {
    if (!service.leadEnabled) return;
    t.openLeadModal(
      {
        ...(service.page || {}),
        ...(item?.raw || {}),
        name: item?.title || service.name,
        heading: service.heading,
        slug: service.slug,
      },
      prefill
    );
    setLeadTarget({ service, item });
  };

  const closeLead = () => {
    setLeadTarget(null);
    t.closeLeadModal();
  };

  const ctx: CoboxCtx = {
    t,
    draft,
    services,
    primary,
    kind,
    profile,
    rating,
    status,
    openLead,
    goToService: (service) => t.goToProductPage(service.slug),
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    navLabel: (section, fallback) => {
      const match = (t.navItems || []).find(
        (item: any) => resolveSectionFromSlug(item.slug) === section
      );
      return String(match?.name || "").trim() || fallback;
    },
    c: (key, fallback) => contentCopy(draft, key, fallback),
    photo: (key, fallback) => contentImage(draft, key, fallback),
  };

  const renderProducts = () => {
    const service = services.find(
      (entry) => entry.slug === t.currentProductSlug
    );
    if (!service) return <ServicesIndex />;
    const item = t.currentItemSlug
      ? service.items.find(
          (entry) => entry.slug === normalizeSlug(t.currentItemSlug)
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
        return t.aboutPageEnabled ? <CoboxAbout /> : <CoboxHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <CoboxHome />;
      case "gallery":
        return t.galleryPageEnabled ? <CoboxGallery /> : <CoboxHome />;
      case "testimonials":
        return <CoboxTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <CoboxPartner /> : <CoboxHome />;
      case "careers":
        return t.careersPageEnabled ? <CoboxCareers /> : <CoboxHome />;
      case "contact":
        return t.contactPageEnabled ? <CoboxContact /> : <CoboxHome />;
      default:
        return <CoboxHome />;
    }
  };

  return (
    <CoboxProvider value={ctx}>
      <div className="cbx" style={themeVars}>
        <style>{COBOX_CSS}</style>
        <CoboxCursor />
        <AnimatePresence>
          {loading ? <Loader name={draft.companyName || "Cobox"} /> : null}
        </AnimatePresence>
        <CoboxHeader />
        <Motion.main
          key={location.pathname}
          className="cbx-main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {renderPage()}
        </Motion.main>
        {t.isSectionEnabled("home_footer") ? <CoboxFooter /> : null}
        <CoboxLeadModal
          open={Boolean(leadTarget && t.selectedLeadProduct)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </CoboxProvider>
  );
};

export default CoboxTemplate;
