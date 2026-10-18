// Fixture for e2e/specs/page-scripts.spec.ts: loaded via `scripts` frontmatter
// on the site root page, index.md (Premium only). See GH #1467.
(() => {
  window.__homeScriptRuns = (window.__homeScriptRuns || 0) + 1;
  document.documentElement.dataset.homeScriptRuns = String(
    window.__homeScriptRuns,
  );
  const target = document.getElementById('home-script-target');
  if (!target) return;
  target.textContent = 'enhanced';
})();
