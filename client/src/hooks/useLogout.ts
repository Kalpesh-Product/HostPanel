import useAuth from "./useAuth";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/axios";
import { toast } from "sonner";
import { clearAuthTabSession } from "../utils/authSession";
import { clearTabRefreshToken, getTabRefreshToken } from "../utils/refreshTokenSession";
import { clearStoredTenantRole } from "../lib/tenant-session";

export default function useLogout() {
  const { setAuth, auth } = useAuth();
  const navigate = useNavigate();
  const user = auth.user;

  const logout = async () => {
    try {
      const tabRefreshToken = getTabRefreshToken();
      await api.get("/api/auth/logout", {
        withCredentials: true,
        headers: tabRefreshToken
          ? {
              "x-refresh-token": tabRefreshToken,
            }
          : undefined,
      });
      toast.success("Successfully signed out");
      setAuth((prevState) => {
        return {
          ...prevState,
          accessToken: "",
          user: null,
        };
      });
      clearAuthTabSession();
      clearTabRefreshToken();
      clearStoredTenantRole();
      try {
        localStorage.removeItem("hostpanel_tenant_company_id");
        localStorage.removeItem("hostpanel_tenant_company_name");
      } catch { /* noop */ }

      navigate("/", { replace: true });
      window.history.pushState(null, "", "/");
    } catch (error) {
      toast.error(error.message);
    }
  };
  return logout;
}
