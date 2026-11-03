import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALEVEL_QUALIFICATION,
  BOTH_QUALIFICATIONS,
  GCSE_QUALIFICATION,
  getAccessPlanLabel,
  getMissingUpgradeQualifications,
  getPreferredUpgradeQualification,
  getQualificationAccessState,
  getQualificationLabel,
  hasAccessToQualification,
  pickEntitlementUpdates,
} from "./access.js";

describe("qualification access compatibility", () => {
  it("grants GCSE Science access from existing GCSE access fields", () => {
    const user = { has_gcse_access: true };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
    assert.deepEqual(getQualificationAccessState(user), {
      hasGcseAccess: true,
      hasALevelAccess: false,
      hasAnyPaidAccess: true,
      hasFullAccess: false,
      isLifetime: false,
    });
  });

  it("grants A-level Biology access from existing A-level access fields", () => {
    const user = { has_alevel_access: true };

    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), false);
    assert.deepEqual(getQualificationAccessState(user), {
      hasGcseAccess: false,
      hasALevelAccess: true,
      hasAnyPaidAccess: true,
      hasFullAccess: false,
      isLifetime: false,
    });
  });

  it("grants both legacy qualifications and preserves BOTH semantics", () => {
    const user = { has_gcse_access: true, has_alevel_access: true };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, BOTH_QUALIFICATIONS), true);
    assert.equal(hasAccessToQualification(user, "ALEVEL_CHEMISTRY"), false);
    assert.equal(hasAccessToQualification(user, "ALEVEL_PHYSICS"), false);
    assert.deepEqual(getMissingUpgradeQualifications(user), []);
  });

  it("does not grant BOTH unless both legacy access buckets are granted", () => {
    assert.equal(
      hasAccessToQualification({ has_gcse_access: true }, BOTH_QUALIFICATIONS),
      false,
    );
    assert.equal(
      hasAccessToQualification(
        { has_alevel_access: true },
        BOTH_QUALIFICATIONS,
      ),
      false,
    );
  });

  it("preserves lifetime_unlocked access to both legacy qualifications", () => {
    const user = {
      lifetime_unlocked: true,
      has_gcse_access: false,
      has_alevel_access: false,
    };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(getQualificationAccessState(user).isLifetime, true);
    assert.equal(getAccessPlanLabel(user), "Lifetime plan");
  });

  it("preserves plan_type lifetime access to both legacy qualifications", () => {
    const user = {
      plan_type: "lifetime",
      has_gcse_access: false,
      has_alevel_access: false,
    };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(getQualificationAccessState(user).isLifetime, true);
    assert.equal(getAccessPlanLabel(user), "Lifetime plan");
  });

  it("preserves has_unlimited_access compatibility when split fields are absent", () => {
    const user = { has_unlimited_access: true };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(getQualificationAccessState(user).hasFullAccess, true);
  });

  it("preserves plan_type paid compatibility when split fields are absent", () => {
    const user = { plan_type: "paid" };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(getQualificationAccessState(user).hasFullAccess, true);
  });

  it("does not use legacy full-access flags when any split field is present", () => {
    const user = {
      has_unlimited_access: true,
      has_gcse_access: true,
    };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
  });

  it("treats a free user as having no paid access", () => {
    const user = {
      plan_type: "free",
      questions_remaining_today: 2,
    };

    assert.deepEqual(getQualificationAccessState(user), {
      hasGcseAccess: false,
      hasALevelAccess: false,
      hasAnyPaidAccess: false,
      hasFullAccess: false,
      isLifetime: false,
    });
    assert.equal(hasAccessToQualification(user, BOTH_QUALIFICATIONS), false);
    assert.equal(getAccessPlanLabel(user), "Free plan");
    assert.deepEqual(getMissingUpgradeQualifications(user), [
      GCSE_QUALIFICATION,
      ALEVEL_QUALIFICATION,
    ]);
  });

  it("handles null, missing, and partial user objects", () => {
    for (const user of [null, undefined, {}, { username: "student" }]) {
      assert.deepEqual(getQualificationAccessState(user), {
        hasGcseAccess: false,
        hasALevelAccess: false,
        hasAnyPaidAccess: false,
        hasFullAccess: false,
        isLifetime: false,
      });
      assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), false);
      assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
      assert.deepEqual(getMissingUpgradeQualifications(user), [
        GCSE_QUALIFICATION,
        ALEVEL_QUALIFICATION,
      ]);
    }

    assert.deepEqual(getQualificationAccessState({ has_gcse_access: true }), {
      hasGcseAccess: true,
      hasALevelAccess: false,
      hasAnyPaidAccess: true,
      hasFullAccess: false,
      isLifetime: false,
    });
  });

  it("uses exact qualification values and current labels without case normalization", () => {
    assert.equal(getQualificationLabel(GCSE_QUALIFICATION), "GCSE Science");
    assert.equal(getQualificationLabel(ALEVEL_QUALIFICATION), "A-level Biology");
    assert.equal(getQualificationLabel(BOTH_QUALIFICATIONS), "GCSE + A-level");
    assert.equal(getQualificationLabel("alevel_biology"), "selected qualification");
    assert.equal(
      hasAccessToQualification({ has_gcse_access: true }, "gcse_science"),
      false,
    );
    assert.equal(
      hasAccessToQualification(
        { has_gcse_access: true, has_alevel_access: true },
        "both",
      ),
      false,
    );
  });

  it("selects the legacy BOTH upgrade when both qualifications are missing", () => {
    assert.equal(
      getPreferredUpgradeQualification([
        GCSE_QUALIFICATION,
        ALEVEL_QUALIFICATION,
      ]),
      BOTH_QUALIFICATIONS,
    );
    assert.equal(
      getPreferredUpgradeQualification([ALEVEL_QUALIFICATION]),
      ALEVEL_QUALIFICATION,
    );
    assert.equal(getPreferredUpgradeQualification([]), null);
  });

  it("extracts only the existing entitlement update fields", () => {
    const payload = {
      plan_type: "paid",
      questions_remaining_today: 1,
      has_unlimited_access: true,
      lifetime_unlocked: false,
      has_gcse_access: true,
      can_access_a_level: true,
      unlocked_subjects: ["alevel_chemistry"],
      unrelated: "ignored",
    };

    assert.deepEqual(pickEntitlementUpdates(payload), {
      plan_type: "paid",
      questions_remaining_today: 1,
      has_unlimited_access: true,
      lifetime_unlocked: false,
      has_gcse_access: true,
      can_access_a_level: true,
    });
    assert.deepEqual(pickEntitlementUpdates(null), {});
    assert.deepEqual(pickEntitlementUpdates({}), {});
  });
});
