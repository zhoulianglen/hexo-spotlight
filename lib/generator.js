'use strict';

const fs = require('fs');
const path = require('path');
const { stripHTML } = require('hexo-util');

const SOURCE_DIR = path.join(__dirname, '..', 'source');

// Read a bundled front-end asset once and reuse the string.
const assetCache = {};
function readAsset(name) {
  if (assetCache[name] === undefined) {
    assetCache[name] = fs.readFileSync(path.join(SOURCE_DIR, name), 'utf8');
  }
  return assetCache[name];
}

// Build the click-through URL. `post.path` is relative to the site root, so we
// must prefix `hexo.config.root` — otherwise links 404 on sub-directory deploys
// (e.g. GitHub Pages project sites with root: /repo/). The collapse only runs on
// the joined path, never on `permalink`, which is an absolute URL with a scheme.
function buildUrl(post, root) {
  if (post.path) return (root + post.path).replace(/\/{2,}/g, '/');
  return post.permalink || '';
}

function serialize(post, includeContent, root) {
  const item = {
    title: post.title || '',
    url: buildUrl(post, root),
    date: post.date ? post.date.format('YYYY.MM.DD') : ''
  };
  if (includeContent) {
    item.content = stripHTML(post.content || '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return item;
}

/**
 * Register three generators:
 *   - the search index (search.json by default)
 *   - the bundled front-end script (js/spotlight.js)
 *   - the bundled stylesheet (css/spotlight.css)
 * They run on every `hexo generate` and `hexo server`, so the index stays fresh.
 */
module.exports = function registerGenerator(hexo, config) {
  const root = hexo.config.root || '/';

  hexo.extend.generator.register('spotlight_index', function (locals) {
    const field = config.field || 'post';
    let items = [];

    if (field === 'post' || field === 'all') {
      items = items.concat(locals.posts.toArray());
    }
    if (field === 'page' || field === 'all') {
      items = items.concat(locals.pages.toArray());
    }

    items.sort(function (a, b) {
      return (b.date || 0) - (a.date || 0);
    });

    const data = items.map(function (p) {
      return serialize(p, config.content !== false, root);
    });

    const outputs = [{
      path: config.path || 'search.json',
      data: JSON.stringify(data)
    }];

    // Only emit the bundled assets when the user has not pointed at a CDN.
    if (!config.jsCdn) {
      outputs.push({ path: 'js/spotlight.js', data: readAsset('spotlight.js') });
    }
    if (!config.cssCdn) {
      outputs.push({ path: 'css/spotlight.css', data: readAsset('spotlight.css') });
    }

    return outputs;
  });
};
