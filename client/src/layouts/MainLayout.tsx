// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Drawer, IconButton, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "../components/Sidebar";
import TenantSidebar from "../components/TenantSidebar";
import Header from "../components/Header";
import BreadCrumbComponent from "../components/BreadCrumbComponent";
import Footer from "../components/Footer";
import { useSidebar } from "../context/SideBarContext";
import ScrollToTop from "../components/ScrollToTop";
import useAuth from "../hooks/useAuth";
import AiChat from "../components/AiChat";
import ModuleAccessGuard from "../routes/ModuleAccessGuard";
import { useQuery, useMutation } from "@tanstack/react-query";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { queryClient } from "../main";
import usePageTour from "../tours/usePageTour";
import PageGuideButton from "../tours/PageGuideButton";
import PlanExpiryBanner from "../components/PlanExpiryBanner";
import { getPlanExpiryReminderThreshold } from "../utils/plan-expiry-reminder";
import { RotateCw, Smartphone } from "lucide-react";

const MainLayoutContent = () => {
  const { auth } = useAuth();
  const axios = useAxiosPrivate();
  const [showFooter, setShowFooter] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dismissedPlanReminder, setDismissedPlanReminder] = useState("");
  const dummyRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const { isSidebarOpen } = useSidebar();
  const { isTourAvailable, startCurrentTour } = usePageTour();

  const { data: notifications = [], isLoading: isLoadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await axios.get("/api/notifications/get-my-notifications");
      return res.data;
    },
    refetchInterval: 15000,
  });

  const unseenCount = notifications.filter(
    (n: any) => !n.readAt,
  ).length;

  const { data: planSummary } = useQuery({
    queryKey: ["planBillingSummary"],
    queryFn: async () => {
      const res = await axios.get("/api/plan-billing/summary");
      return res?.data?.data;
    },
    refetchInterval: 60000,
    enabled: !auth?.impersonation,
  });

  const hasTenantRole = Boolean(auth?.user?.tenantRole);
  const isTenantRoute = location.pathname.startsWith("/dashboard/tenant") || (hasTenantRole && location.pathname.startsWith("/profile/"));
  const isMobile = useMediaQuery("(max-width: 768px)");

  const planExpiryReminder = (() => {
    const selectedPlan = String(planSummary?.selectedPlan || "").toLowerCase();
    if (planSummary?.isTrialing || !["professional", "custom"].includes(selectedPlan)) return null;
    const expiryMs = new Date(planSummary?.planExpiryDate || "").getTime();
    if (!Number.isFinite(expiryMs)) return null;
    const threshold = getPlanExpiryReminderThreshold(planSummary.planExpiryDate);
    if (!threshold) return null;
    const companyId = String(planSummary?.companyId || auth?.user?.companyId || "workspace");
    const expiryKey = new Date(expiryMs).toISOString().slice(0, 10);
    const key = `hostpanel_plan_expiry_reminder_dismissed:${companyId}:${expiryKey}:${threshold}`;
    let dismissed = dismissedPlanReminder === key;
    if (!dismissed && threshold !== "expired") {
      try {
        dismissed = localStorage.getItem(key) === "1";
      } catch {
        dismissed = false;
      }
    }
    return { key, threshold, dismissed, canDismiss: threshold !== "expired" };
  })();

  const dismissPlanExpiryReminder = () => {
    if (!planExpiryReminder?.canDismiss) return;
    try {
      localStorage.setItem(planExpiryReminder.key, "1");
    } catch {
      // Best-effort only; worst case the reminder remains visible.
    }
    setDismissedPlanReminder(planExpiryReminder.key);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFooter(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    const currentDummyRef = dummyRef.current;

    if (currentDummyRef) {
      observer.observe(currentDummyRef);
    }

    return () => {
      if (currentDummyRef) {
        observer.unobserve(currentDummyRef);
      }
    };
  }, []);

  return (
    <div
      className="w-full flex flex-col justify-between h-screen overflow-y-auto"
      data-readonly-session={auth?.impersonation ? "true" : undefined}
    >
      {auth?.impersonation ? (
        <div className="w-full bg-amber-500 text-white text-xs sm:text-sm font-semibold text-center py-1.5 px-3">
          Viewing as {auth?.user?.companyName || "this company"} — read-only staff view
        </div>
      ) : null}
      {planExpiryReminder && !planExpiryReminder.dismissed ? (
        <PlanExpiryBanner
          expiryDate={planSummary.planExpiryDate}
          modulesAtRisk={planSummary.modulesLostOnDowngrade}
          reminderKey={String(planExpiryReminder.threshold)}
          canDismiss={planExpiryReminder.canDismiss}
          isExpired={planExpiryReminder.threshold === "expired"}
          onDismiss={dismissPlanExpiryReminder}
        />
      ) : null}
      <header className="flex w-full shadow-md items-center px-4">
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(true)} edge="start">
            <MenuIcon />
          </IconButton>
        )}
        <Header
          notifications={notifications}
          unseenCount={unseenCount}
          onRefreshNotifications={() => refetchNotifications()}
          isRefreshingNotifications={isLoadingNotifications}
        />
      </header>

      <div className="flex w-full flex-grow">
        {isMobile ? (
          <Drawer
            anchor="left"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            PaperProps={{
              style: { width: 250 },
            }}
          >
            <div className="py-2" data-tour="sidebar">
              {isTenantRoute ? (
                <TenantSidebar
                  drawerOpen={mobileOpen}
                  onCloseDrawer={() => setMobileOpen(false)}
                />
              ) : (
                <Sidebar
                  drawerOpen={mobileOpen}
                  onCloseDrawer={() => setMobileOpen(false)}
                />
              )}
            </div>
          </Drawer>
        ) : (
          <aside className="bg-white" data-tour="sidebar">
            {isTenantRoute ? <TenantSidebar /> : <Sidebar />}
          </aside>
        )}

        <div className="w-full min-w-0">
          <main className="w-full bg-[#F7F8FA] p-3 flex flex-col gap-2">
            <div className="p-4 rounded-t-md bg-white" data-tour="breadcrumb">
              <BreadCrumbComponent />
            </div>
            <div
              id="scrollable-content"
              className="bg-white h-[80vh] overflow-y-auto flex flex-col justify-between min-w-0"
            >
              <ScrollToTop />
              <div className="w-full min-w-0" data-tour="page-content">
                <ModuleAccessGuard isTenantRoute={isTenantRoute}>
                  <Outlet />
                  <PageGuideButton available={isTourAvailable} onStart={startCurrentTour} />
                </ModuleAccessGuard>
              </div>

              <div ref={dummyRef} className="h-1 w-1 bg-red-500 text-red-500" />
            </div>
          </main>
        </div>
      </div>
      <AiChat />

      {/* {showFooter && (
        <footer
          className={`transition-all duration-500 transform ${showFooter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
        > */}
          <Footer />
        {/* </footer>
      )} */}
    </div>
  );
};

const MainLayout = () => {
  // Temporary: keep phone portrait mode locked until Host Panel is fully responsive.
  const isPhonePortrait = useMediaQuery("(max-width: 767px) and (orientation: portrait)");

  if (isPhonePortrait) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F8FA] px-6 py-10 text-center">
        <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-[#1E3D73]">
            <Smartphone size={38} strokeWidth={1.8} />
            <RotateCw
              size={24}
              strokeWidth={2}
              className="absolute -bottom-1 -right-1 rounded-full bg-[#1E3D73] p-1 text-white"
            />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Rotate your device</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Host Panel works in landscape mode on phones. Rotate your device to continue.
          </p>
        </section>
      </main>
    );
  }

  return <MainLayoutContent />;
};

export default MainLayout;

