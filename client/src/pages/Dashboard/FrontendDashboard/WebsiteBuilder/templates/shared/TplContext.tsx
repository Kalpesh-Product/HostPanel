import { createContext, useContext, type ReactNode } from "react";
import type { Service, ServiceItem } from "../serviceAdapter";
import type { ServiceKind, ServiceProfile } from "../verticalProfiles";
import type { openStatus } from "../templateKit";

export interface TplCtx {
  /** Everything useWebsiteTemplateData returns. */
  t: any;
  draft: any;
  services: Service[];
  primary: Service | null;
  kind: ServiceKind;
  profile: ServiceProfile;
  rating: { avg: number; count: number };
  status: ReturnType<typeof openStatus>;
  /** Opens the lead form for a service (optionally for one item, optionally prefilled). */
  openLead: (
    service: Service,
    item?: ServiceItem | null,
    prefill?: { form?: Record<string, string>; extras?: Record<string, string> },
  ) => void;
  goToService: (service: Service, opts?: { category?: string; search?: Record<string, string> }) => void;
  goToItem: (service: Service, item: ServiceItem) => void;
  /** The label the business gave a nav page, else `fallback`. */
  navLabel: (section: string, fallback: string) => string;
  /** The owner's wording for a slot (see templateContent.ts), else the template's own `fallback`. */
  c: (key: string, fallback: string) => string;
  /** The photo the owner picked for a slot, else `fallback`. */
  photo: (key: string, fallback: string) => string;
}

const Ctx = createContext<TplCtx | null>(null);

/**
 * Specialized templates use Google Maps while the five legacy/base templates keep
 * their existing map behavior. Converting here also upgrades previously saved OSM
 * embed URLs without changing each template's layout or editable mapUrl contract.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const googleMapEmbedSrc = (address?: string, configuredUrl?: string) => {
  const value = String(configuredUrl || "").trim();
  if (!value) return "";

  const fallback = String(address || "").trim();
  const queryUrl = (query: string) =>
    `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  try {
    const url = new URL(value);
    const isGoogleMap =
      /(^|\.)google\.[a-z.]+$/i.test(url.hostname) ||
      url.hostname === "maps.google.com";
    const isEmbed =
      url.pathname.includes("/maps/embed") ||
      url.searchParams.get("output") === "embed";
    if (isGoogleMap && isEmbed) return value;

    const query =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      fallback;
    return query ? queryUrl(query) : "";
  } catch {
    return fallback ? queryUrl(fallback) : "";
  }
};

export const TplProvider = ({
  value,
  children,
}: {
  value: TplCtx;
  children: ReactNode;
}) => {
  const mapUrl = googleMapEmbedSrc(
    value.t?.contactAddress,
    value.draft?.mapUrl,
  );
  const normalizedValue =
    mapUrl === value.draft?.mapUrl
      ? value
      : { ...value, draft: { ...value.draft, mapUrl } };

  return <Ctx.Provider value={normalizedValue}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTpl = (): TplCtx => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useTpl must be used inside <TplProvider>");
  return value;
};
