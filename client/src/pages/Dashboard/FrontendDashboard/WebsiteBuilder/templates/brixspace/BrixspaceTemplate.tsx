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
import { BrixspaceProvider, type BrixspaceCtx } from "./BrixspaceContext";
import { BrixspaceHeader, BrixspaceFooter } from "./BrixspaceChrome";
import { BrixspaceHome } from "./BrixspaceHome";
import { BrixspaceBooking } from "./BrixspaceBooking";
import {
  BrixspaceAbout,
  BrixspaceCareers,
  BrixspaceContact,
  BrixspaceGallery,
  BrixspacePartner,
  BrixspaceTestimonials,
  ItemDetail,
  ServicePage,
  ServicesIndex,
} from "./BrixspacePages";
import { BRIXSPACE_CSS } from "./brixspaceTheme";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <motion.div
    className="bx-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <span>{name.charAt(0)}</span>
      <strong>{name}</strong>
      <i />
    </motion.div>
  </motion.div>
);

const BrixspaceTemplate: React.FC = () => {
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
    const timer = window.setTimeout(() => setLoading(false), 980);
    return () => window.clearTimeout(timer);
  }, []);
  const companyName = draft?.companyName;
  const companyLogo = draft?.companyLogo;
  useEffect(() => {
    if (!companyName && !companyLogo) return;
    const previousTitle = document.title;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const previousIcon = favicon?.href || "";
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    document.title = companyName || "Brixspace";
    if (companyLogo) favicon.href = companyLogo;
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
    () => buildThemeVars("brixspace", draft?.styleConfig) || {},
    [draft?.styleConfig],
  );
  if (!draft)
    return (
      <div className="bx" style={themeVars}>
        <style>{BRIXSPACE_CSS}</style>
        <div className="bx-shell bx-empty">No preview data found.</div>
      </div>
    );
  const openLead: BrixspaceCtx["openLead"] = (
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
  const ctx: BrixspaceCtx = {
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
  const products = () => {
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
  const page = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <BrixspaceAbout /> : <BrixspaceHome />;
      case "products":
        return t.productsPageEnabled ? products() : <BrixspaceHome />;
      case "gallery":
        return t.galleryPageEnabled ? <BrixspaceGallery /> : <BrixspaceHome />;
      case "testimonials":
        return <BrixspaceTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <BrixspacePartner /> : <BrixspaceHome />;
      case "careers":
        return t.careersPageEnabled ? <BrixspaceCareers /> : <BrixspaceHome />;
      case "contact":
        return t.contactPageEnabled ? <BrixspaceContact /> : <BrixspaceHome />;
      default:
        return <BrixspaceHome />;
    }
  };
  return (
    <BrixspaceProvider value={ctx}>
      <div className={`bx bx-page-${t.currentSection}`} style={themeVars}>
        <style>{BRIXSPACE_CSS}</style>
        <AnimatePresence>
          {loading ? <Loader name={draft.companyName || "Brix Rooms"} /> : null}
        </AnimatePresence>
        <BrixspaceHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {page()}
        </motion.main>
        <BrixspaceFooter />
        <BrixspaceBooking
          open={Boolean(leadTarget)}
          onClose={closeLead}
          service={leadTarget?.service || null}
          item={leadTarget?.item || null}
        />
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </BrixspaceProvider>
  );
};
export default BrixspaceTemplate;
