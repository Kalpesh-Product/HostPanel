/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type AuthUser = Record<string, unknown> | null;

export interface AuthState {
  user: AuthUser;
  accessToken: string;
}

interface AuthContextValue {
  auth: AuthState;
  setAuth: Dispatch<SetStateAction<AuthState>>;
}

export const AuthContext = createContext<AuthContextValue>({
  auth: {
    user: null,
    accessToken: "",
  },
  setAuth: () => {},
});

interface AuthContextProviderProps {
  children: ReactNode;
}

export default function AuthContextProvider({ children }: AuthContextProviderProps) {
  // sessionStorage only — it is tab-scoped, unlike localStorage which is shared
  // across every tab/window for this origin. Persisting the cached user there
  // let one tab's logged-in user (e.g. the founder) leak into a different tab
  // that expects its own fresh login (e.g. a department manager), causing the
  // wrong role's sidebar/modules to render. Mirrors the tab-isolation intent
  // already enforced for auth tokens via hasAuthTabSession().
  const getStoredUser = (): AuthUser => {
    try {
      const raw = sessionStorage.getItem("hostpanel_auth_user");
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  };

  const [auth, setAuth] = useState<AuthState>({
    user: getStoredUser(),
    accessToken: "",
  });

  useEffect(() => {
    if (auth?.user) {
      sessionStorage.setItem("hostpanel_auth_user", JSON.stringify(auth.user));
    } else {
      sessionStorage.removeItem("hostpanel_auth_user");
    }
  }, [auth?.user]);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
