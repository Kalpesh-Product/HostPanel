import type { ElementType } from "react";
import {
  Bed,
  BriefcaseBusiness,
  Building2,
  Home,
  Magnet,
  ShoppingCart,
  Tag,
  Users,
  UtensilsCrossed,
} from "lucide-react";

export type SalesDashboardModule = {
  id: string;
  label: string;
  icon: ElementType;
  route: string;
  description: string;
  color: string;
  verticals?: string[];
};

export const SALES_DASHBOARD_MODULES: SalesDashboardModule[] = [
  { id: "leads-management", label: "Leads Management", icon: Magnet, route: "/department-accesses/sales-department/leads-management", description: "Track and convert sales enquiries", color: "#2563EB" },
  { id: "resource-pricing", label: "Resource & Pricing", icon: Tag, route: "/department-accesses/sales-department/resource-pricing", description: "Manage inventory pricing and packages", color: "#7C3AED" },
  { id: "cafe-management", label: "Cafe Management", icon: UtensilsCrossed, route: "/key-apps/cafe-management", description: "Tables, orders, reservations, and menu", color: "#EA580C", verticals: ["cafe"] },
  { id: "hostel-management", label: "Hostel Management", icon: Bed, route: "/key-apps/hostel-management", description: "Dorms, beds, guests, and stay revenue", color: "#0D9488", verticals: ["hostel"] },
  { id: "co-living-management", label: "Co-living Management", icon: Home, route: "/key-apps/co-living-management", description: "Rooms, residents, bookings, and revenue", color: "#0891B2", verticals: ["co-living"] },
  { id: "co-working-management", label: "Co-working Management", icon: BriefcaseBusiness, route: "/key-apps/co-working-management", description: "Desks, tenants, occupancy, and renewals", color: "#1E3D73", verticals: ["co-working"] },
  { id: "meeting-room-management", label: "Meeting Room Management", icon: Users, route: "/key-apps/meeting-room-management", description: "Meeting rooms, bookings, and revenue", color: "#4F46E5", verticals: ["meeting-rooms"] },
  { id: "virtual-office-sales", label: "Virtual Offices", icon: Building2, route: "/department-accesses/sales-department/virtual-offices", description: "Virtual-office clients and assignments", color: "#0F766E", verticals: ["co-working"] },
  { id: "sales-architecture", label: "Sales Architecture", icon: ShoppingCart, route: "/department-accesses/sales-department/sales-architecture", description: "Vertical resource and space architecture", color: "#F59E0B" },
];
