# hexo-spotlight

> 为**任意** Hexo 主题打造的 Spotlight 风格即时搜索。零依赖、自带浮层 UI、⌘K 快捷键、多语言。搜索索引在 `hexo generate` / `hexo server` 时自动生成，UI 自动注入每个页面——**无需改动任何主题**。

[English](./README.md) | 🌐 **中文**

![license](https://img.shields.io/npm/l/hexo-spotlight) ![node](https://img.shields.io/node/v/hexo-spotlight)

## 为什么做这个

大多数 Hexo 搜索插件（`hexo-generator-search`、`hexo-generator-searchdb`）只生成一份 JSON 索引——搜索框还得你自己写，而且通常绑死在某个主题里。`hexo-spotlight` 把**整套体验**都给你：索引**加上**一个精致、键盘驱动的浮层，装上即用，任何主题都能跑。

## 特性

- **任意主题可用**——UI 通过 Hexo 的 injector API 注入，无需改模板。
- **索引自动生成**——以生成器形式运行，`hexo g` 和 `hexo s` 都会产出最新的 `search.json`。
- **纯前端即时搜索**——标题 + 全文匹配，命中片段高亮，输入防抖。
- **键盘优先**——⌘K / Ctrl+K 唤起，↑/↓ 导航，↵ 打开，Esc 关闭。
- **三种触发方式**——⌘K 快捷键、可选浮动按钮，以及主题自行放置的任意 `[data-spotlight-toggle]` 元素。
- **多语言**——内置 en、zh-CN、zh-TW、ja、ko、fr、de、es、ru、pt，按站点语言自动识别，可完全自定义。
- **主题感知样式**——自带 `--spotlight-*` CSS 变量，自动适配浅/深色（`prefers-color-scheme` + 常见暗色选择器）。
- **零运行时依赖**——不用 jQuery、不用框架，约 7KB 原生 JS。
- **解耦埋点**——派发 `spotlight:*` DOM 事件，可接入任意统计（GA、Plausible 等）。

## 安装

```bash
npm install hexo-spotlight --save
```

就这样。运行 `hexo clean && hexo server`，按下 ⌘K。

## 配置

所有选项均可选。在站点 `_config.yml`（或主题配置）里加一个 `spotlight` 段来自定义：

```yaml
spotlight:
  enable: true            # 总开关
  # 索引
  path: search.json       # 索引输出路径
  field: post             # post | page | all
  content: true           # 是否包含正文全文（设为 false 则只索引标题，体积更小）
  # UI 入口
  hotkey: true            # ⌘K / Ctrl+K 唤起
  button: true            # 显示浮动搜索按钮
  buttonPosition: bottom-right  # bottom-right | bottom-left | top-right | top-left
  # 多语言
  language: null          # 强制指定语言码；默认跟随站点 `language`
  strings:                # 覆盖单条文案（可选）
    placeholder: 搜索这个博客…
  # 资源（可选 CDN 覆盖）
  cssCdn: null
  jsCdn: null
```

### 在主题里触发搜索

浮动按钮和 ⌘K 无需任何设置即可用。若要加自己的入口（比如顶栏的放大镜图标），给任意元素加上 `data-spotlight-toggle` 属性即可：

```html
<a href="#" data-spotlight-toggle aria-label="搜索">🔍</a>
```

也可以编程式调用：

```js
window.spotlight.open();
window.spotlight.close();
```

### 自定义样式

在主题 CSS 里覆盖任意 `--spotlight-*` 变量，即可贴合你的品牌色：

```css
:root {
  --spotlight-accent: #e0567a;
  --spotlight-mark-bg: rgba(224, 86, 122, 0.15);
}
```

暗色模式会自动识别 `prefers-color-scheme`，以及 `html[data-theme="dark"]`、`html.dark`、`html.night`、`body.dark`、`[data-theme="dark"]`。

### 埋点统计

浮层派发解耦的 DOM 事件，可接入任意统计：

```js
document.addEventListener('spotlight:query', function (e) {
  // e.detail = { query, results_count }
  gtag('event', 'search', e.detail);
});
document.addEventListener('spotlight:result_click', function (e) {
  // e.detail = { query, result_url, position }
});
```

事件：`spotlight:open`、`spotlight:query`、`spotlight:no_results`、`spotlight:result_click`。

## 工作原理

1. **生成器**遍历文章/页面，输出 `search.json`，以及打包的 `js/spotlight.js` 和 `css/spotlight.css`。每次 `hexo g` 和 `hexo s` 都会运行。
2. **注入器**把样式表加到 `<head>`，把运行时配置 + 脚本加到每个页面的 `</body>` 之前——这就是无需改主题的原因。
3. 在客户端，脚本首次打开浮层时懒加载 `search.json`，之后完全在浏览器内过滤。

## 支持的语言

`en` · `zh-CN` · `zh-TW` · `ja` · `ko` · `fr` · `de` · `es` · `ru` · `pt`

没有你的语言？新增一个 `languages/<code>.yml` 并提个 PR——英文始终作为兜底。

## 许可证

[MIT](./LICENSE) © zhoulianglen
