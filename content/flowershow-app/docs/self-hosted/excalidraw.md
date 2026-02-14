
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

# Excalidraw in Flowershow

Excalidraw is a virtual collaborative whiteboard tool that lets you easily sketch diagrams that have a hand-drawn feel to them.

There is great integration of Excalidraw into many tools like Obsidian and LogSeq.

Here we walk through how you can display Excalidraw sketches on your Flowershow site.

## Plain Excalidraw

If you are creating diagrams on https://excalidraw.com/ then using them in Flowershow is easy:

- export the drawing as `.svg` and `.png`
- add them to your [[embedding-files|assets folder]]
- then embed them like any other image

## Obsidian support

We can use the Excalidraw integration in [[notes/obsidian|Obsidian]] to create Excalidraw drawings locally and display them with Flowershow. There are three simple steps:

### 1. Install the Excalidraw plugin

Install the [Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin).

### 2. Configure auto-generation of rendered images

In the Obsidian settings, head over to the Excalidraw plugin settings section and make the following changes.

Note that you can choose png or svg. In this screenshot we are choosing svg.

![[docs-excalidraw-images-2.png]]
Optional (bonus): you can also configure use of wiki-links which Flowershow supports:

![[docs-excalidraw-images-1.png]]

### 3. Symlink the Excalidraw directory into Flowershow public

First, make sure you have a defined folder for your Excalidraw files. This entry shouldn't be blank. The default is `Excalidraw` (in this example it is has been lower-cased!)

![[docs-excalidraw-images-3.png]]

Then, symlink this directory into the public folder in flowershow.

For example, assuming your Obsidian vault is your Flowershow content folder you'd do the following:

```bash
$ cd <flowershow-template-directory>
$ ln -s <relative-path-to-excalidraw-folder> ./public/excalidraw
# e.g. ln -s ../my-digital-garden/excalidraw ./public/excalidraw
```
