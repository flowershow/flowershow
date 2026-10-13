# Blog post covers (flowershow.app)

Every post in `content/flowershow-app/blog/` has its own cover: a public-domain Japanese bird-and-flower woodblock print (Hokusai, Hiroshige). Don't reuse a print another post already has; the list is on [/cover-art](../content/flowershow-app/cover-art.md).

1. Pick an unused print from the Met's Open Access collection: search `https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&isPublicDomain=true&q=Hiroshige%20flowers%20birds`, then fetch `/public/collection/v1/objects/<id>` for `primaryImage`. Wider compositions crop better than the tall narrow strips.
2. Crop it to 1200×800, save it as webp (quality ~84) at `content/flowershow-app/assets/covers/<artist>-<title-slug>.webp`, and set `image: /assets/covers/<file>.webp` in the post's frontmatter.
3. Add a row to the table on `content/flowershow-app/cover-art.md`.

The cover is also the post's `og:image` (flowershow.app is a premium site, so a page `image` replaces the generated social card). Screenshots go in the post body, not in `image:`.
