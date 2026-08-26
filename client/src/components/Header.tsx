// @ts-nocheck
import { useState, useEffect, type MouseEvent } from "react";
import {
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  useMediaQuery,
} from "@mui/material";
import { IoIosArrowForward } from "react-icons/io";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaUserTie } from "react-icons/fa6";
import { FiLogOut } from "react-icons/fi";
import { BellRing } from "lucide-react";
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient } from "../main";
import WoNoLogo from "../assets/WONO_LOGO_Black_TP.svg";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  notifications?: Array<any>;
  unseenCount?: number;
  onRefreshNotifications?: () => void;
  isRefreshingNotifications?: boolean;
}

const Header = ({
  notifications = [],
  unseenCount,
  onRefreshNotifications,
  isRefreshingNotifications = false,
}: HeaderProps) => {
  const getStoredUser = () => {
    try {
      // sessionStorage only — see auth-session.ts for why localStorage (shared
      // across tabs) must not be used as a fallback for the cached user.
      const raw = sessionStorage.getItem("hostpanel_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const axios = useAxiosPrivate();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const logout = useLogout();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState<string>("");
  const storedUser = getStoredUser();

  const headerLogoUrl =
    auth?.user?.logo?.url ||
    auth?.user?.logo ||
    WoNoLogo;

  const { mutate: updateRead } = useMutation({
    mutationKey: ["updateRead"],
    mutationFn: async (notificationId: string) => {
      const response = await axios.patch(
        `/api/notifications/mark-as-read/${notificationId}`,
      );
      return response.data;
    },
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error");
    },
  });

  const { mutate: markAllRead } = useMutation({
    mutationKey: ["markAllRead"],
    mutationFn: async () => {
      const response = await axios.patch("/api/notifications/mark-all-read");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error marking all as read");
    },
  });

  useEffect(() => {
    const fetchDepartmentName = async () => {
      try {
        const orgResult = await axios.get("/api/organization/overview");
        const orgPayload = orgResult?.data?.data || {};
        const teamMembers = Array.isArray(orgPayload?.teamMembers) ? orgPayload.teamMembers : [];
        const currentUserId = String(auth?.user?.id || auth?.user?._id || "").trim();
        const currentUserEmail = String(auth?.user?.email || "").trim().toLowerCase();
        const me = teamMembers.find((member: any) => {
          const memberUserId = String(member?.userId || member?.id || "").trim();
          const memberEmail = String(member?.email || "").trim().toLowerCase();
          return (
            (memberUserId && memberUserId === currentUserId) ||
            (currentUserEmail && memberEmail === currentUserEmail)
          );
        });
        if (me?.departmentNames && Array.isArray(me.departmentNames) && me.departmentNames.length === 1) {
          setDepartmentName(me.departmentNames[0]);
        } else {
          setDepartmentName("");
        }
      } catch {
        // Ignore errors
      }
    };
    void fetchDepartmentName();
  }, [axios, auth?.user]);

  const handleAvatarClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen((current) => !current);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await logout();
  };

  const handleProfileClick = () => {
    navigate("/profile/my-profile");
    handlePopoverClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? "avatar-popover" : undefined;

  const computedUnseenCount =
    typeof unseenCount === "number"
      ? unseenCount
      : notifications.filter((item) => !item?.isRead && !item?.read).length;
  const storedTenantRole = (() => {
    try {
      return localStorage.getItem("hostpanel_tenant_role") || null;
    } catch { return null; }
  })();
  const hasTenantRole = Boolean(auth?.user?.tenantRole);

  const roleArrayTitles = Array.isArray(auth?.user?.role)
    ? auth.user.role
      .map((entry) => entry?.roleTitle || entry?.title || entry?.name)
      .filter(Boolean)
    : [];

  const roleCandidates = [
    auth?.user?.tenantRole,
    auth?.user?.workspaceMembership?.role,
    auth?.user?.role,
    storedUser?.workspaceMembership?.role,
    storedUser?.role,
    auth?.user?.designation,
    storedUser?.designation,
    auth?.user?.title,
    storedUser?.title,
    auth?.user?.workspaceRole,
    storedUser?.workspaceRole,
    auth?.user?.workspaceMembership?.designation,
    storedUser?.workspaceMembership?.designation,
    ...roleArrayTitles,
  ]
    .filter((v) => v != null && v !== "" && !(typeof v === "number" && isNaN(v)))
    .map((value) => {
      if (typeof value === "object") return "";
      return String(value).trim().toLowerCase().replace(/_/g, "-");
    })
    .filter(Boolean);

  const normalizedRole = roleCandidates[0] || "";
  const rawPermissions = Array.isArray(auth?.user?.permissions?.permissions)
    ? auth.user.permissions.permissions
    : [];
  const hasFounderPermission = rawPermissions.some((permission) => {
    const value = String(permission || "").toLowerCase();
    return value.includes("owner") || value.includes("founder");
  });
  const isFounderByFlag = Boolean(
    auth?.user?.isOwner ||
    auth?.user?.isFounder ||
    auth?.user?.workspaceMembership?.isOwner ||
    auth?.user?.workspaceMembership?.isFounder ||
    storedUser?.isOwner ||
    storedUser?.isFounder ||
    storedUser?.workspaceMembership?.isOwner ||
    storedUser?.workspaceMembership?.isFounder,
  );
  const isFounderRole = roleCandidates.some((role) => {
    if (role === "owner" || role === "founder") {
      return true;
    }
    return role.includes("founder");
  });

  const formatRoleLabel = (role: string, dept: string) => {
    const normalized = String(role || "").trim().toLowerCase().replace(/_/g, "-");

    const fixedLabels: Record<string, string> = {
      owner: "Founder",
      founder: "Founder",
      "founder-&-ceo": "Founder",
      "co-founder-&-coo": "Founder",
      "co-founder": "Founder",
      "master-admin": "Founder",
      "super-admin": "Super Admin",
      "tenant-manager": "Tenant Manager",
      "tenant-employee": "Tenant Employee",
    };

    if (fixedLabels[normalized]) return fixedLabels[normalized];

    const roleParts = normalized.split("-");
    const roleType = roleParts.pop() || "";
    const roleDepartment = roleParts
      .map((part) =>
        part.toUpperCase() === "HR"
          ? "HR"
          : part.toUpperCase() === "IT"
            ? "IT"
            : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join(" ");

    if (["admin", "manager", "employee"].includes(roleType)) {
      const department = dept || roleDepartment;
      return department
        ? `${department} ${roleType.charAt(0).toUpperCase() + roleType.slice(1)}`
        : roleType.charAt(0).toUpperCase() + roleType.slice(1);
    }

    return normalized
      ? normalized
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "";
  };

  const tenantRoleFromAuth = auth?.user?.tenantRole || '';
  const roleLabel = hasTenantRole
    ? tenantRoleFromAuth === "tenant-manager"
      ? "Tenant Manager"
      : "Tenant Employee"
    : isFounderRole || isFounderByFlag || hasFounderPermission
      ? "Founder"
      : formatRoleLabel(normalizedRole, departmentName);

  return (
    <>
      <div className="flex w-full justify-between gap-x-6 items-center py-2">
        <div>
          <div>
            <div className={`flex justify-between items-center h-full transition-all duration-100 ${isSidebarOpen ? "w-60 gap-16" : "w-16 gap-0"}`}>
              <img
                onClick={() => navigate("/company-settings")}
                className={`h-12 object-contain cursor-pointer transition-all duration-100 ${isSidebarOpen ? "max-w-[70%]" : "max-w-[36px] mx-auto"}`}
                src={headerLogoUrl}
                alt="logo"
              />
              {!isMobile && (
                <button type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 text-gray-500 text-xl"
                >
                  {isSidebarOpen ? <GiHamburgerMenu /> : <GiHamburgerMenu />}
                </button>
              )}
            </div>
          </div>
        </div>
        {!isMobile && <div className="w-full flex items-center pl-8" />}
        <div className="flex items-center gap-3 md:w-fit w-fit">
          <WorkspaceSwitcher />
          <button
            type="button"
            data-notification-trigger
            onClick={handleNotificationClick}
            className={`relative h-9 w-9 rounded-xl transition-colors flex items-center justify-center ${
              isNotificationOpen
                ? "bg-blue-50 text-[#2563EB] ring-1 ring-blue-100"
                : "text-slate-600 hover:text-[#2563EB] hover:bg-slate-100"
            }`}
            aria-label="Open notifications"
          >
            <BellRing size={18} strokeWidth={2.25} />
            {computedUnseenCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-pmedium leading-[18px] text-center ring-2 ring-white">
                {computedUnseenCount > 99 ? "99+" : computedUnseenCount}
              </span>
            )}
          </button>

          <Avatar onClick={handleAvatarClick} className="cursor-pointer">
            {auth?.user?.profilePicture?.url ? (
              <img
                src={auth?.user?.profilePicture?.url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              auth?.user?.name?.charAt(0) || ""
            )}
          </Avatar>

          <div className="relative pr-1">
            {!isMobile && (
              <div className="leading-tight">
                <h1 className="text-[14px] font-semibold text-start">
                  {auth?.user?.name?.split(" ")[0] || ""}
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {roleLabel || "\u2014"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <div className="p-4 w-48">
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleProfileClick}
                className="hover:text-primary transition-all duration-100 text-gray-500 cursor-pointer"
              >
                <ListItemIcon>
                  <FaUserTie className="text-gray-500" />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItemButton>
            </ListItem>

            <Divider />

            <ListItem disablePadding>
              <ListItemButton
                onClick={handleSignOut}
                className="hover:text-red-600 transition-all duration-100 text-gray-500 cursor-pointer"
              >
                <ListItemIcon>
                  <FiLogOut className="text-gray-500" />
                </ListItemIcon>
                <ListItemText primary="Sign Out" />
              </ListItemButton>
            </ListItem>
          </List>
        </div>
      </Popover>

      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        isLoading={isRefreshingNotifications}
        onMarkRead={(notificationId) => updateRead(notificationId)}
        onMarkAllRead={() => markAllRead()}
      />
    </>
  );
};

export default Header;

