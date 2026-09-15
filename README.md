# Glacier Inventory

Web viewer for the glacier inventory dataset, built with Vue 2.7 and Brunch.

## Setup

```sh
npm install
```

The map data, `app/assets/data/glaciers.geojson`, is committed. To regenerate
it, put the source inventory at `data/inventory_20220929.geojson` (gitignored)
and run:

```sh
npm run prepare-data
```

This reprojects the inventory from USA Contiguous Albers (ESRI:102039) to
WGS84 lon/lat. It also simplifies outlines to 1 m, rounds coordinates, and
drops attributes the UI doesn't use.

The map needs a [Mapbox access token](https://account.mapbox.com/access-tokens/),
read from `MAPBOX_ACCESS_TOKEN` at build time. Put it in a gitignored `.env`
file, which `brunch-config.js` loads on start-up:

```sh
cp .env.example .env    # then set MAPBOX_ACCESS_TOKEN=pk....
```

A `MAPBOX_ACCESS_TOKEN` set in the shell environment overrides `.env`.

## Develop

```sh
npm start       # brunch watch --server, http://localhost:3333
```

## Build

```sh
npm run build   # minified bundle into public/
```

The token is baked into `public/js/app.js`, so use a public (`pk.`) token
restricted to your site's URLs.

## Deploy

Every push to `main` deploys to GitHub Pages at
https://cderwin.github.io/glacier-inventory/ (`.github/workflows/pages.yml`).
Pull requests run the build without deploying. The workflow reads the token
from the `MAPBOX_ACCESS_TOKEN` repository variable and builds with
`BASE_PATH=/glacier-inventory/`, the URL path the site is served under.

## Layout

```
app/
  assets/          copied verbatim into public/ (index.html, icons, data/glaciers.geojson)
  components/      Vue single-file components
  router/          vue-router routes
  styles/          global CSS
  App.vue          root component
  config.js        build-time settings (Mapbox token, base path, data URL)
  initialize.js    entry point (auto-required by brunch)
scripts/           data preparation
brunch-config.js   build config
.github/workflows/ GitHub Pages build and deploy
data/              source datasets (gitignored)
public/            build output (gitignored)
```

## Notes

The build toolchain has sharp edges: `brunch` must stay at 4.0.2, `.vue`
scripts are parsed by Babel 6, and `vue`/`vue-template-compiler` must match
exactly. See "Toolchain constraints" in [CLAUDE.md](CLAUDE.md) before changing
dependencies, the build config, or SFC code.
