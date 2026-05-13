import { useQuery } from "@tanstack/react-query";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const Notifications = () => {
  const { auth } = useAuth();
  const axios = useAxiosPrivate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await axios.get("/api/notifications/get-my-notifications");

      const filtered = res.data.filter(
        (n: any) => n.initiatorData?._id !== auth?.user?._id,
      );

      return filtered;
    },
    refetchInterval: 15000,
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

  const calculateTimeDue = (date: string) => {
    const now = new Date();
    const diffInMilliseconds = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  const renderNotifications = (sectionName: string, sectionNotifications: any[]) => (
    <>
      {sectionNotifications.length > 0 && (
        <>
          <div className="text-xl font-semibold pb-4">{sectionName}</div>
          {sectionNotifications.map((notification) => (
            <div key={notification._id} className="mb-4">
              <div className="border-2 border-gray-300 p-4 rounded-md flex w-full justify-between items-center">
                <div className="flex flex-col w-full gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-subtitle">{notification.module}</span>
                    <span className="text-content">{notification.message}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-end items-end w-full">
                  <div>
                    <span className="text-content text-gray-500">
                      {getSection(new Date(notification.createdAt)) === "Today"
                        ? calculateTimeDue(notification.createdAt)
                        : getSection(new Date(notification.createdAt))}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`text-content py-2 px-4 rounded-md ${
                        notification.module === "Meeting"
                          ? "bg-red-200 text-red-600"
                          : "bg-blue-200 text-blue-600"
                      }`}
                    >
                      {notification.type.charAt(0).toUpperCase() +
                        notification.type.slice(1)}
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

  return (
    <div className="p-4">
      {renderNotifications("Today", todayNotifications)}
      {renderNotifications("Yesterday", yesterdayNotifications)}
      {renderNotifications("Older", olderNotifications)}
    </div>
  );
};

export default Notifications;