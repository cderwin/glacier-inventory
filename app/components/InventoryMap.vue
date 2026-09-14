<template>
  <section class="inventory">
    <div ref="map" class="inventory-map"></div>

    <div ref="panel" class="inventory-panel">
      <glacier-search
        :entries="searchEntries"
        :center="mapCenter"
        :hidden-classes="hiddenClasses"
        :disabled="!searchEntries.length"
        @select="zoomTo"
      />

      <p v-if="error" class="inventory-status inventory-status--error">
        {{ error }}
      </p>
      <p v-else-if="loading" class="inventory-status">Loading inventory…</p>
      <p v-else class="inventory-status">{{ status }}</p>

      <ul class="inventory-legend">
        <li v-for="item in legend" :key="item.label">
          <button
            type="button"
            class="inventory-legend-item"
            :class="{ 'inventory-legend-item--hidden': isHidden(item.label) }"
            :aria-pressed="isHidden(item.label) ? 'false' : 'true'"
            :title="(isHidden(item.label) ? 'Show ' : 'Hide ') + item.label"
            @click="toggleClass(item.label)"
          >
            <span class="inventory-swatch" :style="{ background: item.color }"></span>
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script>
import { MAPBOX_ACCESS_TOKEN, GLACIERS_URL } from '../config';
import GlacierSearch from './GlacierSearch.vue';

// Loaded as a global from vendor.js (see npm.static in brunch-config.js).
const mapboxgl = window.mapboxgl;

const CLASS_COLORS = {
  Glacier: '#2f80ed',
  'Perennial snowfield': '#56ccf2',
  'Buried ice': '#9b51e0'
};
const OTHER_COLOR = '#828282';

// Glaciers are mostly well under a square kilometer, so polygons are
// invisible at regional zooms. Show centroid dots until the shapes resolve.
const POLYGON_MIN_ZOOM = 9;

// Layers the legend's class toggles filter.
const GLACIER_LAYERS = ['glacier-centroids', 'glaciers-fill', 'glaciers-outline'];

const classColor = [
  'match',
  ['get', 'CLASS'],
  ...Object.keys(CLASS_COLORS).reduce((expr, name) => expr.concat(name, CLASS_COLORS[name]), []),
  OTHER_COLOR
];

