'use strict';

// Reprojects the glacier inventory from USA Contiguous Albers Equal Area
// (ESRI:102039) to WGS84 lon/lat, which is what Mapbox GL expects, and writes
// it into app/assets so brunch copies it to public/data/.
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

// 6 decimal places is ~0.1 m, well below the digitizing precision.
const round = n => Math.round(n * 1e6) / 1e6;

const geojson = JSON.parse(fs.readFileSync(input, 'utf8'));
const crs = geojson.crs && geojson.crs.properties && geojson.crs.properties.name;
if (crs !== SOURCE_CRS) {
  throw new Error(`Expected ${SOURCE_CRS} input, got ${crs || 'no crs'}`);
}

const bbox = [Infinity, Infinity, -Infinity, -Infinity];

function reproject(coords) {
  if (typeof coords[0] !== 'number') return coords.map(reproject);
  // Drop the (always zero) Z value.
  const [lon, lat] = toLonLat([coords[0], coords[1]]).map(round);
  bbox[0] = Math.min(bbox[0], lon);
  bbox[1] = Math.min(bbox[1], lat);
  bbox[2] = Math.max(bbox[2], lon);
  bbox[3] = Math.max(bbox[3], lat);
  return [lon, lat];
}

const features = geojson.features.map(feature => ({
  type: 'Feature',
  id: feature.id,
  geometry: {
    type: feature.geometry.type,
    coordinates: reproject(feature.geometry.coordinates)
  },
  properties: feature.properties
}));

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ type: 'FeatureCollection', bbox, features }));

const mb = (fs.statSync(output).size / 1e6).toFixed(1);
console.log(`Wrote ${features.length} features (${mb} MB) to ${path.relative(root, output)}`);
