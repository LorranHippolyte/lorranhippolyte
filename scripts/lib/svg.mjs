// Peças SVG do perfil: hero (animado ou estático) e card de projeto.
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
.d1{animation-delay:.05s}.d2{animation-delay:.2s}.d3{animation-delay:.45s}.d4{animation-delay:.6s}
.r{stroke-dasharray:1000;animation:draw 1.1s cubic-bezier(.6,0,.2,1) .7s both}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.m,.r{animation:none}}
</style>`;

export function hero(data, themeName, { animated }) {
  const t = themes[themeName];
  const W = 1000, H = 360;
  const cls = (c) => (animated ? ` class="${c}"` : '');

  // Nome: "Lorran" romano + "Hippolyte" itálico, reduzido até caber.
  let size = 136;
  const gap = () => size * 0.24;
  const width = () => measure(fonts.serif, data.nome[0], size) + gap() + measure(fonts.serifItalic, data.nome[1], size);
  while (width() > W - 8) size -= 2;
  const first = textPath(fonts.serif, data.nome[0], 0, 188, size);
  const second = textPath(fonts.serifItalic, data.nome[1], measure(fonts.serif, data.nome[0], size) + gap(), 188, size);

  return [
    open(W, H, data.alt),
    animated ? HERO_MOTION : '',
    `<g${cls('m d1')}><rect x="0" y="37" width="9" height="9" fill="${t.accent}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, data.eyebrow, 24, 46, 17, { tracking: 0.12 })}"/></g>`,
    `<g${cls('m d2')} fill="${t.fg}"><path d="${first}"/><path d="${second}"/></g>`,
    `<path${cls('m d3')} fill="${t.fg2}" d="${textPath(fonts.sans, data.tese[0], 2, 258, 31, { tracking: -0.005 })}"/>`,
    `<path${cls('m d4')} fill="${t.fg2}" d="${textPath(fonts.sans, data.tese[1], 2, 302, 31, { tracking: -0.005 })}"/>`,
    `<line x1="0" y1="344" x2="${W}" y2="344" stroke="${t.faint}" stroke-width="1"/>`,
    `<line${cls('r')} x1="0" y1="344" x2="168" y2="344" stroke="${t.accent}" stroke-width="2"${animated ? ' pathLength="1000"' : ''}/>`,
    '</svg>',
  ].join('');
}

export function projectCard(card, info, themeName) {
  const t = themes[themeName];
  const W = 1000, H = 210, R = 960;
  const title = `${card.titulo}. ${card.rotulo.replace(/\s+·\s+/g, ', ').toLowerCase()}. Versão ${info.version} no npm, licença ${card.licenca}, última release em ${info.date}.`;
  return [
    open(W, H, title),
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="${t.card}" stroke="${t.border}"/>`,
    `<rect x="40" y="47" width="9" height="9" fill="${t.accent}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, card.rotulo, 62, 56, 16, { tracking: 0.12 })}"/>`,
    `<path fill="${t.fg}" d="${textPath(fonts.serif, card.titulo, 38, 158, 84)}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, `NPM · ${card.licenca}`, R, 56, 16, { tracking: 0.12, align: 'right' })}"/>`,
    `<path fill="${t.fg}" d="${textPath(fonts.mono, `v${info.version}`, R, 128, 46, { align: 'right' })}"/>`,
    `<path fill="${t.muted}" d="${textPath(fonts.mono, `última release ${info.date}`, R, 164, 16, { align: 'right' })}"/>`,
    '</svg>',
  ].join('');
}
