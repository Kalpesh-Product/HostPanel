// @ts-nocheck
import { useState, useEffect, type MouseEvent } from "react";
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
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
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
      toast.success(data.message || "UPDATED");
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
        if (me?.departmentNames && Array.isArray(me.departmentNames) && me.departmentNames.length > 0) {
          setDepartmentName(me.departmentNames[0]);
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
    navigate("/profile/company-profile");
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
            className="relative h-9 w-9 rounded-lg text-slate-600 hover:text-[#2563EB] transition-colors flex items-center justify-center"
            aria-label="Open notifications"
          >
            <BellRing size={18} strokeWidth={2.25} />
            {computedUnseenCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-pmedium leading-[18px] text-center">
                {computedUnseenCount > 9 ? "9+" : computedUnseenCount}
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
            <div className="flex items-center gap-2">
              {computedUnseenCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
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
                  <div className="h-52 overflow-y-auto pr-4">
                    {notifications.slice(0, 10).map((notification: any) => (
                      <div
                        key={notification._id}
                        className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                          notification.readAt
                            ? "bg-white hover:bg-gray-50"
                            : "bg-blue-50 hover:bg-blue-100"
                        }`}
                        onClick={() => {
                          if (!notification.readAt) {
                            updateRead(notification._id);
                          }
                          if (notification.targetUrl) {
                            setNotificationAnchorEl(null);
                            navigate(notification.targetUrl);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400">
                              {dayjs(notification.createdAt).fromNow()}
                            </span>
                            {!notification.readAt && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                        {notification.isActionRequired && (
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                            Action Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

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

