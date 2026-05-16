import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

export default function AuthLayout() {
  const { auth } = useAuth();
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    if (!auth?.accessToken) return;

    let isMounted = true;
    const verifyActiveAccess = async () => {
      try {
        if (!isMounted) return;
        await axiosPrivate.get("/api/profile/me");
      } catch {
        // 403/401 handling is centralized in axios interceptor.
      }
    };

    verifyActiveAccess();
    const timer = window.setInterval(verifyActiveAccess, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [auth?.accessToken, axiosPrivate]);

  return auth.accessToken ? (
    <Outlet />
  ) : (
    <Navigate to="/" state={{ from: location }} replace />
  );
}
