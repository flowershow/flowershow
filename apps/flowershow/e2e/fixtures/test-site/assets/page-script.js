// Fixture for e2e/specs/page-scripts.spec.ts: loaded via `scripts` frontmatter
// on page-scripts.md and page-scripts-mdx.mdx (Premium only).
(() => {
  window.__pageScriptRuns = (window.__pageScriptRuns || 0) + 1;
  document.documentElement.dataset.pageScriptRuns = String(
    window.__pageScriptRuns,
  );
  const target = document.getElementById('page-script-target');
  if (!target) return;
  target.textContent = 'enhanced';
})();
