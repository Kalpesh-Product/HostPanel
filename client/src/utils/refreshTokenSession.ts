const REFRESH_TOKEN_KEY = "wono_refresh_token";

export const setTabRefreshToken = (token: string) => {
  if (!token) return;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getTabRefreshToken = () => sessionStorage.getItem(REFRESH_TOKEN_KEY) || "";

export const clearTabRefreshToken = () => {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

