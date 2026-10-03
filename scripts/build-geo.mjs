// Converts world-atlas (ISO numeric ids) to a TopoJSON keyed by ISO3, saved in public/data/world.json
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import countries from 'i18n-iso-countries';

const require = createRequire(import.meta.url);
const topo = JSON.parse(await readFile(require.resolve('world-atlas/countries-50m.json'), 'utf8'));
const fixes = { Kosovo: 'XKX', 'N. Cyprus': 'CYP', Somaliland: 'SOM' };
let missing = [];
for (const g of topo.objects.countries.geometries) {
  const iso3 = g.id ? countries.numericToAlpha3(g.id) : fixes[g.properties?.name];
  if (!iso3) missing.push(g.properties?.name);
  g.id = iso3 ?? null;
  g.properties = { name: g.properties?.name };
}
delete topo.objects.land;
await writeFile(new URL('../public/data/world.json', import.meta.url), JSON.stringify(topo));
console.log('unmapped:', missing.join(', '));
