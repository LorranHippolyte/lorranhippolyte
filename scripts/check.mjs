// Checagem automatizada da Definition of Done do README.
// Uso: node scripts/check.mjs [--offline]
//   --offline  pula as checagens de rede (links, visibilidade de repos). É o modo da CI.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const offline = process.argv.includes('--offline');
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const readme = read('README.md');
const profile = JSON.parse(read('data/profile.json'));

const results = [];
const check = (item, name, ok, detail = '') => results.push({ item, name, ok, detail });
const manual = (item, name, detail) => results.push({ item, name, ok: null, detail });

// Item 1: estrutura e conteúdo removido
const banned = ['Sugestão: fixar', 'Aprendizado Contínuo', 'O que você vai encontrar', 'github-readme-stats', 'Desenvolvedor Front-end'];
const found = banned.filter((b) => readme.includes(b));
check(1, 'sem conteúdo removido pelo plano', found.length === 0, found.join(', '));
const sections = ['## Agora', '## Open source', '## Como eu trabalho', '## Stack em uso', '## Contato', '<summary>English summary</summary>'];
const missing = sections.filter((s) => !readme.includes(s));
check(1, 'seções aprovadas presentes', missing.length === 0, missing.join(', '));

// Coleta de URLs
const hrefs = [...readme.matchAll(/\]\(([^)\s]+)\)|href="([^"]+)"/g)].map((m) => m[1] ?? m[2]);
const imgs = [...readme.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);

// Item 4: hosts de imagem
const OUTPUT = 'https://raw.githubusercontent.com/LorranHippolyte/lorranhippolyte/output/';
const badImgs = imgs.filter((u) => !(u.startsWith(OUTPUT) || (!/^[a-z]+:/i.test(u) && existsSync(new URL(u, root)))));
check(4, 'imagens só deste repo (relativas ou branch output)', badImgs.length === 0, badImgs.join(', '));

