// Converte texto em <path> SVG. SVG servido via <img> não carrega webfont,
// então a tipografia vai como contorno vetorial. Layout glifo a glifo
// (advance + kerning) porque o shaping do opentype.js falha no ccmp da Inter.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import opentype from 'opentype.js';

const require = createRequire(import.meta.url);

function load(spec) {
  const buf = readFileSync(require.resolve(spec));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

export const fonts = {
  serif: load('@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff'),
  serifItalic: load('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff'),
  sans: load('@fontsource/inter/files/inter-latin-400-normal.woff'),
  mono: load('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'),
};

function glyphsOf(font, text) {
  return [...text].map((ch) => {
    const g = font.charToGlyph(ch);
    if (!g || g.index === 0) throw new Error(`Glifo ausente para "${ch}" em ${font.names.fullName?.en ?? 'fonte'}`);
    return g;
  });
}

/** Largura do texto em px. `tracking` em em (ex.: 0.12). */
export function measure(font, text, size, tracking = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = glyphsOf(font, text);
  let w = 0;
  glyphs.forEach((g, i) => {
    w += g.advanceWidth * scale;
    if (i < glyphs.length - 1) w += font.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size;
  });
  return w;
}

/** Retorna o atributo `d` do texto posicionado na linha de base (x, y). */
export function textPath(font, text, x, y, size, { tracking = 0, align = 'left' } = {}) {
  const scale = size / font.unitsPerEm;
  const glyphs = glyphsOf(font, text);
  let cx = align === 'right' ? x - measure(font, text, size, tracking) : x;
  const parts = [];
  glyphs.forEach((g, i) => {
    const d = g.getPath(cx, y, size).toPathData(2);
    if (d.includes('NaN')) throw new Error(`Contorno inválido (NaN) no glifo "${text[i]}"`);
    if (d) parts.push(d);
    cx += g.advanceWidth * scale;
    if (i < glyphs.length - 1) cx += font.getKerningValue(g, glyphs[i + 1]) * scale + tracking * size;
  });
  return parts.join('');
}
