# hexo-spotlight

> Spotlight-style instant search for **any** Hexo theme. Zero dependencies, self-contained overlay UI, ⌘K hotkey, multi-language. The search index is generated on `hexo generate` / `hexo server`, and the UI is injected into every page — **no theme changes required**.

🌐 **English** | [中文文档](./README.zh-CN.md)

![license](https://img.shields.io/npm/l/hexo-spotlight) ![node](https://img.shields.io/node/v/hexo-spotlight)

## Why

Most Hexo search plugins (`hexo-generator-search`, `hexo-generator-searchdb`) only produce a JSON index — you still have to build the search box yourself, and it usually lives inside one specific theme. `hexo-spotlight` ships the **whole experience**: the index *and* a polished, keyboard-driven overlay that works on any theme out of the box.

## Features

- **Works with any theme** — the UI is injected via Hexo's injector API. No template edits.
- **Auto-generated index** — runs as a generator, so `hexo g` and `hexo s` always produce a fresh `search.json`.
- **Instant client-side search** — title + full-text matching, highlighted snippets, debounced input.
- **Keyboard first** — ⌘K / Ctrl+K to open, ↑/↓ to navigate, ↵ to open, Esc to close.
- **Many ways to trigger** — the ⌘K hotkey, an optional floating button, a `spotlight_icon()` helper that drops the default search icon anywhere, and any `[data-spotlight-toggle]` element themes can place themselves.
- **Multi-language** — ships en, zh-CN, zh-TW, ja, ko, fr, de, es, ru, pt. Auto-detected from your site language, fully overridable.
- **Theme-aware styling** — self-contained `--spotlight-*` CSS variables with light/dark auto-detection (`prefers-color-scheme` + common dark-mode selectors).
- **Zero runtime dependencies** — no jQuery, no framework, ~7KB of vanilla JS.
- **Decoupled analytics** — emits `spotlight:*` DOM events you can wire to any tracker (GA, Plausible, …).

## Install

```bash
npm install hexo-spotlight --save
```

That's it. Run `hexo clean && hexo server` and press ⌘K.

## Configuration

All options are optional. Add a `spotlight` block to your site `_config.yml` (or theme config) to customize:

```yaml
spotlight:
  enable: true            # master switch
  # index
  path: search.json       # output path of the index
  field: post             # post | page | all
  content: true           # include full body text (set false for a smaller, title-only index)
  # UI entry points
  hotkey: true            # ⌘K / Ctrl+K opens the overlay
  button: true            # show a floating search button
  buttonPosition: bottom-right  # bottom-right | bottom-left | top-right | top-left
  # styling
  highlightColor: null    # color of matched search terms; background tint is auto-derived
  # i18n
  language: null          # force a language code; defaults to your site `language`
  strings:                # override individual labels (optional)
    placeholder: Search the blog…
  # assets (optional CDN override)
  cssCdn: null
  jsCdn: null
```

### Triggering search from your theme

The floating button and ⌘K work with no setup. To embed the **default search icon** somewhere in your theme (a header, nav, or sidebar), drop in the `spotlight_icon()` helper — it renders the same magnifier glyph and opens the overlay on click:

```ejs
<%- spotlight_icon() %>
```

Pass an optional class name to style or position it:

```ejs
<%- spotlight_icon('nav-search') %>
```

The icon inherits the surrounding text color (`currentColor`), so it blends into any theme automatically.

Prefer plain HTML, or your theme isn't EJS? Any element with the `data-spotlight-toggle` attribute is a trigger:

```html
<button class="spotlight-trigger" data-spotlight-toggle aria-label="Search">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
</button>
```

You can also open it programmatically:

```js
window.spotlight.open();
window.spotlight.close();
```

### Styling

The quickest way to recolor highlighted search terms is the `highlightColor` config option — the translucent background tint is derived from it automatically:

```yaml
spotlight:
  highlightColor: '#e0567a'
```

For finer control, override any `--spotlight-*` custom property in your theme's CSS:

```css
:root {
  --spotlight-accent: #e0567a;
  --spotlight-mark-bg: rgba(224, 86, 122, 0.15);
}
```

Dark mode is detected automatically from `prefers-color-scheme` and from `html[data-theme="dark"]`, `html.dark`, `html.night`, `body.dark`, `[data-theme="dark"]`.

### Analytics

The overlay emits decoupled DOM events, so you can plug in any analytics:

```js
document.addEventListener('spotlight:query', function (e) {
  // e.detail = { query, results_count }
  gtag('event', 'search', e.detail);
});
document.addEventListener('spotlight:result_click', function (e) {
  // e.detail = { query, result_url, position }
});
```

Events: `spotlight:open`, `spotlight:query`, `spotlight:no_results`, `spotlight:result_click`.

## How it works

1. A **generator** walks your posts/pages and emits `search.json`, plus the bundled `js/spotlight.js` and `css/spotlight.css`. This runs on every `hexo g` and `hexo s`.
2. An **injector** adds the stylesheet to `<head>` and the runtime config + script before `</body>` on every page — which is why no theme edits are needed.
3. On the client, the script lazy-loads `search.json` the first time the overlay opens, then filters entirely in the browser.

## Supported languages

`en` · `zh-CN` · `zh-TW` · `ja` · `ko` · `fr` · `de` · `es` · `ru` · `pt`

Missing your language? Add a `languages/<code>.yml` and open a PR — English is always the fallback.

## License

[MIT](./LICENSE) © zhoulianglen
