'use strict';

const VERSION = require('../package.json').version;

function joinUrl(root, p) {
  return (root + p).replace(/\/{2,}/g, '/');
}

function htmlEscapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Keep only characters valid inside a CSS color value, so a user-supplied color
// can never break out of the injected <style> block.
function safeColor(v) {
  return String(v).replace(/[^a-zA-Z0-9#(),.%\- ]/g, '');
}

// Turn a #rgb / #rrggbb color into an `rgba(…, alpha)` string. Returns null for
// any other format, letting the caller fall back to color-mix().
function hexToRgba(hex, alpha) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

/**
 * Inject the stylesheet, the runtime config, an optional floating button, and the
 * script into every rendered page. Because injection happens after the theme
 * renders, this works with ANY theme without template edits.
 */
module.exports = function registerInjector(hexo, config) {
  const root = hexo.config.root || '/';
  const v = '?v=' + VERSION;

  const cssUrl = config.cssCdn || (joinUrl(root, 'css/spotlight.css') + v);
  const jsUrl = config.jsCdn || (joinUrl(root, 'js/spotlight.js') + v);
  const searchUrl = joinUrl(root, config.path || 'search.json');

  // --- <head> : stylesheet ---
  hexo.extend.injector.register('head_end', function () {
    return '<link rel="stylesheet" href="' + htmlEscapeAttr(cssUrl) + '">';
  }, 'default');

  // --- <head> : optional highlight color override ---
  // A single `highlightColor` drives the accent (search-term text color); its
  // translucent variant becomes the mark background. Injected after the
  // stylesheet so it wins over the default `--spotlight-*` values, while still
  // letting theme CSS override either variable.
  if (config.highlightColor) {
    const accent = safeColor(config.highlightColor);
    const rgba = hexToRgba(accent, 0.14);
    const markBg = rgba || ('color-mix(in srgb, ' + accent + ' 14%, transparent)');
    hexo.extend.injector.register('head_end', function () {
      return '<style>:root{--spotlight-accent:' + accent +
        ';--spotlight-mark-bg:' + markBg + ';}</style>';
    }, 'default');
  }

  // --- before </body> : runtime config + optional button + script ---
  hexo.extend.injector.register('body_end', function () {
    const runtime = {
      searchUrl: searchUrl,
      hotkey: config.hotkey !== false,
      button: config.button !== false,
      buttonPosition: config.buttonPosition || 'bottom-right',
      i18n: config.i18n || {}
    };

    let html = '<script>window.SPOTLIGHT_CONFIG=' +
      JSON.stringify(runtime).replace(/</g, '\\u003c') + ';</script>';

    html += '<script src="' + htmlEscapeAttr(jsUrl) + '" defer></script>';
    return html;
  }, 'default');
};
