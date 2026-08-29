import worldTopology from 'world-atlas/countries-110m.json';
import { feature as topoFeature } from 'topojson-client';

const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';
const previousFetch = globalThis.fetch?.bind(globalThis);

const atlasObject = worldTopology?.objects?.countries;
const atlasGeoJson = atlasObject
  ? topoFeature(worldTopology, atlasObject)
  : { type: 'FeatureCollection', features: [] };

const WORLD_COUNTRY_BORDERS = {
  type: 'FeatureCollection',
  features: (atlasGeoJson.features || []).map(item => ({
    type: 'Feature',
    id: String(item.id || ''),
    properties: {
      name: item.properties?.name || '',
      NAME_EN: item.properties?.name || ''
    },
    geometry: item.geometry
  }))
};

if (!globalThis.__NEON_WORLD_LOCAL_BORDERS__) {
  globalThis.__NEON_WORLD_LOCAL_BORDERS__ = true;
  globalThis.fetch = async function neonWorldLocalBordersFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input || '');
    if (url === GEOJSON_URL) {
      return new Response(JSON.stringify(WORLD_COUNTRY_BORDERS), {
        status: 200,
        headers: {
          'Content-Type': 'application/geo+json; charset=utf-8',
          'X-Neon-Source': 'bundled-world-atlas-110m'
        }
      });
    }
    if (!previousFetch) throw new TypeError('Fetch API is unavailable');
    return previousFetch(input, init);
  };
}
