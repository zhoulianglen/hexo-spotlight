'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const LANG_DIR = path.join(__dirname, '..', 'languages');

// Cache parsed language files for the lifetime of the process.
const cache = {};

function loadLang(code) {
  if (cache[code] !== undefined) return cache[code];
  const file = path.join(LANG_DIR, code + '.yml');
  let data = null;
  try {
    if (fs.existsSync(file)) {
      data = yaml.load(fs.readFileSync(file, 'utf8')) || null;
    }
  } catch (e) {
    data = null;
  }
  cache[code] = data;
  return data;
}

// Build the candidate chain from a language code, e.g. "zh-CN" -> ["zh-CN", "zh"].
function candidates(code) {
  if (!code) return [];
  const normalized = String(code).trim();
  const list = [normalized];
  // Try common case variants (Hexo configs are inconsistent: zh-cn, zh-CN, zh_CN).
  const dashed = normalized.replace(/_/g, '-');
  if (dashed !== normalized) list.push(dashed);
  const parts = dashed.split('-');
  if (parts.length > 1) {
    list.push(parts[0] + '-' + parts[1].toUpperCase()); // zh-cn -> zh-CN
    list.push(parts[0]);                                 // zh
  }
  return list;
}

/**
 * Resolve the active UI strings.
 * Priority: explicit config.strings overrides > site language file > English fallback.
 */
function resolveStrings(hexo, config) {
  const en = loadLang('en') || {};

  // Determine the desired language: plugin override, else site config.
  let lang = config.language;
  if (!lang) {
    lang = hexo.config.language;
    if (Array.isArray(lang)) lang = lang[0];
  }

  let resolved = null;
  candidates(lang).some(function (code) {
    const data = loadLang(code);
    if (data) { resolved = data; return true; }
    return false;
  });

  // Merge: English provides the complete key set, the resolved language overrides,
  // and user-provided strings win last.
  const out = Object.assign({}, en, resolved || {}, config.strings || {});
  return out;
}

module.exports = { resolveStrings, loadLang };
