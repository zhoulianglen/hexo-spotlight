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

function serialize(post, includeContent) {
  const item = {
    title: post.title || '',
    url: post.path ? '/' + post.path : (post.permalink || ''),
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
      return serialize(p, config.content !== false);
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
