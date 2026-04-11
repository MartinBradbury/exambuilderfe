export const ALEVEL_QUALIFICATION = "ALEVEL_BIOLOGY";
export const GCSE_QUALIFICATION = "GCSE_SCIENCE";
export const BOTH_QUALIFICATIONS = "BOTH";

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

  return "selected qualification";
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

  const hasGcseAccess =
    isLifetime ||
    hasLegacyFullAccess ||
    normalizeBoolean(readFirstDefined(user, GCSE_ACCESS_KEYS));
  const hasALevelAccess =
    isLifetime ||
    hasLegacyFullAccess ||
    normalizeBoolean(readFirstDefined(user, ALEVEL_ACCESS_KEYS));
  const hasAnyPaidAccess = hasGcseAccess || hasALevelAccess;
  const hasFullAccess = hasGcseAccess && hasALevelAccess;

  return {
    hasGcseAccess,
    hasALevelAccess,
    hasAnyPaidAccess,
    hasFullAccess,
    isLifetime,
  };
};

export const hasAccessToQualification = (user, qualification) => {
  const { hasGcseAccess, hasALevelAccess } = getQualificationAccessState(user);

  if (qualification === BOTH_QUALIFICATIONS) {
    return hasGcseAccess && hasALevelAccess;
  }

  if (qualification === GCSE_QUALIFICATION) {
    return hasGcseAccess;
  }

  if (qualification === ALEVEL_QUALIFICATION) {
    return hasALevelAccess;
  }

  return false;
};

export const getAccessPlanLabel = (user) => {
  const { hasGcseAccess, hasALevelAccess, isLifetime } =
    getQualificationAccessState(user);

  if (isLifetime) {
    return "Lifetime plan";
  }

  if (hasGcseAccess && hasALevelAccess) {
    return "GCSE + A-level access";
  }

  if (hasALevelAccess) {
    return "A-level access";
  }

  if (hasGcseAccess) {
    return "GCSE access";
  }

  return "Free plan";
};

export const getMissingUpgradeQualifications = (user) => {
  const { hasGcseAccess, hasALevelAccess } = getQualificationAccessState(user);
  const missingQualifications = [];

  if (!hasGcseAccess) {
    missingQualifications.push(GCSE_QUALIFICATION);
  }

  if (!hasALevelAccess) {
    missingQualifications.push(ALEVEL_QUALIFICATION);
  }

  return missingQualifications;
};

export const getCheckoutPrice = (qualification) => {
  if (qualification === BOTH_QUALIFICATIONS) {
    return "£3.99";
  }

  return "£2.99";
};

export const pickEntitlementUpdates = (payload) => {
  const nextEntitlement = {};

  for (const key of ACCESS_UPDATE_KEYS) {
    if (hasOwn(payload, key)) {
      nextEntitlement[key] = payload[key];
    }
  }

  return nextEntitlement;
};
