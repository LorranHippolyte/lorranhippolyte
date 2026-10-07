// Peças SVG do perfil: hero (animado ou estático) e card de projeto,
// em layout largo (desktop) e compacto (telas até 600 px).
// Regras: sem <script>, sem recurso externo, sem <text>. Tudo vira <path>.
import { fonts, measure, textPath } from './type.mjs';

export const themes = {
  dark: { fg: '#e6edf3', fg2: '#c9d1d9', muted: '#9198a1', faint: '#3d444d', accent: '#00e0bb', card: '#151b23', border: '#3d444d' },
  light: { fg: '#1f2328', fg2: '#31373d', muted: '#59636e', faint: '#d1d9e0', accent: '#08806f', card: '#f6f8fa', border: '#d1d9e0' },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const open = (w, h, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t"><title id="t">${esc(title)}</title>`;

const HERO_MOTION = `<style>
.m{animation:up .8s cubic-bezier(.2,.7,.2,1) both}
.d1{animation-delay:.05s}.d2{animation-delay:.2s}.d3{animation-delay:.45s}.d4{animation-delay:.6s}.d5{animation-delay:.75s}
.r{stroke-dasharray:1000;animation:draw 1.1s cubic-bezier(.6,0,.2,1) .8s both}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.m,.r{animation:none}}
</style>`;

/** Maior tamanho (em passos de 2) em que `fn(size)` cabe em `max`. */
function fit(start, max, fn) {
  let size = start;
  while (fn(size) > max) size -= 2;
  return size;
}

export function hero(data, themeName, { animated, compact = false }) {
  const t = themes[themeName];
  const cls = (c) => (animated ? ` class="${c}"` : '');
  const [nome1, nome2] = data.nome;
  const parts = [];

  let W, H, eyebrowSize, tese, teseSize, teseY, teseLead, ruleY;
  if (!compact) {
    W = 1000;
    eyebrowSize = 17;
    const size = fit(136, W - 8, (s) => measure(fonts.serif, nome1, s) + s * 0.24 + measure(fonts.serifItalic, nome2, s));
    const x2 = measure(fonts.serif, nome1, size) + size * 0.24;
    parts.push(`<g${cls('m d2')} fill="${t.fg}"><path d="${textPath(fonts.serif, nome1, 0, 188, size)}"/><path d="${textPath(fonts.serifItalic, nome2, x2, 188, size)}"/></g>`);
    tese = data.tese; teseSize = 31; teseY = 258; teseLead = 44;
  } else {
    W = 600;
    eyebrowSize = 19;
    const size = fit(150, W - 8, (s) => Math.max(measure(fonts.serif, nome1, s), measure(fonts.serifItalic, nome2, s)));
    parts.push(`<g${cls('m d2')} fill="${t.fg}"><path d="${textPath(fonts.serif, nome1, 0, 92 + size * 0.78, size)}"/><path d="${textPath(fonts.serifItalic, nome2, 0, 92 + size * 1.66, size)}"/></g>`);
    tese = data.teseCompacta; teseSize = fit(34, W - 6, (s) => Math.max(...tese.map((l) => measure(fonts.sans, l, s, -0.005)))); teseY = 92 + size * 1.66 + 82; teseLead = 46;
  }
  tese.forEach((line, i) => {
    parts.push(`<path${cls(`m d${3 + i}`)} fill="${t.fg2}" d="${textPath(fonts.sans, line, 2, teseY + i * teseLead, teseSize, { tracking: -0.005 })}"/>`);
  });
  ruleY = Math.round(teseY + (tese.length - 1) * teseLead + 42);
  H = ruleY + 16;

  return [
    open(W, H, data.alt),
    animated ? HERO_MOTION : '',
    `<g${cls('m d1')}><rect x="0" y="${37 + (eyebrowSize - 17) * 0.5}" width="9" height="9" fill="${t.accent}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, data.eyebrow, 24, 46 + (eyebrowSize - 17) * 0.5, eyebrowSize, { tracking: 0.12 })}"/></g>`,
    ...parts,
    `<line x1="0" y1="${ruleY}" x2="${W}" y2="${ruleY}" stroke="${t.faint}" stroke-width="1"/>`,
    `<line${cls('r')} x1="0" y1="${ruleY}" x2="${compact ? 120 : 168}" y2="${ruleY}" stroke="${t.accent}" stroke-width="2"${animated ? ' pathLength="1000"' : ''}/>`,
    '</svg>',
  ].join('');
}

export function projectCard(card, info, themeName, { compact = false } = {}) {
  const t = themes[themeName];
  const title = `${card.titulo}. ${card.rotulo.replace(/\s+·\s+/g, ', ').toLowerCase()}. Versão ${info.version} no npm, licença ${card.licenca}, última release em ${info.date}.`;
  const meta = `NPM · ${card.licenca}`;
  const release = `última release ${info.date}`;

  if (!compact) {
    const W = 1000, H = 210, R = 960;
    return [
      open(W, H, title),
      `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${t.card}" stroke="${t.border}"/>`,
      `<rect x="40" y="47" width="9" height="9" fill="${t.accent}"/>`,
      `<path fill="${t.muted}" d="${textPath(fonts.mono, card.rotulo, 62, 56, 16, { tracking: 0.12 })}"/>`,
      `<path fill="${t.fg}" d="${textPath(fonts.serif, card.titulo, 38, 158, 84)}"/>`,
      `<path fill="${t.muted}" d="${textPath(fonts.mono, meta, R, 56, 16, { tracking: 0.12, align: 'right' })}"/>`,
      `<path fill="${t.fg}" d="${textPath(fonts.mono, `v${info.version}`, R, 128, 46, { align: 'right' })}"/>`,
      `<path fill="${t.muted}" d="${textPath(fonts.mono, release, R, 164, 16, { align: 'right' })}"/>`,
      '</svg>',
    ].join('');
  }

  const W = 600, H = 270, R = 564;
  return [
    open(W, H, title),
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${t.card}" stroke="${t.border}"/>`,
    `<rect x="36" y="44" width="10" height="10" fill="${t.accent}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, card.rotulo, 60, 54, 20, { tracking: 0.1 })}"/>`,
    `<path fill="${t.fg}" d="${textPath(fonts.serif, card.titulo, 34, 158, 92)}"/>`,
    `<path fill="${t.fg}" d="${textPath(fonts.mono, `v${info.version}`, R, 156, 44, { align: 'right' })}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, meta, 36, 226, 20, { tracking: 0.1 })}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, release, R, 226, 20, { align: 'right' })}"/>`,
    '</svg>',
  ].join('');
}
