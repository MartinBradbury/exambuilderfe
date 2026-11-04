import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  BOTH_QUALIFICATIONS,
  GCSE_QUALIFICATION,
  PURCHASABLE_QUALIFICATIONS,
} from "./access.js";
import {
  buildCheckoutRequest,
  confirmCheckoutEntitlement,
  resolvePurchasedQualification,
} from "./checkout.js";

const ORIGIN = "https://staging.example.test";

describe("checkout requests", () => {
  it("sends the matching qualification identifier for every module", () => {
    const expected = {
      [GCSE_QUALIFICATION]: "GCSE_SCIENCE",
      [ALEVEL_QUALIFICATION]: "ALEVEL_BIOLOGY",
      [ALEVEL_CHEMISTRY_QUALIFICATION]: "ALEVEL_CHEMISTRY",
      [ALEVEL_PHYSICS_QUALIFICATION]: "ALEVEL_PHYSICS",
    };

    assert.deepEqual(Object.keys(expected), PURCHASABLE_QUALIFICATIONS);

    for (const [qualification, identifier] of Object.entries(expected)) {
      const request = buildCheckoutRequest(ORIGIN, qualification);

      assert.equal(request.qualification, identifier);
      assert.equal(
        request.success_url,
        `${ORIGIN}/account?checkout=success&qualification=${identifier}`,
      );
      assert.equal(request.cancel_url, `${ORIGIN}/account?checkout=cancelled`);
    }
  });

  it("refuses to build a checkout for the removed bundle or unknown values", () => {
    for (const value of [BOTH_QUALIFICATIONS, "ALL", "", null, undefined]) {
      assert.throws(() => buildCheckoutRequest(ORIGIN, value));
    }
  });
});

describe("resolvePurchasedQualification", () => {
  it("prefers the URL value, then session storage, and ignores BOTH", () => {
    assert.equal(
      resolvePurchasedQualification("ALEVEL_PHYSICS", "GCSE_SCIENCE"),
      "ALEVEL_PHYSICS",
    );
    assert.equal(
      resolvePurchasedQualification(null, "ALEVEL_CHEMISTRY"),
      "ALEVEL_CHEMISTRY",
    );
    assert.equal(resolvePurchasedQualification("BOTH", null), null);
    assert.equal(resolvePurchasedQualification(null, null), null);
  });
});

describe("confirmCheckoutEntitlement", () => {
  const noWait = () => Promise.resolve();
  const freeUser = { plan_type: "free", unlocked_subjects: [] };
  const chemistryUser = {
    plan_type: "free",
    unlocked_subjects: ["alevel_chemistry"],
  };

  it("confirms Chemistry from unlocked_subjects despite plan_type free", async () => {
    let calls = 0;
    const outcome = await confirmCheckoutEntitlement({
      refreshUser: async () => {
        calls += 1;
        return chemistryUser;
      },
      qualification: ALEVEL_CHEMISTRY_QUALIFICATION,
      wait: noWait,
    });

    assert.equal(outcome, "confirmed");
    assert.equal(calls, 1);
  });

  it("does not confirm a different subject than the one purchased", async () => {
    const outcome = await confirmCheckoutEntitlement({
      refreshUser: async () => chemistryUser,
      qualification: ALEVEL_PHYSICS_QUALIFICATION,
      retryDelaysMs: [1],
      wait: noWait,
    });

    assert.equal(outcome, "pending");
  });

  it("retries until the webhook has granted the subject", async () => {
    const responses = [freeUser, freeUser, chemistryUser];
    let calls = 0;
    const pendingNotices = [];
    const outcome = await confirmCheckoutEntitlement({
      refreshUser: async () => responses[calls++],
      qualification: ALEVEL_CHEMISTRY_QUALIFICATION,
      retryDelaysMs: [1, 1, 1],
      wait: noWait,
      onPending: (failed) => pendingNotices.push(failed),
    });

    assert.equal(outcome, "confirmed");
    assert.equal(calls, 3);
    assert.deepEqual(pendingNotices, [false]);
  });

  it("falls back to any paid access when the purchased subject is unknown", async () => {
    const outcome = await confirmCheckoutEntitlement({
      refreshUser: async () => chemistryUser,
      qualification: null,
      wait: noWait,
    });

    assert.equal(outcome, "confirmed");
  });

  it("reports an error when every refresh fails and stops when cancelled", async () => {
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const failed = await confirmCheckoutEntitlement({
        refreshUser: async () => {
          throw new Error("network");
        },
        qualification: GCSE_QUALIFICATION,
        retryDelaysMs: [1],
        wait: noWait,
      });
      assert.equal(failed, "error");
    } finally {
      console.error = originalConsoleError;
    }

    const cancelled = await confirmCheckoutEntitlement({
      refreshUser: async () => freeUser,
      qualification: GCSE_QUALIFICATION,
      retryDelaysMs: [1, 1],
      wait: noWait,
      isCancelled: () => true,
    });
    assert.equal(cancelled, "cancelled");
  });
});
