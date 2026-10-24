import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "../motion";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
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
import { AromaticaBooking } from "./AromaticaBooking";
import { AromaticaFooter, AromaticaHeader } from "./AromaticaChrome";
import { AromaticaProvider, type AromaticaCtx } from "./AromaticaContext";
import { AromaticaHome } from "./AromaticaHome";
import { AromaArrow } from "./AromaticaUI";
import {
  AromaticaAbout,
  AromaticaCareers,
  AromaticaContact,
  AromaticaGallery,
  AromaticaPartner,
  AromaticaTestimonials,
  ItemDetail,
  ServicePage,
  ServicesIndex,
} from "./AromaticaPages";
import { AROMATICA_CSS } from "./aromaticaTheme";

const Loader: React.FC<{ name: string }> = ({ name }) => (
  <motion.div
    className="aroma-loader"
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.55 }}
  >
    <div className="aroma-loader-bean">
      <i />
      <i />
    </div>
    <strong>{name}</strong>
    <span>ROASTING YOUR EXPERIENCE</span>
  </motion.div>
);

const AromaticaTemplate: React.FC = () => {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [leadTarget, setLeadTarget] = useState<{
    service: Service;
    item: ServiceItem | null;
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1050);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!leadTarget) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [leadTarget]);
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 620);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    if (!draft?.companyName && !draft?.companyLogo) return;
    const oldTitle = document.title;
    const icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const oldIcon = icon?.href || "";
    document.title = draft.companyName || "Aromatica";
    if (icon && draft.companyLogo) icon.href = draft.companyLogo;
    return () => {
      document.title = oldTitle;
      if (icon) icon.href = oldIcon;
    };
  }, [draft?.companyName, draft?.companyLogo]);
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
    () => buildThemeVars("aromatica", draft?.styleConfig) || {},
    [draft?.styleConfig],
  );
  if (!draft)
    return (
      <div className="aroma" style={themeVars}>
        <style>{AROMATICA_CSS}</style>
        <div className="aroma-empty">No preview data found.</div>
      </div>
    );
  const openLead: AromaticaCtx["openLead"] = (
    service,
    item = null,
    prefill,
  ) => {
    setLeadTarget({ service, item });
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
  };
  const ctx: AromaticaCtx = {
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
      const previewPrefix = location.pathname.startsWith("/website-preview")
        ? "/website-preview"
        : "";
      navigate(
        `${previewPrefix}/page/products/${service.slug}${query ? `?${query}` : ""}`,
      );
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
      <ItemDetail service={service} item={item} />
    ) : (
      <ServicePage service={service} />
    );
  };
  const page = () => {
    switch (t.currentSection) {
      case "about":
        return t.aboutPageEnabled ? <AromaticaAbout /> : <AromaticaHome />;
      case "products":
        return t.productsPageEnabled ? products() : <AromaticaHome />;
      case "gallery":
        return t.galleryPageEnabled ? <AromaticaGallery /> : <AromaticaHome />;
      case "testimonials":
        return <AromaticaTestimonials />;
      case "partner":
        return t.partnerPageEnabled ? <AromaticaPartner /> : <AromaticaHome />;
      case "careers":
        return t.careersPageEnabled ? <AromaticaCareers /> : <AromaticaHome />;
      case "contact":
        return t.contactPageEnabled ? <AromaticaContact /> : <AromaticaHome />;
      default:
        return <AromaticaHome />;
    }
  };
  return (
    <AromaticaProvider value={ctx}>
      <div className={`aroma aroma-page-${t.currentSection}`} style={themeVars}>
        <style>{AROMATICA_CSS}</style>
        <AnimatePresence>
          {loading ? <Loader name={draft.companyName || "Aromatica"} /> : null}
        </AnimatePresence>
        <AromaticaHeader />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname + location.search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42 }}
          >
            {page()}
          </motion.main>
        </AnimatePresence>
        <AromaticaFooter />
        <AromaticaBooking
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
        <AnimatePresence>
          {showBackToTop ? (
            <motion.button
              type="button"
              className="aroma-back-to-top"
              aria-label="Back to top"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <AromaArrow />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </AromaticaProvider>
  );
};

export default AromaticaTemplate;
