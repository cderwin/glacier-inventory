# Glacier Inventory

Web viewer for the glacier inventory dataset, built with Vue 2.7 and Brunch.

## Setup

```sh
npm install
npm run prepare-data   # reproject data/inventory_20220929.geojson for the map
```

`prepare-data` converts the inventory from USA Contiguous Albers
(ESRI:102039) to WGS84 lon/lat and writes `app/assets/data/glaciers.geojson`
(gitignored). Re-run it whenever the source file changes.

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

## Layout

```
app/
  assets/          copied verbatim into public/ (index.html lives here)
  components/      Vue single-file components
  router/          vue-router routes
  styles/          global CSS
  App.vue          root component
  config.js        build-time settings (Mapbox token, data URL)
  initialize.js    entry point (auto-required by brunch)
scripts/           data preparation
brunch-config.js   build config
data/              source datasets (gitignored)
public/            build output (gitignored)
```

## Notes

The build toolchain has sharp edges: `brunch` must stay at 4.0.2, `.vue`
scripts are parsed by Babel 6, and `vue`/`vue-template-compiler` must match
exactly. See "Toolchain constraints" in [CLAUDE.md](CLAUDE.md) before changing
dependencies, the build config, or SFC code.
