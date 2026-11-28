import { axiosPrivate } from "../utils/axios";
import { useEffect } from "react";
import useRefresh from "./useRefresh";
import useAuth from "./useAuth";
import { toast } from "sonner";
import { clearAuthTabSession } from "../utils/authSession";
import { clearTabRefreshToken } from "../utils/refreshTokenSession";

export default function useAxiosPrivate() {
  const { auth, setAuth } = useAuth();
  const refresh = useRefresh();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers["Authorization"]) {
          config.headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        const errorCode = error?.response?.data?.code;
        const errorMessage = error?.response?.data?.message;

        if (error?.response?.status === 403 && (errorCode === "ACCOUNT_DISABLED" || errorCode === "ACCOUNT_DELETED")) {
          setAuth((prevState) => ({
            ...prevState,
            accessToken: "",
            user: null,
          }));
          clearAuthTabSession();
          clearTabRefreshToken();
          toast.error(errorMessage || "Access denied. Contact founder to regain access.");
          window.location.href = "/";
          return Promise.reject(error);
        }

        if (error?.response?.status === 403 && auth?.impersonation) {
          // Staff "View As" sessions never have a refresh token by design
          // (see StaffViewPage.tsx) — attempting one here is guaranteed to
          // fail and would wipe the whole read-only session and bounce the
          // viewer to login over a SINGLE denied request (a blocked write
          // from blockWriteIfImpersonating, or any ordinary permission check
          // like Visitor Management's hasVisitorAccess gate — both return a
          // plain 403). Reject this one request in place instead; the
          // session still ends naturally when its own short-lived access
          // token actually expires (next page load's auth check catches
          // that, since there's no refresh path to keep it alive anyway).
          //
          // A blocked write (READ_ONLY_SESSION, from
          // blockWriteIfImpersonating) is explained to the viewer. Mutating
          // buttons are disabled where they can be, but that is not yet
          // everywhere, and a click that silently does nothing reads as a
          // broken panel. A stable toast id keeps repeat attempts to one
          // message instead of stacking. Ordinary permission 403s stay quiet
          // so they don't get mislabelled as read-only.
          if (errorCode === "READ_ONLY_SESSION") {
            toast.error(
              errorMessage ||
                "This is a read-only staff view session and cannot make changes.",
              { id: "readonly-staff-view" }
            );
          }
          return Promise.reject(error);
        }

        const shouldRefreshAccessToken =
          error?.response?.status === 401 ||
          (error?.response?.status === 403 &&
            (errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_INVALID"));

        if (shouldRefreshAccessToken && prevRequest && !prevRequest.sent) {
          prevRequest.sent = true;
          try {
            const authData = await refresh();
            if (!authData?.accessToken) {
              return Promise.reject(error);
            }
            prevRequest.headers = prevRequest.headers || {};
            prevRequest.headers["Authorization"] = `Bearer ${authData.accessToken}`;
            return axiosPrivate(prevRequest);
          } catch {
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth, refresh, setAuth]);

  return axiosPrivate;
}
