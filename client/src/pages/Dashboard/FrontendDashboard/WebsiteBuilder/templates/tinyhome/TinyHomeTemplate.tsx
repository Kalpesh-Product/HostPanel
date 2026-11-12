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
import { TinyHomeProvider, type TinyHomeContext } from "./TinyHomeContext";
import { TinyHomeHeader, TinyHomeFooter } from "./TinyHomeChrome";
import { TinyHomeHome } from "./TinyHomeHome";
import { TinyHomeBooking } from "./TinyHomeBooking";
import {
  AboutPage, CareersPage, ContactPage, GalleryPage, PartnerPage, ReviewsPage,
} from "./TinyHomePages";
import { StaysPage, StayServicePage, StayDetailPage } from "./TinyHomeStays";
import { TINY_HOME_CSS } from "./tinyHomeTheme";

export default function TinyHomeTemplate() {
  const t = useWebsiteTemplateData();
  const { draft } = t;
  const { pathname } = useLocation();
  const [booking, setBooking] = useState<{ service: Service; item: ServiceItem | null } | null>(null);
  const services = useMemo(() => draft ? buildServices(draft, t.productPages) : [], [draft, t.productPages]);
  const primary = resolvePrimaryService(draft, services);
  const kind = resolvePrimaryKind(draft, primary);
  const theme = buildThemeVars("tinyhome", draft?.styleConfig);

  if (!draft) return <div className="tinyhome tinyhome-shell">No preview data found.</div>;

  const context: TinyHomeContext = {
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
      case "about": return t.aboutPageEnabled ? <AboutPage /> : <TinyHomeHome />;
      case "gallery": return t.galleryPageEnabled ? <GalleryPage /> : <TinyHomeHome />;
      case "partner": return t.partnerPageEnabled ? <PartnerPage /> : <TinyHomeHome />;
      case "careers": return t.careersPageEnabled ? <CareersPage /> : <TinyHomeHome />;
      case "contact": return t.contactPageEnabled ? <ContactPage /> : <TinyHomeHome />;
      case "testimonials": return <ReviewsPage />;
      case "products": {
        if (!t.productsPageEnabled) return <TinyHomeHome />;
        const service = services.find((entry) => entry.slug === t.currentProductSlug);
        if (!service) return <StaysPage />;
        const item = service.items.find((entry) => entry.slug === normalizeSlug(t.currentItemSlug));
        return item ? <StayDetailPage service={service} item={item} /> : <StayServicePage service={service} />;
      }
      default: return <TinyHomeHome />;
    }
  }

  return (
    <TinyHomeProvider value={context}>
      <div className="tinyhome" style={theme}>
        <style>{TINY_HOME_CSS}</style>
        <TinyHomeHeader />
        <main id="tinyhome-main" key={pathname}>{renderPage()}</main>
        {t.isSectionEnabled("home_footer") ? <TinyHomeFooter /> : null}
        {booking ? (
          <TinyHomeBooking {...booking} onClose={() => {
            setBooking(null);
            t.closeLeadModal();
          }} />
        ) : null}
        <ReviewModal />
        <Lightbox />
        <Toast />
      </div>
    </TinyHomeProvider>
  );
}
