// Gera os assets versionados (hero e badges) a partir de data/profile.json
// e reescreve os blocos gerados do README (entre os marcadores <!-- x:start --> e <!-- x:end -->).
// Determinístico: rodar duas vezes produz os mesmos bytes.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { hero } from './lib/svg.mjs';
import { techBadge, socialBadge, fileSlug } from './lib/badges.mjs';

const root = new URL('../', import.meta.url);
const profile = JSON.parse(readFileSync(new URL('data/profile.json', root), 'utf8'));
const write = (name, svg) => { writeFileSync(new URL(name, root), svg + '\n'); console.log('gerado', name); };

mkdirSync(new URL('assets/', root), { recursive: true });
for (const theme of ['dark', 'light']) {
  for (const compact of [false, true]) {
    for (const animated of [true, false]) {
      write(`assets/hero-${theme}${compact ? '-compact' : ''}${animated ? '' : '-static'}.svg`, hero(profile.hero, theme, { animated, compact }));
    }
  }
}

// Badges: a pasta é recriada para não sobrar arquivo órfão.
rmSync(new URL('assets/badges/', root), { recursive: true, force: true });
mkdirSync(new URL('assets/badges/', root), { recursive: true });

const social = profile.social.map(({ nome, url, icone, cor }) => {
  const file = `assets/badges/social-${fileSlug(nome)}.svg`;
  write(file, socialBadge(nome, icone, cor));
  return `<a href="${url}"><img src="${file}" height="28" alt="${nome}"></a>`;
});

const stack = profile.stack.grupos.map(({ nome, itens }) => {
  const pics = itens.map(([label, slug]) => {
    const base = `assets/badges/${fileSlug(label)}`;
    for (const theme of ['dark', 'light']) write(`${base}-${theme}.svg`, techBadge(label, slug, theme));
    return `<picture><source media="(prefers-color-scheme: dark)" srcset="${base}-dark.svg"><img src="${base}-light.svg" height="28" alt="${label}"></picture>`;
  });
  return `**${nome}**\n\n<p>\n${pics.join('\n')}\n</p>`;
});

function replaceBlock(text, name, body) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(text)) throw new Error(`Marcador ${name} ausente no README`);
  return text.replace(re, (_, a, b) => `${a}\n${body}\n${b}`);
}

const readmeUrl = new URL('README.md', root);
let readme = readFileSync(readmeUrl, 'utf8');
readme = replaceBlock(readme, 'social', `<p>\n${social.join('\n')}\n</p>`);
readme = replaceBlock(readme, 'stack', stack.join('\n\n'));
writeFileSync(readmeUrl, readme);
console.log('README: blocos social e stack atualizados');
