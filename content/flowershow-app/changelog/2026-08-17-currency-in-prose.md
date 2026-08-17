---
title: Dollar amounts in prose no longer break your text
date: 2026-08-17
description: Currency mentions like "$61 … $76" are no longer mistaken for math. Heads-up if you use single-dollar math — you'll need to switch to double-dollar.
authors:
  - olayway
showToc: false
---

Text that mentioned two dollar amounts used to break silently. A sentence like:

> Solar cost about $61 per MWh, *cheaper* than gas at $76/MWh.

was mistaken for a math formula: everything between the two `$` signs — including the `*cheaper*` emphasis — got swallowed and rendered as garbled KaTeX instead of text.

This is now fixed. Dollar amounts in prose render as plain text, and any markdown inside them (bold, italic, links) renders normally.

## Heads-up: single-dollar math needs migrating

To fix this, we disabled **single-dollar inline math**. If your content used a single `$` for genuine math, it will now show as raw LaTeX text instead of a rendered formula.

The fix is a one-character change per formula — switch to double dollars, which still render as inline math:

```md
<!-- before: no longer renders as math -->
Kinetic energy is $\frac{1}{2}mv^2$.

<!-- after: renders as inline math -->
Kinetic energy is $$\frac{1}{2}mv^2$$.
```

If you have math-heavy content, search your source for single-`$` inline math and convert them to `$$…$$`.
