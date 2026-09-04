import { useState } from "react";
import type { ElementType } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  CalendarCheck,
  Clock,
  HandCoins,
  ReceiptIndianRupee,
  Ticket,
  User,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import { getStoredTenantRole, isTenantManagerRole } from "../lib/tenant-session";
import useLogout from "../hooks/useLogout";

interface NavNode {
  id: string;
  label: string;
  icon?: ElementType;
  route?: string;
  isRed?: boolean;
  children?: NavNode[];
  rolesAllowed?: string[];
}

interface TenantSidebarProps {
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

interface NavItemProps {
  icon?: ElementType;
  label: string;
  collapsed: boolean;
  depth?: number;
  hasChildren?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  isRed?: boolean;
  isActive?: boolean;
}

const NavItem = ({
  icon: Icon,
  label,
  collapsed,
  depth = 0,
  hasChildren,
  isOpen,
  onClick,
  isRed,
  isActive,
}: NavItemProps) => {
  return (
    <button
      type="button"
      aria-label={collapsed ? label : undefined}
      className={`group relative flex w-full items-center rounded-md text-left transition-all hover:bg-white ${
        collapsed ? "h-10 justify-center gap-0 p-0" : "gap-2 px-3 py-2.5"
      } ${
        isActive ? "bg-white text-black shadow-sm" : "text-black/80"
      } ${isRed ? "text-red-500 hover:text-red-600" : ""} cursor-pointer`}
      style={collapsed ? undefined : { paddingLeft: `${depth * 1.25 + 0.75}rem` }}
      onClick={onClick}
    >
      {Icon && (
        <Icon
          size={18}
          className={`shrink-0 ${isRed ? "text-red-500" : isActive ? "text-accent" : "text-black/80"}`}
        />
      )}
      {!collapsed && (
        <span className={`truncate font-['Poppins'] text-xs font-medium ${isActive ? "font-semibold" : ""}`}>
          {label}
        </span>
      )}
      {!collapsed && hasChildren && (
        isOpen
          ? <ChevronUp size={16} className="ml-auto shrink-0 text-black/50" />
          : <ChevronDown size={16} className="ml-auto shrink-0 text-black/50" />
      )}
    </button>
  );
};

const NavGroup = ({ item, collapsed, depth = 0, pathname, onNavigate }: {
  item: NavNode;
  collapsed: boolean;
  depth?: number;
  pathname: string;
  onNavigate: (item: NavNode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const hasChildren = Boolean(item.children?.length);
  const isActive = item.route
    ? item.id === "tenant-dashboard"
      ? pathname === "/dashboard/tenant"
      : pathname.startsWith(item.route)
    : false;

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen((prev) => !prev);
      return;
    }
    onNavigate(item);
  };

  return (
    <div>
      <NavItem
        icon={item.icon}
        label={item.label}
        collapsed={collapsed}
        depth={depth}
        hasChildren={hasChildren}
        isOpen={isOpen}
        onClick={handleClick}
        isRed={item.isRed}
        isActive={isActive}
      />
      {hasChildren && isOpen && !collapsed && item.children && (
        <div className="mt-1 flex flex-col gap-1">
          {item.children.map((child) => (
            <NavGroup
              key={child.id}
              item={child}
              collapsed={collapsed}
              depth={depth + 1}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const tenantNavNodes: NavNode[] = [
  { id: "tenant-dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/dashboard/tenant" },
  { id: "tenant-meeting-room-booking", label: "Meeting Room Booking", icon: CalendarCheck, route: "/dashboard/tenant/meeting-room-booking" },
  { id: "tenant-booking-history", label: "Booking History", icon: Clock, route: "/dashboard/tenant/booking-history" },
  { id: "tenant-buy-credits", label: "Buy Credits", icon: HandCoins, route: "/dashboard/tenant/buy-credits", rolesAllowed: ["manager", "admin"] },
  { id: "tenant-rent-payments", label: "Rent Payments", icon: ReceiptIndianRupee, route: "/dashboard/tenant/rent-payments", rolesAllowed: ["manager", "admin"] },
  { id: "tenant-tickets", label: "Tickets", icon: Ticket, route: "/dashboard/tenant/tickets" },
];

const generalData: NavNode[] = [
  { id: "tenant-profile", label: "Profile", icon: User, route: "/profile/my-profile" },
  { id: "logout", label: "Sign Out", icon: LogOut, isRed: true },
];

const SECTION_ABBR: Record<string, string> = {
  tenant: "TNT",
};

const TenantSidebar = ({ onCloseDrawer }: TenantSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarOpen } = useSidebar();
  const logout = useLogout();
  const collapsed = !isSidebarOpen;

  const { auth } = useAuth();
  const tenantRole = auth?.user?.tenantRole || getStoredTenantRole();
  const isManager = isTenantManagerRole(tenantRole);

  const visibleNavNodes = tenantNavNodes.filter((node) => {
    if (!node.rolesAllowed) return true;
    if (node.rolesAllowed.includes("admin") && tenantRole === "tenant-admin") return true;
    if (node.rolesAllowed.includes("manager") && isManager) return true;
    return false;
  });

  const onNavigate = (item: NavNode) => {
    if (item.id === "logout") {
      void logout();
      onCloseDrawer?.();
      return;
    }
    if (item.route) {
      navigate(item.route);
      onCloseDrawer?.();
    }
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-[90vh] bg-[#efefef] flex flex-col border-r border-black/10 overflow-hidden transition-all duration-300`}
    >
      <div className="flex-1 overflow-y-auto pb-3 space-y-0 hideScrollBar">
        <div className="px-4 pt-3">
          <div className="border-t border-black/10 pt-2">
            {!collapsed ? (
              <div className="font-['Poppins'] text-xs font-semibold uppercase tracking-wide text-black/80">
                Tenant
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[10px] font-pbold tracking-wide text-black/80 uppercase text-center">
                  {SECTION_ABBR.tenant}
                </div>
              </div>
            )}
            <div className="space-y-1">
              {visibleNavNodes.map((item) => (
                <NavGroup
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  pathname={location.pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pt-2">
          <div className="border-t border-black/10 pt-2 space-y-1">
            {generalData.map((item) => (
              <NavGroup
                key={item.id}
                item={item}
                collapsed={collapsed}
                pathname={location.pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSidebar;