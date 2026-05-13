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
import { useSidebar } from "../context/SideBarContext";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient } from "../main";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import WoNoLogo from "../assets/WONO_LOGO_Black_TP.png";

dayjs.extend(relativeTime);

interface HeaderProps {
  notifications?: Array<any>;
  unseenCount?: number;
  onRefreshNotifications?: () => void;
  isRefreshingNotifications?: boolean;
}

const Header = ({
  notifications = [],
  unseenCount = 0,
  onRefreshNotifications,
  isRefreshingNotifications = false,
}: HeaderProps) => {
  const axios = useAxiosPrivate();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const logout = useLogout();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);

  const { data: companyLogo } = useQuery({
    queryKey: ["companyLogo"] as const,
    queryFn: async () => {
      const response = await axios.get("/api/company/get-company-logo");
      return response.data;
    },
  });

  const headerLogoUrl =
    companyLogo?.logo?.url ||
    companyLogo?.logo ||
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

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await logout();
  };

  const handleProfileClick = () => {
    navigate("/profile");
    handlePopoverClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? "avatar-popover" : undefined;

  const openNotification = Boolean(notificationAnchorEl);
  const notificationId = openNotification ? "notification-popover" : undefined;

  return (
    <>
      <div className="flex w-full justify-between gap-x-10 items-center py-2">
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
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 text-gray-500 text-xl"
                >
                  {isSidebarOpen ? <GiHamburgerMenu /> : <IoIosArrowForward />}
                </button>
              )}
            </div>
          </div>
        </div>
        {!isMobile && <div className="w-full flex items-center pl-20" />}
        <div className="flex items-center gap-4 md:w-fit w-fit">
          <Avatar onClick={handleAvatarClick} className="cursor-pointer">
            {auth?.user?.profilePicture?.url ? (
              <img src={auth?.user?.profilePicture?.url} alt="" />
            ) : (
              auth?.user?.name?.charAt(0) || ""
            )}
          </Avatar>

          <div className="w-full relative">
            {!isMobile && (
              <h1 className="text-xl font-semibold text-start">
                {auth?.user?.name?.split(" ")[0] || ""}
              </h1>
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
                badgeContent={unseenCount > 9 ? "9+" : unseenCount}
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
                      <button
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