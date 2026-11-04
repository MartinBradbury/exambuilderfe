export const ALEVEL_QUALIFICATION = "ALEVEL_BIOLOGY";
export const GCSE_QUALIFICATION = "GCSE_SCIENCE";
export const ALEVEL_CHEMISTRY_QUALIFICATION = "ALEVEL_CHEMISTRY";
export const ALEVEL_PHYSICS_QUALIFICATION = "ALEVEL_PHYSICS";
// Historical combined purchase. Never offered for new checkout, but existing
// BOTH purchases still resolve to GCSE Science + A-level Biology access.
export const BOTH_QUALIFICATIONS = "BOTH";

export const MODULE_PRICE = "£2.99";

export const PURCHASABLE_QUALIFICATIONS = [
  GCSE_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
];

const QUALIFICATION_SUBJECT_CODES = {
  [GCSE_QUALIFICATION]: "gcse_science",
  [ALEVEL_QUALIFICATION]: "alevel_biology",
  [ALEVEL_CHEMISTRY_QUALIFICATION]: "alevel_chemistry",
  [ALEVEL_PHYSICS_QUALIFICATION]: "alevel_physics",
};

const GCSE_ACCESS_KEYS = [
  "has_gcse_access",
  "gcse_access",
  "paid_gcse_access",
  "gcse_paid_access",
  "gcse_unlocked",
  "has_gcse_paid_access",
  "can_access_gcse",
];

const ALEVEL_ACCESS_KEYS = [
  "has_alevel_access",
  "has_a_level_access",
  "alevel_access",
  "a_level_access",
  "paid_alevel_access",
  "paid_a_level_access",
  "alevel_unlocked",
  "a_level_unlocked",
  "has_alevel_paid_access",
  "has_a_level_paid_access",
  "can_access_alevel",
  "can_access_a_level",
];

const ACCESS_UPDATE_KEYS = [
  "plan_type",
  "questions_remaining_today",
  "has_unlimited_access",
  "lifetime_unlocked",
  ...GCSE_ACCESS_KEYS,
  ...ALEVEL_ACCESS_KEYS,
];

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value || {}, key);

const readFirstDefined = (source, keys) => {
  for (const key of keys) {
    if (hasOwn(source, key)) {
      return source[key];
    }
  }

  return undefined;
};

const normalizeBoolean = (value) => {
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return Boolean(value);
};

export const getQualificationLabel = (qualification) => {
  if (qualification === BOTH_QUALIFICATIONS) {
    return "GCSE + A-level";
  }

  if (qualification === GCSE_QUALIFICATION) {
    return "GCSE Science";
  }

  if (qualification === ALEVEL_QUALIFICATION) {
    return "A-level Biology";
  }

  if (qualification === ALEVEL_CHEMISTRY_QUALIFICATION) {
    return "A-level Chemistry";
  }

  if (qualification === ALEVEL_PHYSICS_QUALIFICATION) {
    return "A-level Physics";
  }

  return "selected qualification";
};

export const getUnlockedSubjectCodes = (user) => {
  const unlocked = user?.unlocked_subjects;

  if (!Array.isArray(unlocked)) {
    return [];
  }

  return unlocked
    .filter((code) => typeof code === "string")
    .map((code) => code.trim().toLowerCase());
};

