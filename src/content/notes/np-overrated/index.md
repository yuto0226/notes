---
title: 閱讀筆記：NP-overrated
date: 2026-08-14T09:37:02+08:00
description: ''
authors: ['yuto']
tags:
  - article
  - algorithm
---

source: https://gruhn.me/blog/2026-08-13/

作者提出不要被課本所設想的框架限制住，說常常會有人提到「NP-hard == 不可解」的論述。但現實不一樣，到處都是 NP-hard 的問題，他有一個 quote 我也很喜歡：

> In theory, there is no difference between theory and practice. But in practice, there is.
>
> -- Benjamin Brewster

文章內也提到了五種 NP-hard 問題，其中 1、2 項的 worst case 鮮少發生，發生了也不會怎樣；3、4 理論上是最佳化問題，也提出了幾篇文章 [^opt-problem] 來討論這些；最後 5 甚至是 NP-hard 的原型，但事實是 AMZ 整天在處理這些問題 [^amz]。

1. Dependency resolution (in package managers)
2. Type checking (not all type systems)
3. Scheduling
4. Traveling Salesman
5. Boolean Satisfiability (SAT)

總結大概是，遇到 NP-hard 就想辦法解吧，讓課本中的理論只停留在理論，工程的問題便是想辦法去解決。如果真的碰到 worst-case 也沒差，反正做好錯誤處理就好。

[^opt-problem]: 最佳化問題：
    - [scipopt/scip](https://github.com/scipopt/scip)
    - [Google OR Tools](https://developers.google.com/optimization/introduction)
    - [Best Subset Selection Via A Modern Optmization Lens](https://scispace.com/pdf/best-subset-selection-via-a-modern-optimization-lens-353jtit2ms.pdf)
[^amz]: [A billion SMT queries a day](https://www.amazon.science/blog/a-billion-smt-queries-a-day)
