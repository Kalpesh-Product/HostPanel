export const AUTH_TAB_SESSION_KEY = "wono_auth_tab_session";

export const setAuthTabSessionActive = () => {
  sessionStorage.setItem(AUTH_TAB_SESSION_KEY, "1");
};

export const clearAuthTabSession = () => {
  sessionStorage.removeItem(AUTH_TAB_SESSION_KEY);
};

export const hasAuthTabSession = () =>
  sessionStorage.getItem(AUTH_TAB_SESSION_KEY) === "1";

