import { api } from "../utils/axios";
import { useCallback } from "react";
import useAuth from "./useAuth";
import { clearAuthTabSession, setAuthTabSessionActive } from "../utils/authSession";
import { clearTabRefreshToken, getTabRefreshToken, setTabRefreshToken } from "../utils/refreshTokenSession";

let pendingRefreshRequest: Promise<any> | null = null;

const requestFreshAccessToken = (refreshToken: string) => {
  if (!pendingRefreshRequest) {
    pendingRefreshRequest = api
      .get("/api/auth/refresh", {
        withCredentials: true,
        headers: { "x-refresh-token": refreshToken },
      })
      .then((response) => response.data)
      .finally(() => {
        pendingRefreshRequest = null;
      });
  }
  return pendingRefreshRequest;
};

export default function useRefresh() {
  const { setAuth } = useAuth();
  return useCallback(async () => {
    const tabRefreshToken = getTabRefreshToken();
    if (!tabRefreshToken) {
      setAuth((prevState) => ({ ...prevState, accessToken: "", user: null }));
      clearAuthTabSession();
      clearTabRefreshToken();
      throw new Error("Missing tab refresh token");
    }

    try {
      const data = await requestFreshAccessToken(tabRefreshToken);

      setAuth((prevState) => {
        return {
          ...prevState,
          accessToken: data.accessToken,
          user: data.user,
        };
      });
      setAuthTabSessionActive();
      if (data?.refreshToken) {
        setTabRefreshToken(data.refreshToken);
      }
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      // Only an explicit authentication rejection ends the session. A brief
      // network/server failure should leave the session intact for a retry.
      if (status === 401 || status === 403) {
        setAuth((prevState) => ({ ...prevState, accessToken: "", user: null }));
        clearAuthTabSession();
        clearTabRefreshToken();
      }
      throw error;
    }
  }, [setAuth]);
}
