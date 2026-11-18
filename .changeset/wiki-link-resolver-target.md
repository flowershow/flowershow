---
"@flowershow/remark-wiki-link": minor
---

`urlResolver` also receives `target`, the link target as written (without `#heading`), so a resolver can tell `[[report]]` from `[[report.docx]]`.

Link matching (`matchLinkTarget` from `@flowershow/core`) now also matches `.docx` files, so `[[report]]` can resolve to `report.docx`. When a Markdown (`.md`/`.mdx`) file also matches, it wins, wherever it sits; `[[report.docx]]` prefers the Word file.
