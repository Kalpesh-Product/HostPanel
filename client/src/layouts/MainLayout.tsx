// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Drawer, IconButton, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import BreadCrumbComponent from "../components/BreadCrumbComponent";
import Footer from "../components/Footer";
import { useSidebar } from "../context/SideBarContext";
import ScrollToTop from "../components/ScrollToTop";
import useAuth from "../hooks/useAuth";
import { PERMISSIONS } from "../constants/permissions";
import AiChat from "../components/AiChat";

const MainLayout = () => {
  const { auth } = useAuth();
  const [showFooter, setShowFooter] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dummyRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarOpen } = useSidebar();
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    const pathname = location.pathname;
    const rawPermissions: string[] = auth?.user?.permissions?.permissions || [];

    const guardedRoutes = Object.values(PERMISSIONS).filter((perm) => perm.route);
    const currentRoutePermission = guardedRoutes.find((perm) =>
      pathname.includes(perm.route),
    );

    if (currentRoutePermission) {
      const userHasPermission = rawPermissions.includes(currentRoutePermission.value);

      if (!userHasPermission) {
        navigate("/unauthorized");
        return;
      }
    }

    setPermissionChecked(true);
  }, [location.pathname, auth, navigate]);

  const isMobile = useMediaQuery("(max-width: 768px)");

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
    <div className="w-full flex flex-col justify-between h-screen overflow-y-auto">
      <header className="flex w-full shadow-md items-center px-4">
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(true)} edge="start">
            <MenuIcon />
          </IconButton>
        )}
        <Header />
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
            <div className="py-2">
              <Sidebar
                drawerOpen={mobileOpen}
                onCloseDrawer={() => setMobileOpen(false)}
              />
            </div>
          </Drawer>
        ) : (
          <aside className="bg-white">
            <Sidebar />
          </aside>
        )}

        <div className="w-full">
          <main className="w-full bg-[#F7F8FA] p-3 flex flex-col gap-2">
            <div className="p-4 rounded-t-md bg-white">
              <BreadCrumbComponent />
            </div>
            <div
              id="scrollable-content"
              className="bg-white h-[80vh] overflow-y-auto flex flex-col justify-between"
            >
              <ScrollToTop />
              {permissionChecked ? <Outlet /> : null}

              <div ref={dummyRef} className="h-1 w-1 bg-red-500 text-red-500" />
            </div>
          </main>
        </div>
      </div>
      <AiChat />

      {showFooter && (
        <footer
          className={`transition-all duration-500 transform ${showFooter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
        >
          <Footer />
        </footer>
      )}
    </div>
  );
};

export default MainLayout;

