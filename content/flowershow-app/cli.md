---
title: Flowershow CLI
description: Publish Markdown and HTML files and folders directly from the terminal with fl, the Flowershow CLI. No config, no UI, just publish.
layout: plain
showToc: false
showComments: false
showEditLink: false
---

<div className="fs-root lp-cli">
  <div id="top">
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy reveal">
          <a className="pill" href="/publish-with-ai">🤖 New — publish with your AI agent <span className="arw">→</span></a>
          <h1>Publish Markdown and HTML from your terminal.</h1>
          <p className="lede">One command, a shareable URL in seconds. Built for power users and AI agents.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="/docs/reference/cli#installation">Install now <span className="arw">→</span></a>
            <a className="btn btn-secondary" href="#demo">Watch demo <span className="arw">→</span></a>
          </div>
          <p className="microcopy"><b>Free forever</b>, no credit card required</p>
        </div>
        <div className="hero-media-term reveal">
          <div className="term">
            <div className="term-bar">
              <i></i><i></i><i></i>
              <span className="term-title">zsh — my-notes</span>
            </div>
            <div className="term-body">
              <div className="ln cmd">fl ./my-notes</div>
              <div className="ln muted">Scanning 12 files…</div>
              <div className="ln ok">✓ Uploaded 12 files in 3.2s</div>
              <div className="ln">→ Live at <span className="url">my-notes-yourname.flowershow.me</span></div>
              <div className="ln cmd">fl ./report.html</div>
              <div className="ln ok">✓ Uploaded 1 file</div>
              <div className="ln">→ Live at <span className="url">report-yourname.flowershow.me</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="how">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Publish in one command.</h2>
          <p>No git repo, no build pipeline. Just run <code>fl</code>.</p>
        </div>
        <div className="steps cli-steps reveal">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Install</h3>
            <div className="cmd-line">curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh</div>
            <p>One binary, <code>fl</code>, for macOS and Linux. Then run <code>fl login</code>. On Windows, <a href="/docs/reference/cli#installation">download the zip</a>.</p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Publish</h3>
            <div className="cmd-line">fl ./my-folder</div>
            <p>Your site goes live at a shareable URL. Works with a single file too, like <code>fl ./report.html</code>.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Republish</h3>
            <div className="cmd-line">fl ./my-folder</div>
            <p>The same command updates your site. We diff locally and upload only what changed.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="demo">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Demo</span>
          <h2>See it go from folder to live site.</h2>
        </div>
        <div className="demo-media reveal">
          <iframe src="https://www.youtube-nocookie.com/embed/E9z0zLewoAM?rel=0" title="Flowershow CLI — a real publish walkthrough" loading="lazy" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullscreen></iframe>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="why">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Why the terminal</span>
          <h2>Why publish from the terminal?</h2>
        </div>
        <div className="concept-grid reveal">
          <div className="concept-card">
            <span className="ic">📄</span>
            <h3>No setup required</h3>
            <p>No <code>git init</code>, no config files, no project setup. If it's a file or folder on your computer, you can publish it.</p>
          </div>
          <div className="concept-card">
            <span className="ic">⚡</span>
            <h3>Instant</h3>
            <p>No build queue and no server cloning your repo. Files upload straight from your machine.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🤖</span>
            <h3>Automation ready</h3>
            <p>It's just a command, so scripts, cron jobs and AI agents can publish without anyone clicking through a UI.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🏃</span>
            <h3>Stay in flow</h3>
            <p>Don't break your writing flow to switch to a browser. Write in your editor, run <code>fl</code>, share the URL, and keep going.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="final">
      <div className="wrap">
        <div className="final-card reveal">
          <h2>Files to URL. Straight from your shell.</h2>
          <p>Install the CLI and publish your first site in seconds.</p>
          <a className="btn btn-primary" href="/docs/reference/cli#installation">Install now <span className="arw">→</span></a>
          <p className="fine">Open source · Free plan, forever</p>
        </div>
      </div>
    </section>
  </div>
</div>
