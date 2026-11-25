import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { buildServices, type Service, type ServiceItem } from "../serviceAdapter";
import { averageRating, openStatus, resolvePrimaryKind, resolvePrimaryService } from "../templateKit";
import { getServiceProfile } from "../verticalProfiles";
import { buildThemeVars } from "../templateTheme";
import { contentCopy, contentImage } from "../templateContent";
import { normalizeSlug, resolveSectionFromSlug, useWebsiteTemplateData } from "../useWebsiteTemplateData";
import { ReviewModal } from "../shared/TplForms";
import { Lightbox, Toast } from "../shared/TplParts";
import { CabinProvider, type CabinContext } from "./CabinContext";
import { CabinHeader, CabinFooter } from "./CabinChrome";
import { CabinHome } from "./CabinHome";
import { CabinBooking } from "./CabinBooking";
import {
  AboutPage, CareersPage, ContactPage, GalleryPage, PartnerPage, ReviewsPage,
} from "./CabinPages";
import { StaysPage, StayServicePage, StayDetailPage } from "./CabinStays";
import { CABIN_CSS } from "./cabinTheme";

export default function CabinTemplate() {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const { pathname } = useLocation();
  const [booking, setBooking] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  const services = useMemo(() => draft ? buildServices(draft, t.productPages) : [], [draft, t.productPages]);
  const primary = resolvePrimaryService(draft, services);
  const kind = resolvePrimaryKind(draft, primary);
  const theme = buildThemeVars("cabin", draft?.styleConfig);

  if (!draft) return <div className="cabin cabin-shell">No preview data found.</div>;

  const context: CabinContext = {
    t, draft, services, primary, kind,
    profile: getServiceProfile(kind),
    rating: averageRating(t.testimonials),
    status: openStatus(draft.openingHours),
    openLead: (service, item = null, prefill) => {
      if (!service.leadEnabled) return;
      t.openLeadModal({
        ...service.page,
        ...item?.raw,
        name: item?.title || service.name,
        heading: service.heading,
        slug: service.slug,
      }, prefill);
      setBooking({ service, item });
    },
    goToService: (service) => t.goToProductPage(service.slug),
    goToItem: (service, item) => t.goToProductItem(service.slug, item.slug),
    navLabel: (section, fallback) =>
      t.navItems.find((item) => resolveSectionFromSlug(item.slug) === section)?.name || fallback,
    c: (key, fallback) => contentCopy(draft, key, fallback),
    photo: (key, fallback) => contentImage(draft, key, fallback),
  };

  function renderPage() {
    switch (t.currentSection) {
      case "about": return t.aboutPageEnabled ? <AboutPage /> : <CabinHome />;
      case "gallery": return t.galleryPageEnabled ? <GalleryPage /> : <CabinHome />;
      case "partner": return t.partnerPageEnabled ? <PartnerPage /> : <CabinHome />;
      case "careers": return t.careersPageEnabled ? <CareersPage /> : <CabinHome />;
      case "contact": return t.contactPageEnabled ? <ContactPage /> : <CabinHome />;
      case "testimonials": return <ReviewsPage />;
      case "products": {
        if (!t.productsPageEnabled) return <CabinHome />;
        const service = services.find((entry) => entry.slug === t.currentProductSlug);
        if (!service) return <StaysPage />;
        const item = service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug));
        return item ? <StayDetailPage service={service} item={item} /> : <StayServicePage service={service} />;
      }
      default: return <CabinHome />;
    }
  }

  return (
    <CabinProvider value={context}>
      <div className="cabin" style={theme}>
        <style>{CABIN_CSS}</style>
        <CabinHeader />
        <main id="cabin-main" key={pathname}>{renderPage()}</main>
        {t.isSectionEnabled("home_footer") ? <CabinFooter /> : null}
        {booking ? (
          <CabinBooking {...booking} onClose={() => {
            setBooking(null);
            t.closeLeadModal();
          }} />
        ) : null}
        <ReviewModal panelBackground="var(--t-bg, var(--cb-white))" />
        <Lightbox />
        <Toast />
      </div>
    </CabinProvider>
  );
}
