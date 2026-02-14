---
title: Embedding files
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

If you want to embed images (or pdfs) in your markdown notes or use them as `src` value in your in-markdown HTML code blocks, you need to create a folder at the top level of your content folder, where you'll put all your asset files. Then you'll need to create a symlink to it inside the `public` folder.

## Steps

1. Create a folder for your assets (e.g. `<your-content-folder>/assets`) in the folder with your markdown notes (e.g. your Obsidian vault):

```bash
cd <your-content-dir>
mkdir assets
```

> [!tip]
> If you're an Obsidian user, after you create a folder for your assets, you can right-click on it and select "Set as attachment folder". This way, any new files you embed in your notes will be automatically added to this folder instead of adding them next to your mardown files (default).

2. Go to the `public` folder of the Flowershow app you've created with `create-next-app` and create a symlink to the assets folder you created in step 1:

```bash
cd my-flowershow-app/public
ln -s your-content-dir/assets assets
```

3. Once linked, you can now use your assets folder as a source. For example:

```md
<img src="/assets/<filepath here>" alt=""></img>
```
