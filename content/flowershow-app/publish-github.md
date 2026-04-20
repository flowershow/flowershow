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
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-6xl">Your GitHub repo is your CMS</h1>
      <p className="mt-8 text-pretty text-lg text-gray-500 sm:text-xl/8">Connect once, push to update. No separate content system, no copy-paste, no drift — your repository is the source of truth and your site stays in sync automatically.</p>
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
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Your workflow, unchanged</h2>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-y-16">
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">✏️</span>
            </div>
            Edit anywhere
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Local editor, GitHub UI, or a pull request. Flowershow doesn't care how you write — it just watches for pushes.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">🔄</span>
            </div>
            Push to publish
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Every push triggers an automatic sync. No manual deploys, no dashboard clicks, no waiting.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">📁</span>
            </div>
            Publish part of a repo
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Set a root directory to publish only <code>/docs</code> from a code repo. Your app code stays private.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">🌿</span>
            </div>
            Pick your branch
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Point Flowershow at any branch — main, staging, or a preview branch for drafts.
          </dd>
        </div>
      </dl>
    </div>
  </div>
</div>
