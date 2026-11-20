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
import { RestobarProvider, type RestobarContext } from "./RestobarContext";
import { RestobarHeader, RestobarFooter } from "./RestobarChrome";
import { RestobarHome } from "./RestobarHome";
import { RestobarBooking } from "./RestobarBooking";
import { RestobarCursor } from "./RestobarCursor";
import {
  AboutPage, CareersPage, ContactPage, GalleryPage, MenuPage, MenuItemPage,
  MenusPage, PartnerPage, ReviewsPage,
} from "./RestobarPages";
import { RESTOBAR_CSS } from "./restobarTheme";

export default function RestobarTemplate() {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const { pathname } = useLocation();
  const [booking, setBooking] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  const services = useMemo(() => draft ? buildServices(draft, t.productPages) : [], [draft, t.productPages]);
  const primary = resolvePrimaryService(draft, services);
  const kind = resolvePrimaryKind(draft, primary);
  const theme = buildThemeVars("restobar", draft?.styleConfig);

  if (!draft) return <div className="resto resto-shell">No preview data found.</div>;

  const context: RestobarContext = {
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
      case "about": return t.aboutPageEnabled ? <AboutPage /> : <RestobarHome />;
      case "gallery": return t.galleryPageEnabled ? <GalleryPage /> : <RestobarHome />;
      case "partner": return t.partnerPageEnabled ? <PartnerPage /> : <RestobarHome />;
      case "careers": return t.careersPageEnabled ? <CareersPage /> : <RestobarHome />;
      case "contact": return t.contactPageEnabled ? <ContactPage /> : <RestobarHome />;
      case "testimonials": return <ReviewsPage />;
      case "products": {
        if (!t.productsPageEnabled) return <RestobarHome />;
        const service = services.find((entry) => entry.slug === t.currentProductSlug);
        if (!service) return <MenusPage />;
        const item = service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug));
        return item ? <MenuItemPage service={service} item={item} /> : <MenuPage service={service} />;
      }
      default: return <RestobarHome />;
    }
  }

  return (
    <RestobarProvider value={context}>
      <div className="resto" style={theme}>
        <style>{RESTOBAR_CSS}</style>
        <RestobarCursor />
        <RestobarHeader />
        <main id="resto-main" key={pathname}>{renderPage()}</main>
        {t.isSectionEnabled("home_footer") ? <RestobarFooter /> : null}
        {booking ? (
          <RestobarBooking {...booking} onClose={() => {
            setBooking(null);
            t.closeLeadModal();
          }} />
        ) : null}
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </RestobarProvider>
  );
}
