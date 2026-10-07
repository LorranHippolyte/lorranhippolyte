// Gera os assets versionados (hero) a partir de data/profile.json.
// Determinístico: rodar duas vezes produz os mesmos bytes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { hero } from './lib/svg.mjs';

const root = new URL('../', import.meta.url);
const profile = JSON.parse(readFileSync(new URL('data/profile.json', root), 'utf8'));
mkdirSync(new URL('assets/', root), { recursive: true });

for (const theme of ['dark', 'light']) {
  for (const compact of [false, true]) {
    for (const animated of [true, false]) {
      const name = `assets/hero-${theme}${compact ? '-compact' : ''}${animated ? '' : '-static'}.svg`;
      writeFileSync(new URL(name, root), hero(profile.hero, theme, { animated, compact }) + '\n');
      console.log('gerado', name);
    }
  }
}
