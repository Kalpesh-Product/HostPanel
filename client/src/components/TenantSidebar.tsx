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
import { getStoredTenantRole, isTenantManagerRole } from "../lib/tenant-session";

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
}: {
  icon?: ElementType;
  label: string;
  collapsed: boolean;
  depth?: number;
  hasChildren?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  isRed?: boolean;
  isActive?: boolean;
}) => (
  <button
    type="button"
    className={`w-full flex items-center justify-between py-2 px-3 select-none rounded-md transition-colors ${
      isActive ? "bg-blue-100 font-medium" : "hover:bg-gray-200"
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
  const [isOpen, setIsOpen] = useState(item.id === "tenant-dashboard");
  const hasChildren = Boolean(item.children?.length);
  const isActive = item.route ? pathname.startsWith(item.route) : false;

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
      {hasChildren && isOpen && item.children && (
        <div>
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

const allNavNodes: NavNode[] = [
  { id: "tenant-dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/dashboard/tenant" },
  { id: "tenant-meeting-room-booking", label: "Meeting Room Booking", icon: CalendarCheck, route: "/dashboard/tenant/meeting-room-booking" },
  { id: "tenant-booking-history", label: "Booking History", icon: Clock, route: "/dashboard/tenant/booking-history" },
  { id: "tenant-buy-credits", label: "Buy Credits", icon: HandCoins, route: "/dashboard/tenant/buy-credits", rolesAllowed: ["manager", "admin"] },
  { id: "tenant-tickets", label: "Tickets", icon: Ticket, route: "/dashboard/tenant/tickets" },
  { id: "tenant-profile", label: "Profile", icon: User, route: "/profile/company-profile" },
];

const TenantSidebar = ({ drawerOpen, onCloseDrawer }: TenantSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarOpen } = useSidebar();
  const collapsed = !isSidebarOpen;

  const tenantRole = getStoredTenantRole();
  const isManager = isTenantManagerRole(tenantRole);

  const visibleNavNodes = allNavNodes.filter((node) => {
    if (!node.rolesAllowed) return true;
    if (node.rolesAllowed.includes("admin") && tenantRole === "tenant-admin") return true;
    if (node.rolesAllowed.includes("manager") && isManager) return true;
    return false;
  });

  const onNavigate = (item: NavNode) => {
    if (item.route) {
      navigate(item.route);
      onCloseDrawer?.();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className={`flex items-center gap-2 px-3 py-4 border-b border-gray-100 ${collapsed ? "justify-center" : ""}`}>
        <Building2 size={20} className="text-blue-600 shrink-0" />
        {!collapsed && <span className="text-sm font-pbold text-gray-800">Tenant Portal</span>}
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-1">
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

      <div className="border-t border-gray-100 py-2 px-1.5">
        <NavGroup
          item={{ id: "tenant-signout", label: "Sign Out", icon: LogOut, isRed: true, route: "/sign-out" }}
          collapsed={collapsed}
          pathname={location.pathname}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};

export default TenantSidebar;
