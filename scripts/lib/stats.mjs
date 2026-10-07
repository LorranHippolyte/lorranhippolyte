// Card de atividade no GitHub: números dos últimos 12 meses + mapa de contribuições.
// Dados vêm da GraphQL (scripts/cards.mjs); aqui só cálculo e desenho.
import { fonts, measure, textPath } from './type.mjs';
import { themes } from './svg.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const fmt = (n) => n.toLocaleString('pt-BR');

/** Sequência atual (hoje sem contribuição ainda não quebra) e maior sequência na janela. */
export function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i].count > 0; i--) current++;
  return { current, longest };
}

/** 4 níveis por quartis dos dias com contribuição, como o calendário do GitHub. */
function levels(days) {
  const nz = days.map((d) => d.count).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] ?? 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  return (c) => (c === 0 ? 0 : c <= cuts[0] ? 1 : c <= cuts[1] ? 2 : c <= cuts[2] ? 3 : 4);
}

const MOTION = `<style>
.m{animation:up .7s cubic-bezier(.2,.7,.2,1) both}
.w{animation:fade .5s ease-out both}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.m,.w{animation:none}}
</style>`;

export function statsCard(card, s, themeName, { animated, compact = false }) {
  const t = themes[themeName];
  const empty = themeName === 'dark' ? '#212830' : '#eceff2';
  const opacity = [0, 0.35, 0.55, 0.78, 1];
  const level = levels(s.days);

  const items = [
    [fmt(s.total), 'CONTRIBUIÇÕES', ''],
    [fmt(s.commits), 'COMMITS PÚBLICOS', ''],
    [fmt(s.prs), 'PRS PÚBLICOS', ''],
    [fmt(s.reviews), 'REVIEWS PÚBLICOS', ''],
    [fmt(s.current), 'SEQUÊNCIA ATUAL', s.current === 1 ? 'dia' : 'dias'],
    [fmt(s.longest), 'MAIOR SEQUÊNCIA', s.longest === 1 ? 'dia' : 'dias'],
  ];

  const W = compact ? 600 : 1000, X = compact ? 36 : 40, inner = W - 2 * X;
  const cols = compact ? 3 : 6;
  const colW = inner / cols;
  const numSize = compact ? 38 : 36, labSize = compact ? 14 : 12, eyebrow = compact ? 18 : 15;
  const rowH = compact ? 92 : 0;
  const firstNumY = compact ? 128 : 122;

  const parts = [];
  items.forEach(([num, label, unit], i) => {
    const cx = X + (i % cols) * colW;
    const ny = firstNumY + Math.floor(i / cols) * rowH;
    const g = [`<path fill="${t.fg}" d="${textPath(fonts.mono, num, cx, ny, numSize)}"/>`];
    if (unit) g.push(`<path fill="${t.muted}" d="${textPath(fonts.sans, unit, cx + measure(fonts.mono, num, numSize) + 6, ny, compact ? 18 : 16)}"/>`);
    g.push(`<path fill="${t.muted}" d="${textPath(fonts.mono, label, cx, ny + (compact ? 28 : 26), labSize, { tracking: 0.08 })}"/>`);
    parts.push(`<g${animated ? ` class="m" style="animation-delay:${(0.1 + i * 0.06).toFixed(2)}s"` : ''}>${g.join('')}</g>`);
  });

  let noteY = firstNumY + Math.floor((items.length - 1) / cols) * rowH + (compact ? 58 : 54);
  if (s.restricted > 0) {
    parts.push(`<path fill="${t.muted}" d="${textPath(fonts.sans, `Inclui ${fmt(s.restricted)} contribuições em repositórios privados.`, X, noteY, compact ? 17 : 14)}"/>`);
    noteY += compact ? 20 : 16;
  }

  // Mapa: colunas = semanas (domingo no topo), como o GitHub.
  const weeks = [];
  s.days.forEach((d) => { if (!weeks.length || d.weekday === 0) weeks.push([]); weeks.at(-1).push(d); });
  const step = inner / weeks.length, cell = Math.max(4, step - (compact ? 2 : 3));
  const mapY = noteY + (compact ? 18 : 18);
  const map = weeks.map((w, wi) => {
    const rects = w.map((d) => {
      const lv = level(d.count);
      const fill = lv === 0 ? empty : t.accent;
      const op = lv === 0 ? '' : ` fill-opacity="${opacity[lv]}"`;
      return `<rect x="${(X + wi * step).toFixed(2)}" y="${(mapY + d.weekday * step).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="${compact ? 1.5 : 2.5}" fill="${fill}"${op}/>`;
    }).join('');
    return animated ? `<g class="w" style="animation-delay:${(0.35 + wi * 0.018).toFixed(3)}s">${rects}</g>` : rects;
  }).join('');
  const H = Math.ceil(mapY + 7 * step + (compact ? 30 : 32));

  const title = `Atividade no GitHub de ${card.login} nos últimos 12 meses: ${fmt(s.total)} contribuições${s.restricted > 0 ? ` (${fmt(s.restricted)} em repositórios privados)` : ''}, ${fmt(s.commits)} commits, ${fmt(s.prs)} pull requests e ${fmt(s.reviews)} reviews públicos; sequência atual de ${s.current} e maior de ${s.longest} dias. Atualizado em ${s.updated}.`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t"><title id="t">${esc(title)}</title>`,
    animated ? MOTION : '',
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${t.card}" stroke="${t.border}"/>`,
    `<rect x="${X}" y="${compact ? 40 : 38}" width="${compact ? 10 : 9}" height="${compact ? 10 : 9}" fill="${t.accent}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, card.rotulo, X + 22, compact ? 50 : 47, eyebrow, { tracking: 0.1 })}"/>`,
    compact ? '' : `<path fill="${t.muted}" d="${textPath(fonts.mono, `atualizado em ${s.updated}`, W - X, 47, 14, { align: 'right' })}"/>`,
    ...parts,
    map,
    '</svg>',
  ].join('');
}
