import type { ElementType } from "react";
import { ContactRound } from "lucide-react";
import { MdOutlineRateReview, MdOutlineTravelExplore } from "react-icons/md";
import { BadgeCheck } from "lucide-react";

// Same shape as SALES_DASHBOARD_MODULES in pages/Sales — the Nomad Listings
// workspace mirrors the sales "All Management" dashboard pattern so module
// cards stay consistent across departments.
export type NomadDashboardModule = {
  id: string;
  label: string;
  icon: ElementType;
  route: string;
  description: string;
  color: string;
};

export const NOMAD_DASHBOARD_MODULES: NomadDashboardModule[] = [
  { id: "nomad-listings", label: "Listings", icon: MdOutlineTravelExplore as ElementType, route: "/key-apps/nomad-listings", description: "Co-working and co-living space listings", color: "#2563EB" },
  { id: "nomad-reviews", label: "Reviews", icon: MdOutlineRateReview as ElementType, route: "/key-apps/reviews", description: "Guest reviews of your listed spaces", color: "#7C3AED" },
  { id: "nomads-leads", label: "Nomads Leads", icon: ContactRound, route: "/key-apps/nomads-leads", description: "Enquiries received from your Nomads listings", color: "#0F766E" },
  { id: "nomad-verify-business", label: "Verify Business", icon: BadgeCheck, route: "/key-apps/verify-business", description: "Verified badge for your live listings", color: "#F59E0B" },
];
