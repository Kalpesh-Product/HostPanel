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
import {
  CaliHostelHeader,
  CaliHostelFooter,
  CaliHostelToTop,
} from "./CaliHostelChrome";
import { CaliHostelHome } from "./CaliHostelHome";
import {
  CaliHostelItemDetail,
  CaliHostelServicePage,
  CaliHostelServicesIndex,
} from "./CaliHostelStays";
import {
  CaliHostelAbout,
  CaliHostelCareers,
  CaliHostelContact,
  CaliHostelGallery,
  CaliHostelPartner,
  CaliHostelTestimonials,
} from "./CaliHostelPages";
import { CALI_HOSTEL_CSS, CALI_HOSTEL_PALETTE } from "./caliHostelTheme";

// The shared nav hook's generic defaults (see FALLBACK_NAV in useWebsiteTemplateData.ts) — used to
// tell "business renamed this nav link" apart from "nothing's been customized yet".
const GENERIC_NAV_LABEL: Record<string, string> = {
  about: "About",
  products: "Services",
  gallery: "Gallery",
  partner: "Partner",
  careers: "Careers",
  contact: "Contact",
};

const CaliHostelTemplate: React.FC = () => {
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
  const visualProfile = useMemo(
    () => ({
      ...profile,
      palette: { ...profile.palette, ...CALI_HOSTEL_PALETTE },
    }),
    [profile],
  );
  const themeVars = useMemo(
    () => buildTemplateVars("cali-hostel", draft, visualProfile),
    [draft, visualProfile],
  );
  if (!draft)
    return (
      <div className="wf ch" style={themeVars}>
        <style>{CALI_HOSTEL_CSS}</style>
        <div className="ch-loader">
          <div className="ch-loader-stamp">
            <span>MAREA</span>
            <strong>HOSTEL</strong>
            <small>CHECKING IN</small>
          </div>
          <div className="ch-loader-line">
            <i />
          </div>
        </div>
      </div>
    );
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
  const ctx: TplCtx = {
    t,
    draft,
    services,
    primary,
    kind,
    profile,
    rating: averageRating(t.testimonials),
    status: openStatus(draft?.openingHours),
    openLead,
    goToService: (service, opts) => {
      const q = new URLSearchParams(opts?.search || {});
      if (opts?.category) q.set("cat", opts.category);
      const qs = q.toString();
      navigate(
        `/website-preview/page/products/${service.slug}${qs ? `?${qs}` : ""}`,
      );
    },
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    // Only a nav link the business actually renamed should override the page's own crafted
    // heading — otherwise this always matched the generic default nav label ("About", "Gallery"...)
    // and silently dropped the richer fallback every page hero passes in.
    navLabel: (section, fallback) => {
      const match = (t.navItems || []).find(
        (item: any) => resolveSectionFromSlug(item.slug) === section,
      );
      const name = String(match?.name || "").trim();
      const isGenericDefault =
        !name ||
        name.toLowerCase() === (GENERIC_NAV_LABEL[section] || "").toLowerCase();
      return isGenericDefault ? fallback : name;
    },
    c: (key, fallback) => contentCopy(draft, key, fallback),
    photo: (key, fallback) => contentImage(draft, key, fallback),
  };
  const products = () => {
    const service = services.find((s) => s.slug === t.currentProductSlug);
    if (!service) return <CaliHostelServicesIndex />;
    let routeItemSlug = t.currentItemSlug;
    try {
      routeItemSlug = decodeURIComponent(routeItemSlug);
    } catch {
      /* Keep the original route fragment when malformed. */
    }
    const item = routeItemSlug
      ? service.items.find((i) => i.slug === normalizeSlug(routeItemSlug))
      : null;
    return item ? (
      <CaliHostelItemDetail key={item.key} service={service} item={item} />
    ) : (
      <CaliHostelServicePage key={service.key} service={service} />
    );
  };
  const page = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <CaliHostelAbout /> : <CaliHostelHome />;
      case "products":
        return t.productsPageEnabled ? products() : <CaliHostelHome />;
      case "gallery":
        return t.galleryPageEnabled ? (
          <CaliHostelGallery />
        ) : (
          <CaliHostelHome />
        );
      case "testimonials":
        return <CaliHostelTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? (
          <CaliHostelPartner />
        ) : (
          <CaliHostelHome />
        );
      case "careers":
        return t.careersPageEnabled ? (
          <CaliHostelCareers />
        ) : (
          <CaliHostelHome />
        );
      case "contact":
        return t.contactPageEnabled ? (
          <CaliHostelContact />
        ) : (
          <CaliHostelHome />
        );
      default:
        return <CaliHostelHome />;
    }
  };
  return (
    <TplProvider value={ctx}>
      <div className="wf ch" style={themeVars}>
        <style>{CALI_HOSTEL_CSS}</style>
        <CaliHostelHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          {page()}
        </motion.main>
        <CaliHostelFooter />
        <CaliHostelToTop />
        <LeadModal
          open={Boolean(leadTarget)}
          onClose={() => {
            setLeadTarget(null);
            t.closeLeadModal();
          }}
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
export default CaliHostelTemplate;
