---
title: Publish with AI
description: Publish straight from your AI session. Ask Claude, ChatGPT, Codex, Cursor or any agent with skills to turn your Markdown and HTML into a live website, from a single page to a whole site, in seconds. Free.
layout: plain
showToc: false
showComments: false
showEditLink: false
---

<div className="fs-root lp-ai">
  <div id="top">
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy reveal">
          <span className="pill">🤖 Works with Claude, ChatGPT, Codex, Cursor and more</span>
          <h1>From your AI session to a live website.</h1>
          <p className="lede">Notes, docs, a report, an HTML page: whatever you're making with your AI, just ask it to publish. One page or a whole site, live and shareable in seconds.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#install">Install the skill <span className="arw">→</span></a>
            <a className="btn btn-secondary" href="#how">See how it works <span className="arw">→</span></a>
          </div>
          <p className="microcopy"><b>Free forever</b>, no credit card required</p>
        </div>
        <div className="hero-media-agent reveal">
          <div className="panel vis-agent">
            <div className="chat">
              <div className="msg user">Publish the <code>research/</code> folder we've been working on as a website.</div>
              <div className="msg bot">
                <span className="bot-head">💐 flowershow skill</span>
                <span className="step">$ fl --yes ./research</span>
                <span className="step">✓ Uploaded 24 files · 3 HTML, 21 Markdown</span>
                <span className="step">→ Live at <b>research-yourname.flowershow.me</b></span>
              </div>
              <div className="msg user">Nice. Add our logo and use the "letterpress" theme.</div>
              <div className="msg bot">
                <span className="bot-head">💐 flowershow skill</span>
                <span className="step">✓ Updated config.json · theme <b>letterpress</b></span>
                <span className="step">✓ Republished 2 changed files</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="how">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Three steps. The agent does the rest.</h2>
          <p>The Flowershow skill teaches your agent how to publish with the <code>fl</code> CLI, and how to configure and style your site from the Flowershow docs.</p>
        </div>
        <div className="steps ai-steps reveal">
          <div className="step" id="install">
            <span className="step-num">1</span>
            <h3>Install the skill</h3>
            <div className="cmd-line">npx skills add flowershow/skills --global</div>
            <p>One line, once, for Claude Code, Codex, Cursor and other coding agents. In ChatGPT or the Claude app, or no Node.js? <a href="/docs/agents/supported-agents">Add the skill manually →</a></p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Ask your agent</h3>
            <div className="prompt-line">Publish my notes folder to Flowershow</div>
            <p>First time? The agent walks you through a quick sign-in.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Share the URL</h3>
            <div className="cmd-line url-line">→ notes-yourname.flowershow.me</div>
            <p>Edit and ask again: only the changed files are re-uploaded.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="can-do">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">What your agent can do</span>
          <h2>Publish, configure, style. Just ask.</h2>
        </div>
        <div className="concept-grid reveal">
          <div className="concept-card">
            <span className="ic">🚀</span>
            <h3>Publish and update</h3>
            <p>Publish a single file or a whole folder, republish changes, list and delete sites.</p>
          </div>
          <div className="concept-card">
            <span className="ic">⚙️</span>
            <h3>Configure your site</h3>
            <p>Navigation, sidebar, theme, search and more, written to <code>config.json</code> by reading the Flowershow docs rather than guessing.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🎨</span>
            <h3>Style it</h3>
            <p>Colors, fonts and layout tweaks in <code>custom.css</code>, using Flowershow's real style variables.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🧭</span>
            <h3>Guide you through the rest</h3>
            <p>Custom domains, comments and GitHub connection need a dashboard or DNS step, and the agent gives you exact, numbered instructions.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="works-with">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Works with</span>
          <h2>Your agent, your workflow.</h2>
          <p>Whichever way you already publish: from the terminal, GitHub or Obsidian.</p>
        </div>
        <div className="agent-row reveal">
          <span className="pa-icons" aria-hidden="true"><svg className="ag-claude" viewBox="0 0 24 24" fill="#D97757" role="img" aria-label="Claude Code" xmlns="http://www.w3.org/2000/svg"><path d="M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z" /></svg><svg className="ag-codex" viewBox="0 0 24 24" fill="#000000" role="img" aria-label="Codex" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z" /></svg><svg className="ag-cursor" viewBox="0 0 24 24" fill="#000000" role="img" aria-label="Cursor" xmlns="http://www.w3.org/2000/svg"><path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" /></svg></span>
          <span className="agent-names">Claude · ChatGPT · Codex · Cursor · and other agents that support skills</span>
        </div>
      </div>
    </section>
    <section className="section" id="uses">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Use cases</span>
          <h2>What people publish with AI.</h2>
        </div>
        <div className="concept-grid ai-uses reveal">
          <div className="concept-card">
            <span className="ic">📊</span>
            <h3>Share what you just made</h3>
            <p>A report, an analysis, an interactive HTML page you built in your session: get it out of the chat and onto a link you can send.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🌱</span>
            <h3>Publish your agent-maintained wiki</h3>
            <p>Your agent keeps a wiki of what you're researching or building. Flowershow turns it into a real site, with wikilinks, backlinks and a sidebar, updated every time the agent republishes.</p>
          </div>
          <div className="concept-card">
            <span className="ic">📚</span>
            <h3>One page today, a whole site tomorrow</h3>
            <p>Start with a single page. Add docs, a blog or a changelog as you go: same folder, same command, same URL. Your files stay yours.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="agent-friendly">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Built for the AI age</span>
          <h2>HTML as-is. Markdown for agents.</h2>
        </div>
        <div className="concept-grid reveal">
          <div className="concept-card">
            <span className="ic">🧩</span>
            <h3>HTML, published as-is</h3>
            <p>Publish <code>.html</code> files exactly as written, with their CSS, JavaScript and images, next to your Markdown.</p>
          </div>
          <div className="concept-card">
            <span className="ic">📄</span>
            <h3>Markdown pages, readable by agents</h3>
            <p>Add <code>.md</code> to any Markdown page's URL to get clean source that is faster and cheaper for agents to read. <a href="/docs/agents/markdown-access">Learn more →</a></p>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">FAQ</span>
          <h2>Questions, answered.</h2>
        </div>
        <div className="faq-grid reveal">
          <div className="faq-item">
            <h3>Which AI agents does it work with?</h3>
            <p>Any agent that supports skills, including Claude (Claude Code and the Claude apps), ChatGPT, Codex and Cursor. To publish, the agent needs to run the <code>fl</code> CLI with internet access; where it can't, it still configures your site and gives you the one command to run. See the <a href="/docs/agents/supported-agents">per-agent install steps</a>.</p>
          </div>
          <div className="faq-item">
            <h3>Do I need Node.js?</h3>
            <p>Only for the one-line install. Without it, add the skill manually: see the <a href="/docs/agents/supported-agents">per-agent install steps</a>.</p>
          </div>
          <div className="faq-item">
            <h3>I publish from GitHub or Obsidian. Is this for me?</h3>
            <p>Yes. The skill helps you configure and style your site whichever way you publish. It only runs the <code>fl</code> CLI if you publish from a local folder.</p>
          </div>
          <div className="faq-item">
            <h3>Is it free?</h3>
            <p>Yes, there's a free plan, forever. Premium adds things like custom domains and full-text search. See <a href="/pricing">pricing</a>.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="final">
      <div className="wrap">
        <div className="final-card reveal">
          <h2>From your AI session to a live URL. In one ask.</h2>
          <p>Install the skill and publish your first site in seconds.</p>
          <a className="btn btn-primary" href="#install">Install the skill <span className="arw">→</span></a>
          <p className="fine">Open source · Free plan, forever</p>
        </div>
      </div>
    </section>
  </div>
</div>
