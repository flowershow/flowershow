---
title: Flowershow Publish
description: Publish your files and folders directly from the terminal with the Flowershow CLI. No config, no UI, just publish.
layout: plain
showToc: false
showComments: false
showEditLink: false
---

<div className="py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">Publish Markdown directly from your terminal.</h1>
      <p className="mt-6 text-pretty text-lg text-gray-500 sm:text-xl/8">Open-source CLI tool to publish Markdown and HTML straight from the command line. Perfect for power users and AI agents. Get a shareable URL in seconds.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://flowershow.app/docs/cli"
          className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >Install now</a>
        <a
        href="#demo"
        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2">Learn more →</a>
      </div>
    </div>
    <div id="demo" className="mt-12 max-w-6xl mx-auto flow-root sm:mt-16">
      <div className="relative aspect-video w-full">
        <iframe className="absolute inset-0 w-full h-full rounded-md" src="https://www.youtube.com/embed/x6XsC2njFnU?si=zpgL-9BCrDWw6lS0" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullscreen></iframe>
      </div>
    </div>
  </div>
</div>

<div className="bg-gray-50 py-12 sm:py-24 my-12 rounded-3xl mx-6 lg:mx-8">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Publish in one command</h2>
      <p className="mt-6 text-lg/8 text-gray-600">No git repo, no build pipeline. Just run <code>fl</code> — you'll get a shareable URL in seconds.</p>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-y-16">
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">1</div>
            Publish
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <div className="bg-gray-900 text-slate-200 p-4 rounded-md overflow-x-auto text-sm font-mono">fl ./my-folder</div>
            <p className="mt-4">Your site goes live instantly. You get a shareable URL — works with a single file too.</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">2</div>
            Republish
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <div className="bg-gray-900 text-slate-200 p-4 rounded-md overflow-x-auto text-sm font-mono">fl ./my-folder</div>
            <p className="mt-4">Same command updates your site. We diff locally and upload only what changed.</p>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</div>

<div className="mx-auto max-w-7xl px-6 lg:px-8">
  <div id="demo" className="mt-12 max-w-6xl mx-auto flow-root sm:mt-16">
    <iframe className="w-full rounded-md" width="560" height="315" src="https://www.youtube.com/embed/E9z0zLewoAM?si=J7LDLnPoh3tG_ZRJ" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullscreen></iframe>
  </div>
</div>

<div className="py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Why publish from the terminal?</h2>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-y-16">
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">📄</span>
            </div>
            No Setup Required
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            No `git init`. No config files. No "setting up a project". If you have a folder of Markdown on your computer, you can publish it.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">⚡</span>
            </div>
            Instant
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            No build pipelines. No waiting for a server to clone your repo. The CLI uploads your local files fast and diffs your files locally when you update them and uploads only what changed.
          </dd>
        </div>
         <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">🤖</span>
            </div>
            Automation Ready
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Since it's just a command, it's perfect for scripts, cron jobs, or AI agents that need to publish content without a human clicking a UI.
          </dd>
        </div>
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
             <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">🏃</span>
            </div>
            Stay in Flow
          </dt>
          <dd className="mt-2 text-base leading-7 text-gray-600">
            Don't break your writing flow to switch to a browser. Write in your editor -> run `fl` -> share URL -> keep going.
          </dd>
        </div>
      </dl>
    </div>
  </div>
</div>
