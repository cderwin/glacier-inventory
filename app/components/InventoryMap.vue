<template>
  <section class="inventory">
    <div ref="map" class="inventory-map"></div>

    <div class="inventory-panel">
      <p v-if="error" class="inventory-status inventory-status--error">
        {{ error }}
      </p>
      <p v-else-if="loading" class="inventory-status">Loading inventory…</p>
      <p v-else class="inventory-status">
        {{ featureCount }} glacier features loaded.
      </p>

      <ul class="inventory-legend">
        <li v-for="item in legend" :key="item.label">
          <span class="inventory-swatch" :style="{ background: item.color }"></span>
          {{ item.label }}
        </li>
      </ul>
    </div>
  </section>
</template>

<script>
import { MAPBOX_ACCESS_TOKEN, GLACIERS_URL } from '../config';

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

  data() {
    return {
      featureCount: 0,
      loading: false,
      error: null,
      legend: Object.keys(CLASS_COLORS).map(label => ({ label, color: CLASS_COLORS[label] }))
    };
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
        this.featureCount = geojson.features.length;
        this.addLayers(geojson);
        this.map.fitBounds(geojson.bbox, { padding: 40, duration: 0 });
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

      this.bindInteractions(['glacier-centroids', 'glaciers-fill']);
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