export const getQualificationAccessState = (user) => {
  const planType = user?.plan_type ?? null;
  const hasSplitAccessFields = [
    ...GCSE_ACCESS_KEYS,
    ...ALEVEL_ACCESS_KEYS,
  ].some((key) => hasOwn(user, key));
  const isLifetime = Boolean(
    user?.lifetime_unlocked || planType === "lifetime",
  );
  const hasLegacyFullAccess =
    !hasSplitAccessFields &&
    Boolean(
      user?.has_unlimited_access ||
      planType === "paid" ||
      planType === "lifetime",
    );

  // plan_type "free" is deliberately not consulted: Chemistry-only and
  // Physics-only purchasers can still carry it, so ownership comes from
  // unlocked_subjects. Lifetime and legacy flags never grant Chemistry/Physics.
  const unlockedSubjects = getUnlockedSubjectCodes(user);

  const hasGcseAccess =
    isLifetime ||
    hasLegacyFullAccess ||
    normalizeBoolean(readFirstDefined(user, GCSE_ACCESS_KEYS)) ||
    unlockedSubjects.includes(QUALIFICATION_SUBJECT_CODES[GCSE_QUALIFICATION]);
  const hasALevelAccess =
    isLifetime ||
    hasLegacyFullAccess ||
    normalizeBoolean(readFirstDefined(user, ALEVEL_ACCESS_KEYS)) ||
    unlockedSubjects.includes(
      QUALIFICATION_SUBJECT_CODES[ALEVEL_QUALIFICATION],
    );
  const hasChemistryAccess = unlockedSubjects.includes(
    QUALIFICATION_SUBJECT_CODES[ALEVEL_CHEMISTRY_QUALIFICATION],
  );
  const hasPhysicsAccess = unlockedSubjects.includes(
    QUALIFICATION_SUBJECT_CODES[ALEVEL_PHYSICS_QUALIFICATION],
  );
  const hasAnyPaidAccess =
    hasGcseAccess || hasALevelAccess || hasChemistryAccess || hasPhysicsAccess;
  const hasFullAccess =
    hasGcseAccess && hasALevelAccess && hasChemistryAccess && hasPhysicsAccess;

  return {
    hasGcseAccess,
    hasALevelAccess,
    hasChemistryAccess,
    hasPhysicsAccess,
    hasAnyPaidAccess,
    hasFullAccess,
    isLifetime,
  };
};

export const hasAccessToQualification = (user, qualification) => {
  const { hasGcseAccess, hasALevelAccess, hasChemistryAccess, hasPhysicsAccess } =
    getQualificationAccessState(user);

  if (qualification === BOTH_QUALIFICATIONS) {
    return hasGcseAccess && hasALevelAccess;
  }

  if (qualification === GCSE_QUALIFICATION) {
    return hasGcseAccess;
  }

  if (qualification === ALEVEL_QUALIFICATION) {
    return hasALevelAccess;
  }

  if (qualification === ALEVEL_CHEMISTRY_QUALIFICATION) {
    return hasChemistryAccess;
  }

  if (qualification === ALEVEL_PHYSICS_QUALIFICATION) {
    return hasPhysicsAccess;
  }

  return false;
};

export const getOwnedQualifications = (user) =>
  PURCHASABLE_QUALIFICATIONS.filter((qualification) =>
    hasAccessToQualification(user, qualification),
  );

export const getAccessPlanLabel = (user) => {
  const { isLifetime } = getQualificationAccessState(user);
  const owned = getOwnedQualifications(user);

  if (isLifetime) {
    return "Lifetime plan";
  }

  if (owned.length === PURCHASABLE_QUALIFICATIONS.length) {
    return "All modules unlocked";
  }

  if (owned.length > 1) {
    return `${owned.length} modules unlocked`;
  }

  if (owned.length === 1) {
    return getQualificationLabel(owned[0]);
  }

  return "Free plan";
};

export const getMissingUpgradeQualifications = (user) =>
  PURCHASABLE_QUALIFICATIONS.filter(
    (qualification) => !hasAccessToQualification(user, qualification),
  );

export const getPreferredUpgradeQualification = (missingQualifications) => {
  const normalizedQualifications = Array.isArray(missingQualifications)
    ? missingQualifications.filter((qualification) =>
        PURCHASABLE_QUALIFICATIONS.includes(qualification),
      )
    : [];

  return normalizedQualifications[0] || null;
};

export const buildAccountUpgradePath = (preferredQualification = null) => {
  const params = new URLSearchParams({ section: "upgrade" });

  if (PURCHASABLE_QUALIFICATIONS.includes(preferredQualification)) {
    params.set("qualification", preferredQualification);
  }

  return `/account?${params.toString()}`;
};

export const getCheckoutPrice = (qualification) =>
  PURCHASABLE_QUALIFICATIONS.includes(qualification) ? MODULE_PRICE : null;

export const pickEntitlementUpdates = (payload) => {
  const nextEntitlement = {};

  for (const key of ACCESS_UPDATE_KEYS) {
    if (hasOwn(payload, key)) {
      nextEntitlement[key] = payload[key];
    }
  }

  return nextEntitlement;
};
