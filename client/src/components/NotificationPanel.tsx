// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckSquare,
  Ticket,
  CalendarClock,
  Calendar,
  AlertTriangle,
  CheckCheck,
  Inbox,
  BellRing,
} from "lucide-react";

const TYPE_CONFIG = {
  task: {
    icon: CheckSquare,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  ticket: {
    icon: Ticket,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  leave: {
    icon: CalendarClock,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  meeting: {
    icon: Calendar,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  system: {
    icon: AlertTriangle,
    bgColor: "bg-slate-100",
    iconColor: "text-slate-600",
  },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "action", label: "Action" },
];

const isUnread = (notification: any) => !notification?.readAt;

function useMediaQuery(query: string) {
  const getInitialMatches = () => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getInitialMatches);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function listener(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

function formatRelativeTime(value: string | Date | undefined) {
  const createdAt = value ? new Date(value) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return "Just now";
  }

  const diffMs = Math.max(0, Date.now() - createdAt.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose?: () => void;
  notifications?: Array<any>;
  isLoading?: boolean;
  onMarkRead?: (notificationId: string) => void;
  onMarkAllRead?: () => void;
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications = [],
  isLoading = false,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState("all");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const navigate = useNavigate();

  const stableOnClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    function handleClickOutside(event: any) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const bellButton = event.target.closest?.("[data-notification-trigger]");
        if (!bellButton) {
          stableOnClose();
        }
      }
    }

    const timerId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isDesktop, stableOnClose]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stableOnClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stableOnClose]);

  useEffect(() => {
    if (!isOpen || isDesktop) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isDesktop]);

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "unread") {
      return isUnread(notification);
    }

    if (activeTab === "action") {
      return Boolean(notification.isActionRequired);
    }

    return true;
  });

  const unreadCount = notifications.filter(isUnread).length;
  const actionCount = notifications.filter((n) => n?.isActionRequired).length;

  function handleOpenNotification(notification: any) {
    if (isUnread(notification)) {
      onMarkRead?.(notification._id);
    }
    stableOnClose();

    if (notification.targetUrl) {
      navigate(notification.targetUrl);
    }
  }

  function renderNotificationList() {
    return (
      <>
        <div className="px-5 py-4 border-b border-slate-100/80 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <BellRing size={16} className="text-[#2563EB]" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[15px] font-pmedium text-[#0F172A] tracking-tight leading-none">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-[10px] font-pmedium text-slate-500 mt-0.5">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => onMarkAllRead?.()}
                className="flex items-center gap-1.5 text-[11px] font-pmedium text-[#2563EB] hover:text-blue-700 transition-colors px-2.5 py-1.5 hover:bg-blue-50 rounded-lg"
              >
                <CheckCheck size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={stableOnClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Close notifications"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-1 border-b border-slate-100/60 shrink-0 bg-white">
          <div className="flex gap-0.5 relative">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const tabCount =
                tab.key === "unread"
                  ? unreadCount
                  : tab.key === "action"
                    ? actionCount
                    : notifications.length;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3.5 py-2.5 text-[12px] font-pmedium transition-colors rounded-t-lg flex items-center gap-1.5 ${
                    isActive
                      ? "text-[#2563EB]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab.label}
                  {tabCount > 0 && tab.key !== "all" && (
                    <span
                      className={`text-[9px] font-bold min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tabCount}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="notifActiveTab"
                      className="absolute bottom-0 left-1.5 right-1.5 h-[2px] bg-[#2563EB] rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain max-h-[300px]">
          {isLoading && notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
              Loading notifications...
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="py-1">
              {filteredNotifications.map((notification, index) => {
                const config =
                  TYPE_CONFIG[notification.category] || TYPE_CONFIG.system;
                const IconComponent = config.icon;
                const isLast = index === filteredNotifications.length - 1;
                const unread = isUnread(notification);

                return (
                  <div key={notification._id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className={`w-full text-left px-5 py-3.5 flex gap-3.5 transition-all active:bg-slate-100 group relative ${
                        unread
                          ? "bg-gradient-to-r from-blue-50/60 via-blue-50/20 to-transparent hover:from-blue-50/80 hover:via-blue-50/40"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {unread && (
                        <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#2563EB] rounded-r-full" />
                      )}

                      <div
                        className={`w-9 h-9 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0 mt-0.5 border border-white shadow-sm`}
                      >
                        <IconComponent
                          size={16}
                          strokeWidth={2}
                          className={config.iconColor}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[13px] leading-snug pr-1 ${
                              unread
                                ? "font-pmedium text-[#0F172A]"
                                : "font-pmedium text-slate-500"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {unread && (
                            <span className="w-2 h-2 bg-[#2563EB] rounded-full shrink-0 mt-1.5 ring-2 ring-blue-100" />
                          )}
                        </div>
                        <p
                          className={`text-[11.5px] mt-0.5 line-clamp-2 leading-relaxed ${
                            unread
                              ? "text-slate-500 font-pmedium"
                              : "text-slate-400 font-normal"
                          }`}
                        >
                          {notification.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                          {notification.isActionRequired && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold uppercase tracking-wide">
                              Action required
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {!isLast && <div className="mx-5 h-px bg-slate-100/80" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                <Inbox size={28} className="text-slate-200" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-slate-400">
                {activeTab === "unread"
                  ? "All caught up!"
                  : activeTab === "action"
                    ? "Nothing needs your attention"
                    : "No notifications"}
              </p>
              <p className="text-[12px] font-medium text-slate-300 mt-1.5 text-center max-w-[220px] leading-relaxed">
                {activeTab === "unread"
                  ? "You've read all your notifications."
                  : "Notifications will appear here when there is activity."}
              </p>
            </div>
          )}
        </div>

        {filteredNotifications.length > 0 && unreadCount > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 shrink-0 bg-white/80">
            <button
              type="button"
              onClick={() => onMarkAllRead?.()}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#2563EB] hover:text-blue-700 py-2.5 hover:bg-blue-50/50 rounded-xl transition-colors active:bg-blue-50"
            >
              Mark all read
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <AnimatePresence>
      {isOpen &&
        (isDesktop ? (
          <motion.div
            key="notif-desktop-panel"
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="fixed top-[64px] md:top-[68px] right-4 lg:right-8 z-[2000] pointer-events-auto w-[420px] max-h-[calc(100dvh-90px)] bg-white rounded-2xl shadow-[0_25px_60px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.04)] flex flex-col overflow-hidden"
          >
            {renderNotificationList()}
          </motion.div>
        ) : (
          <div key="notif-mobile-root" className="fixed inset-0 z-[2000]">
            <motion.div
              key="notif-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
              onClick={stableOnClose}
            />

            <motion.div
              key="notif-mobile-sheet"
              ref={panelRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="absolute inset-x-0 bottom-0 bg-white rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
              style={{ maxHeight: "90dvh" }}
            >
              <div className="w-full flex justify-center pt-2.5 pb-0.5 shrink-0">
                <div className="w-9 h-1 bg-slate-200 rounded-full" />
              </div>
              {renderNotificationList()}
            </motion.div>
          </div>
        ))}
    </AnimatePresence>
  );
}

export default NotificationPanel;
