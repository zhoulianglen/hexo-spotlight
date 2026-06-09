/* global hexo */
'use strict';

const { resolveStrings } = require('./lib/i18n');
const registerGenerator = require('./lib/generator');
const registerInjector = require('./lib/injector');

const DEFAULT_CONFIG = {
  enable: true,
  // index
  path: 'search.json',     // output path of the search index, relative to site root
  field: 'post',           // post | page | all
  content: true,           // include full stripped body text in the index
  // UI entry points
  hotkey: true,            // ⌘K / Ctrl+K opens the overlay
  button: true,            // inject a floating search button (bottom-right)
  buttonPosition: 'bottom-right',
  // i18n
  language: null,          // override; falls back to hexo.config.language, then 'en'
  strings: null,           // object to override individual UI strings
  // assets
  cssCdn: null,            // if set, load CSS from this URL instead of the bundled asset
  jsCdn: null              // if set, load JS from this URL instead of the bundled asset
};

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return Object.assign({}, base);
  const out = Object.assign({}, base);
  Object.keys(override).forEach(function (k) {
    if (override[k] === null || override[k] === undefined) return;
    if (typeof override[k] === 'object' && !Array.isArray(override[k]) &&
        typeof base[k] === 'object' && base[k] !== null) {
      out[k] = deepMerge(base[k], override[k]);
    } else {
      out[k] = override[k];
    }
  });
  return out;
}

const userConfig = hexo.config.spotlight || hexo.theme.config.spotlight || {};
const config = deepMerge(DEFAULT_CONFIG, userConfig);

if (config.enable !== false) {
  // Resolve the UI strings for the active language once, at registration time.
  config.i18n = resolveStrings(hexo, config);

  registerGenerator(hexo, config);
  registerInjector(hexo, config);
}
