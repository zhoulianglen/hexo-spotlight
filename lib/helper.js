'use strict';

function htmlEscapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// The same magnifier glyph used by the floating button, so the embedded icon
// matches the rest of the UI. `currentColor` lets it follow the theme's text color.
const ICON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

/**
 * Register a view helper that renders the default Spotlight search icon as a
 * ready-to-place trigger. Drop `<%- spotlight_icon() %>` anywhere in a theme
 * template (header, nav, sidebar) and clicking it opens the overlay — it reuses
 * the existing `[data-spotlight-toggle]` mechanism, so no extra wiring is needed.
 *
 * Optional first argument: extra class name(s) appended to the trigger element,
 * e.g. `<%- spotlight_icon('nav-search') %>`.
 */
module.exports = function registerHelper(hexo, config) {
  if (!hexo.extend.helper || typeof hexo.extend.helper.register !== 'function') return;
  const label = (config.i18n && (config.i18n.button || config.i18n.label)) || 'Search';

  hexo.extend.helper.register('spotlight_icon', function (extraClass) {
    const cls = 'spotlight-trigger' + (extraClass ? ' ' + String(extraClass) : '');
    return '<button type="button" class="' + htmlEscapeAttr(cls) + '" data-spotlight-toggle ' +
      'aria-label="' + htmlEscapeAttr(label) + '" title="' + htmlEscapeAttr(label) + '">' +
      ICON_SVG + '</button>';
  });
};
