export const STAGING_API_BASE_URL =
  "https://exambuilder-staging-e3f9e4c51418.herokuapp.com";

const normalizeUrl = (value) => value.trim().replace(/\/$/, "");

const parseHttpsOrigin = (value) => {
  try {
    const url = new URL(value);
    const hasExtras =
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname && url.pathname !== "/");
    return url.protocol === "https:" && !hasExtras ? url.origin : null;
  } catch {
    return null;
  }
};

// Resolves the API base URL for the current build environment.
// The production URL is injected so staging bundles never need to contain it.
export const resolveApiBaseUrl = ({
  appEnv,
  apiBaseUrl,
  productionApiBaseUrl,
} = {}) => {
  const env = (appEnv || "production").trim();

  if (env === "production") {
    const url = apiBaseUrl || productionApiBaseUrl;

    if (!url) {
      throw new Error("No API base URL is configured for production.");
    }

    return normalizeUrl(url);
  }

  if (env !== "staging") {
    throw new Error(
      'Invalid VITE_APP_ENV. Expected "production" or "staging".',
    );
  }

  if (!apiBaseUrl || !apiBaseUrl.trim()) {
    throw new Error(
      "VITE_API_BASE_URL is required when VITE_APP_ENV=staging.",
    );
  }

  const origin = parseHttpsOrigin(apiBaseUrl.trim());

  if (!origin) {
    throw new Error(
      "VITE_API_BASE_URL must be a valid HTTPS origin when VITE_APP_ENV=staging.",
    );
  }

  if (productionApiBaseUrl && origin === parseHttpsOrigin(productionApiBaseUrl)) {
    throw new Error(
      "VITE_API_BASE_URL must not point to the production backend when VITE_APP_ENV=staging.",
    );
  }

  if (origin !== STAGING_API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL must point to the staging backend when VITE_APP_ENV=staging.",
    );
  }

  return origin;
};
