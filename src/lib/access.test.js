import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  BOTH_QUALIFICATIONS,
  GCSE_QUALIFICATION,
  PURCHASABLE_QUALIFICATIONS,
  buildAccountUpgradePath,
  getAccessPlanLabel,
  getCheckoutPrice,
  getMissingUpgradeQualifications,
  getPreferredUpgradeQualification,
  getQualificationAccessState,
  getQualificationLabel,
  hasAccessToQualification,
  pickEntitlementUpdates,
} from "./access.js";

const NO_ACCESS = {
  hasGcseAccess: false,
  hasALevelAccess: false,
  hasChemistryAccess: false,
  hasPhysicsAccess: false,
  hasAnyPaidAccess: false,
  hasFullAccess: false,
  isLifetime: false,
};

describe("qualification access compatibility", () => {
  it("grants GCSE Science access from existing GCSE access fields", () => {
    const user = { has_gcse_access: true };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
    assert.deepEqual(getQualificationAccessState(user), {
      ...NO_ACCESS,
      hasGcseAccess: true,
      hasAnyPaidAccess: true,
    });
  });

  it("grants A-level Biology access from existing A-level access fields", () => {
    const user = { has_alevel_access: true };

    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), false);
    assert.deepEqual(getQualificationAccessState(user), {
      ...NO_ACCESS,
      hasALevelAccess: true,
      hasAnyPaidAccess: true,
    });
  });

  it("grants both legacy qualifications and preserves BOTH semantics", () => {
    const user = { has_gcse_access: true, has_alevel_access: true };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, BOTH_QUALIFICATIONS), true);
    assert.equal(hasAccessToQualification(user, "ALEVEL_CHEMISTRY"), false);
    assert.equal(hasAccessToQualification(user, "ALEVEL_PHYSICS"), false);
    assert.deepEqual(getMissingUpgradeQualifications(user), [
      ALEVEL_CHEMISTRY_QUALIFICATION,
      ALEVEL_PHYSICS_QUALIFICATION,
    ]);
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
    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), false);
    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), false);
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
    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), false);
    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), false);
    assert.equal(getQualificationAccessState(user).isLifetime, true);
    assert.equal(getAccessPlanLabel(user), "Lifetime plan");
  });

  it("preserves has_unlimited_access compatibility when split fields are absent", () => {
    const user = { has_unlimited_access: true };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), false);
    assert.equal(getQualificationAccessState(user).hasFullAccess, false);
  });

  it("preserves plan_type paid compatibility when split fields are absent", () => {
    const user = { plan_type: "paid" };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), false);
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

    assert.deepEqual(getQualificationAccessState(user), NO_ACCESS);
    assert.equal(hasAccessToQualification(user, BOTH_QUALIFICATIONS), false);
    assert.equal(getAccessPlanLabel(user), "Free plan");
    assert.deepEqual(
      getMissingUpgradeQualifications(user),
      PURCHASABLE_QUALIFICATIONS,
    );
  });

  it("handles null, missing, and partial user objects", () => {
    for (const user of [null, undefined, {}, { username: "student" }]) {
      assert.deepEqual(getQualificationAccessState(user), NO_ACCESS);
      assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), false);
      assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
      assert.deepEqual(
        getMissingUpgradeQualifications(user),
        PURCHASABLE_QUALIFICATIONS,
      );
    }

    assert.deepEqual(getQualificationAccessState({ has_gcse_access: true }), {
      ...NO_ACCESS,
      hasGcseAccess: true,
      hasAnyPaidAccess: true,
    });
  });

  it("uses exact qualification values and current labels without case normalization", () => {
    assert.equal(getQualificationLabel(GCSE_QUALIFICATION), "GCSE Science");
    assert.equal(getQualificationLabel(ALEVEL_QUALIFICATION), "A-level Biology");
    assert.equal(getQualificationLabel(ALEVEL_CHEMISTRY_QUALIFICATION), "A-level Chemistry");
    assert.equal(getQualificationLabel(ALEVEL_PHYSICS_QUALIFICATION), "A-level Physics");
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

  it("never offers the combined bundle as an upgrade", () => {
    assert.equal(
      getPreferredUpgradeQualification([
        GCSE_QUALIFICATION,
        ALEVEL_QUALIFICATION,
      ]),
      GCSE_QUALIFICATION,
    );
    assert.equal(
      getPreferredUpgradeQualification([ALEVEL_QUALIFICATION]),
      ALEVEL_QUALIFICATION,
    );
    assert.equal(
      getPreferredUpgradeQualification([BOTH_QUALIFICATIONS]),
      null,
    );
    assert.equal(getPreferredUpgradeQualification([]), null);
    assert.equal(PURCHASABLE_QUALIFICATIONS.includes(BOTH_QUALIFICATIONS), false);
    assert.equal(getCheckoutPrice(BOTH_QUALIFICATIONS), null);
    assert.equal(
      buildAccountUpgradePath(BOTH_QUALIFICATIONS),
      "/account?section=upgrade",
    );
    assert.equal(
      buildAccountUpgradePath(ALEVEL_PHYSICS_QUALIFICATION),
      "/account?section=upgrade&qualification=ALEVEL_PHYSICS",
    );
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

describe("four-module pricing and ownership", () => {
  it("lists exactly four purchasable modules at £2.99 each", () => {
    assert.deepEqual(PURCHASABLE_QUALIFICATIONS, [
      "GCSE_SCIENCE",
      "ALEVEL_BIOLOGY",
      "ALEVEL_CHEMISTRY",
      "ALEVEL_PHYSICS",
    ]);

    for (const qualification of PURCHASABLE_QUALIFICATIONS) {
      assert.equal(getCheckoutPrice(qualification), "£2.99");
    }
  });

  it("recognises Chemistry-only ownership even with plan_type free", () => {
    const user = {
      plan_type: "free",
      has_gcse_paid_access: false,
      has_alevel_paid_access: false,
      lifetime_unlocked: false,
      unlocked_subjects: ["alevel_chemistry"],
    };

    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), false);
    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), false);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
    assert.equal(getQualificationAccessState(user).hasAnyPaidAccess, true);
    assert.equal(getAccessPlanLabel(user), "A-level Chemistry access");
    assert.deepEqual(getMissingUpgradeQualifications(user), [
      GCSE_QUALIFICATION,
      ALEVEL_QUALIFICATION,
      ALEVEL_PHYSICS_QUALIFICATION,
    ]);
  });

  it("recognises Physics-only ownership even with plan_type free", () => {
    const user = {
      plan_type: "free",
      has_gcse_paid_access: false,
      has_alevel_paid_access: false,
      unlocked_subjects: ["alevel_physics"],
    };

    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), false);
    assert.equal(getQualificationAccessState(user).hasAnyPaidAccess, true);
    assert.equal(getAccessPlanLabel(user), "A-level Physics access");
    assert.equal(
      getMissingUpgradeQualifications(user).includes(ALEVEL_PHYSICS_QUALIFICATION),
      false,
    );
  });

  it("keeps legacy paid flags working alongside unlocked_subjects", () => {
    const user = {
      plan_type: "paid",
      has_gcse_paid_access: true,
      has_alevel_paid_access: false,
      unlocked_subjects: [],
    };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), false);
    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), false);
    assert.equal(getAccessPlanLabel(user), "GCSE Science access");
  });

  it("accepts explicit GCSE and Biology rows in unlocked_subjects", () => {
    const user = {
      plan_type: "free",
      has_gcse_paid_access: false,
      has_alevel_paid_access: false,
      unlocked_subjects: ["alevel_biology", "gcse_science"],
    };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), false);
  });

  it("keeps lifetime access to GCSE and Biology without granting Chemistry or Physics", () => {
    const user = {
      plan_type: "lifetime",
      lifetime_unlocked: true,
      has_gcse_paid_access: true,
      has_alevel_paid_access: true,
      unlocked_subjects: [],
    };

    assert.equal(hasAccessToQualification(user, GCSE_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_QUALIFICATION), true);
    assert.equal(hasAccessToQualification(user, ALEVEL_CHEMISTRY_QUALIFICATION), false);
    assert.equal(hasAccessToQualification(user, ALEVEL_PHYSICS_QUALIFICATION), false);
    assert.equal(getQualificationAccessState(user).hasFullAccess, false);
    assert.deepEqual(getMissingUpgradeQualifications(user), [
      ALEVEL_CHEMISTRY_QUALIFICATION,
      ALEVEL_PHYSICS_QUALIFICATION,
    ]);
  });

  it("treats a historical combined purchase as GCSE plus Biology only", () => {
    const user = {
      plan_type: "paid",
      has_gcse_paid_access: true,
      has_alevel_paid_access: true,
      unlocked_subjects: ["alevel_biology", "gcse_science"],
    };

    assert.equal(hasAccessToQualification(user, BOTH_QUALIFICATIONS), true);
    assert.equal(getAccessPlanLabel(user), "GCSE + A-level access");
    assert.deepEqual(getMissingUpgradeQualifications(user), [
      ALEVEL_CHEMISTRY_QUALIFICATION,
      ALEVEL_PHYSICS_QUALIFICATION,
    ]);
  });

  it("reports full access only when all four modules are owned", () => {
    const user = {
      has_gcse_paid_access: true,
      has_alevel_paid_access: true,
      unlocked_subjects: ["alevel_chemistry", "alevel_physics"],
    };

    assert.equal(getQualificationAccessState(user).hasFullAccess, true);
    assert.equal(getAccessPlanLabel(user), "All modules unlocked");
    assert.deepEqual(getMissingUpgradeQualifications(user), []);
  });

  it("ignores malformed unlocked_subjects values", () => {
    for (const unlocked_subjects of [null, "alevel_chemistry", {}, [null, 3]]) {
      assert.equal(
        hasAccessToQualification(
          { unlocked_subjects },
          ALEVEL_CHEMISTRY_QUALIFICATION,
        ),
        false,
      );
    }
  });
});
