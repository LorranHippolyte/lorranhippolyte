// Gera os cards com dado vivo (versão no npm e data da última release) em out/.
// Roda na Action diária, que publica out/ na branch `output`.
// Qualquer falha de rede ou dado inesperado encerra com código 1: a Action abre uma issue
// e o último card publicado continua no ar.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { projectCard } from './lib/svg.mjs';

const root = new URL('../', import.meta.url);
const outDir = new URL(`${process.argv[2] ?? 'out'}/`, root);
const profile = JSON.parse(readFileSync(new URL('data/profile.json', root), 'utf8'));
const card = profile.cards.uiport;
const repo = process.env.CARDS_REPO || card.repo;

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': 'lorranhippolyte-profile', ...headers } });
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);
  return res.json();
}

const gh = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const [release, pkg] = await Promise.all([
  getJson(`https://api.github.com/repos/${repo}/releases/latest`, { accept: 'application/vnd.github+json', ...gh }),
  getJson(`https://registry.npmjs.org/${card.npm}/latest`),
]);

if (!/^\d+\.\d+\.\d+/.test(pkg.version ?? '')) throw new Error(`versão inesperada no npm: ${pkg.version}`);
const published = new Date(release.published_at);
if (Number.isNaN(published.getTime())) throw new Error(`data de release inválida: ${release.published_at}`);

const info = {
  version: pkg.version,
  date: published.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
};

mkdirSync(outDir, { recursive: true });
for (const theme of ['dark', 'light']) {
  writeFileSync(new URL(`uiport-${theme}.svg`, outDir), projectCard(card, info, theme) + '\n');
}
writeFileSync(new URL('uiport.json', outDir), JSON.stringify({ repo, ...info, release: release.tag_name }, null, 2) + '\n');
console.log('cards gerados:', JSON.stringify(info));
