import { useState } from "react";
import type { ElementType } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  CalendarCheck,
  Clock,
  HandCoins,
  Ticket,
  User,
  LogOut,
  Building2,
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
}: NavItemProps) => (
  <button
    type="button"
    className={`w-full flex items-center justify-between py-2 px-3 select-none rounded-md transition-colors ${
      isActive ? "bg-gray-200 font-medium" : "hover:bg-gray-200"
    } ${isRed ? "text-red-500 hover:text-red-600" : "text-gray-700 hover:text-gray-900"} cursor-pointer`}
    style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
    onClick={onClick}
  >
    <span className="flex items-center gap-3 min-w-0">
      {Icon && <Icon size={16} className={isRed ? "text-red-500" : "text-gray-500"} />}
      {!collapsed && (
        <span className="text-[12px] font-pmedium truncate">{label.toUpperCase()}</span>
      )}
    </span>
    {!collapsed && hasChildren && (isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />)}
  </button>
);

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
  { id: "tenant-tickets", label: "Tickets", icon: Ticket, route: "/dashboard/tenant/tickets" },
];

const generalData: NavNode[] = [
  { id: "tenant-profile", label: "Profile", icon: User, route: "/profile/my-profile" },
  { id: "logout", label: "Sign Out", icon: LogOut, isRed: true },
];

const SECTION_ABBR: Record<string, string> = {
  tenant: "TNT",
};

const TenantSidebar = ({ drawerOpen, onCloseDrawer }: TenantSidebarProps) => {
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
      } h-[90vh] bg-[#f3f4f6] flex flex-col border-r border-gray-200 shadow-sm overflow-hidden transition-all duration-100`}
    >
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-5 hideScrollBar">
        {/* Tenant section */}
        <div>
          {!collapsed ? (
            <div className="flex items-center justify-center px-3 mb-2">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="text-[10px] font-pbold text-gray-500 tracking-wider px-2">Tenant</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
          ) : (
            <div className="px-2 pt-1 pb-2">
              <div className="text-[10px] font-pbold tracking-wider text-gray-500 uppercase text-center">
                {SECTION_ABBR.tenant}
              </div>
              <div className="mt-2 h-px bg-gray-300" />
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

        {/* General section */}
        <div>
          {!collapsed ? (
            <div className="flex items-center justify-center px-3 mb-2">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="text-[10px] font-pbold text-gray-500 tracking-wider px-2">General</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
          ) : (
            <div className="px-2 pt-1 pb-2">
              <div className="text-[10px] font-pbold tracking-wider text-gray-500 uppercase text-center">GEN</div>
              <div className="mt-2 h-px bg-gray-300" />
            </div>
          )}
          <div className="space-y-1">
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
