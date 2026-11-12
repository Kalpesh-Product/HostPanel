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
import { CoPlaceProvider, type CoPlaceContext } from "./CoPlaceContext";
import { CoPlaceHeader, CoPlaceFooter } from "./CoPlaceChrome";
import { CoPlaceHome } from "./CoPlaceHome";
import { CoPlaceBooking } from "./CoPlaceBooking";
import {
  AboutPage, CareersPage, ContactPage, GalleryPage, PartnerPage, ReviewsPage,
} from "./CoPlacePages";
import { WorkspacesPage, WorkspaceServicePage, WorkspaceDetailPage } from "./CoPlaceWorkspaces";
import { COPLACE_CSS } from "./coplaceTheme";

export default function CoPlaceTemplate() {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const { pathname } = useLocation();
  const [booking, setBooking] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  const services = useMemo(() => draft ? buildServices(draft, t.productPages) : [], [draft, t.productPages]);
  const primary = resolvePrimaryService(draft, services);
  const kind = resolvePrimaryKind(draft, primary);
  const theme = buildThemeVars("coplace", draft?.styleConfig);

  if (!draft) return <div className="coplace coplace-shell">No preview data found.</div>;

  const context: CoPlaceContext = {
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
      case "about": return t.aboutPageEnabled ? <AboutPage /> : <CoPlaceHome />;
      case "gallery": return t.galleryPageEnabled ? <GalleryPage /> : <CoPlaceHome />;
      case "partner": return t.partnerPageEnabled ? <PartnerPage /> : <CoPlaceHome />;
      case "careers": return t.careersPageEnabled ? <CareersPage /> : <CoPlaceHome />;
      case "contact": return t.contactPageEnabled ? <ContactPage /> : <CoPlaceHome />;
      case "testimonials": return <ReviewsPage />;
      case "products": {
        if (!t.productsPageEnabled) return <CoPlaceHome />;
        const service = services.find((entry) => entry.slug === t.currentProductSlug);
        if (!service) return <WorkspacesPage />;
        const item = service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug));
        return item ? <WorkspaceDetailPage service={service} item={item} /> : <WorkspaceServicePage service={service} />;
      }
      default: return <CoPlaceHome />;
    }
  }

  return (
    <CoPlaceProvider value={context}>
      <div className="coplace" style={theme}>
        <style>{COPLACE_CSS}</style>
        <CoPlaceHeader />
        <main id="coplace-main" key={pathname}>{renderPage()}</main>
        {t.isSectionEnabled("home_footer") ? <CoPlaceFooter /> : null}
        {booking ? (
          <CoPlaceBooking {...booking} onClose={() => {
            setBooking(null);
            t.closeLeadModal();
          }} />
        ) : null}
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </CoPlaceProvider>
  );
}
