import { loadEnv } from "vite";
import { resolveApiBaseUrl } from "../src/lib/apiEnv.js";
import { PRODUCTION_API_BASE_URL } from "../src/lib/productionApi.js";

// Mirrors Vite's env loading (.env files plus process env) for production builds.
const env = loadEnv("production", process.cwd(), "VITE_");

try {
  resolveApiBaseUrl({
    appEnv: env.VITE_APP_ENV,
    apiBaseUrl: env.VITE_API_BASE_URL,
    productionApiBaseUrl: PRODUCTION_API_BASE_URL,
  });
  console.log(
    `API environment OK (VITE_APP_ENV=${env.VITE_APP_ENV || "production"}).`,
  );
} catch (error) {
  console.error(`API environment validation failed: ${error.message}`);
  process.exit(1);
}
