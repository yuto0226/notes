# 🍥Yuto's Notes

使用 [Astro](https://astro.build/) 的 [Fuwari](https://github.com/saicaca/fuwari) 主題

## ⚙️ 文章 Frontmatter

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new Astro blog.
image: ./cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
lang: jp      # 僅設定當前文章語言，與 `config.ts` 網站語言不同時才設定
---
```

## 🧞 Commands

以下指令均須在專案的根目錄執行：

| Command                             | Action                                           |
|:------------------------------------|:-------------------------------------------------|
| `pnpm install` 然後 `pnpm add sharp` | 安裝相依套件                                       |
| `pnpm dev`                          | 在 `localhost:4321` 啟動本地開發伺服器               |
| `pnpm build`                        | 建置生產網站到目錄 `./dist/`                        |
| `pnpm preview`                      | 在部署前於本地端預覽已經建置的網站                     |
| `pnpm new-post <filename>`          | 建立新貼文                                         |
| `pnpm astro ...`                    | 執行 `astro add`、`astro check` 等 CLI 指令        |
| `pnpm astro --help`                 | 顯示 Astro CLI 幫助資訊                            |
