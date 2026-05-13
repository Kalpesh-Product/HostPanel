/* eslint-disable react-refresh/only-export-components */
import { createContext, useState } from "react";
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
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    accessToken: "",
  });

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
