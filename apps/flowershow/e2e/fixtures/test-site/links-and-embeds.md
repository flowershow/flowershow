---
title: Links Test
---

## CommonMark Links

[Internal link to home](index.md)

[Internal link to basic syntax](basic-syntax.md)

[External link](https://example.com)

[Link to anchor](#anchor-target)

[Link to nested page](subfolder/nested-page.md)

[Link with title](https://example.com "Example Title")

[Dot-slash link to basic syntax](./basic-syntax.md)

[Dot-slash link to nested page](./subfolder/nested-page.md)

[Link to subfolder readme](subfolder/README.md)

## Obsidian Wiki Links

[[index]]

[[basic-syntax]]

[[basic-syntax|Custom Link Text]]

[[nested-page]]

[[subfolder/nested-page]]

[[nested-page#section-one]]

[[nested-page#section-one|Nested Section Link]]

[[nonexistent-page]]

[[subfolder/README]]

[[my file with spaces]]

[[folder with spaces/my file with spaces]]

[[file with spaces & special (chars)]]

## Raw HTML Links

<a href="https://example.com">HTML external link default</a>

<a href="https://example.com" target="_self">HTML external link target self</a>

<a href="https://example.com" target="_top">HTML external link target top</a>

<a href="/local-page">HTML internal link</a>

## CommonMark Embeds

![CM image](assets/image.jpg)

![CM image with title](assets/image.jpg "Image Title")

## Obsidian Embeds

<div data-testid="obsidian-embeds">

![[image.jpg]]

![[image.jpg|300]]

![[image.jpg|300x200]]

</div>

### Anchor Target
