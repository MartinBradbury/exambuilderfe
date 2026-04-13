export const THEME_STORAGE_KEY = "themePreference";

export const getPreferredTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return "dark";
};

export const applyThemePreference = (themePreference) => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = themePreference;
  window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
};

export const initializeThemePreference = () => {
  const themePreference = getPreferredTheme();
  applyThemePreference(themePreference);
  return themePreference;
};
