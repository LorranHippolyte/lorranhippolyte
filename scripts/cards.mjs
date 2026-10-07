// Gera os cards com dado vivo em out/:
// - UIport: versão no npm e data da última release
// - Atividade no GitHub: contribuições dos últimos 12 meses (GraphQL) e mapa
// Roda na Action diária, que publica out/ na branch `output`.
// Qualquer falha de rede ou dado inesperado encerra com código 1: a Action abre uma issue
// e os últimos cards publicados continuam no ar.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { projectCard } from './lib/svg.mjs';
import { statsCard, streaks } from './lib/stats.mjs';

const root = new URL('../', import.meta.url);
const outDir = new URL(`${process.argv[2] ?? 'out'}/`, root);
const profile = JSON.parse(readFileSync(new URL('data/profile.json', root), 'utf8'));
const card = profile.cards.uiport;
const repo = process.env.CARDS_REPO || card.repo;
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN é obrigatório (a GraphQL do GitHub exige autenticação)');
const gh = { authorization: `Bearer ${token}` };
const tz = { timeZone: 'America/Sao_Paulo' };

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'user-agent': 'lorranhippolyte-profile', ...init.headers } });
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);
  return res.json();
}

const STATS_QUERY = `query($login: String!) { user(login: $login) { contributionsCollection {
  totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions restrictedContributionsCount
  contributionCalendar { totalContributions weeks { contributionDays { date weekday contributionCount } } } } } }`;

const [release, pkg, graph] = await Promise.all([
  getJson(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { accept: 'application/vnd.github+json', ...gh } }),
  getJson(`https://registry.npmjs.org/${card.npm}/latest`),
  getJson('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...gh },
    body: JSON.stringify({ query: STATS_QUERY, variables: { login: profile.cards.stats.login } }),
  }),
]);

// UIport
if (!/^\d+\.\d+\.\d+/.test(pkg.version ?? '')) throw new Error(`versão inesperada no npm: ${pkg.version}`);
const published = new Date(release.published_at);
if (Number.isNaN(published.getTime())) throw new Error(`data de release inválida: ${release.published_at}`);
const info = { version: pkg.version, date: published.toLocaleDateString('pt-BR', tz) };

// Atividade
if (graph.errors?.length) throw new Error(`GraphQL: ${graph.errors.map((e) => e.message).join('; ')}`);
const cc = graph.data?.user?.contributionsCollection;
if (!cc) throw new Error('GraphQL sem contributionsCollection');
const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays)
  .map((d) => ({ date: d.date, weekday: d.weekday, count: d.contributionCount }));
if (days.length < 360) throw new Error(`calendário incompleto: ${days.length} dias`);
const stats = {
  total: cc.contributionCalendar.totalContributions,
  commits: cc.totalCommitContributions,
  prs: cc.totalPullRequestContributions,
  reviews: cc.totalPullRequestReviewContributions,
  restricted: cc.restrictedContributionsCount,
  ...streaks(days),
  days,
  updated: new Date().toLocaleDateString('pt-BR', tz),
};

mkdirSync(outDir, { recursive: true });
const out = (name, svg) => writeFileSync(new URL(name, outDir), svg + '\n');
for (const theme of ['dark', 'light']) {
  for (const compact of [false, true]) {
    const sfx = compact ? '-compact' : '';
    out(`uiport-${theme}${sfx}.svg`, projectCard(card, info, theme, { compact }));
    for (const animated of [true, false]) {
      out(`stats-${theme}${sfx}${animated ? '' : '-static'}.svg`, statsCard(profile.cards.stats, stats, theme, { animated, compact }));
    }
  }
}
const { days: _omit, ...summary } = stats;
writeFileSync(new URL('cards.json', outDir), JSON.stringify({ uiport: { repo, ...info, release: release.tag_name }, stats: summary }, null, 2) + '\n');
console.log('cards gerados:', JSON.stringify({ uiport: info, stats: summary }));
