---
title: Search finds your new pages again
date: 2026-10-25
description: Pages published or updated between October 18 and October 25 were missing from site search. They're indexed again, and new publishes show up in search as before.
authors:
  - olayway
showToc: false
---

From October 18, pages you published or updated didn't reach your site's search index, though the publish itself succeeded and the pages were live. Sites created in that week had no search results at all.

Publishing adds pages to search again, and we've re-indexed every page published during the outage, so you don't need to republish anything. Search is turned on with `enableSearch` in [[config-file|config.json]].

**Fixes**

- A page search can't index because of its frontmatter (for example `authors` written as plain text instead of a list) now shows an error in your publish output and publish history, such as `Not added to search: Field authors must be an array.` Before, it was silently left out of search.
