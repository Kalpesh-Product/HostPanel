import useAuth from "./useAuth";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/axios";
import { toast } from "sonner";
import { clearAuthTabSession } from "../utils/authSession";
import { clearTabRefreshToken, getTabRefreshToken } from "../utils/refreshTokenSession";
import { clearStoredTenantRole } from "../lib/tenant-session";
import { useQueryClient } from "@tanstack/react-query";
import { clearUserSessionData } from "../utils/clearUserSessionData";

export default function useLogout() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    } catch (error: any) {
      // Signing out locally must not depend on the server being reachable.
      toast.error(error?.message || "Signed out locally. Server session cleanup failed.");
    } finally {
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
      clearUserSessionData();
      queryClient.clear();

      navigate("/", { replace: true });
      window.history.pushState(null, "", "/");
    }
  };
  return logout;
}
