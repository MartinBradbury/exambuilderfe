import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { UserProvider } from "./context/UserContext.jsx";
import { initializeThemePreference } from "./lib/theme.js";

initializeThemePreference();

createRoot(document.getElementById("root")).render(
  <UserProvider>
    <App />
  </UserProvider>,
);
