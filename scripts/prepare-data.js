'use strict';

// Reprojects the glacier inventory from USA Contiguous Albers Equal Area
// (ESRI:102039) to WGS84 lon/lat, which is what Mapbox GL expects, and
// shrinks it for the web: outlines are simplified, coordinates rounded, and
// attributes the UI doesn't use are dropped. The output is committed and
// served from app/assets/data/.
//
//   node scripts/prepare-data.js [input.geojson] [output.geojson]

const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

const root = path.resolve(__dirname, '..');
const input = process.argv[2] || path.join(root, 'data/inventory_20220929.geojson');
const output = process.argv[3] || path.join(root, 'app/assets/data/glaciers.geojson');

const SOURCE_CRS = 'ESRI:102039';
proj4.defs(
  SOURCE_CRS,
  '+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 ' +
    '+x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs'
);
const toLonLat = proj4(SOURCE_CRS, 'EPSG:4326').forward;

// Vertices within this many meters of a simplified outline are dropped. The
// outlines were traced from ~1 m imagery, so this isn't visible on the map.
const SIMPLIFY_TOLERANCE_M = 1;

// 5 decimal places is ~1 m.
const round = n => Math.round(n * 1e5) / 1e5;

// Attributes shown in the UI. Everything else is dropped.
const PROPERTIES = [
  'INV_ID',
  'GLACNAME',
  'CLASS',
  'AREA_KM2',
  'GEO_REGION',
  'UNIT_NAME',
  'YEAR',
  'SOURCE_MAT',
  'X_COORD',
  'Y_COORD'
];

const geojson = JSON.parse(fs.readFileSync(input, 'utf8'));
const crs = geojson.crs && geojson.crs.properties && geojson.crs.properties.name;
if (crs !== SOURCE_CRS) {
  throw new Error(`Expected ${SOURCE_CRS} input, got ${crs || 'no crs'}`);
}

const bbox = [Infinity, Infinity, -Infinity, -Infinity];

function squaredSegmentDistance(p, a, b) {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx || dy) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      [x, y] = b;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

// Douglas-Peucker, in the source projection's meters.
function simplify(ring) {
  const maxSquared = SIMPLIFY_TOLERANCE_M * SIMPLIFY_TOLERANCE_M;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let farthest = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const d = squaredSegmentDistance(ring[i], ring[first], ring[last]);
      if (d > farthest) {
        farthest = d;
        index = i;
      }
    }
    if (farthest > maxSquared) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

function reprojectRing(ring) {
  const lonLat = [];
  for (const point of simplify(ring)) {
    // Drop the (always zero) Z value.
    const [lon, lat] = toLonLat([point[0], point[1]]).map(round);
    const prev = lonLat[lonLat.length - 1];
    if (prev && prev[0] === lon && prev[1] === lat) continue;
    lonLat.push([lon, lat]);
  }
  return lonLat;
}

// Area centroid of a polygon, computed on the original rings in the source
// projection. ESRI:102039 is equal-area, so the result is a true centroid.
// Coordinates are taken relative to the first vertex to keep precision.
// The source's X_COORD/Y_COORD are label points, not centroids.
function polygonCentroid(rings) {
  const [ox, oy] = rings[0][0];
  let totalArea = 0;
  let momentX = 0;
  let momentY = 0;
  rings.forEach((ring, index) => {
    let area = 0;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = [ring[i][0] - ox, ring[i][1] - oy];
      const next = ring[(i + 1) % ring.length];
      const [x2, y2] = [next[0] - ox, next[1] - oy];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      mx += (x1 + x2) * cross;
      my += (y1 + y2) * cross;
    }
    // Ring winding varies; count the outline as positive and holes negative.
    const sign = (index === 0 ? 1 : -1) * Math.sign(area);
    totalArea += (sign * area) / 2;
    momentX += (sign * mx) / 6;
    momentY += (sign * my) / 6;
  });
  return toLonLat([ox + momentX / totalArea, oy + momentY / totalArea]).map(round);
}

// [west, south, east, north] of a ring.
function ringBbox(ring) {
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  ring.forEach(([lon, lat]) => {
    box[0] = Math.min(box[0], lon);
    box[1] = Math.min(box[1], lat);
    box[2] = Math.max(box[2], lon);
    box[3] = Math.max(box[3], lat);
  });
  return box;
}

let vertices = 0;
const features = geojson.features.map(feature => {
  if (feature.geometry.type !== 'Polygon') {
    throw new Error(`Feature ${feature.id}: unsupported ${feature.geometry.type}`);
  }
  // A ring needs 4 positions. Tiny holes may simplify away and are dropped;
  // the outline itself must survive.
  const [outline, ...holes] = feature.geometry.coordinates.map(reprojectRing);
  if (outline.length < 4) {
    throw new Error(`Feature ${feature.id}: outline simplified away`);
  }
  const rings = [outline, ...holes.filter(ring => ring.length >= 4)];
  vertices += rings.reduce((sum, ring) => sum + ring.length, 0);

  // Holes lie inside the outline, so its extent is the feature's. The app
  // zooms to it when a search result is chosen.
  const featureBbox = ringBbox(outline);
  bbox[0] = Math.min(bbox[0], featureBbox[0]);
  bbox[1] = Math.min(bbox[1], featureBbox[1]);
  bbox[2] = Math.max(bbox[2], featureBbox[2]);
  bbox[3] = Math.max(bbox[3], featureBbox[3]);

  const properties = {};
  PROPERTIES.forEach(name => {
    properties[name] = feature.properties[name];
  });

  return {
    type: 'Feature',
    id: feature.id,
    bbox: featureBbox,
    // Not a standard GeoJSON member; Mapbox ignores it. The glacier search
    // combines these, weighted by area, for glaciers split into pieces.
    centroid: polygonCentroid(feature.geometry.coordinates),
    geometry: { type: 'Polygon', coordinates: rings },
    properties
  };
});

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ type: 'FeatureCollection', bbox, features }));

const mb = (fs.statSync(output).size / 1e6).toFixed(1);
console.log(
  `Wrote ${features.length} features, ${vertices} vertices (${mb} MB) to ${path.relative(root, output)}`
);
