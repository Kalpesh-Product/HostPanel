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
  buildTemplateVars,
  openStatus,
  resolvePrimaryKind,
  resolvePrimaryService,
} from "../templateKit";
import { getServiceProfile } from "../verticalProfiles";
import { THEME_DEFAULTS } from "../templateTheme";
import { contentCopy, contentImage } from "../templateContent";
import { TplProvider, type TplCtx } from "../shared/TplContext";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { WAVEX_CSS } from "./wavexTheme";
import { WavexFooter, WavexHeader, WavexStickyBar } from "./WavexChrome";
import { WavexHome } from "./WavexHome";
import { WavexBooking } from "./WavexBooking";
import { ItemDetail, ServicePage, ServicesIndex } from "./WavexRooms";
import {
  WavexAbout,
  WavexCareers,
  WavexContact,
  WavexGallery,
  WavexPartner,
  WavexTestimonials,
} from "./WavexPages";

/**
 * WaveX Rooms — a warm, editorial meeting-room template. Large photographic carousels,
 * a community/stats strip, membership cards, testimonials and a contact form. All copy and
 * photos come from the site draft or the template's editable content slots.
 */
const WaveXTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [leadTarget, setLeadTarget] = useState<{
    service: Service;
    item: ServiceItem | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 620);
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
  const serviceProfile = getServiceProfile(kind);
  // WaveX ships with its own warm coral palette. The generic meeting vertical
  // defaults to a blue scheme (shared by Huddle), so override it unless the
  // business has explicitly picked colours in the builder.
  const profile = useMemo(() => {
    const wavex = THEME_DEFAULTS.wavex;
    return {
      ...serviceProfile,
      labels: { ...serviceProfile.labels, leadSubmit: "Request Booking" },
      palette: {
        ...serviceProfile.palette,
        bg: wavex.bg,
        text: wavex.text,
        accent: wavex.accent,
      },
    };
  }, [serviceProfile]);
  const rating = useMemo(() => averageRating(t.testimonials), [t.testimonials]);
  const status = useMemo(
    () => openStatus(draft?.openingHours),
    [draft?.openingHours],
  );
  const themeVars = useMemo(() => {
    const vars = { ...buildTemplateVars("wavex", draft, profile) } as Record<string, string>;
    // Coral reads better with white labels than with the auto-picked dark text.
    // Keep this override local to WaveX so other templates are unaffected.
    vars["--t-accent-text"] = "#ffffff";
    vars["--t-accent-secondary-text"] = "#ffffff";
    return vars as React.CSSProperties;
  }, [draft, profile]);

  if (!draft) {
    return (
      <div className="wx" style={themeVars}>
        <style>{WAVEX_CSS}</style>
        <div className="wx-shell" style={{ padding: "80px 0" }}>
          <h1 className="tp-h3">Preview</h1>
          <p className="tp-muted" style={{ marginTop: 8 }}>
            No preview data found. Go back to Create Website and click Preview.
          </p>
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
    const service = services.find((item) => item.slug === t.currentProductSlug);
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
        return t.aboutPageEnabled ? <WavexAbout /> : <WavexHome />;
      case "products":
        return t.productsPageEnabled ? renderProducts() : <WavexHome />;
      case "gallery":
        return t.galleryPageEnabled ? <WavexGallery /> : <WavexHome />;
      case "testimonials":
        return <WavexTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <WavexPartner /> : <WavexHome />;
      case "careers":
        return t.careersPageEnabled ? <WavexCareers /> : <WavexHome />;
      case "contact":
        return t.contactPageEnabled ? <WavexContact /> : <WavexHome />;
      default:
        return <WavexHome />;
    }
  };

  return (
    <TplProvider value={ctx}>
      <div className="wx" style={themeVars}>
        <style>{WAVEX_CSS}</style>
        <AnimatePresence>
          {loading ? (
            <motion.div
              className="wx-loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="wx-loader-inner">
                <span>{draft?.companyName || "WaveX"}</span>
                <i />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <WavexHeader />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderPage()}
        </motion.main>
        <WavexFooter />
        <WavexStickyBar />
        <WavexBooking
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

export default WaveXTemplate;
