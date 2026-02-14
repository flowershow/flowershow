---
date: 2023-10-31
title: "Markdown Citations: Exploring how they work in Obsidian"
authors: [ "rufuspollock" ]
---


Citations are references to sources of information from books, papers, journals, websites, etc. These help readers to find the necessary information about the source and more importantly, we are able to give credit to the original author. In addition, citing the source in our documents / pages enables a proper roadmap to our research process.

> [!note] Points to cover:
> * citation-plugin configuration in Obsidian
>   * Literature notes
>   * Markdown citation
> * supported formats (in obsidian)
> * exporting from Zotero
> * how to use / connect (BibLaTex)
> * flowershow setup
> * ...

## Using citations in Obsidian

Citations can be added in Obsidian with the help of a [comminity plugin](https://github.com/hans/obsidian-citation-plugin) which needs to be installed along with some configuration. Once this setup is ready, we can connect our citations with third party applications such as Zotero, R markdown, etc.

### Installing and configuring the plugin

You can follow the plugin setup guide in their repo https://github.com/hans/obsidian-citation-plugin#setup.

The main point to note here is that the plugin supports retrieving data from two different source types which are `BibLaTex` and `CSL-JSON`

**[BibLaTex](http://www.bibtex.org/)** (.bib file)
 
*A BibTex file usually has entries in a format as below*

```
@article{,
  title = {Create Blogs and Websites with Floweshow},
  author = {Rufus Pollock and Aleksandra Rubaj},
  year = {2023},
  url = {https://github.com/flowershow/flowershow}, 
}
```

**CSL-JSON**

We will configure the plugin to use BibLaTex with Zotero.

### Connecting Obsidian with Zotero

[Zotero](https://www.zotero.org/) is a free and open-source software that helps you collect and organize your research work. For more info on how to use zotero please head over to their website and also read their [documentation](https://www.zotero.org/support/).

In Zotero, we can export a `bib` file which will be used as a citation database path in the Obsidian plugin as mentioned above. Before exporting it is best to install the [better BibTex](https://retorque.re/zotero-better-bibtex/) plugin which gives some additional configurations such as customizing citation keys, keeping track of the exported file for auto updates, etc.

Place your exported library/collection bib file in the root of the vault (optional but easier). Then in the obsidian citation plugin settings choose `BibLaTex` as database format and  provide the citation **database path** eg. `./MyLibrary.bib`.

#### Literature Notes**

In the citation plugin settings you can set the folder name to where you want the reference notes to be stored as files. Note that you will have to create this folder if not already exists. You can then create citations with reference by opening the prompt `cmd + p` and using the `Citations: Insert literature note link` command.

#### Pandoc-style markdown citations

You are also able to insert citations in Obsidian by opening the prompt `cmd + p` and using the `Citations: Insert markdown citations`.  command.

## How could we make this work with Floweshow

**Prerequisites:**

* citation plugin in obsidian to add citations
* a `bib` file in vault / content

Once we have the above setup, we may then be able to add [rehype-citation](https://github.com/timlrx/rehype-citation) to convert citations and display the bibliography. The rehype plugin would require setting two properties in config which are `Name` and `path` of the bibtex file.

```js
// contentlayer.config.ts
import rehypeCitation from 'rehype-citation'

rehypePlugins: [
  [rehypeCitation, {
    bibliography: 'My Library.bib',
    path: '...' // defaults to process.cwd()
  }]
]
```

We can ask the user to place the `bib` file in vault (content) root and set the `path` in plugin options.

**Challenges**:
* how do we pass the `name` property to the plugin as this can be anything eg. `./Custom Library.bib`.
* avoid recognizing email addresses as citations ? (something to test)

**Solutions**:
* add property in user's `config.mjs` for example maybe `bibFile: "Custom Library.bib"` and use that in plugin's config, or
* customize rehype plugin to search for a bib file in content's root ?
  * https://github.com/timlrx/rehype-citation#generating-your-own-remark-citation-plugins 
  * maybe could also solve email address issue, if needed ?
