---
title: Math equations
description: Write math equations with LaTeX syntax.
---

## Inline math

To render an equation inline, wrap it in double dollars `$$…$$`, all on a single line.

**Example:**

```markdown
The hypotenuse is $$\sqrt{a^2 + b^2}$$.
```

**Renders as:**

The hypotenuse is $$\sqrt{a^2 + b^2}$$.

> A single `$` is treated as a literal dollar sign, not a math delimiter. That's why inline math uses `$$…$$` — see [Dollar signs in regular text](#dollar-signs-in-regular-text) below.

## Block math

To render an equation as a centered block, wrap it in double dollars `$$` placed on their own lines.

**Example:**

```markdown
$$
\begin{vmatrix}a & b\\
c & d
\end{vmatrix}=ad-bc
$$
```

**Renders as:**

$$
\begin{vmatrix}a & b\\
c & d
\end{vmatrix}=ad-bc
$$

The difference is the line break: `$$…$$` on one line renders inline, while `$$` split across separate lines renders as a block.

Documentation on supported math syntax can be found in [KaTeX docs](https://katex.org/docs/support_table.html).

## Dollar signs in regular text

Because inline math uses double dollars, a single `$` in your prose is left alone. Currency amounts render as plain text, even when a sentence mentions several:

```markdown
Solar cost about $61 per MWh, cheaper than gas at $76/MWh.
```

renders exactly as written — no escaping needed. If you ever want a literal double `$$` in text without triggering math, escape a dollar with a backslash: `\$$`.
