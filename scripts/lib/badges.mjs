// Badges próprios: logo do pacote simple-icons (local, versionado) + texto em paths.
// Sem ícone no simple-icons → badge só com texto. Nunca usar o logo de outra marca.
import * as icons from 'simple-icons';
import { fonts, measure, textPath } from './type.mjs';
import { themes } from './svg.mjs';

const bySlug = Object.fromEntries(Object.values(icons).filter((i) => i?.slug).map((i) => [i.slug, i]));

export function icon(slug) {
  if (!slug) return null;
  const i = bySlug[slug];
  if (!i) throw new Error(`Ícone "${slug}" não existe no simple-icons`);
  return i;
}

// Contraste WCAG entre duas cores #rrggbb.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const H = 28, PAD = 10, LOGO = 14, GAP = 7, SIZE = 13;

function layout(label, withIcon) {
  const textX = withIcon ? PAD + LOGO + GAP : PAD + 1;
  const width = Math.ceil(textX + measure(fonts.sansMedium, label, SIZE) + PAD + 1);
  return { textX, width };
}

function logoPath(ic, fill) {
  // Ícones do simple-icons são 24×24; escala para LOGO px, centralizado na altura.
  const s = LOGO / 24;
  return `<path fill="${fill}" transform="translate(${PAD} ${(H - LOGO) / 2}) scale(${s})" d="${ic.path}"/>`;
}

const open = (w, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-labelledby="t"><title id="t">${esc(title)}</title>`;

/** Badge de tecnologia, chip neutro do tema; logo na cor da marca quando há contraste. */
export function techBadge(label, slug, themeName) {
  const t = themes[themeName];
  const ic = icon(slug);
  const { textX, width } = layout(label, !!ic);
  const brand = ic ? `#${ic.hex}` : null;
  const logoFill = brand && contrast(brand, t.card) >= 2.2 ? brand : t.fg;
  return [
    open(width, label),
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${H - 1}" rx="6" fill="${t.card}" stroke="${t.border}"/>`,
    ic ? logoPath(ic, logoFill) : '',
    `<path fill="${t.fg}" d="${textPath(fonts.sansMedium, label, textX, 18.5, SIZE)}"/>`,
    '</svg>',
  ].join('');
}

/** Badge social: fundo na cor da marca (escurecida para contraste AA com o branco). Um SVG serve aos dois temas. */
export function socialBadge(label, slug, color) {
  if (contrast('#ffffff', color) < 4.5) throw new Error(`Contraste insuficiente no badge ${label}: ${color}`);
  const ic = icon(slug);
  const { textX, width } = layout(label, !!ic);
  return [
    open(width, label),
    `<rect width="${width}" height="${H}" rx="6" fill="${color}"/>`,
    ic ? logoPath(ic, '#ffffff') : '',
    `<path fill="#ffffff" d="${textPath(fonts.sansMedium, label, textX, 18.5, SIZE)}"/>`,
    '</svg>',
  ].join('');
}

export const fileSlug = (label) =>
  label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
