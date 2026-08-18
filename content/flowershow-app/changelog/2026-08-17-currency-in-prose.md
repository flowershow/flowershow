---
title: Dollar amounts in prose no longer break your text
date: 2026-08-17
description: Currency mentions like "$61 … $76" are no longer mistaken for math formulas.
authors:
  - olayway
showToc: false
---

Text that mentioned two dollar amounts used to break silently. A sentence like:

> Solar cost about $61 per MWh, _cheaper_ than gas at $76/MWh.

was mistaken for a math formula: everything between the two `$` signs — including the `*cheaper*` emphasis — got swallowed and rendered as garbled KaTeX instead of text.

This is now fixed. A `$…$` is only treated as math when there's no space right after the opening `$` and no space right before the closing `$`. Every other `$` — currency amounts, a lone dollar sign, `$HOME`, etc. — renders as a literal dollar sign, and any markdown around it (bold, italic, links) renders normally.
