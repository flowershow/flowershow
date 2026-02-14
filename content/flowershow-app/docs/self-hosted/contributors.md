---
title: Developer docs for contributors
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

## Our repository

https://github.com/flowershow/flowershow

Structure:

- **packages**
  - **cli**
  - **template**: Flowershow template installed by the CLI
  - **template-e2e**: E2E tests for the template
  - **core**: Flowershow template's core components
  - **remark-embed**: remark plugin for you tube embeds
  - **remar-callouts**: remark plugin for Obsidian callouts/admonitions
  - **remark-wiki-link**: remark plugin for Obisidian wiki-links
  - **markdowndb**: replacement for Contentlayer; our custom "content layer"
- **site**: the content of our website
  - **content**: all the content you can see on our website
- **scripts**: some utility scripts

## How to contribute

You can start by checking open [issues in our repo](https://github.com/datopian/flowershow/issues).

If you'd like to work on one of them:

1. Comment on the issue to let us know you'd like to work on, so that we can assist you and to make sure no one has started looking into it yet.
2. If good to go, fork the main repository.
3. Clone the forked repository to your machine.
4. Create a feature branch (e.g. `50-update-readme`, where `50` is the number of the related issue).
5. Commit your changes to the feature branch.
6. Push the feature branch to your forked repository.
7. Create a Pull Request against the original repository.
   - add a short description of the changes included in the PR
8. Address review comments if requested by our demanding reviewers 😜.

If you have an idea for improvement, and it doesn't have a corresponding issue yet, simply submit a new one.

## Package manager

We're using `pnpm` package manager.

You can install it using npm:

```
npm i -g pnpm
```

Then you can run the following command anywhere in this repository to install all projects' dependencies:

```
pnpm install
# or pnpm i
```

You can also try installing the dependencies offline from your local pnpm store:

```
pnpm i --offline
```

To install a dependency of the workspace (root):

```
pnpm add <pkg>
```

To install a dev dependency of the workspace (root):

```
pnpm add -D <pkg>
```

You can run the above commands for a specific package by using `--filter` (or `-F`) flag along with the name of a package (you can find it in its package.json file), e.g:

```
pnpm add <pkg> -F @flowershow/template
```

See [the official pnpm docs](https://pnpm.io/) to learn more.

## Nx

Our monorepo is set up with Nx build system. See their [official documentation](https://nx.dev/getting-started) to learn more.

### Tasks

Each project within this repository has a `project.json` file, which defines all targets that can be run on this project.

A target is an action that can be taken on a project.
A task is a single target run on a given project.

#### Running single tasks

To run a single target on a given project run:

```sh
pnpm nx <target> <project>
# e.g. pnpm nx e2e cli
```

#### Running multiple tasks

To run a given target on all projects that define it, run:

```sh
pnpm nx run-many --target=<target>
# e.g. pnpm nx run-many --target=e2e
```

#### Running tasks affected by your changes

When you run `nx affected --target=<some-target>`, Nx looks at the files you changed (compares current HEAD vs base), and it uses this to figure out the list of projects in the workspace that may be affected by this change. It then runs the run-many command with that list.

```sh
pnpm nx affected --target=<target>
# e.g. pnpm nx affected --target=e2e

# or
# pnpm nx affected:<target>
# e.g. pnpm nx affected:e2e
```

> To learn more about how Affected works, read [this Nx docs page](https://nx.dev/concepts/affected#how-affected-works).

### Linting and formatting

Nx uses eslint for code linting and prettier for code formatting. There is a base `eslintrc.json` file in the root of this repository that defines global eslint configs. Each project can have its own `eslintrc.json` for project-specific eslint configurations.

To lint the code in a single project:

```sh
pnpm nx lint <project>
# pnpm nx lint cli
```

To lint all projects:

```
pnpm nx run-many --target=lint
```

To check code formatting in selected projects:

```sh
pnpm nx format:check --projects=<array of projects>
# pnpm nx format:check --projects=cli,template
```

To check code formatting in all projects:

```sh
pnpm nx format:check --all
# or
# pnpm nx format
```

To fix code formatting in selected projects:

```sh
pnpm nx format:write --projects=<array projects>
# pnpm nx format:write --projects=cli,template
```

To fix formatting in all projects:

```sh
pnpm nx format --all
# or
# pnpm nx format:write --all
```

> To learn more about all the available options for the format command, see [format:check](https://nx.dev/nx/format-check) and [format:write](https://nx.dev/nx/format-write) docs pages.

### Creating a library

To create a new publishable js library:

```sh
pnpm nx g @nrwl/node:lib --js --publishable --importPath @flowershow/<library-name>
```

### Dependency graph

To see the graph of dependencies between the projects within this repository, run:

```sh
pnpm nx graph
```

### Caching

Nx by default uses local computation cache to store results of the tasks it has run.

This repository is also configured with Nx Cloud, which means you can read from the results cached in it.

You need to have an access token to be able to also write to this cache. It can be set in `nx-cloud.env` (see `nx-cloud.env.example` for reference).

### Configuration

The entry point of Nx's configuration is the `nx.json` file in the root of this repository. It defines global configurations as well default configurations for projects targets.

To learn more see this [official docs page](https://nx.dev/reference/nx-json).

Each project also has it's own configuration file - `project.json`, where you can define and configure it's targets (and more).

To learn more see this [official docs page](https://nx.dev/reference/project-configuration).

## Changesets and publishing packages

> This monorepo is set up with changesets versioning tool. See their [github repository](https://github.com/changesets/changesets) to learn more.

### What are Changesets?

Changesets are files that describe the intention of a contributor to change a version of the package according to their changes, and provide a description of those changes, which will be added to the package changelog just before publishing new version of the package.

### Workflow

1. Contributors add changesets files along with the changes they make.

2. After reviewing the changesets and at an agreed time the version command is run.

3. The publish command is run afterwards.

### Adding changesets

In the root directory of the repo, run:

```
pnpm changeset
```

The description of the changes related to the changelog you're adding should be written with end users and other developers in mind. Please make sure to add the most accurate but also concise information.

To learn about semantic versioning standards see [this semver doc page](https://semver.org/).

> [!NOTE] Not every change (commit or PR) requires a changeset file
> Some small changes to docs or other really minor changes to code, that don't affect how packages work e.g. any changes made to `/site` folder, or changes to developer dependencies configurations.

### Versioning and publishing

> This should only be done after all the files in the `.changeset` folder are reviewed by a designated person and at a pre-agreed time.

```
pnpm changeset version
```

This command will consume all the files in the `.changeset` folder, update packages to the most appropriate semver versions based on change types specified in their related changeset files (e.g. `"@flowershow/remark-embed": patch`) and will write changelog entries in their `CHANGELOG.md` files.

To ignore changeset files of some packages (e.g. we don't want to version bump them yet), you can run:

```
pnpm changeset version --ignore @flowershow/template
```

After running version command, both all the version bumps and changelog entries of the changed packages should be reviewed before committing changes made by the command. If needed, changelog entries should be manually adjusted to provide the most accurate description of the changes included in the new release. If everything is correct, packages can be published by running:

```
pnpm nx publish <project-name>
# pnpm nx publish cli
```

If you want to check what's going to be published, before actually publishing to npm:

```
pnpm nx publish:dry <project-name>
```

> [!NOTE] > `nx publish` (and `nx publish:dry`) command will automatically re-build the package first, if any of its source files (or source files of other workspace projects it depends on) changes.

## Styling and Tailwind

When styling components using tailwind use named semantic colors and fonts which are defined in `tailwind.config.js`. This makes it easy to change colors and fonts across the whole site in one place. For example, use `text-primary` rather than a named color from tailwind palette.

We currently have definitions for fonts (sans, serif, mono, headings) and for colors (`background`, `primary`, `secondary`).

```js
  theme: {
    fontFamily: {
      'sans': ['ui-sans-serif', 'system-ui', ...], # changes default and body font
      'serif': ['ui-serif', 'Georgia', ...],
      'mono': ['ui-monospace', 'SFMono-Regular', ...],
      'headings': ['Oswald', ...],
    }
  },
  colors: {
    background: {
      DEFAULT: colors.black,
      dark
   },
   primary: {
     DEFAULT: ...
     dark:
   },
   secondary: {
     DEFAULT: ...
     dark:
   }
```

### Example

For example, rather than doing this (uses `text-black`):

```jsx
<div className="ml-3">
  <p className="text-sm font-medium text-black dark:text-white">...</p>
</div>
```

Do this:

```jsx
<div className="ml-3">
  <p className="text-sm font-medium text-primary dark:text-primary-dark">...</p>
</div>
```
