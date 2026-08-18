---
title: 'Reading Notes: NP-overrated'
date: 2026-08-18T22:47:50+08:00
description: ''
authors: ['yuto']
tags:
  - article
  - algorithm
---

source: https://gruhn.me/blog/2026-08-13/

The author argues we shouldn't let the framework taught in textbooks box us in: people often bring up the claim that "NP-hard == unsolvable." But reality is different: NP-hard problems are everywhere, and he shares a quote I really like too:

> In theory, there is no difference between theory and practice. But in practice, there is.
>
> -- Benjamin Brewster

The article also lists five kinds of NP-hard problems. For 1 and 2, the worst case rarely shows up, and even when it does, it isn't a big deal; 3 and 4 are theoretically optimization problems, and he links a few articles [^opt-problem] discussing them; the last one, 5, is practically the archetype of NP-hard, yet Amazon deals with it all day long [^amz].

1. Dependency resolution (in package managers)
2. Type checking (not all type systems)
3. Scheduling
4. Traveling Salesman
5. Boolean Satisfiability (SAT)

The takeaway is roughly this: when you hit NP-hard, just find a way to solve it. Let the textbook theory stay theory; engineering problems are about finding a way through. And if you really do hit the worst case, it's fine, as long as your error handling is solid.

[^opt-problem]: Optimization problems:
    - [scipopt/scip](https://github.com/scipopt/scip)
    - [Google OR Tools](https://developers.google.com/optimization/introduction)
    - [Best Subset Selection Via A Modern Optmization Lens](https://scispace.com/pdf/best-subset-selection-via-a-modern-optimization-lens-353jtit2ms.pdf)
[^amz]: [A billion SMT queries a day](https://www.amazon.science/blog/a-billion-smt-queries-a-day)
