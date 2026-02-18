---
title: UVA 12442 - Forwarding Emails
date: 2025-04-27 17:12:12
updated: 2025-04-27 17:12:12
description: ''
image: ''
tags:
  - UVA
  - DFS
draft: false
---

在火星人中，每個火星人收到轉發郵件時，都會只轉發給一個指定的人（且不能轉給自己）。現在，族長想親自寄出一封郵件，他想知道應該寄給哪一位火星人,才能讓看到郵件的人數最多。每個人之後按照固定的轉發規則傳遞下去。

[題目連結](https://onlinejudge.org/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=3873)

## 分析

題目說要找出給哪個節點，traverse 的節點數量會最多。根據題目給的輸入測資，每一個 case 都可以拿到一個 adjacency list。因此我的初步想法是用 dfs traverse 在 list 裡面的每一個節點，找出最大節點數的那個節點。

```cpp
int dfs(int u) {
    if (visited[u]) return 0;
    visited[u] = true;
    return 1 + dfs(graph[u]);
}
```

送出後結果 TLE，透過 DFS 記憶化改善程式效能。

```cpp
int dfs(int u) {
    if (visited[u]) return 0;
    visited[u] = true;
    return dp[u] = 1 + dfs(graph[u]);
}
```

> [AC 程式碼](https://github.com/yuto0226/cp-solutions/blob/main/onlinejudge/oj_12442.cpp)
