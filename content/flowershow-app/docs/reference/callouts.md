---
title: Callouts
description: Obsidian callout syntax, supported types and aliases, custom titles, folding, and nesting in Flowershow.
---

Use callouts to highlight notes, tips, warnings, and other information. Start a blockquote with `[!type]`, for example `[!tip]`.

## Supported types and aliases

Flowershow supports these 13 Obsidian callout types. Use any type or alias inside `[!…]`; aliases use the same style as their main type.

| Type | Aliases |
| --- | --- |
| `note` | — |
| `abstract` | `summary`, `tldr` |
| `info` | — |
| `todo` | — |
| `tip` | `hint`, `important` |
| `success` | `check`, `done` |
| `question` | `help`, `faq` |
| `warning` | `caution`, `attention` |
| `failure` | `fail`, `missing` |
| `danger` | `error` |
| `bug` | — |
| `example` | — |
| `quote` | `cite` |

Source: [Obsidian's supported callout types](https://help.obsidian.md/callouts#Supported%20types).

## Syntax and examples

Add text after `[!type]` for a custom title. Omit the body for a title-only callout. Add `-` immediately after `[!type]` to collapse the callout by default, or `+` to make it foldable and expanded by default. Callouts can also be nested.

```
> [!info] This is cool!
> Here's a callout block.
> It supports **markdown** and [[syntax|wikilinks]].
```

> [!info] This is cool!
> Here's a callout block.
> It supports **markdown** and [[syntax|wikilinks]].

```
> [!tip] Title-only callout
```

> [!tip] Title-only callout

```
> [!faq]- Are callouts foldable?
> Yes! In a foldable callout, the contents are hidden when the callout is collapsed.
```

> [!faq]- Are callouts foldable?
> Yes! In a foldable callout, the contents are hidden when the callout is collapsed.

```
> [!question] Can callouts be nested?
> > [!todo] Yes!, they can.
> > > [!example]  You can even use multiple layers of nesting.
```

> [!question] Can callouts be nested?
> > [!todo] Yes!, they can.
> > > [!example]  You can even use multiple layers of nesting.

## Custom styling

See [custom styles](./custom-styles#retheme-warning-callouts) for an example of changing callout colors.
