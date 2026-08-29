import { mkdir, writeFile } from 'node:fs/promises';

const SOURCES = [
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson'
];

const outputUrl = new URL('../generated/world/world-map.js', import.meta.url);

function roundCoordinates(value) {
  if (typeof value === 'number') return Math.round(value * 1000) / 1000;
  if (Array.isArray(value)) return value.map(roundCoordinates);
  return value;
}

async function downloadWorldMap() {
  let lastError;
  for (const url of SOURCES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'Msar-Neon-World-Map-Builder/1.0' }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = await response.json();
      if (!Array.isArray(payload?.features) || payload.features.length < 150) {
        throw new Error('Natural Earth response did not contain enough country features.');
      }
      return payload;
    } catch (error) {
      lastError = error;
      console.warn(`World map source failed: ${url}`, error?.message || error);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Unable to download world borders: ${lastError?.message || 'unknown error'}`);
}

const source = await downloadWorldMap();
const compact = {
  type: 'FeatureCollection',
  features: source.features
    .filter(feature => feature?.geometry?.coordinates)
    .map(feature => {
      const properties = feature.properties || {};
      const iso3 = String(properties.ISO_A3 || properties.ADM0_A3 || feature.id || '').toUpperCase();
      return {
        type: 'Feature',
        id: iso3,
        properties: {
          ISO_A3: iso3,
          NAME_AR: properties.NAME_AR || '',
          NAME_EN: properties.NAME_EN || properties.ADMIN || properties.NAME || ''
        },
        geometry: {
          type: feature.geometry.type,
          coordinates: roundCoordinates(feature.geometry.coordinates)
        }
      };
    })
};

await mkdir(new URL('../generated/world/', import.meta.url), { recursive: true });
const output = `// Generated from Natural Earth 1:110m during build.\nexport const WORLD_COUNTRY_BORDERS = ${JSON.stringify(compact)};\n`;
await writeFile(outputUrl, output, 'utf8');
console.log(`World map built: ${compact.features.length} country/territory border features.`);
