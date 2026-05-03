---
title: Publish from GitHub
description: Connect a GitHub repository to Flowershow and publish automatically whenever you push.
layout: plain
showToc: false
showComments: false
showEditLink: false
---

<div className="py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-6xl">Push to publish</h1>
      <p className="mt-8 text-pretty text-lg text-gray-500 sm:text-xl/8">Connect your GitHub repository once and your site stays in sync automatically. No separate content system, no copy-paste, no drift — your repo is the source of truth.</p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="https://cloud.flowershow.app"
          className="rounded-md bg-orange-400 px-3.5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-300"
        >Get Started</a>
        <a href="/docs/getting-started" className="text-sm/6 font-semibold text-gray-900">Read the Docs <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </div>
</div>

<div className="bg-gray-50 py-12 sm:py-24 my-12 rounded-3xl mx-6 lg:mx-8">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Get started in 4 steps</h2>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-y-16">
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">1</div>
            Create your site
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <p>Go to <a href="https://cloud.flowershow.app" className="text-orange-400 hover:text-orange-300">cloud.flowershow.app</a>, click <strong>New Site</strong>, and give it a name.</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">2</div>
            Connect GitHub
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <p>Select <strong>Sync with GitHub</strong>, then choose your repository and branch.</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">3</div>
            Set a root directory (optional)
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <p>Publishing only <code>/docs</code> from a code repo? Set the root directory and Flowershow publishes just that folder.</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">4</div>
            Push to update
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <p>Commit and push like you always do. Your site syncs automatically on every push.</p>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</div>

<div className="py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Built for...</h2>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3 lg:gap-y-16">
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">✏️</span>
            </div>
            Personal sites & blogs
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Write in your editor, commit, push. Your site updates while you stay in your git flow.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">👥</span>
            </div>
            Team wikis & docs
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Collaborate via PRs and commits. No CMS accounts needed — Git is the workflow.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">📦</span>
            </div>
            Open-source projects
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Already have a <code>/docs</code> folder in your repo? Set it as root directory and publish just your documentation.
          </dd>
        </div>
      </dl>
    </div>
  </div>
</div>

<div className="bg-gray-50 py-12 sm:py-24 my-12 rounded-3xl mx-6 lg:mx-8">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Once you're live</h2>
      <p className="mt-6 text-lg/8 text-gray-600">Your site is ready to customize. Here's what you can do next.</p>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:gap-y-8">
        <div className="flex gap-x-4">
          <div className="min-w-0">
            <dt className="text-base font-semibold leading-7 text-gray-900"><a href="/docs/themes" className="hover:text-orange-400">Themes</a></dt>
            <dd className="text-sm leading-6 text-gray-600">Choose a visual style for your site.</dd>
          </div>
        </div>
        <div className="flex gap-x-4">
          <div className="min-w-0">
            <dt className="text-base font-semibold leading-7 text-gray-900"><a href="/docs/navbar" className="hover:text-orange-400">Navbar & sidebar</a></dt>
            <dd className="text-sm leading-6 text-gray-600">Configure navigation links and structure.</dd>
          </div>
        </div>
        <div className="flex gap-x-4">
          <div className="min-w-0">
            <dt className="text-base font-semibold leading-7 text-gray-900"><a href="/docs/custom-styles" className="hover:text-orange-400">Custom styles</a></dt>
            <dd className="text-sm leading-6 text-gray-600">Tweak colors, fonts, and layout with CSS variables.</dd>
          </div>
        </div>
        <div className="flex gap-x-4">
          <div className="min-w-0">
            <dt className="text-base font-semibold leading-7 text-gray-900"><a href="/docs/custom-domain" className="hover:text-orange-400">Custom domain</a> <span className="text-xs font-medium text-orange-400">Premium</span></dt>
            <dd className="text-sm leading-6 text-gray-600">Publish on your own domain.</dd>
          </div>
        </div>
        <div className="flex gap-x-4">
          <div className="min-w-0">
            <dt className="text-base font-semibold leading-7 text-gray-900"><a href="/docs/comments" className="hover:text-orange-400">Comments</a></dt>
            <dd className="text-sm leading-6 text-gray-600">Let readers leave feedback on your pages.</dd>
          </div>
        </div>
        <div className="flex gap-x-4">
          <div className="min-w-0">
            <dt className="text-base font-semibold leading-7 text-gray-900"><a href="/blog/announcing-full-text-search" className="hover:text-orange-400">Full-text search</a> <span className="text-xs font-medium text-orange-400">Premium</span></dt>
            <dd className="text-sm leading-6 text-gray-600">Help visitors find anything across your site.</dd>
          </div>
        </div>
      </dl>
    </div>
  </div>
</div>
