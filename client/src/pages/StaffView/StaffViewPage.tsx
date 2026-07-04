import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../utils/axios";
import useAuth from "../../hooks/useAuth";
import { setAuthTabSessionActive } from "../../utils/authSession";
import Loading from "../Loading";

// Landing point for master-panel-issued "View As" links (see
// authControllers.ts: consumeStaffViewToken). Deliberately does NOT call
// setTabRefreshToken — there is no refresh token for this session, by
// design, so it naturally ends (redirecting to login) once the short-lived
// access token expires rather than silently renewing.
export default function StaffViewPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [error, setError] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const consumeToken = async () => {
      try {
        const response = await api.post(`/api/auth/staff-view/${token}`);
        const accessToken = response?.data?.accessToken || "";
        const user = response?.data?.user || null;

        if (!accessToken || !user) {
          setError("This staff view link is invalid or has expired.");
          return;
        }

        setAuth((prevState) => ({
          ...prevState,
          accessToken,
          user,
          impersonation: true,
        }));
        setAuthTabSessionActive();

        const redirect = searchParams.get("redirect") || "/dashboard";
        navigate(redirect.startsWith("/") ? redirect : "/dashboard", { replace: true });
      } catch (err: any) {
        setError(err?.response?.data?.message || "This staff view link is invalid or has expired.");
      }
    };

    void consumeToken();
  }, [token, searchParams, navigate, setAuth]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Staff view link unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return <Loading />;
}
