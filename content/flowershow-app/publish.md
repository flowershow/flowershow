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
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-6xl">Turn local files into websites</h1>
      <p className="mt-8 text-pretty text-lg text-gray-500 sm:text-xl/8">Skip the repository. Skip the dashboard. Flowershow CLI lets you publish any folder of Markdown files directly from your terminal. It's built for moments when you just want a URL, not a project.</p>
      <p className="mt-4 text-pretty text-lg text-gray-500 sm:text-xl/8">Also great for automated publishing, with scripts or by your AI agent.</p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="/docs/cli"
          className="rounded-md bg-orange-400 px-3.5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-300"
        >Read the Docs</a>
        <a href="/blog/announcing-flowershow-cli" className="text-sm/6 font-semibold text-gray-900">Read the Announcement <span aria-hidden="true">→</span></a>
      </div>
      <div className="mt-16 flex justify-center w-full">
        <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow-lg ring-1 ring-gray-900/10">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src="https://www.youtube.com/embed/ou1bigOIlPk"
            title="Flowershow CLI Demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</div>

<div className="bg-gray-50 py-12 sm:py-24 my-12 rounded-3xl mx-6 lg:mx-8">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Get started in 4 steps</h2>
      <p className="mt-6 text-lg/8 text-gray-600">You don't need a git repo or a build pipeline. You just need a folder/file.</p>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-y-16">
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">1</div>
            Install
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <div className="bg-gray-900 text-slate-200 p-4 rounded-md overflow-x-auto text-sm font-mono">npm i -g @flowershow/publish</div>
            <p className="mt-4">Get the global binary. Requires Node.js</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">2</div>
            Login
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <div className="bg-gray-900 text-slate-200 p-4 rounded-md overflow-x-auto text-sm font-mono">publish auth login</div>
            <p className="mt-4">Authenticates via browser. You only do this once.</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">3</div>
            Publish
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <div className="bg-gray-900 text-slate-200 p-4 rounded-md overflow-x-auto text-sm font-mono">
              publish ./my-folder<br/>
              <span className="text-gray-500"># OR</span><br/>
              <span className="text-gray-500"># publish ./my-file.md</span>
            </div>
            <p className="mt-4">Publish your files and folders to the web.</p>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-400 text-white font-bold">4</div>
            Sync changes
          </dt>
          <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
            <div className="bg-gray-900 text-slate-200 p-4 rounded-md overflow-x-auto text-sm font-mono">
              publish sync ./folder-file
            </div>
            <p className="mt-4">We diff your files and upload only what changed.</p>
          </dd>
        </div>
      </dl>
    </div>

  </div>
</div>

<div className="py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-balance">Why use the CLI?</h2>
    </div>
    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-y-16">
        <div className="relative pl-16">
          <dt className="text-base font-semibold leading-7 text-gray-900">
            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <span className="text-2xl">📄</span>
            </div>
            Just Files
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
            Don't break your writing flow to switch to a browser. Write in your editor -> run `publish` -> share URL -> keep going.
          </dd>
        </div>
      </dl>
    </div>
  </div>
</div>
