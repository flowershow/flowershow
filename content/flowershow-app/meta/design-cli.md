# Design of Flowershow Command Line

Overview of the command line experience

```
mkdir my-garden
cd my-garden
vi index.md
# add some content

npx flowershow install
npx flowershow build

# or if cloud publishing
npx flowershow publish
```

Recommended layout for your digital garden

```
components
content
```

But you can do anything ... (we just have to symlink stuff into the right places)

Key commands:

- `install`: install flowershow app
- `preview`: live preview of your flowershow site
- `build`: build flowershow site locally
- `publish`: publish your flowershow site on flowershow cloud - see [[meta/publishing-design]]

Other aspects of UX (not yet addressed):

- Upgrading
- Uninstalling
- Configuration

### Install

- degit seems one of the most efficient ways to get the template down
- degit does overwrite
- ? degit won't remove old files

```bash=
mkdir -p .flowershow/app
cd .flowershow/app
npx degit flowershow/flowershow/templates/default

# symlink content directory
ln -s ../../ content
ln -s ../../components components/custom
ln -s ../../assets public/assets
```

### Preview

```
flowershow run
```

What it does

```
cd .flowershow/app
npm run dev
open localhost:3000
```

### Upgrade

```
flowershow upgrade
```

How it works

```
npx degit flowershow/flowershow/templates/default --force
```

### Publish

```
flowershow publish
```


# Notes

## What about package.json conflicts on upgrade - 2022-09-30

How to package.json - because the user might have added packages ...

one way to solve that is to publish flowershow as a package with all dependencies ...

What about conflicts with base packages e.g. we are installing nextjs and the user is too ...)

=> Long story, short: we need to be able to update package.json - learn from pliny/blitzjs

In templates/default

```
# package.json

dependencies: {
  "@flowershow/template-default": "0.1.0"
}
```

package.json for templates/default "package"

```
dependencies: {
  "next": ...

}
```

```bash
templates/default
  package.json
  components
  ...
templates/fancy
  package.json
  components
packages/template-default
  package.json
packages/template-default
```

## Alpha Product Design (CLI) - 2022-08-24

See [[notes/upgrading-template-apps]]

- Installation / initialization
  - NB: We are going for the all in one so no need for a scaffolder
- Upgrading: main issue is conflicts
  - Merges: user and flowershow have changed a file => try and avoid user changing the file

Imagine the perfect world

```
mkdir my-garden
cd my-garden
vi index.md
# add some content

flowershow init
```

Recommended layout for your digital garden

```
components
content
```

But you can do anything ... (we just have to symlink stuff into the right places)

### Init

- degit seems one of the most efficient ways to get the template down
- degit does overwrite
- ? degit won't remove old files

```bash=
mkdir -p .flowershow/app
cd .flowershow/app
npx degit flowershow/flowershow/templates/default

# symlink content directory
ln -s ../../ content
ln -s ../../components components/custom
ln -s ../../assets public/assets
```

### Run

```
flowershow run
```

What it does

```
cd .flowershow/app
npm run dev
open localhost:3000
```

### Upgrade

```
flowershow upgrade
```

How it works

```
npx degit flowershow/flowershow/templates/default --force
```

### Publish

```
flowershow publish
```

## Mock-out of install / upgrade - 2022-07-16

In this case upgrading an existing NextJS app to use Flowershow.

```bash=
mkdir ecosystem-new
cd ecosystem-new

# flowershow install
npx create-next-app --example=https://github.com/flowershow/flowershow/templates/default .
mkdir content
echo `export default {}` > content/userConfig.js
echo getflowershowgitcommithash > .flowershow/version

# manual
cp -a ../ecosystem-old/content ./
cp -a ../ecosystem-old/pages/
cp -a ../ecosystem-old/components/Vis.js components/

# a week later, new features have been released in flowershow and i want to use them

flowershow upgrade

# in a perfect world i just download the latest flowershow e.g.

mkdir /tmp/flowershow-latest
npx create-..

# issues
package.json - because the user might have added packages ...
package-lock.json

# one way to solve that is to publish flowershow as a package with all dependencies ...

# and then just change package.json flowershow version

other place there may be conflict

pages/_app.js
```