// The map instance holds WebGL state and must stay out of Vue's reactivity
// system, so it lives on the component instance rather than in data().
export default {
  name: 'InventoryMap',

  components: { GlacierSearch },

  data() {
    return {
      featureCount: 0,
      loading: false,
      error: null,
      legend: Object.keys(CLASS_COLORS).map(label => ({ label, color: CLASS_COLORS[label] })),
      // Feature count per CLASS, and the classes switched off in the legend.
      classCounts: {},
      hiddenClasses: [],
      // Named features for GlacierSearch. Frozen so Vue doesn't observe them.
      searchEntries: Object.freeze([]),
      mapCenter: null
    };
  },

  computed: {
    status() {
      if (!this.hiddenClasses.length) {
        return `${this.featureCount} glacier features loaded.`;
      }
      const hidden = this.hiddenClasses.reduce((sum, name) => sum + (this.classCounts[name] || 0), 0);
      return `${this.featureCount - hidden} of ${this.featureCount} glacier features shown.`;
    }
  },

  watch: {
    hiddenClasses() {
      this.applyClassFilter();
    }
  },

  mounted() {
    if (!MAPBOX_ACCESS_TOKEN) {
      this.error = 'No Mapbox token. Rebuild with MAPBOX_ACCESS_TOKEN set.';
      return;
    }

    // Covers the style load as well as the data request.
    this.loading = true;
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    this.map = new mapboxgl.Map({
      container: this.$refs.map,
      style: 'mapbox://styles/mapbox/outdoors-v12'
    });
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
    this.map.on('error', event => {
      console.error(event.error);
      // Once glaciers are showing, a failed basemap tile isn't worth
      // replacing the status for; before that it's likely a bad token.
      if (!this.featureCount) {
        this.error = (event.error && event.error.message) || 'The map failed to load.';
      }
    });
    this.map.on('moveend', () => {
      this.mapCenter = this.map.getCenter().toArray();
    });
    this.map.on('load', () => this.load());
  },

  beforeDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  },

  methods: {
    async load() {
      // Clear map errors from before the style finished loading.
      this.error = null;
      try {
        const response = await fetch(GLACIERS_URL);
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const geojson = await response.json();
        // The component may have been destroyed while the request was open.
        if (!this.map) return;
        const classCounts = {};
        geojson.features.forEach(feature => {
          const name = feature.properties.CLASS;
          classCounts[name] = (classCounts[name] || 0) + 1;
        });
        this.classCounts = classCounts;
        this.featureCount = geojson.features.length;
        this.addLayers(geojson);
        this.map.fitBounds(geojson.bbox, { padding: 40, duration: 0 });
        this.searchEntries = buildSearchEntries(geojson.features);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    addLayers(geojson) {
      const map = this.map;

      map.addSource('glaciers', { type: 'geojson', data: geojson });
      map.addSource('glacier-centroids', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: geojson.features.map(feature => ({
            type: 'Feature',
            id: feature.id,
            geometry: {
              type: 'Point',
              coordinates: [feature.properties.X_COORD, feature.properties.Y_COORD]
            },
            properties: feature.properties
          }))
        }
      });

      map.addLayer({
        id: 'glacier-centroids',
        type: 'circle',
        source: 'glacier-centroids',
        maxzoom: POLYGON_MIN_ZOOM,
        paint: {
          'circle-color': classColor,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 8, 5],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 0.75,
          'circle-opacity': 0.85
        }
      });
      map.addLayer({
        id: 'glaciers-fill',
        type: 'fill',
        source: 'glaciers',
        minzoom: POLYGON_MIN_ZOOM,
        paint: {
          'fill-color': classColor,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.8, 0.5]
        }
      });
      map.addLayer({
        id: 'glaciers-outline',
        type: 'line',
        source: 'glaciers',
        minzoom: POLYGON_MIN_ZOOM,
        paint: {
          'line-color': classColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.75, 14, 2]
        }
      });

      // Classes may have been switched off before the data arrived.
      this.applyClassFilter();
      this.bindInteractions(['glacier-centroids', 'glaciers-fill']);
    },

    isHidden(name) {
      return this.hiddenClasses.indexOf(name) !== -1;
    },

    toggleClass(name) {
      this.hiddenClasses = this.isHidden(name)
        ? this.hiddenClasses.filter(hidden => hidden !== name)
        : this.hiddenClasses.concat(name);
    },

    applyClassFilter() {
      const map = this.map;
      // Before the layers exist, addLayers applies the filter instead.
      if (!map || !map.getLayer('glaciers-fill')) return;
      // Filter out hidden classes rather than listing visible ones, so a
      // CLASS missing from the legend is never hidden.
      const filter = this.hiddenClasses.length
        ? ['!', ['in', ['get', 'CLASS'], ['literal', this.hiddenClasses.slice()]]]
        : null;
      GLACIER_LAYERS.forEach(layer => map.setFilter(layer, filter));
    },

    // Centers the map on a search group's centroid, zoomed so all its pieces
    // are in view.
    zoomTo(group) {
      const map = this.map;
      // Keep the glacier clear of the panel in the top-left corner. Don't
      // keep that padding afterwards: it would shift the map's center, which
      // the nearest-glacier suggestions and zoom controls use.
      const panel = this.$refs.panel;
      const padding = { top: panel.offsetTop + panel.offsetHeight + 20, right: 60, bottom: 40, left: 40 };
      // The centroid is rarely the middle of the pieces' bbox, so widen the
      // bbox to be symmetric around it before working out the zoom.
      const [lon, lat] = group.centroid;
      const [west, south, east, north] = group.bbox;
      const halfWidth = Math.max(lon - west, east - lon);
      const halfHeight = Math.max(lat - south, north - lat);
      const camera = map.cameraForBounds(
        [lon - halfWidth, lat - halfHeight, lon + halfWidth, lat + halfHeight],
        { padding, maxZoom: 15 }
      );
      map.flyTo({
        center: group.centroid,
        zoom: camera ? camera.zoom : 15,
        padding,
        retainPadding: false
      });
    },

    bindInteractions(layers) {
      const map = this.map;
      let hovered = null;

      layers.forEach(layer => {
        map.on('mousemove', layer, event => {
          const feature = event.features[0];
          const target = { source: feature.source, id: feature.id };
          if (hovered && (hovered.source !== target.source || hovered.id !== target.id)) {
            map.setFeatureState(hovered, { hover: false });
          }
          hovered = target;
          map.setFeatureState(hovered, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layer, () => {
          if (hovered) map.setFeatureState(hovered, { hover: false });
          hovered = null;
          map.getCanvas().style.cursor = '';
        });

        map.on('click', layer, event => {
          new mapboxgl.Popup({ maxWidth: '280px' })
            .setLngLat(event.lngLat)
            .setDOMContent(popupContent(event.features[0].properties))
            .addTo(map);
        });
      });
    }
  }
};

