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
  const getStoredUser = (): AuthUser => {
    try {
      const raw = localStorage.getItem("hostpanel_auth_user");
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
      localStorage.setItem("hostpanel_auth_user", JSON.stringify(auth.user));
    } else {
      localStorage.removeItem("hostpanel_auth_user");
    }
  }, [auth?.user]);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
