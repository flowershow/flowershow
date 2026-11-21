---
title: "Publish a Changelog from Markdown"
description: "Turn a CHANGELOG.md or a changelog folder into a timeline page with versions, authors, entry pages, RSS and social cards. A free alternative to hosted changelog tools. No config."
layout: plain
showToc: false
showEditLink: false
showComments: false
---

<div className="fs-root lp-changelog">
  <div id="top">
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy reveal">
          <span className="uc-badge"><span className="uc-pre">Flowershow for:</span><span className="uc-name">Changelogs</span></span>
          <h1>Turn your CHANGELOG.md into a changelog page.</h1>
          <p className="lede">Keep the <code>CHANGELOG.md</code> you already have and Flowershow renders it as a timeline, with an anchor link for every version. Or write one Markdown file per update in a <code>changelog</code> folder, and each entry gets its date, authors, image and its own page. Free to start; your own domain on Premium.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="https://cloud.flowershow.app/login">Get started <span className="arw">→</span></a>
            <a className="btn btn-secondary btn-google" href="https://cloud.flowershow.app/login?provider=google">
              <svg className="g-ico" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </a>
            <a className="btn btn-secondary" href="/changelog">See it live <span className="arw">→</span></a>
          </div>
          <p className="microcopy"><b>Free forever</b>, no credit card required</p>
        </div>
        <div className="hero-media reveal">
          <img className="hero-img" src="/assets/uses/changelogs/flowershow-changelog.webp" alt="The Flowershow changelog: a timeline of updates with dates, authors and screenshots" loading="eager" />
        </div>
      </div>
    </section>
    <section className="section" id="two-ways">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">No config</span>
          <h2>Two ways to write it.</h2>
          <p>Pick the one that fits how you ship. Both render as the same timeline.</p>
        </div>
        <div className="two-ways">
          <div className="way reveal">
            <h3>A folder of updates</h3>
            <p>One Markdown file per update in a <code>changelog</code> folder, newest first. Each entry can show a date, version, authors, summary and image, and gets its own page.</p>
            <div className="ftree" role="img" aria-label="A changelog folder with three dated Markdown files">
              <div className="ftree-row ftree-root t-dir">changelog</div>
              <ul>
                <li className="ftree-row t-md">2026-11-21-export-to-csv<span className="ext">.md</span></li>
                <li className="ftree-row t-md">2026-11-04-uk-dates<span className="ext">.md</span></li>
                <li className="ftree-row t-md">2026-10-18-duplicate-forms<span className="ext">.md</span></li>
              </ul>
            </div>
            <div className="way-shot"><img src="/assets/uses/changelogs/changelog-dense.webp" alt="A changelog folder rendered as a timeline, with dates and version labels beside each entry" loading="lazy" /></div>
            <a className="textlink" href="/docs/reference/changelog"><span className="lm-txt">Write your first entry</span> <span className="arw">→</span></a>
          </div>
          <div className="way reveal">
            <h3>One CHANGELOG.md</h3>
            <p>The file your project already has. Keep a Changelog, Changesets, release-please and conventional-changelog headings are recognized. Each version gets its own anchor, and a Compare link when its heading links to a diff.</p>
            <div className="vis-code cl-src"><span className="ln h"># Changelog</span><span className="ln">&nbsp;</span><span className="ln h">## [0.4.0] - 2026-11-21</span><span className="ln s">### Added</span><span className="ln">&#45; Export answers to CSV from any form.</span><span className="ln">&nbsp;</span><span className="ln h">## [0.3.1] - 2026-11-04</span><span className="ln s">### Fixed</span><span className="ln">&#45; Dates are read day first in UK English.</span></div>
            <div className="way-shot"><img src="/assets/uses/changelogs/changelog-file.webp" alt="A CHANGELOG.md rendered as a timeline: Unreleased first, then version 0.4.0 with its date and a Compare link" loading="lazy" /></div>
            <a className="textlink" href="/docs/reference/changelog#single-changelogmd-file"><span className="lm-txt">Publish your CHANGELOG.md</span> <span className="arw">→</span></a>
          </div>
        </div>
        <p className="ways-note reveal">Any folder or file can be a changelog: add <code>layout: changelog</code> to the file's frontmatter, or to the folder's <code>README.md</code>.</p>
      </div>
    </section>
    <section className="section" id="publish">
      <div className="wrap">
        <div className="publish-card publish-grid">
          <div className="publish-copy reveal">
            <span className="eyebrow">Ways to publish</span>
            <h2>Publish from wherever you write.</h2>
            <p className="pc-sub">Pick one. Switch later — your changelog is always plain Markdown.</p>
            <div className="publish-cta">
              <a className="btn btn-primary" href="https://cloud.flowershow.app/login">Get started <span className="arw">→</span></a>
            </div>
            <div className="publish-agent">
              <span className="pa-lead">
                <span className="pa-icons" aria-hidden="true">
                  <svg className="ag-claude" viewBox="0 0 24 24" fill="#D97757" role="img" aria-label="Claude Code" xmlns="http://www.w3.org/2000/svg"><path d="M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z" /></svg>
                  <svg className="ag-codex" viewBox="0 0 24 24" fill="#000000" role="img" aria-label="Codex" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z" /></svg>
                  <svg className="ag-cursor" viewBox="0 0 24 24" fill="#000000" role="img" aria-label="Cursor" xmlns="http://www.w3.org/2000/svg"><path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" /></svg>
                </span>
                Using an AI agent?
              </span>
              <p className="pa-copy">The Flowershow skill writes release notes and publishes them — in whichever workflow you already use.</p>
              <a className="textlink" href="/docs/agents/skills"><span className="lm-txt">Instructions for your agent</span> <span className="arw">→</span></a>
            </div>
          </div>
          <div className="wf-grid reveal">
            <div className="wf-card">
              <span className="wf-ico brand-github" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
              </span>
              <h3>GitHub</h3>
              <p>Connect the repo and your changelog republishes on every push.</p>
              <a className="wf-learn" href="/docs/getting-started/from-github"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
            <div className="wf-card">
              <span className="wf-ico brand-obsidian" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z" /></svg>
              </span>
              <h3>Obsidian</h3>
              <p>Keep release notes in your vault and publish them with the rest of your notes.</p>
              <a className="wf-learn" href="/docs/getting-started/from-obsidian"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
            <div className="wf-card">
              <span className="wf-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /></svg>
              </span>
              <h3>Drag &amp; drop</h3>
              <p>Upload your changelog folder in the browser and get a live page.</p>
              <a className="wf-learn" href="/docs/getting-started/drag-and-drop"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
            <div className="wf-card">
              <span className="wf-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19h8" /><path d="m4 17 6-6-6-6" /></svg>
              </span>
              <h3>CLI</h3>
              <p>Publish straight from the terminal. Script it if you want.</p>
              <a className="wf-learn" href="/docs/reference/cli"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="features">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Features</span>
          <h2>A real changelog, out of the box.</h2>
          <p>Everything a release-notes page needs, from the files you already write.</p>
        </div>
        <div className="bento">
          <div className="bento-card bento-index reveal">
            <div className="bento-media bg-berry">
              <img src="/assets/uses/changelogs/entry-page.webp" alt="A single changelog entry page with its date, author and screenshot" loading="lazy" />
            </div>
            <div className="bento-body">
              <h3>A page for every entry</h3>
              <p>Each update gets its own page, with links to the previous and next updates and a preview card when you share it. Link to one release, not the whole list.</p>
              <a className="ft-learn" href="/docs/reference/changelog"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
          </div>
          <div className="bento-card bento-search reveal">
            <div className="bento-media bg-lemon">
              <img src="/assets/uses/changelogs/changelog-roomy.webp" alt="A roomy changelog style with large titles and square markers, set with a few CSS variables" loading="lazy" />
            </div>
            <div className="bento-body">
              <h3>Your look</h3>
              <p>Colors and fonts come from your theme. Set spacing, columns and markers with a few CSS variables, from roomy to a dense log.</p>
              <a className="ft-learn" href="/docs/reference/changelog#styling"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
          </div>
          <div className="bento-card bento-comments reveal">
            <div className="bento-body">
              <h3>Versions and authors</h3>
              <p>Add a <code>version</code> label beside each date, and <code>authors</code> with avatars and links to their pages. In a changelog folder, the newest update comes first, ten to a page.</p>
              <a className="ft-learn" href="/docs/reference/page-authors"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
          </div>
          <div className="bento-card bento-news reveal">
            <div className="bento-body">
              <h3>Readers follow along</h3>
              <p>Turn on the RSS feed and every dated entry in a changelog folder goes into it. Turn on <code>llms.txt</code> and AI assistants can find and read your changelog as Markdown.</p>
              <a className="ft-learn" href="/docs/reference/rss-feed"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="product-site">
      <div className="wrap">
        <div className="callout reveal">
          <span className="eyebrow">Part of a product site</span>
          <h2>Your changelog, beside your docs, blog and pricing.</h2>
          <p>Keep it in the same folder as the rest of your site, and one publish updates them all. Add a landing page and you have a whole product site.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="/docs/guides/build-a-product-site">Build a product site <span className="arw">→</span></a>
            <a className="btn btn-secondary" href="/uses/product-sites">See product sites <span className="arw">→</span></a>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="showcase">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Showcase</span>
          <h2>Changelogs published with Flowershow</h2>
          <p>A few of the <span className="stat-hl">2,600+</span> sites already published.</p>
        </div>
        <div className="show-grid two">
          <div className="show-card sc-blog reveal">
            <span className="show-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg></span>
            <div className="show-thumb"><img className="show-thumb-img" src="/assets/uses/changelogs/flowershow-changelog.webp" alt="The Flowershow changelog published with Flowershow" loading="lazy" decoding="async" /></div>
            <div className="show-body">
              <span className="show-badge">Changelog</span>
              <p><span className="nm">Flowershow</span> ships its own release notes from a changelog folder, one file per update, with screenshots and authors.</p>
              <a className="show-link" href="/changelog"><span className="lm-txt">flowershow.app/changelog</span> <span className="arw">→</span></a>
            </div>
          </div>
          <div className="show-card sc-blog reveal">
            <span className="show-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg></span>
            <div className="show-thumb"><img className="show-thumb-img" src="/assets/uses/changelogs/wilber-changelog.webp" alt="The Wilber Wiki changelog published with Flowershow" loading="lazy" decoding="async" /></div>
            <div className="show-body">
              <span className="show-badge">Changelog</span>
              <p><span className="nm">Wilber Wiki</span>, a wiki of Ken Wilber's ideas, logs every new figure and page in its changelog.</p>
              <a className="show-link" href="https://wilber.wiki/changelog"><span className="lm-txt">wilber.wiki/changelog</span> <span className="arw">→</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="final">
      <div className="wrap">
        <div className="final-card reveal">
          <span className="petal p1" aria-hidden="true">💐</span>
          <span className="petal p2" aria-hidden="true">💐</span>
          <h2>Markdown to URL. Instantly. Free.</h2>
          <p>Join the writers, researchers, and teams behind 2,600+ sites already published with Flowershow.</p>
          <a className="btn btn-primary" href="https://cloud.flowershow.app/">Get started <span className="arw">→</span></a>
          <p className="fine">No credit card required · Free plan, forever</p>
        </div>
      </div>
    </section>
  </div>
</div>
