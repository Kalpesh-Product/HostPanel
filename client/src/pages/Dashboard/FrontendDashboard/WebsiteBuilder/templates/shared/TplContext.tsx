import { createContext, useContext } from "react";
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
export const TplProvider = Ctx.Provider;

export const useTpl = (): TplCtx => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useTpl must be used inside <TplProvider>");
  return value;
};
