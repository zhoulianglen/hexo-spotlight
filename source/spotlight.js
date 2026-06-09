/* hexo-spotlight — self-contained instant search overlay.
   Config is provided by the injected `window.SPOTLIGHT_CONFIG`. No dependencies. */
(function () {
  'use strict';

  var CFG = window.SPOTLIGHT_CONFIG || {};
  var T = CFG.i18n || {};
  // Sensible English fallbacks so the UI never renders empty labels.
  function t(key, fallback) { return (T[key] != null && T[key] !== '') ? T[key] : fallback; }

  document.addEventListener('DOMContentLoaded', function () {
    var searchUrl = CFG.searchUrl || '/search.json';
    var strings = {
      placeholder: t('placeholder', 'Search titles and content…'),
      loading: t('loading', 'Loading…'),
      empty: t('empty', 'No matching results.'),
      failed: t('failed', 'Failed to load search index.'),
      close: t('close', 'Close'),
      label: t('label', 'Search'),
      navigate: t('navigate', 'navigate'),
      select: t('select', 'open'),
      esc: t('esc', 'close'),
      button: t('button', 'Search')
    };

    var data = null, loading = false, debounce = null, selectedIndex = -1;

    // Decoupled analytics: dispatch a DOM CustomEvent so any tracker can listen.
    // e.g. document.addEventListener('spotlight:query', e => gtag('event','search', e.detail))
    function emit(name, detail) {
      try { document.dispatchEvent(new CustomEvent('spotlight:' + name, { detail: detail || {} })); } catch (e) {}
    }

    var trackTimer = null, lastTracked = '';

    var overlay = document.createElement('div');
    overlay.className = 'spotlight-overlay';
    overlay.innerHTML =
      '<div class="spotlight-panel" role="dialog" aria-modal="true" aria-label="' + strings.label + '">' +
        '<div class="spotlight-bar">' +
          '<svg class="spotlight-bar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="text" class="spotlight-input" autocomplete="off" placeholder="' + strings.placeholder + '" aria-label="' + strings.placeholder + '">' +
          '<button type="button" class="spotlight-close" aria-label="' + strings.close + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
        '</div>' +
        '<div class="spotlight-status"></div>' +
        '<div class="spotlight-results"></div>' +
        '<div class="spotlight-footer">' +
          '<span class="spotlight-hint"><kbd>↑</kbd><kbd>↓</kbd> ' + strings.navigate + '</span>' +
          '<span class="spotlight-hint"><kbd>↵</kbd> ' + strings.select + '</span>' +
          '<span class="spotlight-hint"><kbd>esc</kbd> ' + strings.esc + '</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var panel = overlay.querySelector('.spotlight-panel');
    var input = overlay.querySelector('.spotlight-input');
    var statusEl = overlay.querySelector('.spotlight-status');
    var results = overlay.querySelector('.spotlight-results');

    // Optional floating button.
    var fab = null;
    if (CFG.button !== false) {
      fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'spotlight-fab spotlight-fab-' + (CFG.buttonPosition || 'bottom-right');
      fab.setAttribute('aria-label', strings.button);
      fab.setAttribute('title', strings.button);
      fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
      document.body.appendChild(fab);
      fab.addEventListener('click', open);
    }

    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function snippet(content, q) {
      var idx = content.toLowerCase().indexOf(q);
      if (idx === -1) return '';
      var start = Math.max(0, idx - 30);
      var end = Math.min(content.length, idx + q.length + 50);
      return (start > 0 ? '…' : '') + escapeHtml(content.slice(start, idx)) +
             '<mark>' + escapeHtml(content.slice(idx, idx + q.length)) + '</mark>' +
             escapeHtml(content.slice(idx + q.length, end)) + (end < content.length ? '…' : '');
    }
    function setStatus(text) {
      statusEl.textContent = text || '';
      statusEl.hidden = !text;
    }
    function matchesOf(ql) {
      return data.filter(function (p) {
        if (p.title && p.title.toLowerCase().indexOf(ql) !== -1) return true;
        return p.content && p.content.toLowerCase().indexOf(ql) !== -1;
      });
    }
    function render() {
      selectedIndex = -1;
      var q = input.value.trim().toLowerCase();
      if (!q) { results.innerHTML = ''; setStatus(''); return; }
      if (!data) { results.innerHTML = ''; setStatus(strings.loading); return; }
      var matches = matchesOf(q);
      if (!matches.length) { results.innerHTML = ''; setStatus(strings.empty); return; }
      setStatus('');
      results.innerHTML = matches.map(function (p) {
        var inTitle = p.title && p.title.toLowerCase().indexOf(q) !== -1;
        var snip = inTitle ? '' : (p.content ? snippet(p.content, q) : '');
        return '<a class="spotlight-result" href="' + p.url + '">' +
               '<span class="spotlight-result-title">' + escapeHtml(p.title || '') + '</span>' +
               (snip ? '<span class="spotlight-result-snippet">' + snip + '</span>' : '') +
               (p.date ? '<span class="spotlight-result-date">' + escapeHtml(p.date) + '</span>' : '') +
               '</a>';
      }).join('');
    }
    function trackSettled() {
      var q = input.value.trim();
      if (!q || !data) return;
      var ql = q.toLowerCase();
      if (ql === lastTracked) return;
      lastTracked = ql;
      var count = matchesOf(ql).length;
      if (count > 0) emit('query', { query: q, results_count: count });
      else emit('no_results', { query: q });
    }
    function trackResultClick(item) {
      if (!item) return;
      var pos = Array.prototype.indexOf.call(getItems(), item);
      emit('result_click', { query: input.value.trim(), result_url: item.getAttribute('href') || '', position: pos });
    }

    function load() {
      if (data || loading) return;
      loading = true;
      fetch(searchUrl).then(function (r) { return r.json(); }).then(function (j) {
        data = j; loading = false; render();
      }).catch(function () {
        loading = false; setStatus(strings.failed);
      });
    }
    function open() {
      overlay.classList.add('show');
      document.body.classList.add('spotlight-open');
      load();
      render();
      emit('open', {});
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() {
      overlay.classList.remove('show');
      document.body.classList.remove('spotlight-open');
    }

    function getItems() { return results.querySelectorAll('.spotlight-result'); }
    function highlight(scroll) {
      var items = getItems();
      items.forEach(function (el, i) {
        var on = (i === selectedIndex);
        el.classList.toggle('is-active', on);
        if (on && scroll) el.scrollIntoView({ block: 'nearest' });
      });
    }
    function move(delta) {
      var items = getItems();
      if (!items.length) return;
      selectedIndex += delta;
      if (selectedIndex < 0) selectedIndex = items.length - 1;
      if (selectedIndex >= items.length) selectedIndex = 0;
      highlight(true);
    }

    input.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(render, 150);
      clearTimeout(trackTimer);
      trackTimer = setTimeout(trackSettled, 900);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        var items = getItems();
        var idx = selectedIndex >= 0 ? selectedIndex : 0;
        if (items[idx]) {
          trackResultClick(items[idx]);
          window.location.href = items[idx].getAttribute('href');
        }
      }
    });
    results.addEventListener('mouseover', function (e) {
      var item = e.target.closest ? e.target.closest('.spotlight-result') : null;
      if (!item) return;
      selectedIndex = Array.prototype.indexOf.call(getItems(), item);
      highlight(false);
    });
    results.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.spotlight-result') : null;
      if (item) trackResultClick(item);
    });
    overlay.querySelector('.spotlight-close').addEventListener('click', close);
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    overlay.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('show')) { close(); return; }
      // ⌘K / Ctrl+K toggles the overlay.
      if (CFG.hotkey !== false && (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (overlay.classList.contains('show')) close(); else open();
      }
    });

    // Any element with [data-spotlight-toggle] opens the overlay — themes can place
    // their own trigger (a header icon, a nav link) without touching this script.
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('[data-spotlight-toggle]') : null;
      if (trigger) { e.preventDefault(); open(); }
    });

    // Programmatic API.
    window.spotlight = { open: open, close: close };
  });
})();