// A small, frozen index of named features for GlacierSearch. Unnamed features
// (blank GLACNAME, shown as "Unnamed" in popups) can't be searched for.
function buildSearchEntries(features) {
  const entries = [];
  features.forEach(feature => {
    const props = feature.properties;
    const name = (props.GLACNAME || '').trim();
    if (!name || name.toLowerCase() === 'unnamed') return;
    entries.push(
      Object.freeze({
        id: feature.id,
        name,
        key: name.toLowerCase(),
        className: props.CLASS,
        region: props.GEO_REGION,
        areaKm2: props.AREA_KM2,
        centroid: feature.centroid,
        bbox: feature.bbox
      })
    );
  });
  return Object.freeze(entries);
}

// Built with DOM APIs rather than setHTML so dataset text is never parsed as
// markup.
function popupContent(props) {
  const root = document.createElement('div');
  root.className = 'glacier-popup';

  const title = document.createElement('strong');
  title.textContent = (props.GLACNAME || '').trim() || 'Unnamed';
  root.appendChild(title);

  const rows = [
    ['Class', props.CLASS],
    ['Area', props.AREA_KM2 != null ? `${Number(props.AREA_KM2).toFixed(3)} km²` : null],
    ['Region', props.GEO_REGION],
    ['Unit', props.UNIT_NAME],
    ['Mapped', [props.YEAR, props.SOURCE_MAT].filter(Boolean).join(' · ')],
    ['ID', props.INV_ID]
  ];

  const list = document.createElement('dl');
  rows.forEach(([label, value]) => {
    if (value == null || String(value).trim() === '') return;
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  });
  root.appendChild(list);

  return root;
}
</script>

<style>
.inventory {
  position: relative;
  flex: 1;
  min-height: 480px;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.inventory-map {
  position: absolute;
  inset: 0;
}

.inventory-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  max-width: calc(100% - 70px);
  padding: 0.5rem 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  font-size: 0.85rem;
}

.inventory-status {
  margin: 0;
  color: var(--text-muted);
}

.inventory-status--error {
  color: var(--danger);
}

.inventory-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;
}

.inventory-legend-item {
  display: inline-flex;
  align-items: center;
  margin: 0 -0.3rem;
  padding: 0.1rem 0.3rem;
  border: 0;
  border-radius: 3px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.inventory-legend-item:hover {
  background: var(--border);
}

.inventory-legend-item:focus-visible {
  outline: 2px solid var(--text-muted);
  outline-offset: 1px;
}

.inventory-legend-item--hidden {
  color: var(--text-muted);
  text-decoration: line-through;
}

.inventory-legend-item--hidden .inventory-swatch {
  opacity: 0.3;
}

.inventory-swatch {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  margin-right: 0.3rem;
  border-radius: 2px;
  vertical-align: -0.05rem;
}

/* Popups sit on the map, which stays light in dark mode. */
.glacier-popup {
  color: #16181d;
  font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
}

.glacier-popup dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.1rem 0.6rem;
  margin: 0.4rem 0 0;
}

.glacier-popup dt {
  color: #6b7280;
}

.glacier-popup dd {
  margin: 0;
}
</style>