// Item 5: <picture> com claro/escuro, movimento reduzido e alt
const pictures = [...readme.matchAll(/<picture>([\s\S]*?)<\/picture>/g)].map((m) => m[1]);
// Ordem importa: o navegador usa o primeiro <source> que casa.
const M = '(max-width: 600px)', R = '(prefers-reduced-motion: reduce)', D = '(prefers-color-scheme: dark)';
const expectedHero = [
  [`${M} and ${R} and ${D}`, 'assets/hero-dark-compact-static.svg'], [`${M} and ${R}`, 'assets/hero-light-compact-static.svg'],
  [`${M} and ${D}`, 'assets/hero-dark-compact.svg'], [M, 'assets/hero-light-compact.svg'],
  [`${R} and ${D}`, 'assets/hero-dark-static.svg'], [R, 'assets/hero-light-static.svg'], [D, 'assets/hero-dark.svg'],
];
const expectedCard = [
  [`${M} and ${D}`, `${OUTPUT}uiport-dark-compact.svg`], [M, `${OUTPUT}uiport-light-compact.svg`], [D, `${OUTPUT}uiport-dark.svg`],
];
const sourcesOf = (pic) => [...(pic ?? '').matchAll(/<source media="([^"]+)" srcset="([^"]+)">/g)].map((m) => [m[1], m[2]]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const heroPic = pictures.find((p) => p.includes('hero-'));
check(5, 'hero: claro/escuro × movimento reduzido × compacto (7 sources, ordem certa)',
  same(sourcesOf(heroPic), expectedHero) && /<img src="assets\/hero-light\.svg"/.test(heroPic ?? ''));
const cardPic = pictures.find((p) => p.includes('uiport-'));
check(5, 'card do UIport: claro/escuro × compacto (card sem animação)',
  same(sourcesOf(cardPic), expectedCard) && (cardPic ?? '').includes(`<img src="${OUTPUT}uiport-light.svg"`));
const heroFiles = readdirSync(new URL('assets/', root)).filter((f) => f.endsWith('.svg')).map((f) => `assets/${f}`);
const referenced = new Set([...expectedHero.map((e) => e[1]), 'assets/hero-light.svg']);
check(5, 'todo SVG em assets/ é usado no README', heroFiles.every((f) => referenced.has(f)) && heroFiles.length === referenced.size);
const imgTags = [...readme.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
const noAlt = imgTags.filter((t) => !/alt="[^"]{20,}"/.test(t));
check(5, 'todo <img> com alt descritivo (20+ caracteres)', imgTags.length > 0 && noAlt.length === 0, noAlt.join(' | '));

// Item 6: SVGs autocontidos
const svgFiles = ['assets', 'out'].flatMap((d) =>
  existsSync(new URL(`${d}/`, root)) ? readdirSync(new URL(`${d}/`, root)).filter((f) => f.endsWith('.svg')).map((f) => `${d}/${f}`) : []);
for (const f of svgFiles) {
  const s = read(f);
  const size = statSync(new URL(f, root)).size;
  const problems = [];
  if (/<script/i.test(s)) problems.push('script');
  if (/<text[\s>]/i.test(s)) problems.push('<text>');
  if (/<foreignObject/i.test(s)) problems.push('foreignObject');
  if (/\bhref=/i.test(s)) problems.push('href');
  if (/@import|url\(/i.test(s)) problems.push('recurso externo em CSS');
  if (/NaN/.test(s)) problems.push('NaN');
  if ((s.match(/https?:\/\//g) ?? []).length !== 1 || !s.includes('xmlns="http://www.w3.org/2000/svg"')) problems.push('URL além do xmlns');
  if (size > 150 * 1024) problems.push(`${Math.round(size / 1024)} KB`);
  check(6, `${f} autocontido e ≤150 KB (${Math.round(size / 1024)} KB)`, problems.length === 0, problems.join(', '));
}

// Item 8: afirmações rastreáveis
for (const a of profile.afirmacoes) {
  check(8, `afirmação com fonte: "${a.texto.slice(0, 48)}${a.texto.length > 48 ? '…' : ''}"`, readme.includes(a.texto) && a.fonte?.length > 10);
}

// Item 9: varredura LGPD
const corpus = [readme, read('data/profile.json'), ...svgFiles.map((f) => read(f).match(/<title[^>]*>(.*?)<\/title>/)?.[1] ?? '')].join('\n');
const lgpd = {
  CPF: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, CNPJ: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/,
  telefone: /(\+?55\s?)?\(?\b\d{2}\)?\s?9\d{4}-?\d{4}\b/, WhatsApp: /wa\.me|whatsapp/i,
  'valor em R$': /R\$\s?\d/, endereço: /\b(rua|avenida|av\.)\s+[A-ZÀ-Ú]/i,
};
for (const [label, re] of Object.entries(lgpd)) check(9, `LGPD: sem ${label}`, !re.test(corpus));
// Nomes que não podem aparecer nem neste script (ex.: fornecedor white-label): comparados por hash.
const blocked = new Set(['340c62d71a36687bc2f3df3cf6c8870bf2e4d050533d069b126efa72de2709cc']);
const words = new Set(corpus.toLowerCase().match(/[a-z0-9]+/g));
check(9, 'LGPD: sem nomes bloqueados (hash)', ![...words].some((w) => blocked.has(createHash('sha256').update(w).digest('hex'))));

// Item 12: .gitkeep removido
check(12, '.gitkeep removido', !existsSync(new URL('.gitkeep', root)));

// Itens 2 e 3: rede
if (offline) {
  manual(2, 'links respondem 200', 'pulado (--offline)');
  manual(3, 'nenhum repo privado', 'pulado (--offline)');
} else {
  const gh = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const urls = [...new Set([...hrefs, ...imgs].filter((u) => /^https?:/.test(u)))];
  for (const u of urls) {
    if (/linkedin\.com/.test(u)) { manual(2, u, 'LinkedIn bloqueia bots; URL confirmada pelo Lorran (D8)'); continue; }
    if (/npmjs\.com\/package\/([^/]+)/.test(u)) {
      const pkg = u.match(/package\/([^/?#]+)/)[1];
      const r = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
      check(2, `${u} (via registry: ${pkg})`, r.ok, String(r.status));
      continue;
    }
    let status = 0;
    try {
      const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (profile link check)' } });
      status = r.status;
    } catch (e) { status = e.cause?.code ?? 'erro'; }
    check(2, u, status === 200, String(status));
  }
  const repos = [...new Set(urls.map((u) => u.match(/^https:\/\/github\.com\/([^/]+\/[^/#?]+)/)?.[1]).filter(Boolean))];
  repos.push('LorranHippolyte/lorranhippolyte');
  for (const r of [...new Set(repos)]) {
    const res = await fetch(`https://api.github.com/repos/${r}`, { headers: { accept: 'application/vnd.github+json', ...gh } });
    const body = res.ok ? await res.json() : {};
    check(3, `repo público: ${r}`, res.ok && body.private === false, res.ok ? `private=${body.private}` : String(res.status));
  }
  for (const u of urls.filter((x) => x.startsWith(OUTPUT))) {
    const r = await fetch(u);
    const body = r.ok ? await r.text() : '';
    check(4, `${u} publicado na branch output`, r.ok && body.trimStart().startsWith('<svg'), `${r.status} ${r.headers.get('content-type') ?? ''}`);
  }
}

// Relatório
let failed = 0;
for (const r of results.sort((a, b) => a.item - b.item)) {
  const tag = r.ok === null ? 'MANUAL' : r.ok ? 'OK    ' : 'FALHOU';
  if (r.ok === false) failed++;
  console.log(`[${tag}] item ${String(r.item).padStart(2)}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\n${results.length} checagens, ${failed} falha(s).`);
process.exit(failed ? 1 : 0);
