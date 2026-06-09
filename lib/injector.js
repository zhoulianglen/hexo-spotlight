'use strict';

const VERSION = require('../package.json').version;

function joinUrl(root, p) {
  return (root + p).replace(/\/{2,}/g, '/');
}

function htmlEscapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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
