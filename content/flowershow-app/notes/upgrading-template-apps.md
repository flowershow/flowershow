# Upgrading Template Apps - Challenges

# Challenge of Upgrading Template Apps

This is a general problem of compositional apps or template apps.

NB: there's both an upgrade problem and a distinct creation problem.

Upgrade problem: once i've installed my "app" it is very painful to upgrade it - requires manual diffing/copy-pasting. Why? because have made changes for configuration and extension - thus cannot cleanly copy in new stuff.

Creation problem: i have a menu of N different features of which i want some subset M. Either i have to have preconfigured a template with just those M features (which implies $|P(N)|$ templates) or user has to create what they want from examples of each of N features (the current approach of nextjs).

## Problem illustrated

![challenge-of-upgrading-template-app-2022-05-09.excalidraw](../Excalidraw/challenge-of-upgrading-template-app-2022-05-09.excalidraw.svg)

## Examples of it happening elsewhere

### timlrx/nextjs-starter-blog

See this issue happening for nextjs-starter blog: https://github.com/timlrx/tailwind-nextjs-starter-blog/issues/454

See also author's comment about new version: https://github.com/timlrx/tailwind-nextjs-starter-blog/issues/486

They are solving it using https://github.com/timlrx/pliny

![](../assets/Pasted%20image%2020220622113830.png)

### Svelte-add

Same problem arises for svelte-kit. There is a project addressing this: https://github.com/svelte-add/svelte-add - though almost entirely focused on creation not upgrading (and creation is also limited to creation at the start).

As they eloquently explain:

> This is a community project to easily add integrations and other functionality to Svelte apps. Its goal is to solve the problems with downloading templates to start your app from:
>
> - You have to want *all* the functionality a template includes—no more, no less.
>
>   `svelte-add` has app initializers that let you select the exact integrations wanted: `npm init @svelte-add/kit@latest`
>
> - You have to fall back on following a third party tutorial that could be outdated or take a lot of work to add things missing from that template.
>
>   `svelte-add`'s "tutorials" are one step: `npx --yes svelte-add@latest graphql-server`
>
> - You have to rely on the maintainer keeping the template updated as the tools it uses change and the official Svelte app template it was built on changes.
>
>   `svelte-add`'s app initializers are always built on top of the latest version of the official Svelte app templates. Of course it still needs to be maintained as tools change (like Tailwind JIT or the future rewrite of mdsvex), but because it is in a central location and contributed to by many people, problems are found quickly, and fixes are for everyone—not just one specific template.

### BlitzJS

From https://blitzjs.com/docs/why-blitz

> **Code scaffolding** means initial code is scaffolded into your project for you. From then on, you have full ownership over all the code and can customize it as much you need. **A downside of code scaffolding is that you don't get automatic updates like you do with code generation from a third-party library.** But the huge upside is that you are guaranteed to never be limited by someone else's design choices which you have no way to change. [emphasis added]
>
> Blitz is a huge fan of code scaffolding. We have a whole slew of [`blitz generate`](https://blitzjs.com/docs/cli-generate) commands for scaffolding code into your project. It's still early days for our code scaffolding — we have a lot of powerful features that still need to be added, including the ability to add your own custom scaffold templates.

Then see https://blitzjs.com/docs/why-blitz#5-recipes

> Recipes are one-line commands for scaffolding code into your project from an MDX recipe on npm or a git repository.
>
> ...
>
> Recipes are super powerful. They can change almost anything in your project, including adding dependencies, changing code, adding code, etc. They are written via MDX and can be composed like React components.

###

## How to solve

### What's the source of the problem?

In short: coupling. Different features both involve code in same files (in e.g. nextjs) so installing means overlap which makes automated installation and upgrade hard.

3 things involved here:

- Content / Data
- Core app (cms)
- Extra functionality

Classically we solve by separating these three.

- Content and data => database with clean API
- App => under control of original author and can be upgraded by install new version
  - Do content / data upgrades automatically
- Extra functionality: via plugins etc

NTS

- Issue in nextjs is you often have to do something in `_app.js to` to get the result you need. This isn't upgradeable / scalable (things start to interfere). Easiest way to solve would be some kind of plugin hook around key activities there.
- Otherwise, in theory, one could go a component route ?? (so install a lib)

## How to solve

May not be fully solvable but can be made a lot better.

- Cleanly separate content and data => walk back from putting your content in pages directory if at all possible
  - TODO: no way round this for js content. But all markdown and other content should be outside of pages. Plus mark core CMS-related js pages as "untouchable"
  - this also suggests for content heavy projects that the the cms part is hidden in subdirectory
- Make everything components and libraries that you can
- API-ify / plugin-ify key connection points e.g. the config file and make it upgradeable

You can also go radical and just make stuff much less tweakable - which may mean bloating the core app but so be it.

Advantage of this route is stuff "just works". Downside is it really doesn't scale in features - so either features need to be able to stay pretty reasonably limited => a relatively fixed product usecase.
