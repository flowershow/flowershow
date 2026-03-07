---
title: Google Docs Markdown Export Quirks
created: 2025-12-04
---

I just did a full markdown export of a large document from Googles Docs (this [metacrisis paper](https://metacrisis.info/paper) to be precise).

I noticed a few interesting things:

### Anchor links

It outputted anchors like `{#synopsis}` e.g.:

```
# Synopsis {#synopsis}
```

And in context:

```md
# Synopsis {#synopsis}

Our world shows signs of multi-systemic breakdown. In this context, **polycrisis** names an *entanglement* of interconnected crises that affect one another \- ecological, political, cultural, technological. **Metacrisis**, by contrast, denotes foundational conditions that generate these crises. Just as symptoms signal an underlying illness, polycrisis points to metacrisis. While the reality of a global polycrisis is increasingly acknowledged, awareness of metacrisis is less common. 
```

This is the [[identifiers|Identifiers]] feature introduced by Pandoc.

### Images inlined

It outputs images at the end of the file as `data:...`. This is kind of cool but also kind of weird. I guess it is the one way to have a single page html file. I'd much prefer the export was more like the HTML option where i can either have single file version or with assets separate and what i get is a zip file i can unzip.
