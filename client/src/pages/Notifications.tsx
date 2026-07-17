import { useMutation, useQuery } from "@tanstack/react-query";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { queryClient } from "../main";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useNavigate } from "react-router-dom";

dayjs.extend(relativeTime);

const Notifications = () => {
  const { auth } = useAuth();
  const axios = useAxiosPrivate();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await axios.get("/api/notifications/get-my-notifications");
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { mutate: markAsRead } = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await axios.patch(`/api/notifications/mark-as-read/${notificationId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: async () => {
      const res = await axios.patch("/api/notifications/mark-all-read");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const getSection = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date >= today) return "Today";
    if (date >= yesterday) return "Yesterday";
    return "Older";
  };

  const todayNotifications = notifications.filter(
    (notification: any) => getSection(new Date(notification.createdAt)) === "Today",
  );
  const yesterdayNotifications = notifications.filter(
    (notification: any) => getSection(new Date(notification.createdAt)) === "Yesterday",
  );
  const olderNotifications = notifications.filter(
    (notification: any) => getSection(new Date(notification.createdAt)) === "Older",
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "task":
        return "bg-blue-100 text-blue-700";
      case "ticket":
        return "bg-purple-100 text-purple-700";
      case "leave":
        return "bg-amber-100 text-amber-700";
      case "meeting":
        return "bg-red-100 text-red-700";
      case "system":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.readAt) {
      markAsRead(notification._id);
    }
    if (notification.targetUrl) {
      navigate(notification.targetUrl);
    }
  };

  const renderNotifications = (sectionName: string, sectionNotifications: any[]) => (
    <>
      {sectionNotifications.length > 0 && (
        <>
          <div className="text-xl font-semibold pb-4">{sectionName}</div>
          {sectionNotifications.map((notification) => (
            <div
              key={notification._id}
              className="mb-4 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={`border p-4 rounded-md flex w-full justify-between items-center transition-colors ${
                notification.readAt
                  ? "border-gray-200 bg-white hover:bg-gray-50"
                  : "border-blue-200 bg-blue-50 hover:bg-blue-100"
              }`}>
                <div className="flex flex-col w-full gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-subtitle font-medium">{notification.title}</span>
                    {!notification.readAt && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <span className="text-content text-gray-600">{notification.description}</span>
                  {notification.isActionRequired && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 w-fit">
                      Action Required
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 justify-end items-end w-full">
                  <div>
                    <span className="text-content text-gray-500">
                      {getSection(new Date(notification.createdAt)) === "Today"
                        ? dayjs(notification.createdAt).fromNow()
                        : getSection(new Date(notification.createdAt))}
                    </span>
                  </div>
                  <div>
                    <span className={`text-xs py-1 px-3 rounded-full ${getCategoryColor(notification.category)}`}>
                      {notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <span className="text-gray-500">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n: any) => !n.readAt) && (
          <button
            onClick={() => markAllRead()}
            className="text-sm text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No notifications yet.
        </div>
      ) : (
        <>
          {renderNotifications("Today", todayNotifications)}
          {renderNotifications("Yesterday", yesterdayNotifications)}
          {renderNotifications("Older", olderNotifications)}
        </>
      )}
    </div>
  );
};

export default Notifications;
