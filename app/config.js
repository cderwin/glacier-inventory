// Values inlined from the build environment (see plugins.babel in
// brunch-config.js). Rebuild after changing them.
export const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

// URL path the app is served under, with a trailing slash: '/' locally,
// '/glacier-inventory/' on GitHub Pages.
export const BASE_PATH = process.env.BASE_PATH || '/';

// Produced by `npm run prepare-data`; served from app/assets/data/.
export const GLACIERS_URL = `${BASE_PATH}data/glaciers.geojson`;
