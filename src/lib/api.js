import axios from "axios";
import { resolveApiBaseUrl } from "./apiEnv";
import { PRODUCTION_API_BASE_URL } from "./productionApi";

export const AUTH_LOGOUT_EVENT = "auth:logout";
// VITE_APP_ENV is replaced at build time, so the production-only branch (and
// the production URL) is removed from staging bundles.
export const API_BASE_URL =
  import.meta.env.VITE_APP_ENV === "staging"
    ? resolveApiBaseUrl({
        appEnv: "staging",
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      })
    : resolveApiBaseUrl({
        appEnv: import.meta.env.VITE_APP_ENV,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        productionApiBaseUrl: PRODUCTION_API_BASE_URL,
      });

const REFRESH_ENDPOINT = "/accounts/token/refresh/";

const clearStoredTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

let refreshRequest = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.skipAuth) {
    return config;
  }

  const accessToken = localStorage.getItem("accessToken");

  if (accessToken) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const statusCode = error.response?.status;
    const isRefreshRequest = originalRequest?.url?.includes(REFRESH_ENDPOINT);

    if (
      !originalRequest ||
      originalRequest.skipAuth ||
      statusCode !== 401 ||
      originalRequest._retry ||
      isRefreshRequest
    ) {
      throw error;
    }

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      clearStoredTokens();
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      throw error;
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = axios
          .post(
            `${API_BASE_URL}${REFRESH_ENDPOINT}`,
            { refresh: refreshToken },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
          .then(({ data }) => data)
          .finally(() => {
            refreshRequest = null;
          });
      }

      const refreshData = await refreshRequest;
      if (!refreshData?.access) {
        throw new Error("Token refresh failed.");
      }

      localStorage.setItem("accessToken", refreshData.access);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshData.access}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearStoredTokens();
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
      throw refreshError;
    }
  },
);
