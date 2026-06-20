// @ts-nocheck
import { useState, type MouseEvent } from "react";
import {
  Avatar,
  Badge,
  CircularProgress,
  Divider,
  IconButton,
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
import { HiOutlineRefresh } from "react-icons/hi";
import { BellRing } from "lucide-react";
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient } from "../main";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import WoNoLogo from "../assets/WONO_LOGO_Black_TP.png";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

dayjs.extend(relativeTime);

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
      const raw = localStorage.getItem("hostpanel_auth_user");
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
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
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
      toast.success(data.message || "UPDATED");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error");
    },
  });

  const handleAvatarClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationClick = (event: MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
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

  const openNotification = Boolean(notificationAnchorEl);
  const notificationId = openNotification ? "notification-popover" : undefined;
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

  const roleLabelMap: Record<string, string> = {
    owner: "Founder",
    founder: "Founder",
    "founder-&-ceo": "Founder",
    "co-founder-&-coo": "Founder",
    "co-founder": "Founder",
    "master-admin": "Founder",
    "super-admin": "Super Admin",
    admin: "Department Admin",
    manager: "Department Manager",
    employee: "Employee",
    "tenant-manager": "Tenant Manager",
    "tenant-employee": "Tenant Employee",
  };
  const tenantRoleFromAuth = auth?.user?.tenantRole || '';
  const headerRoleLabel = (isFounderRole && !hasTenantRole) || (isFounderByFlag && !hasTenantRole) || (hasFounderPermission && !hasTenantRole)
    ? "Founder"
    : roleLabelMap[normalizedRole];
  const roleLabel = hasTenantRole
    ? (tenantRoleFromAuth === "tenant-manager" ? "Tenant Manager" : "Tenant Employee")
    : (headerRoleLabel || "Team Member");

  return (
    <>
      <div className="flex w-full justify-between gap-x-6 items-center py-2">
        <div>
          <div>
            <div className="w-60 flex justify-between items-center gap-16 h-full ">
              <img
                onClick={() => navigate("/company-settings")}
                className="max-w-[70%] h-12 object-contain cursor-pointer"
                src={headerLogoUrl}
                alt="logo"
              />
              {!isMobile && (
                <button type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 text-gray-500 text-xl"
                >
                  {isSidebarOpen ? <GiHamburgerMenu /> : <IoIosArrowForward />}
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
            className="relative h-9 w-9 rounded-lg text-slate-600 hover:text-[#2563EB] transition-colors flex items-center justify-center"
            aria-label="Open notifications"
          >
            <BellRing size={18} strokeWidth={2.25} />
            {computedUnseenCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center">
                {computedUnseenCount > 9 ? "9+" : computedUnseenCount}
              </span>
            )}
          </button>

          <Avatar onClick={handleAvatarClick} className="cursor-pointer">
            {auth?.user?.profilePicture?.url ? (
              <img src={auth?.user?.profilePicture?.url} alt="" />
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
                  {roleLabel}
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

      <Popover
        id={notificationId}
        open={openNotification}
        anchorEl={notificationAnchorEl}
        onClose={() => setNotificationAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div className="p-4 w-[30rem] max-h-[400px] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-5 rounded-full">
              <span className="font-pmedium text-subtitle">Notifications</span>
              <Badge
                badgeContent={computedUnseenCount > 9 ? "9+" : computedUnseenCount}
                color="error"
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                overlap="circular"
              />
            </div>
            <IconButton
              size="small"
              onClick={onRefreshNotifications}
              disabled={isRefreshingNotifications}
            >
              <HiOutlineRefresh
                className={`${isRefreshingNotifications ? "animate-spin" : ""}`}
              />
            </IconButton>
          </div>
          <Divider className="my-2" />
          {isRefreshingNotifications ? (
            <div className="h-52 flex justify-center items-center">
              <CircularProgress size={15} />
            </div>
          ) : (
            <div className="mt-2">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-sm">No notifications yet.</p>
              ) : (
                <>
                  <div className="h-52 overflow-y-auto pr-4" />

                  {notifications.length > 9 && (
                    <div className="mt-2 text-start">
                      <button type="button"
                        onClick={() => {
                          setNotificationAnchorEl(null);
                          navigate("/app/notifications");
                        }}
                        className="text-primary text-content font-pregular hover:underline"
                      >
                        View more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Popover>
    </>
  );
};

export default Header;

