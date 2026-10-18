// Kept in its own module and only referenced from the production branch of
// api.js, so staging builds tree-shake it out of the bundle.
export const PRODUCTION_API_BASE_URL =
  "https://exambuilder-efae14d59f03.herokuapp.com";
