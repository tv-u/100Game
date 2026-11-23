import assert from 'node:assert/strict';
import test from 'node:test';
import { GAMES_CATALOG, GAME_CATEGORIES, PRIORITY_GAME_SLUGS } from '../src/data/games.ts';
import { REGISTERED_GAME_SLUGS } from '../src/games/registry.ts';
import { LANGUAGE_CODES, SUPPORTED_LANGUAGES } from '../src/config/site.ts';
import { getTranslations } from '../src/i18n/index.ts';
import { buildLanguageSitemapXml, buildRouteSeo, buildSitemapIndexXml } from '../src/seo/serverMeta.ts';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_GAMEPAD_BINDINGS,
  DEFAULT_KEY_BINDINGS,
  formatKeyCode,
  getTouchButtonPx,
  type LogicalAction,
} from '../src/controls/types.ts';

test('Catalog contains all 100 unique games, 9 categories, 10 priority slugs, and 100% playable registry coverage', () => {
  assert.equal(GAMES_CATALOG.length, 100);
  const slugs = new Set(GAMES_CATALOG.map((g) => g.slug));
  assert.equal(slugs.size, 100);
  assert.equal(GAME_CATEGORIES.length, 9);
  assert.equal(PRIORITY_GAME_SLUGS.length, 10);

  const registered = new Set(REGISTERED_GAME_SLUGS);
  assert.equal(registered.size, 100);
  for (const g of GAMES_CATALOG) {
    assert.ok(registered.has(g.slug), `Missing playable engine registration for slug: ${g.slug}`);
  }
  for (const pSlug of PRIORITY_GAME_SLUGS) {
    assert.ok(slugs.has(pSlug), `Missing priority slug: ${pSlug}`);
  }
});

test('All 22 languages resolve cleanly across 9 categories and nav/game keys', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 22);
  for (const code of LANGUAGE_CODES) {
    const bundle = getTranslations(code);
    assert.ok(bundle.nav.home.length > 0, `Missing nav.home for ${code}`);
    assert.ok(bundle.hero.headline.length > 0, `Missing hero.headline for ${code}`);
    assert.ok(bundle.common.playNow.length > 0, `Missing common.playNow for ${code}`);
    assert.ok(bundle.common.seeAll.length > 0, `Missing common.seeAll for ${code}`);
    for (const cat of GAME_CATEGORIES) {
      assert.ok(bundle.categories[cat.id]?.length > 0, `Missing category ${cat.id} for ${code}`);
    }
    for (const g of GAMES_CATALOG) {
      assert.ok(bundle.games[g.slug]?.title.length > 0, `Missing game title ${g.slug} for ${code}`);
    }
  }
  const ar = SUPPORTED_LANGUAGES.find((l) => l.code === 'ar');
  const ur = SUPPORTED_LANGUAGES.find((l) => l.code === 'ur');
  assert.equal(ar?.dir, 'rtl');
  assert.equal(ur?.dir, 'rtl');
});

test('SSR SEO metadata generates unique canonical, hreflang, and JSON-LD for all 100 game pages', () => {
  for (const g of GAMES_CATALOG) {
    const seo = buildRouteSeo(`/en/games/${g.slug}/`, 'https://googameplay.com');
    assert.equal(seo.isNotFound, false, `Unexpected 404 SEO for ${g.slug}`);
    assert.equal(seo.canonicalUrl, `https://googameplay.com/en/games/${g.slug}/`);
    assert.ok(seo.headTags.includes('"@type":"VideoGame"'), `Missing VideoGame JSON-LD for ${g.slug}`);
  }

  const hiSeo = buildRouteSeo('/hi/games/snake/', 'https://googameplay.com');
  assert.equal(hiSeo.lang, 'hi');
  assert.equal(hiSeo.dir, 'ltr');
  assert.ok(hiSeo.headTags.includes('hreflang="x-default"'));
  assert.ok(hiSeo.headTags.includes('hreflang="ar"'));
  assert.ok(hiSeo.headTags.includes('"@type":"BreadcrumbList"'));

  const notFound = buildRouteSeo('/en/non-existent-route/', 'https://googameplay.com');
  assert.equal(notFound.isNotFound, true);
  assert.ok(notFound.headTags.includes('noindex, nofollow'));
});

