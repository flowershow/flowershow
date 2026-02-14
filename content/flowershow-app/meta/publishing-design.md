# Publishing with Flowershow - Design

Designing the Flowershow publishing experience.

# User Experience

### General Approach

- You have your content [in obsidian]
- You install X where X can be obsidian plugin, Flowershow app template, Flowershow command line tool
- Publish
- View and share

### Obsidian plugin

- You have your content [in obsidian]
- You install flowershow plugin
- You configure the plugin with flowershow token
  - Do any other configuration
- Publish button (and do this each time you want to republish)
- Get a link: https://xyz.flowershow.sites
- Wait for (re)build
- Share the link with your colleagues
- Profit!

### Self-publishing via github

(? with Semi-wizard for github action setup)

- you have content in github
- enable github pages
- install this github action
- run it
- Hey presto

[Note: if people will to install the flowershow template then they could use netlify / vercel etc]

### Self-publishing in the rawest way

Original example below. See [[flowershow-setup-v0.0.1-for-alpha-users-june-2022]] for full gory details atm.

1. You have a have some markdown files (and maybe data). Preferably in a git repo.
2. You install the flowershow app template (later this could be encapsulated in a command line tool)
3. You configure the app with your content in step 1
4. You deploy: self-service (to your static site hoster of choice) or cloud (using flowershow tooling)
5. [Share the result]

### Command line or app + cloud ⏫

- Have your content on disk
- Download `flowershow` app/cli (`npm install flowershow` or even `npx flowershow publish` or download it)
- In your directory run `flowershow publish [filename]`
- Get a response like: live at https://xyz.flowershow.sites/

## Original Example

This is an illustrative example of how it works. There are 4 steps:

1. You have a have some markdown files (and maybe data). Preferably in a git repo.
2. You install the flowershow app template (later this could be encapsulated in a command line tool)
3. You configure the app with your content in step 1
4. You deploy: self-service (to your static site hoster of choice) or cloud (using flowershow tooling)
5. [Share the result]

### 0. I have my repo e.g.

/README.md
[data.csv]
[/notes # more markdown]

### 1. Install a template

Template would be a nextjs app template

i.e. a git repo with a working nextjs

### 2. Integrate the content from step 0

e.g. configure that template or symlink files

See e.g. https://github.com/datopian/portal.js/blob/main/examples/data-literate/datahub-portal-local-cli.js

### 3. Deploy

Self-service => instructions for cloudflare pages, vercel, etc

Cloud => install our plugin (e.g. in obsidian) / use our service (point our service at your git repo)

### 4. Share

Share the result with others: "here's my site ..."

# Notes

## 2022-09-14

Choices about how to deploy

```mermaid
graph TD

a[I want to self-publish]
b[I want to cloud publish]
```

Option 1: "NextJS template option"

Best:

- if you are happy with git, nextjs etc
- if you want to customize "under the hood" a lot

```
# first time only
npx flowershow install
# add flowershow permanently to my git repo including symlinks
git add .flowershow/*

# configure nextjs build on vercel, netlify, github actions, (❌ cloudflare because issues with symlink and root folders)
```

Option 2: "Flowershow as a build tool"

Best

- Want simplicity
- Ease of upgrading
- if you arent' familiar with git, nextjs etc

Self-publishing

```
# future: this could be wrapped into build (ie. install if not present already)
npx flowershow install
npx flowershow build ...

# now instructions to user on how to publish their files
```

Cloud publishing

```
npx flowershow publish

# output
https://xyz-happy-days.sites.flowershow.app
```
