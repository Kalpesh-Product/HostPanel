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
import { QerjaProvider, type QerjaCtx } from "./QerjaContext";
import { QerjaHeader, QerjaFooter } from "./QerjaChrome";
import { QerjaHome } from "./QerjaHome";
import { QERJA_CSS } from "./qerjaTheme";
import {
  ItemDetail,
  ServicePage,
  ServicesIndex,
  QerjaAbout,
  QerjaCareers,
  QerjaContact,
  QerjaGallery,
  QerjaPartner,
  QerjaTestimonials,
} from "./QerjaPages";
import { QerjaLeadModal } from "./QerjaBooking";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <motion.div
    className="qj-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <span>
        <i />
        <i />
        <i />
      </span>
      <b>{name}</b>
      <small>WORK · CONNECT · GROW</small>
    </motion.div>
    <motion.em
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.85, ease: "easeInOut" }}
    />
  </motion.div>
);

const QerjaTemplate: React.FC = () => {
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
    const timer = window.setTimeout(() => setLoading(false), 800);
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
    () => buildThemeVars("qerja", draft?.styleConfig) || {},
    [draft?.styleConfig],
  );
  if (!draft)
    return (
      <div className="qj" style={themeVars}>
        <style>{QERJA_CSS}</style>
        <div className="qj-shell qj-empty">
          <h1>Preview</h1>
          <p>
            No preview data found. Go back to Create Website and click Preview.
          </p>
        </div>
      </div>
    );
  const openLead: QerjaCtx["openLead"] = (service, item = null, prefill) => {
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
  const ctx: QerjaCtx = {
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
        return t.aboutPageEnabled ? <QerjaAbout /> : <QerjaHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <QerjaHome />;
      case "gallery":
        return t.galleryPageEnabled ? <QerjaGallery /> : <QerjaHome />;
      case "testimonials":
        return <QerjaTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <QerjaPartner /> : <QerjaHome />;
      case "careers":
        return t.careersPageEnabled ? <QerjaCareers /> : <QerjaHome />;
      case "contact":
        return t.contactPageEnabled ? <QerjaContact /> : <QerjaHome />;
      default:
        return <QerjaHome />;
    }
  };
  return (
    <QerjaProvider value={ctx}>
      <div className="qj" style={themeVars}>
        <style>{QERJA_CSS}</style>
        <AnimatePresence>
          {loading ? <Loader name={draft.companyName || "Qerja"} /> : null}
        </AnimatePresence>
        <QerjaHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {renderPage()}
        </motion.main>
        <QerjaFooter />
        <QerjaLeadModal
          open={Boolean(leadTarget)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </QerjaProvider>
  );
};
export default QerjaTemplate;
