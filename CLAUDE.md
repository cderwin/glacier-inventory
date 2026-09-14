# CLAUDE.md

## Purpose

A browser viewer for a glacier inventory of the western contiguous US:
2,542 polygons (glaciers, perennial snowfields, buried ice) across CA, OR, WA,
ID, MT, WY, CO, NV. The source is `data/inventory_20220929.geojson`, which is
42 MB and gitignored. A reduced copy is committed at
`app/assets/data/glaciers.geojson`. The app shows it on a Mapbox GL map, and
clicking a feature shows its attributes. Pushes to `main` deploy it to
https://cderwin.github.io/glacier-inventory/.

## Stack

- **Vue 2.7** (Options API, single-file components) + **vue-router 3** (history mode)
- **Brunch 4.0.2** build: babel-brunch (Babel 7) for `.js`, vue-brunch/vueify
  (Babel 6) for `.vue`, terser and clean-css for production
- **mapbox-gl 3**, loaded as the `window.mapboxgl` global
- **proj4** (dev only) for reprojecting the dataset

There are no tests or linter.

## Commands

```sh
npm run prepare-data                     # source data -> app/assets/data/glaciers.geojson (needs data/)
npm start                                # dev server, http://localhost:3333
npm run build                            # production bundle in public/
npm run clean                            # delete public/
```

`MAPBOX_ACCESS_TOKEN` comes from `.env` (gitignored; template in
`.env.example`), loaded at the top of `brunch-config.js`. A value set in the
shell environment overrides the file.

`.github/workflows/pages.yml` builds on every pull request, and on pushes to
`main` it deploys `public/` to GitHub Pages. In CI the token comes from the
`MAPBOX_ACCESS_TOKEN` repository variable, and `BASE_PATH` is
`/glacier-inventory/`.

## Git workflow (GitHub flow)

This repo uses [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow).
`main` is the only long-lived branch. It must always build, because every
push to `main` deploys the live site. All other work happens on short-lived
branches that reach `main` through a pull request.

**Use this flow for every feature, fix, and other change.** Never commit or
push directly to `main`.

1. **Start from an up-to-date `main`:**
   ```sh
   git switch main && git pull --ff-only
   ```
2. **Create a branch** named `<type>/<short-kebab-description>`. The type is
   `feature`, `fix`, `docs`, or `chore`, e.g. `feature/glacier-search`.
   ```sh
   git switch -c feature/glacier-search
   ```
   Use one branch per change; don't mix unrelated work.
3. **Commit in small, focused steps.**
   - Write the subject in the imperative, 72 characters at most. Use the body
     to explain why.
   - If you change `scripts/prepare-data.js`, commit the regenerated
     `glaciers.geojson` together with it.
   - Never commit `.env`, `data/`, or `public/`.
4. **Verify before pushing.** Follow "Verifying changes" below: a clean
   `npm run build` for every change, plus a browser check for UI or map
   changes.
5. **Push and open a pull request** against `main`:
   ```sh
   git push -u origin feature/glacier-search
   gh pr create --base main
   ```
   The description should cover what changed and why, and how you tested it.
   Call out anything a reviewer must do by hand, such as repo settings or
   token changes.
6. **Get CI green.** The `build` check must pass. Fix failures with new
   commits on the same branch.
7. **Don't merge your own PR** unless the user asks. Merging deploys to
   production, so the user decides when.
8. **After the merge,** update `main` and delete the branch:
   ```sh
   git switch main && git pull --ff-only
   git branch -d feature/glacier-search
   git push origin --delete feature/glacier-search
   ```

If `main` moves while your branch is open, rebase onto it
(`git fetch && git rebase origin/main`). Then run the build again and push
with `git push --force-with-lease`. Only force-push branches you created,
and never force-push `main`.

## Architecture

```
data/inventory_20220929.geojson   source data, ESRI:102039 (Albers, meters), gitignored
        │  scripts/prepare-data.js   (simplify to 1 m, proj4 → WGS84, round to 5 dp,
        │                             drop Z and unused attributes, add bbox)
        ▼
app/assets/data/glaciers.geojson  generated, committed (10.7 MB); brunch copies it to public/data/
        │  fetch(GLACIERS_URL)
        ▼
app/components/InventoryMap.vue   Mapbox map, sources, layers, popups
```

- `app/initialize.js` is the entry point. Brunch auto-requires it, so there's no
  inline script in `index.html`. It mounts `App.vue` with the router.
- `app/router/index.js` has two routes: `/` → `InventoryMap`, `/about` → `About`.
- `app/config.js` holds build-time settings: `MAPBOX_ACCESS_TOKEN` and
  `BASE_PATH` (inlined from the environment) and `GLACIERS_URL`.
