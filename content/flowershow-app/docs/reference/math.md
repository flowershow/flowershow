---
title: Math equations
description: Write math equations with LaTeX syntax.
---

## Inline math

To render an equation inline, wrap it in single dollars `$…$`.

**Example:**

```markdown
The hypotenuse is $\sqrt{a^2 + b^2}$.
```

**Renders as:**

The hypotenuse is $\sqrt{a^2 + b^2}$.

> A `$…$` is only treated as math when there's **no space right after the opening `$` and no space right before the closing `$`** (spaces in between are fine, e.g. `$x_2 = 4$`). Anything else — including currency amounts like `$61` — is left as a plain dollar sign. See [Dollar signs in regular text](#dollar-signs-in-regular-text) below.

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

A `$` only starts inline math when it's immediately followed by a non-space character _and_ there's a matching `$` later on the same line with a non-space character right before it. Any other `$` is treated as a literal dollar sign — so currency amounts render as plain text, even when a sentence mentions several:

```markdown
Solar cost about $61 per MWh, cheaper than gas at $76/MWh.
```

renders exactly as written — no escaping needed. Prose and real math happily coexist:

```markdown
It costs $5, and the area is $a^2$.
```

Here `$5` stays literal (nothing pairs with it), while `$a^2$` renders as math. Math that starts with a digit works too, as long as it forms a proper span — `$2*4=8$` renders as an equation.

If you ever want to force a literal dollar sign, escape it with a backslash: `\$`.
