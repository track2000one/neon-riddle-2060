import { WORLD_COUNTRY_BORDERS } from '../../generated/world/world-map.js';

const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';
const previousFetch = globalThis.fetch?.bind(globalThis);

if (!globalThis.__NEON_WORLD_LOCAL_BORDERS__) {
  globalThis.__NEON_WORLD_LOCAL_BORDERS__ = true;
  globalThis.fetch = async function neonWorldLocalBordersFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input || '');
    if (url === GEOJSON_URL) {
      return new Response(JSON.stringify(WORLD_COUNTRY_BORDERS), {
        status: 200,
        headers: {
          'Content-Type': 'application/geo+json; charset=utf-8',
          'X-Neon-Source': 'bundled-natural-earth-110m'
        }
      });
    }
    if (!previousFetch) throw new TypeError('Fetch API is unavailable');
    return previousFetch(input, init);
  };
}
