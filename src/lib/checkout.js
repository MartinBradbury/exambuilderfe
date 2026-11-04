import {
  PURCHASABLE_QUALIFICATIONS,
  getQualificationAccessState,
  hasAccessToQualification,
} from "./access.js";

export const CHECKOUT_RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];

export const buildCheckoutRequest = (origin, qualification) => {
  if (!PURCHASABLE_QUALIFICATIONS.includes(qualification)) {
    throw new Error(`Unsupported checkout qualification: ${qualification}`);
  }

  return {
    qualification,
    success_url: `${origin}/account?checkout=success&qualification=${qualification}`,
    cancel_url: `${origin}/account?checkout=cancelled`,
  };
};

// The URL parameter survives a new tab or cleared session storage; the stored
// value is the fallback. Unknown values (including legacy BOTH) are ignored.
export const resolvePurchasedQualification = (urlValue, storedValue) =>
  [urlValue, storedValue].find((value) =>
    PURCHASABLE_QUALIFICATIONS.includes(value),
  ) || null;

const defaultWait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const confirmCheckoutEntitlement = async ({
  refreshUser,
  qualification,
  retryDelaysMs = CHECKOUT_RETRY_DELAYS_MS,
  wait = defaultWait,
  isCancelled = () => false,
  onPending = () => {},
}) => {
  let lastAttemptFailed = false;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    if (attempt > 0) {
      await wait(retryDelaysMs[attempt - 1]);
    }

    if (isCancelled()) {
      return "cancelled";
    }

    try {
      const refreshedUser = await refreshUser();
      lastAttemptFailed = false;

      const activated = qualification
        ? hasAccessToQualification(refreshedUser, qualification)
        : getQualificationAccessState(refreshedUser).hasAnyPaidAccess;

      if (isCancelled()) {
        return "cancelled";
      }

      if (activated) {
        return "confirmed";
      }
    } catch (error) {
      lastAttemptFailed = true;
      console.error("Unable to refresh billing status", error);
    }

    if (attempt === 0) {
      onPending(lastAttemptFailed);
    }
  }

  return lastAttemptFailed ? "error" : "pending";
};
