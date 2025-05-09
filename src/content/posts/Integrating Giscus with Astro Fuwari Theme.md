---
title: Integrating Giscus with Astro Fuwari Theme
published: 2025-04-30 16:29:32
updated: 2025-04-30 16:29:32
description: ''
image: ''
tags: ['Astro','Fuwari','Giscus']
category: ''
draft: false 
lang: ''
pinned: false
---

在整理新的部落格時，到處蒐集人家怎麼魔改 Fuwari，然後發現大家都有整合 Giscus 作為留言系統，於是便想要自己（Chat GPT）整合看看。過程中也參考了很多[大佬](#reference)的整合方式，但在 try and error 的過程中，發現了一個蠻簡單的實作方式。

## 前置作業

<https://giscus.app/> 會告訴你該怎麼設定，就不再多贅述了。

## 建立元件

Giscus 會給你一個 `<script>` 標籤，讓你放在想要出現留言區的地方（如下）。這樣的設定雖然方便，但是當切換主題時，Giscus 的主題不會跟著切換。

```html
<script src="https://giscus.app/client.js"
        data-repo="<user>/<repo>"
        data-repo-id="<repo_id>"
        data-category="<category>"
        data-category-id="<category_id>"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="<theme>"
        data-lang="<lang>"
        data-loading="lazy"
        crossorigin="anonymous"
        async>
</script>
```

此時翻到了 [Yuma Shintani さん的設定](https://www.y-shin.net/posts/rewrite-astro/)，是可以透過監聽 class 的變化判斷目前的主題狀態。接著就搭配 GPT 老師的提示（抄作業），再手動調整一些程式碼，解決頁面切換不會重新載入留言區的問題，就成功地將 Giscus 整合進 Astro Fuwari 了。

```astro
---
---
<div class="card-base base z-10 px-6 py-6 mt-4 relative w-full">
  <div id="giscus_container"></div>
</div>

<script is:inline>
  function loadGiscus(theme) {
    const giscus = document.createElement('script');
    giscus.src = 'https://giscus.app/client.js';
    giscus.setAttribute('data-repo', '<user>/<repo>');
    giscus.setAttribute('data-repo-id', '<repo_id>');
    giscus.setAttribute('data-category', '<category>');
    giscus.setAttribute('data-category-id', '<category_id>');
    giscus.setAttribute('data-mapping', 'pathname');
    giscus.setAttribute('data-strict', '0');
    giscus.setAttribute('data-reactions-enabled', '1');
    giscus.setAttribute('data-emit-metadata', '0');
    giscus.setAttribute('data-input-position', 'bottom');
    giscus.setAttribute('data-theme', theme);
    giscus.setAttribute('data-lang', '<lang>');
    giscus.setAttribute('crossorigin', 'anonymous');
    giscus.async = true;

    const container = document.getElementById('giscus_container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(giscus);
    }
  }

  const light = 'catppuccin_latte';
  const dark = 'catppuccin_mocha';

  function getGiscusTheme() {
    return document.documentElement.classList.contains('dark') ? dark : light;
  }

  function updateGiscusTheme() {
    const theme = getGiscusTheme();
    const iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe) return;
    iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
  }

  // 初始載入
  const initialTheme = getGiscusTheme();
  loadGiscus(initialTheme);

  // 監聽主題變更
  const observer = new MutationObserver(() => {
    updateGiscusTheme();
  });

  // 監聽 class 屬性變更
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // 監聽 Astro 頁面載入事件
  document.addEventListener('astro:page-load', () => {
    const initialTheme = getGiscusTheme();
    loadGiscus(initialTheme);
  });
</script>
```

## 使用方式

使用時把元件 import 進來放在頁面最底下就可以了，可以參考[我的設定方式](https://github.com/yuto0226/notes/blob/main/src/pages/posts/[...slug].astro)。要記得改元件中 Giscus 的設定。

## Reference

- <https://www.ikamusume7.org/posts/frontend/comments_with_darkmode/>
- <https://www.lapis.cafe/posts/technicaltutorials/新一代静态博客框架astro的部署优化指南与使用体验>
- <https://www.y-shin.net/posts/rewrite-astro/>
