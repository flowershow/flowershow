---
title: Landing Animation Demo
description: Hero animation concept for Flowershow — drop to live, themes cycling.
layout: plain
showToc: false
showEditLink: false
showComments: false
---

<CustomHtml html={`
<style>
  /* ── Reset & base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .demo-root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fafaf9;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
  }

  /* ── Hero text ── */
  .hero-text {
    text-align: center;
    margin-bottom: 56px;
  }
  .hero-text h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 600;
    letter-spacing: -0.03em;
    color: #111;
    line-height: 1.1;
  }
  .hero-text p {
    margin-top: 16px;
    font-size: 1.125rem;
    color: #666;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  /* ── Stage: the animation container ── */
  .stage {
    width: 100%;
    max-width: 860px;
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 32px;
    min-height: 420px;
  }

  /* ── Left: folder / files ── */
  .files-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 40px;
    opacity: 0;
    transform: translateY(16px);
    animation: files-appear 0.5s ease forwards 0.3s;
  }
  @keyframes files-appear {
    to { opacity: 1; transform: translateY(0); }
  }

  .folder-icon {
    font-size: 3rem;
    line-height: 1;
    margin-bottom: 4px;
  }

  .file-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.8rem;
    color: #444;
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    opacity: 0;
  }
  .file-chip:nth-child(2) { animation: chip-in 0.3s ease forwards 0.6s; }
  .file-chip:nth-child(3) { animation: chip-in 0.3s ease forwards 0.8s; }
  .file-chip:nth-child(4) { animation: chip-in 0.3s ease forwards 1.0s; }
  .file-chip:nth-child(5) { animation: chip-in 0.3s ease forwards 1.2s; }
  @keyframes chip-in {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .file-dot { width: 8px; height: 8px; border-radius: 50%; background: #fb923c; flex-shrink: 0; }

  /* ── Arrow ── */
  .arrow {
    display: flex;
    align-items: center;
    padding-top: 60px;
    opacity: 0;
    animation: arrow-in 0.4s ease forwards 1.6s;
  }
  @keyframes arrow-in {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  .arrow svg { color: #fb923c; }

  /* ── Right: browser window ── */
  .browser {
    flex: 1;
    max-width: 520px;
    min-width: 280px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
    opacity: 0;
    transform: translateY(20px) scale(0.97);
    animation: browser-appear 0.5s cubic-bezier(0.16,1,0.3,1) forwards 1.9s;
  }
  @keyframes browser-appear {
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .browser-chrome {
    background: #f0f0f0;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #ddd;
  }
  .browser-dots { display: flex; gap: 5px; }
  .browser-dot { width: 10px; height: 10px; border-radius: 50%; }
  .browser-dot.red    { background: #ff5f57; }
  .browser-dot.yellow { background: #febc2e; }
  .browser-dot.green  { background: #28c840; }

  .url-bar {
    flex: 1;
    background: white;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.72rem;
    color: #555;
    border: 1px solid #ddd;
    font-family: 'SF Mono', monospace;
    overflow: hidden;
    white-space: nowrap;
  }
  .url-bar .url-text {
    display: inline-block;
    opacity: 0;
    animation: url-reveal 0.4s ease forwards 2.1s;
  }
  @keyframes url-reveal {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .url-bar .url-highlight { color: #16a34a; font-weight: 600; }

  /* ── Theme panels (the cycling content) ── */
  .browser-body {
    position: relative;
    height: 320px;
    overflow: hidden;
    background: white;
  }

  .theme-panel {
    position: absolute;
    inset: 0;
    padding: 24px;
    opacity: 0;
    transition: opacity 0.6s ease;
  }
  .theme-panel.active { opacity: 1; }

  /* Theme 1: clean light editorial */
  .t1 { background: #ffffff; }
  .t1 .t-nav {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5;
  }
  .t1 .t-logo { font-size: 0.85rem; font-weight: 700; color: #111; letter-spacing: -0.02em; }
  .t1 .t-links { display: flex; gap: 16px; }
  .t1 .t-link { font-size: 0.7rem; color: #888; }
  .t1 .t-tag { font-size: 0.65rem; font-weight: 600; color: #fb923c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .t1 .t-h1 { font-size: 1.4rem; font-weight: 700; color: #111; line-height: 1.2; margin-bottom: 10px; letter-spacing: -0.02em; }
  .t1 .t-body { font-size: 0.75rem; color: #555; line-height: 1.7; }
  .t1 .t-body p { margin-bottom: 8px; }
  .t1 .t-divider { height: 1px; background: #f0f0f0; margin: 14px 0; }

  /* Theme 2: dark elegant */
  .t2 { background: #0f1117; }
  .t2 .t-nav {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #222;
  }
  .t2 .t-logo { font-size: 0.85rem; font-weight: 700; color: #fff; letter-spacing: 0.05em; text-transform: uppercase; }
  .t2 .t-links { display: flex; gap: 16px; }
  .t2 .t-link { font-size: 0.7rem; color: #555; }
  .t2 .t-tag { font-size: 0.65rem; font-weight: 500; color: #6366f1; margin-bottom: 10px; }
  .t2 .t-h1 { font-size: 1.4rem; font-weight: 700; color: #f8f8f8; line-height: 1.2; margin-bottom: 10px; letter-spacing: -0.02em; }
  .t2 .t-body { font-size: 0.75rem; color: #888; line-height: 1.7; }
  .t2 .t-body p { margin-bottom: 8px; }
  .t2 .t-accent { display: inline-block; background: #6366f1; color: white; font-size: 0.65rem; padding: 3px 8px; border-radius: 4px; margin-top: 4px; }

  /* Theme 3: warm serif / editorial */
  .t3 { background: #fdf8f0; }
  .t3 .t-nav {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #111;
  }
  .t3 .t-logo { font-size: 0.9rem; font-weight: 800; color: #111; font-variant: small-caps; letter-spacing: 0.05em; }
  .t3 .t-links { display: flex; gap: 16px; }
  .t3 .t-link { font-size: 0.7rem; color: #666; }
  .t3 .t-tag { font-size: 0.65rem; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .t3 .t-h1 { font-size: 1.5rem; font-weight: 800; color: #111; line-height: 1.15; margin-bottom: 10px; font-style: italic; }
  .t3 .t-body { font-size: 0.75rem; color: #444; line-height: 1.8; }
  .t3 .t-body p { margin-bottom: 8px; }
  .t3 .t-rule { border: none; border-top: 2px solid #111; width: 40px; margin: 12px 0; }

  /* Theme 4: minimal green */
  .t4 { background: #f6faf6; }
  .t4 .t-nav {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #d1e8d1;
  }
  .t4 .t-logo { font-size: 0.85rem; font-weight: 600; color: #166534; }
  .t4 .t-links { display: flex; gap: 16px; }
  .t4 .t-link { font-size: 0.7rem; color: #4a7c59; }
  .t4 .t-tag { font-size: 0.65rem; font-weight: 600; color: #16a34a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; background: #dcfce7; display: inline-block; padding: 2px 6px; border-radius: 4px; }
  .t4 .t-h1 { font-size: 1.4rem; font-weight: 700; color: #14532d; line-height: 1.2; margin-bottom: 10px; letter-spacing: -0.01em; }
  .t4 .t-body { font-size: 0.75rem; color: #365c44; line-height: 1.7; }
  .t4 .t-body p { margin-bottom: 8px; }
  .t4 .t-btn { display: inline-block; background: #16a34a; color: white; font-size: 0.65rem; font-weight: 600; padding: 5px 12px; border-radius: 6px; margin-top: 8px; }

  /* ── Theme label ── */
  .theme-label {
    position: absolute;
    bottom: 10px;
    right: 12px;
    font-size: 0.65rem;
    color: #aaa;
    font-family: 'SF Mono', monospace;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .theme-label.visible { opacity: 1; }

  /* ── Theme dots indicator ── */
  .theme-dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-top: 16px;
    opacity: 0;
    animation: dots-in 0.4s ease forwards 2.4s;
  }
  @keyframes dots-in {
    to { opacity: 1; }
  }
  .theme-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #ddd;
    transition: background 0.3s ease, transform 0.3s ease;
  }
  .theme-dot.active { background: #fb923c; transform: scale(1.3); }

  /* ── Caption ── */
  .caption {
    margin-top: 24px;
    font-size: 0.85rem;
    color: #999;
    text-align: center;
    opacity: 0;
    animation: caption-in 0.5s ease forwards 2.5s;
  }
  @keyframes caption-in {
    to { opacity: 1; }
  }
  .caption strong { color: #555; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .stage { flex-direction: column; align-items: center; min-height: auto; }
    .files-panel { flex-direction: row; flex-wrap: wrap; justify-content: center; padding-top: 0; }
    .arrow { padding-top: 0; transform: rotate(90deg); }
    @keyframes arrow-in {
      from { opacity: 0; transform: rotate(90deg) scale(0.8); }
      to   { opacity: 1; transform: rotate(90deg) scale(1); }
    }
  }
</style>

<div class="demo-root">

  <div class="hero-text">
    <h1>Content to URL.<br>Instantly.</h1>
    <p>Drop your files. Get a live, beautiful website. No config, no pipelines, no waiting.</p>
  </div>

  <div class="stage">

    <!-- Left: files -->
    <div class="files-panel">
      <div class="folder-icon">📁</div>
      <div class="file-chip"><span class="file-dot"></span> README.md</div>
      <div class="file-chip"><span class="file-dot"></span> about.md</div>
      <div class="file-chip"><span class="file-dot"></span> blog/post-1.md</div>
      <div class="file-chip"><span class="file-dot"></span> config.json</div>
    </div>

    <!-- Arrow -->
    <div class="arrow">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </div>

    <!-- Right: browser -->
    <div class="browser">
      <div class="browser-chrome">
        <div class="browser-dots">
          <div class="browser-dot red"></div>
          <div class="browser-dot yellow"></div>
          <div class="browser-dot green"></div>
        </div>
        <div class="url-bar">
          <span class="url-text">
            my.flowershow.app/<span class="url-highlight">yoursite</span>
          </span>
        </div>
      </div>

      <div class="browser-body">

        <!-- Theme 1: clean light -->
        <div class="theme-panel t1 active" data-theme="1">
          <div class="t-nav">
            <span class="t-logo">Acme Docs</span>
            <div class="t-links">
              <span class="t-link">Guides</span>
              <span class="t-link">API</span>
              <span class="t-link">Blog</span>
            </div>
          </div>
          <div class="t-tag">Getting Started</div>
          <div class="t-h1">Build something people love</div>
          <div class="t-divider"></div>
          <div class="t-body">
            <p>Everything you need to ship fast. Clear documentation, clean structure, no noise.</p>
            <p>Start with a single markdown file. Grow from there.</p>
          </div>
        </div>

        <!-- Theme 2: dark -->
        <div class="theme-panel t2" data-theme="2">
          <div class="t-nav">
            <span class="t-logo">Nova</span>
            <div class="t-links">
              <span class="t-link">Docs</span>
              <span class="t-link">Blog</span>
              <span class="t-link">About</span>
            </div>
          </div>
          <div class="t-tag">Latest</div>
          <div class="t-h1">The next generation of publishing</div>
          <div class="t-body">
            <p>Write in markdown. Publish to the world. Your content, your rules.</p>
            <span class="t-accent">Read the docs →</span>
          </div>
        </div>

        <!-- Theme 3: warm serif -->
        <div class="theme-panel t3" data-theme="3">
          <div class="t-nav">
            <span class="t-logo">The Garden</span>
            <div class="t-links">
              <span class="t-link">Essays</span>
              <span class="t-link">Notes</span>
              <span class="t-link">About</span>
            </div>
          </div>
          <div class="t-tag">Essay · Feb 2026</div>
          <div class="t-h1">On the art of thinking slowly</div>
          <hr class="t-rule">
          <div class="t-body">
            <p>The best ideas arrive uninvited. What matters is having somewhere to put them.</p>
            <p>This is a space for working things out.</p>
          </div>
        </div>

        <!-- Theme 4: green minimal -->
        <div class="theme-panel t4" data-theme="4">
          <div class="t-nav">
            <span class="t-logo">GreenBase</span>
            <div class="t-links">
              <span class="t-link">Projects</span>
              <span class="t-link">Blog</span>
              <span class="t-link">Contact</span>
            </div>
          </div>
          <span class="t-tag">Open Source</span>
          <div class="t-h1">Knowledge that grows with you</div>
          <div class="t-body">
            <p>A living knowledge base. Updated daily. Built with markdown.</p>
            <span class="t-btn">Explore →</span>
          </div>
        </div>

        <div class="theme-label" id="theme-label">theme: default</div>
      </div>
    </div>

  </div>

  <!-- Dots -->
  <div class="theme-dots" id="theme-dots">
    <div class="theme-dot active"></div>
    <div class="theme-dot"></div>
    <div class="theme-dot"></div>
    <div class="theme-dot"></div>
  </div>

  <div class="caption">
    Same markdown. <strong>Four completely different sites.</strong> Pick the one that's yours.
  </div>

</div>

<script>
  (function() {
    const themes = document.querySelectorAll('.theme-panel');
    const dots   = document.querySelectorAll('.theme-dot');
    const label  = document.getElementById('theme-label');
    const names  = ['default', 'nova-dark', 'editorial', 'evergreen'];
    let current  = 0;
    let started  = false;

    function goTo(n) {
      themes[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = n;
      themes[current].classList.add('active');
      dots[current].classList.add('active');
      label.textContent = 'theme: ' + names[current];
      label.classList.add('visible');
    }

    function next() {
      goTo((current + 1) % themes.length);
    }

    // Start cycling after the browser appears (2.4s) then every 2.8s
    setTimeout(function() {
      started = true;
      label.classList.add('visible');
      setInterval(next, 2800);
    }, 2400);

    // Allow manual dot clicks
    dots.forEach(function(dot, i) {
      dot.addEventListener('click', function() { goTo(i); });
    });
  })();
</script>
`} />
