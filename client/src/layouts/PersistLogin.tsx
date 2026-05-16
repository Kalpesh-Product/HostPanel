import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import useRefresh from "../hooks/useRefresh";
import useAuth from "../hooks/useAuth";
import Loading from "../pages/Loading";
import { hasAuthTabSession } from "../utils/authSession";

export default function PersistLogin() {
  const [isLoading, setIsLoading] = useState(true);
  const refresh = useRefresh();
  const { auth } = useAuth();

  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        await refresh();
      } catch (error) {
        throw new Error(String(error));
      } finally {
        setIsLoading(false);
      }
    };

    if (auth?.accessToken.length) {
      setIsLoading(false);
      return;
    }

    // Do not auto-authenticate a brand new tab from cookie alone.
    if (!hasAuthTabSession()) {
      setIsLoading(false);
      return;
    }

    verifyRefreshToken();
  }, [auth?.accessToken.length, refresh]);

  return <>{isLoading ? <Loading /> : <Outlet />}</>;
}