- The app can be served under a sub-path. Build URLs from `BASE_PATH` (the
  router's `base` and `GLACIERS_URL` do). `index.html` uses relative asset
  URLs, which only works while every route is one level deep.
- `app/assets/` is copied verbatim into `public/` (including `index.html`).
- Bundles:
  - `js/vendor.js`: everything outside `app/`
  - `js/app.js`: our code
  - `css/app.css`: global styles plus `mapbox-gl.css`
  - `css/components.css`: `<style>` blocks extracted from SFCs

### InventoryMap

- It fetches the prepared GeoJSON once the map style loads. It adds two sources:
  - `glaciers`: the polygons
  - `glacier-centroids`: points built from each feature's `X_COORD`/`Y_COORD`
- Layers:
  - `glacier-centroids` (circle) is shown below zoom 9. Most glaciers are under
    1 km² and can't be seen at regional zoom.
  - `glaciers-fill` and `glaciers-outline` are shown from zoom 9 up.
- Features are colored by `CLASS` through one `match` expression built from
  `CLASS_COLORS`. The legend is generated from the same object.
- Clicking a legend entry toggles that class. `hiddenClasses` drives a
  `setFilter` on every layer in `GLACIER_LAYERS`. Add new glacier layers
  there so they respect the toggles.
- Hover uses `feature-state` and needs numeric feature `id`s. The source data
  already has them.
- The map instance lives on `this.map`, **not** in `data()`. Vue would otherwise
  make the WebGL object and its internals reactive.

### Data fields

The prepared data keeps only these fields (`PROPERTIES` in
`scripts/prepare-data.js`). To show another source field, add it there and
re-run `prepare-data`.

| Field | Meaning |
|---|---|
| `GLACNAME` | name; often `' '`, so trim it |
| `CLASS` | `Glacier`, `Perennial snowfield`, or `Buried ice` |
| `AREA_KM2` | area |
| `GEO_REGION` | mountain range |
| `UNIT_NAME` | managing unit |
| `YEAR`, `SOURCE_MAT` | when and from what the outline was mapped |
| `INV_ID` | inventory ID |
| `X_COORD`, `Y_COORD` | centroid, lon/lat |

The source also has `STATENAME`, `ADM_NAME`, `LandOwner`, `COMMENT`, and
others. Its `Shape_Length` and `Shape_Area` are in the source projection's
meters.

## Toolchain constraints (read before changing the build or writing code)

- **Never upgrade `brunch` past 4.0.2.** From 5.0.0 the npm name belongs to an
  unrelated project. `npx brunch` with the wrong version starts an AI tool's
  server, not a build.
- **`.vue` `<script>` blocks are parsed by Babel 6.** It is set to convert
  modules only; everything else ships as written. These are **syntax errors** in
  SFCs:
  - object spread `{...a}`
  - optional chaining `a?.b` and nullish coalescing `??`
  - class fields
  - optional catch binding `catch {}`
  - numeric separators
  - dynamic `import()`
  - `for await`

  These are fine: `async`/`await`, array rest/spread, destructuring, template
  literals, arrow functions. Plain `.js` files under `app/` go through Babel 7
  and accept modern syntax.
- **Environment variables are only inlined in `.js` files.**
  - Read them in `app/config.js`, and import from there into components.
  - Set local values in `.env`, and add a placeholder line to `.env.example`.
  - Add each new variable to the `include` list of
    `transform-inline-environment-variables` in `brunch-config.js`.
  - Changing a value requires a rebuild.
  - Everything inlined is public in `app.js`.
- **npm packages must be parseable by Brunch's dependency scanner** (an older
  acorn). If a prebuilt modern bundle fails with "Unexpected token", add its
  dist file to `npm.static` and use the global it defines, as mapbox-gl does.
  Static files still go through babel-brunch, so keep `plugins.babel.ignore`
  covering `node_modules`.
  Add a package's CSS through `npm.styles`.
- `vue` and `vue-template-compiler` must stay on exactly the same version.
- The dev server serves `public/`, so data must go under `app/assets/` to be
  reachable. `npm run clean` wipes `public/`, but assets in
  `app/assets/data/` survive.

## Best practices for new code

### Components

- Use Options API SFCs with a `name`. Add a route in `app/router/index.js` for
  new pages.
- Styles are extracted globally (not scoped). Prefix class names with the
  component's root class, BEM-style: `.inventory-panel`,
  `.inventory-status--error`.
- Use the CSS custom properties in `app/styles/app.css` (`--bg`, `--text`,
  `--text-muted`, `--border`, `--danger`) so dark mode keeps working. Content
  drawn on the map (e.g. popups) stays light, because the basemap is light.
- Handle loading and error states the way `InventoryMap` does: `loading` and
  `error` in `data()`, the error shown before the loading message.
- Put third-party instances (maps, charts), large GeoJSON, and other big
  objects on `this.<name>`, or `Object.freeze` them. Don't put them in
  `data()`. Clean up in `beforeDestroy`.

### Map work

- Add sources and layers after the style's `load` event.
- Style with data-driven expressions (`match`, `interpolate`, `feature-state`),
  not per-feature JS.
- Keep one source of truth for class colors and similar constants, and derive
  the paint expressions and legend from it.
- Build popup content with DOM APIs and `textContent` (see `popupContent`).
  Dataset strings are free text, so never use `setHTML` with them.
- Report map `error` events to the user only while nothing is displayed yet.
  After that, a failed basemap tile shouldn't replace the status.
- The dataset is large: 10.7 MB prepared. Avoid extra copies of the full
  collection on the main thread. Prefer filters and expressions over rebuilding
  sources.

### Data

- Do transformations (reprojection, simplification, derived fields, subsets) in
  `scripts/`, at build time. Don't do them in the browser.
- The coordinate system must be WGS84 lon/lat by the time data reaches the
  client. `prepare-data.js` refuses input whose `crs` isn't ESRI:102039; update
  that check deliberately if the source changes.
- Commit only the prepared `app/assets/data/glaciers.geojson`, which CI needs
  to build the site. Keep source datasets in gitignored `data/`. After
  changing `prepare-data.js`, regenerate and commit the output together with
  the script. Keep the file well under GitHub's 50 MB warning size.

### Verifying changes

- Run `npm run build`. It exits non-zero when a file fails to compile, but it
  still writes partial bundles to `public/`. Don't treat an existing
  `public/js/app.js` as proof the build worked.
- For UI or map changes, load the app in a browser with a real token and check
  the console. Once the data loads, the map fits to its bounds and the dots
  should cover the western US. At Mount Rainier
  (`[-121.76, 46.853]`, zoom 12) the glacier shapes should line up with the
  basemap.
