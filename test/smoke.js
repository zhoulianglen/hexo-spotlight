'use strict';

/* Minimal smoke test: mock just enough of the Hexo API to confirm the plugin
   registers its generator + injectors, produces a valid index, emits the bundled
   assets, and resolves i18n strings. Run with `npm test`. */

const assert = require('assert');
const path = require('path');

function makePost(title, content, dateStr) {
  return {
    title: title,
    content: content,
    path: title.toLowerCase().replace(/\s+/g, '-') + '/',
    date: { format: function () { return dateStr; }, valueOf: function () { return new Date(dateStr).getTime(); } }
  };
}

function makeHexo(language) {
  const generators = {};
  const injectors = {};
  const helpers = {};
  return {
    config: { root: '/', language: language },
    theme: { config: {} },
    extend: {
      generator: { register: function (name, fn) { generators[name] = fn; } },
      injector: { register: function (entry, fn) { (injectors[entry] = injectors[entry] || []).push(fn); } },
      helper: { register: function (name, fn) { helpers[name] = fn; } }
    },
    _generators: generators,
    _injectors: injectors,
    _helpers: helpers
  };
}

function run(language, label) {
  // Fresh require each time so index.js re-reads config off the mock hexo.
  delete require.cache[require.resolve('../index.js')];
  delete require.cache[require.resolve('../lib/generator.js')];
  delete require.cache[require.resolve('../lib/injector.js')];
  delete require.cache[require.resolve('../lib/helper.js')];

  const hexo = makeHexo(language);
  hexo.config.spotlight = { content: true, highlightColor: '#e0567a' };
  global.hexo = hexo;
  require('../index.js');

  // Generator registered.
  assert.ok(hexo._generators.spotlight_index, 'spotlight_index generator registered');

  const locals = {
    posts: { toArray: function () { return [makePost('Hello World', '<p>The quick brown fox</p>', '2026.01.01'), makePost('Second Post', '<p>jumps over the lazy dog</p>', '2026.02.02')]; } },
    pages: { toArray: function () { return []; } }
  };
  const out = hexo._generators.spotlight_index(locals);

  const indexFile = out.find(function (o) { return o.path === 'search.json'; });
  assert.ok(indexFile, 'search.json emitted');
  const data = JSON.parse(indexFile.data);
  assert.strictEqual(data.length, 2, 'two posts indexed');
  // Newest first: "Second Post" (Feb) sorts ahead of "Hello World" (Jan).
  assert.strictEqual(data[0].title, 'Second Post', 'sorted newest first');
  assert.strictEqual(data[0].url, '/second-post/', 'url built from path');
  const hello = data.find(function (d) { return d.title === 'Hello World'; });
  assert.ok(hello.content.indexOf('quick brown fox') !== -1, 'content stripped of HTML');
  assert.ok(hello.content.indexOf('<p>') === -1, 'HTML tags removed');

  assert.ok(out.find(function (o) { return o.path === 'js/spotlight.js'; }), 'js asset emitted');
  assert.ok(out.find(function (o) { return o.path === 'css/spotlight.css'; }), 'css asset emitted');

  // Injectors registered.
  assert.ok(hexo._injectors.head_end && hexo._injectors.head_end.length, 'head_end injector registered');
  assert.ok(hexo._injectors.body_end && hexo._injectors.body_end.length, 'body_end injector registered');

  const head = hexo._injectors.head_end[0]();
  assert.ok(head.indexOf('css/spotlight.css?v=') !== -1, 'css link carries a version query');

  // highlightColor: an override <style> is injected after the stylesheet, with
  // the accent set verbatim and the mark background auto-derived from the hex.
  const headStyle = hexo._injectors.head_end.map(function (fn) { return fn(); }).join('');
  assert.ok(headStyle.indexOf('--spotlight-accent:#e0567a') !== -1, 'highlight accent injected');
  assert.ok(headStyle.indexOf('--spotlight-mark-bg:rgba(224, 86, 122, 0.14)') !== -1, 'mark bg auto-derived from hex');

  // spotlight_icon() helper renders the default magnifier trigger.
  assert.ok(typeof hexo._helpers.spotlight_icon === 'function', 'spotlight_icon helper registered');
  const iconHtml = hexo._helpers.spotlight_icon();
  assert.ok(iconHtml.indexOf('data-spotlight-toggle') !== -1, 'helper output is a toggle trigger');
  assert.ok(iconHtml.indexOf('spotlight-trigger') !== -1, 'helper output carries the trigger class');
  assert.ok(iconHtml.indexOf('<svg') !== -1, 'helper output includes the search icon');
  assert.ok(hexo._helpers.spotlight_icon('nav-x').indexOf('spotlight-trigger nav-x') !== -1, 'helper appends extra class');

  const body = hexo._injectors.body_end[0]();
  assert.ok(body.indexOf('SPOTLIGHT_CONFIG') !== -1, 'runtime config injected');
  assert.ok(body.indexOf('js/spotlight.js?v=') !== -1, 'js script carries a version query');

  const cfgMatch = body.match(/window\.SPOTLIGHT_CONFIG=({.*?});<\/script>/);
  assert.ok(cfgMatch, 'config JSON present');
  const cfg = JSON.parse(cfgMatch[1].replace(/\\u003c/g, '<'));
  assert.ok(cfg.i18n && cfg.i18n.placeholder, 'i18n strings resolved');

  console.log('  [' + label + '] placeholder = ' + cfg.i18n.placeholder);
  return cfg.i18n.placeholder;
}

const enPlaceholder = run('en', 'en');
const zhPlaceholder = run('zh-CN', 'zh-CN');
const zhLowerPlaceholder = run('zh-cn', 'zh-cn (case-insensitive)');
const fallbackPlaceholder = run('xx-unknown', 'unknown -> en fallback');

assert.notStrictEqual(enPlaceholder, zhPlaceholder, 'language switch changes strings');
assert.strictEqual(zhPlaceholder, zhLowerPlaceholder, 'zh-cn resolves like zh-CN');
assert.strictEqual(fallbackPlaceholder, enPlaceholder, 'unknown language falls back to English');

console.log('\n✓ all smoke tests passed');