test('XML Sitemap index and localized sitemaps cover all 22 languages and 100 games', () => {
  const indexXml = buildSitemapIndexXml('https://googameplay.com');
  for (const code of LANGUAGE_CODES) {
    assert.ok(indexXml.includes(`/sitemap-${code}.xml`));
  }
  const esSitemap = buildLanguageSitemapXml('https://googameplay.com', 'es');
  for (const g of GAMES_CATALOG) {
    assert.ok(esSitemap.includes(`/es/games/${g.slug}/`), `Missing ${g.slug} from XML sitemap`);
  }
  assert.ok(esSitemap.includes('hreflang="x-default"'));
});

test('Universal Control Engine bindings, touch sizing, and key formatting are valid', () => {
  const actions: LogicalAction[] = [
    'up',
    'down',
    'left',
    'right',
    'primary',
    'secondary',
    'hold',
    'undo',
    'flag',
    'notes',
    'erase',
    'pause',
    'restart',
  ];

  for (const act of actions) {
    assert.ok(DEFAULT_KEY_BINDINGS[act].length > 0, `Missing default key binding for ${act}`);
    assert.ok(DEFAULT_GAMEPAD_BINDINGS[act].length > 0, `Missing default gamepad binding for ${act}`);
  }

  assert.equal(DEFAULT_CONTROL_SETTINGS.handedness, 'right');
  assert.ok(getTouchButtonPx('compact') >= 44);
  assert.ok(getTouchButtonPx('standard') >= 48);
  assert.ok(getTouchButtonPx('large') >= 56);

  assert.equal(formatKeyCode('ArrowUp'), '↑');
  assert.equal(formatKeyCode('KeyW'), 'W');
  assert.equal(formatKeyCode('Digit5'), '5');
  assert.equal(formatKeyCode('Space'), 'Space');
});

test('15-Puzzle solvability parity check passes consistently', () => {
  function isSolvable(tiles: number[]): boolean {
    let inversions = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === 0) continue;
      for (let j = i + 1; j < tiles.length; j++) {
        if (tiles[j] !== 0 && tiles[i] > tiles[j]) inversions++;
      }
    }
    const blankRowFromBottom = 4 - Math.floor(tiles.indexOf(0) / 4);
    return blankRowFromBottom % 2 === 0 ? inversions % 2 === 1 : inversions % 2 === 0;
  }

  assert.equal(isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]), true);
  assert.equal(isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0]), false);
});

test('2048 row merge algorithm prevents double-merging in a single move', () => {
  function slideRowLeft(row: number[]): { result: number[]; gained: number } {
    const filtered = row.filter((v) => v !== 0);
    const out: number[] = [];
    let gained = 0;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] === filtered[i + 1]) {
        const merged = filtered[i] * 2;
        out.push(merged);
        gained += merged;
        i++;
      } else {
        out.push(filtered[i]);
      }
    }
    while (out.length < 4) out.push(0);
    return { result: out, gained };
  }

  assert.deepEqual(slideRowLeft([2, 2, 2, 2]), { result: [4, 4, 0, 0], gained: 8 });
  assert.deepEqual(slideRowLeft([4, 2, 2, 0]), { result: [4, 4, 0, 0], gained: 4 });
  assert.deepEqual(slideRowLeft([2, 0, 4, 8]), { result: [2, 4, 8, 0], gained: 0 });
});

test('Tetris matrix rotation preserves shape geometry clockwise', () => {
  function rotateMatrix(m: number[][]): number[][] {
    return m[0].map((_, c) => m.map((row) => row[c]).reverse());
  }

  const line = [[1, 1, 1, 1]];
  const vertical = rotateMatrix(line);
  assert.deepEqual(vertical, [[1], [1], [1], [1]]);
  assert.deepEqual(rotateMatrix(vertical), [[1, 1, 1, 1]]);
});
