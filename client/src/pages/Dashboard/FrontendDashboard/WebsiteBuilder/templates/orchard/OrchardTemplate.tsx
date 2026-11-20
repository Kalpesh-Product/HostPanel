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
import { OrchardFooter, OrchardHeader } from "./OrchardChrome";
import { OrchardHome } from "./OrchardHome";
import {
  OrchardItemDetail,
  OrchardServicePage,
  OrchardServicesIndex,
} from "./OrchardStays";
import {
  OrchardAbout,
  OrchardCareers,
  OrchardContact,
  OrchardGallery,
  OrchardPartner,
  OrchardTestimonials,
} from "./OrchardPages";
import { ORCHARD_CSS, ORCHARD_PALETTE } from "./orchardTheme";

const GENERIC_NAV_LABEL: Record<string, string> = {
  about: "About",
  products: "Services",
  gallery: "Gallery",
  partner: "Partner",
  careers: "Careers",
  contact: "Contact",
};

const OrchardTemplate: React.FC = () => {
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
      palette: { ...profile.palette, ...ORCHARD_PALETTE },
    }),
    [profile],
  );
  const themeVars = useMemo(
    () => buildTemplateVars("orchard", draft, visualProfile),
    [draft, visualProfile],
  );

  if (!draft)
    return (
      <div className="wf ol" style={themeVars}>
        <style>{ORCHARD_CSS}</style>
        <div className="ol-shell py-24">
          <h1 className="ol-heading">Preview</h1>
          <p className="ol-lead mt-4">
            No preview data found. Go back to Create Website and click Preview.
          </p>
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

  const renderProducts = () => {
    const service = services.find((s) => s.slug === t.currentProductSlug);
    if (!service) return <OrchardServicesIndex />;
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
      <OrchardItemDetail key={item.key} service={service} item={item} />
    ) : (
      <OrchardServicePage key={service.key} service={service} />
    );
  };

  const renderPage = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <OrchardAbout /> : <OrchardHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <OrchardHome />;
      case "gallery":
        return t.galleryPageEnabled ? <OrchardGallery /> : <OrchardHome />;
      case "testimonials":
        return <OrchardTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <OrchardPartner /> : <OrchardHome />;
      case "careers":
        return t.careersPageEnabled ? <OrchardCareers /> : <OrchardHome />;
      case "contact":
        return t.contactPageEnabled ? <OrchardContact /> : <OrchardHome />;
      default:
        return <OrchardHome />;
    }
  };

  return (
    <TplProvider value={ctx}>
      <div className="wf ol" style={themeVars}>
        <style>{ORCHARD_CSS}</style>
        <OrchardHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {renderPage()}
        </motion.main>
        <OrchardFooter />
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

export default OrchardTemplate;
