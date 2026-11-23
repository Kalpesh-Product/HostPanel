import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
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
import { contentCopy, contentImage } from "../templateContent";
import { getServiceProfile } from "../verticalProfiles";
import {
  normalizeSlug,
  resolveSectionFromSlug,
  useWebsiteTemplateData,
} from "../useWebsiteTemplateData";
import { Lightbox, Toast } from "../shared/TplParts";
import { ReviewModal } from "../shared/TplForms";
import { WorkhubProvider, type WorkhubCtx } from "./WorkhubContext";
import { WorkhubHeader, WorkhubFooter } from "./WorkhubChrome";
import { WorkhubBooking } from "./WorkhubBooking";
import { WorkhubHome } from "./WorkhubHome";
import {
  ItemDetail,
  ServicePage,
  ServicesIndex,
  WorkhubAbout,
  WorkhubCareers,
  WorkhubContact,
  WorkhubGallery,
  WorkhubPartner,
  WorkhubTestimonials,
} from "./WorkhubPages";
import { WORKHUB_CSS } from "./workhubTheme";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <motion.div
    className="wh-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.55 }}
  >
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <span>{name}</span>
      <i />
    </motion.div>
  </motion.div>
);

const WorkhubTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const companyName = draft?.companyName;
  const companyLogo = draft?.companyLogo;
  const [loading, setLoading] = useState(true);
  const [leadTarget, setLeadTarget] = useState<{
    service: Service;
    item: ServiceItem | null;
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 920);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!companyName && !companyLogo) return;
    const previousTitle = document.title;
    const favicon =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const previousIcon = favicon?.href || "";
    document.title = companyName || "WorkHub";
    if (favicon && companyLogo) favicon.href = companyLogo;
    return () => {
      document.title = previousTitle;
      if (favicon) favicon.href = previousIcon;
    };
  }, [companyName, companyLogo]);
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
    () => buildThemeVars("workhub", draft?.styleConfig) || {},
    [draft?.styleConfig],
  );
  if (!draft)
    return (
      <div className="wh" style={themeVars}>
        <style>{WORKHUB_CSS}</style>
        <div className="wh-shell wh-empty">No preview data found.</div>
      </div>
    );
  const openLead: WorkhubCtx["openLead"] = (
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
  const ctx: WorkhubCtx = {
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
        return t.aboutPageEnabled ? <WorkhubAbout /> : <WorkhubHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <WorkhubHome />;
      case "gallery":
        return t.galleryPageEnabled ? <WorkhubGallery /> : <WorkhubHome />;
      case "testimonials":
        return <WorkhubTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <WorkhubPartner /> : <WorkhubHome />;
      case "careers":
        return t.careersPageEnabled ? <WorkhubCareers /> : <WorkhubHome />;
      case "contact":
        return t.contactPageEnabled ? <WorkhubContact /> : <WorkhubHome />;
      default:
        return <WorkhubHome />;
    }
  };
  return (
    <WorkhubProvider value={ctx}>
      <div className={`wh wh-page-${t.currentSection}`} style={themeVars}>
        <style>{WORKHUB_CSS}</style>
        <AnimatePresence>
          {loading ? <Loader name={draft.companyName || "WorkHub"} /> : null}
        </AnimatePresence>
        <WorkhubHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.42 }}
        >
          {renderPage()}
        </motion.main>
        <WorkhubFooter />
        <WorkhubBooking
          open={Boolean(leadTarget)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </WorkhubProvider>
  );
};

export default WorkhubTemplate;
