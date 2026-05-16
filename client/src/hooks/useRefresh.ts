import { api } from "../utils/axios";
import useAuth from "./useAuth";
import { clearAuthTabSession, setAuthTabSessionActive } from "../utils/authSession";
import { clearTabRefreshToken, getTabRefreshToken, setTabRefreshToken } from "../utils/refreshTokenSession";

export default function useRefresh() {
  const { setAuth } = useAuth();
  const refresh = async () => {
    try {
      const tabRefreshToken = getTabRefreshToken();
      if (!tabRefreshToken) {
        throw new Error("Missing tab refresh token");
      }
      const response = await api.get("/api/auth/refresh", {
        withCredentials: true,
        headers: {
          "x-refresh-token": tabRefreshToken,
        },
      });

      setAuth((prevState) => {
        return {
          ...prevState,
          accessToken: response.data.accessToken,
          user: response.data.user,
        };
      });
      setAuthTabSessionActive();
      if (response?.data?.refreshToken) {
        setTabRefreshToken(response.data.refreshToken);
      }
      return response.data;
    } catch (error) {
      setAuth((prevState) => {
        return {
          ...prevState,
          accessToken: "",
          user: null,
        };
      });
      clearAuthTabSession();
      clearTabRefreshToken();
    }
  };
  return refresh;
}
