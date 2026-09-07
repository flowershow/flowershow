'use client';

import { useEffect } from 'react';

/**
 * Progressive enhancement for server-rendered JSON Canvas.
 *
 * The canvas is rendered to static HTML on the server (see lib/canvas-renderer.ts):
 * a `.canvas-container` viewport wrapping a `.canvas-world` layer sized to the
 * full canvas extent. Without JS the container falls back to native scrolling.
 *
 * This scans the DOM for any not-yet-upgraded canvases (both standalone pages and
 * inline `![[x.canvas]]` embeds) and attaches @panzoom/panzoom to the world layer,
 * adding drag-to-pan, wheel/pinch zoom, and a small control toolbar. Panzoom is
 * imported lazily so it stays out of the initial page bundle and only loads on
 * pages that actually contain a canvas.
 *
 * The markdown body is compiled and committed on the client (next-mdx-remote-client),
 * so the canvas HTML often lands in the DOM *after* this component's mount effect
 * runs. We therefore can't rely on a single mount-time scan — a MutationObserver
 * re-scans as nodes appear, and `dataset.canvasReady` keeps each upgrade idempotent.
 */
export default function CanvasEnhancer() {
  useEffect(() => {
    let cancelled = false;
    const disposers: Array<() => void> = [];
    let panzoomModule: typeof import('@panzoom/panzoom') | null = null;
    let panzoomLoad: Promise<typeof import('@panzoom/panzoom')> | null = null;
    let scanScheduled = false;

    const upgrade = (
      container: HTMLElement,
      Panzoom: typeof import('@panzoom/panzoom').default,
    ) => {
      const world = container.querySelector<HTMLElement>('.canvas-world');
      if (!world) return;
      container.dataset.canvasReady = 'true';

      // Compute the transform that fits the whole canvas into the viewport and
      // centers it. Panzoom applies `scale(s) translate(x,y)` with origin 0 0,
      // so a translate of x displays at s·x px — hence the `/ scale` below.
      const computeFit = () => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const w = world.offsetWidth;
        const h = world.offsetHeight;
        if (!w || !h || !cw || !ch) return { scale: 1, x: 0, y: 0 };
        const scale = Math.min(cw / w, ch / h, 1);
        const x = (cw - w * scale) / 2 / scale;
        const y = (ch - h * scale) / 2 / scale;
        return { scale, x, y };
      };

      const fit = computeFit();

      const panzoom = Panzoom(world, {
        canvas: true, // pan by dragging anywhere in the viewport, not just a node
        origin: '0 0',
        cursor: 'grab',
        minScale: 0.2,
        maxScale: 4,
        startScale: fit.scale,
        startX: fit.x,
        startY: fit.y,
      });

      const onWheel = (event: WheelEvent) => panzoom.zoomWithWheel(event);
      container.addEventListener('wheel', onWheel, { passive: false });

      const resetToFit = () => {
        const f = computeFit();
        panzoom.zoom(f.scale, { animate: true });
        panzoom.pan(f.x, f.y, { animate: true });
      };

      const controls = createControls({
        zoomIn: () => panzoom.zoomIn(),
        zoomOut: () => panzoom.zoomOut(),
        reset: resetToFit,
      });
      container.appendChild(controls);

      disposers.push(() => {
        container.removeEventListener('wheel', onWheel);
        panzoom.destroy();
        controls.remove();
        delete container.dataset.canvasReady;
      });
    };

    const scan = async () => {
      const containers = Array.from(
        document.querySelectorAll<HTMLElement>('.canvas-container'),
      ).filter(
        (c) => !c.dataset.canvasReady && c.querySelector('.canvas-world'),
      );
      if (containers.length === 0) return;

      if (!panzoomModule) {
        panzoomLoad ??= import('@panzoom/panzoom');
        panzoomModule = await panzoomLoad;
      }
      if (cancelled) return;

      const Panzoom = panzoomModule.default;
      for (const container of containers) {
        // Re-check after the await: a concurrent scan may have upgraded it.
        if (container.dataset.canvasReady) continue;
        if (!container.querySelector('.canvas-world')) continue;
        upgrade(container, Panzoom);
      }
    };

    // Debounce: a single microtask-batched scan per burst of mutations. Upgrading
    // a container appends the toolbar (a childList mutation) which would otherwise
    // re-trigger the observer; the `canvasReady` guard makes that scan a no-op.
    const scheduleScan = () => {
      if (scanScheduled) return;
      scanScheduled = true;
      queueMicrotask(() => {
        scanScheduled = false;
        if (!cancelled) void scan();
      });
    };

    // Handle canvases already present at mount (e.g. standalone SSR pages)...
    scheduleScan();
    // ...and canvases the client-compiled markdown body inserts afterwards.
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      for (const dispose of disposers) dispose();
    };
  }, []);

  return null;
}

function createControls(handlers: {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'canvas-controls';

  const makeButton = (label: string, symbol: string, onClick: () => void) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'canvas-control-btn';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = symbol;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  };

  wrap.appendChild(makeButton('Zoom in', '+', handlers.zoomIn));
  wrap.appendChild(makeButton('Zoom out', '−', handlers.zoomOut));
  wrap.appendChild(makeButton('Fit to view', '⤢', handlers.reset));

  // Keep interactions with the toolbar from starting a pan or zooming the canvas.
  wrap.addEventListener('pointerdown', (event) => event.stopPropagation());
  wrap.addEventListener('wheel', (event) => event.stopPropagation());

  return wrap;
}
