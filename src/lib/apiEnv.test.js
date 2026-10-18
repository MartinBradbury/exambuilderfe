import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAGING_API_BASE_URL,
  resolveApiBaseUrl,
} from "./apiEnv.js";
import { PRODUCTION_API_BASE_URL } from "./productionApi.js";

const production = (options = {}) =>
  resolveApiBaseUrl({
    productionApiBaseUrl: PRODUCTION_API_BASE_URL,
    ...options,
  });
const staging = (apiBaseUrl) =>
  resolveApiBaseUrl({
    appEnv: "staging",
    apiBaseUrl,
    productionApiBaseUrl: PRODUCTION_API_BASE_URL,
  });

describe("resolveApiBaseUrl", () => {
  describe("production compatibility", () => {
    it("falls back to the production API when nothing is set", () => {
      assert.equal(production(), PRODUCTION_API_BASE_URL);
    });

    it("treats an empty VITE_APP_ENV as production", () => {
      assert.equal(production({ appEnv: "" }), PRODUCTION_API_BASE_URL);
    });

    it("errors if production has no URL available", () => {
      assert.throws(() => resolveApiBaseUrl({}), /production/);
    });

    it("keeps honouring a VITE_API_BASE_URL override and trims a trailing slash", () => {
      assert.equal(
        production({
          appEnv: "production",
          apiBaseUrl: "https://example.test/",
        }),
        "https://example.test",
      );
    });
  });

  describe("staging", () => {
    it("accepts the staging URL, with or without a trailing slash", () => {
      assert.equal(staging(STAGING_API_BASE_URL), STAGING_API_BASE_URL);
      assert.equal(staging(`${STAGING_API_BASE_URL}/`), STAGING_API_BASE_URL);
    });

    it("rejects a missing URL", () => {
      assert.throws(() => staging(undefined), /required/);
      assert.throws(() => staging("  "), /required/);
    });

    it("rejects invalid or non-HTTPS URLs", () => {
      assert.throws(() => staging("not a url"), /valid HTTPS/);
      assert.throws(
        () => staging("http://exambuilder-staging-e3f9e4c51418.herokuapp.com"),
        /valid HTTPS/,
      );
      assert.throws(() => staging(`${STAGING_API_BASE_URL}/api`), /valid HTTPS/);
    });

    it("rejects the production URL without falling back", () => {
      assert.throws(() => staging(PRODUCTION_API_BASE_URL), /production/);
      assert.throws(() => staging(`${PRODUCTION_API_BASE_URL}/`), /production/);
    });

    it("rejects any other backend", () => {
      assert.throws(() => staging("https://example.test"), /staging backend/);
    });

    it("does not echo the supplied URL in errors", () => {
      assert.throws(
        () => staging("https://user:secret@example.test"),
        (error) => !error.message.includes("secret"),
      );
    });
  });

  it("rejects an unknown or misspelled VITE_APP_ENV", () => {
    for (const appEnv of ["stagin", "Staging", "prod", "dev"]) {
      assert.throws(
        () => resolveApiBaseUrl({ appEnv, apiBaseUrl: STAGING_API_BASE_URL }),
        /Invalid VITE_APP_ENV/,
      );
    }
  });
});
