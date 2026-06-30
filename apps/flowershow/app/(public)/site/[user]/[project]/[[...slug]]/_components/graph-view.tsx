'use client';

import { Maximize2, Network } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/trpc/react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface GraphNode {
  id: string;
  appPath: string;
  title?: string;
  fx?: number;
  fy?: number;
}

// After the library initialises, source/target are resolved to node objects.
interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface Props {
  siteId: string;
  currentBlobId: string;
}

const MINI_WIDTH = 240;
const MINI_HEIGHT = 180;
const FULL_WIDTH = 900;
const FULL_HEIGHT = 700;

const NODE_COLOR_DEFAULT = '#94a3b8';
const NODE_COLOR_CURRENT = '#f97316';
const LINK_COLOR = '#cbd5e1';
const NODE_LABEL_COLOR = '#334155';

// RGB tuples for alpha interpolation during hover transitions
const NODE_DEFAULT_RGB = [148, 163, 184] as const;
const NODE_CURRENT_RGB = [249, 115, 22] as const;
const LINK_RGB = [203, 213, 225] as const;
const LABEL_RGB = [51, 65, 85] as const;
const DIM_ALPHA = 0.15;
const LINK_DIM_ALPHA = 0.1;

const TRANSITION_DURATION = 180; // ms

function dimmedColor(
  rgb: readonly [number, number, number],
  progress: number,
  targetAlpha: number,
): string {
  const alpha = 1 - progress * (1 - targetAlpha);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

const MINI_NODE_REL_SIZE = 1;
const FULL_NODE_REL_SIZE = 1.5;

function asNode(n: unknown): GraphNode {
  return n as GraphNode;
}

function getLinkEndId(end: unknown): string {
  if (typeof end === 'string') return end;
  if (end && typeof end === 'object' && 'id' in end)
    return (end as { id: string }).id;
  return '';
}

// Painters are stable references that read hover state via ref getters to
// avoid recreating them on every hover change.
function makeNodeLabelPainter(
  nodeRelSize: number,
  maxLen: number,
  getHighlightedIds: () => Set<string> | null,
  getDimProgress: () => number,
  getHoveredId: () => string | null,
  getNodeVal: (id: string) => number,
) {
  return (n: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const node = asNode(n) as GraphNode & { x: number; y: number };
    const raw = node.title ?? node.appPath.split('/').pop() ?? '';
    const label = raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
    if (!label) return;
    const dp = getDimProgress();
    const isHovered = getHoveredId() === node.id;
    const fontScale = isHovered ? 1 + 0.1 * dp : 1;
    const fontSize = Math.max(4, 12 / globalScale) * fontScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const highlightedIds = getHighlightedIds();
    const isDimmed = highlightedIds !== null && !highlightedIds.has(node.id);
    ctx.fillStyle =
      !isDimmed || dp === 0
        ? NODE_LABEL_COLOR
        : dimmedColor(LABEL_RGB, dp, DIM_ALPHA);
    const radius = Math.sqrt(getNodeVal(node.id)) * nodeRelSize;
    ctx.fillText(label, node.x, node.y + radius + 2 / globalScale);
  };
}

const nodeLabelMode = () => 'after';

export default function GraphMiniPanel({ siteId, currentBlobId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'local' | 'global'>('local');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // renderHighlightedIds lags behind hoveredNodeId during fade-out so the
  // dimming stays visible until the animation completes.
  const [renderHighlightedIds, setRenderHighlightedIds] =
    useState<Set<string> | null>(null);
  const [dimProgress, setDimProgress] = useState(0);
  const dimProgressRef = useRef(0);
  const highlightedNodeIdsRef = useRef<Set<string> | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const miniLinkCountsRef = useRef<Map<string, number>>(new Map());
  const modalLinkCountsRef = useRef<Map<string, number>>(new Map());

  const { data, isLoading, error } = api.site.getGraphData.useQuery({
    siteId,
    blobId: currentBlobId,
  });

  const { data: globalData } = api.site.getGraphData.useQuery(
    { siteId },
    { enabled: modalOpen && modalMode === 'global' },
  );

  const graphData = useMemo(
    () => ({
      nodes: ((data?.nodes ?? []) as GraphNode[]).map((n) =>
        n.id === currentBlobId ? { ...n, fx: 0, fy: 0 } : n,
      ),
      links: (data?.links ?? []) as GraphLink[],
    }),
    [data, currentBlobId],
  );

  const globalGraphData = useMemo(
    () => ({
      nodes: (globalData?.nodes ?? []) as GraphNode[],
      links: (globalData?.links ?? []) as GraphLink[],
    }),
    [globalData],
  );

  const activeGraphData = modalMode === 'global' ? globalGraphData : graphData;

  const miniLinkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of graphData.links) {
      const src = getLinkEndId(link.source);
      const tgt = getLinkEndId(link.target);
      counts.set(src, (counts.get(src) ?? 0) + 1);
      counts.set(tgt, (counts.get(tgt) ?? 0) + 1);
    }
    return counts;
  }, [graphData.links]);

  const modalLinkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of activeGraphData.links) {
      const src = getLinkEndId(link.source);
      const tgt = getLinkEndId(link.target);
      counts.set(src, (counts.get(src) ?? 0) + 1);
      counts.set(tgt, (counts.get(tgt) ?? 0) + 1);
    }
    return counts;
  }, [activeGraphData.links]);

  miniLinkCountsRef.current = miniLinkCounts;
  modalLinkCountsRef.current = modalLinkCounts;

  // Hovered node + its direct neighbours. null means no hover (nothing dimmed).
  const highlightedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const ids = new Set<string>([hoveredNodeId]);
    for (const link of activeGraphData.links) {
      const src = getLinkEndId(link.source);
      const tgt = getLinkEndId(link.target);
      if (src === hoveredNodeId || tgt === hoveredNodeId) {
        ids.add(src);
        ids.add(tgt);
      }
    }
    return ids;
  }, [hoveredNodeId, activeGraphData.links]);

  // Animate dimProgress when hover changes. renderHighlightedIds is kept alive
  // during fade-out so the dimming remains visible until the transition ends.
  useEffect(() => {
    const target = highlightedNodeIds !== null ? 1 : 0;

    if (highlightedNodeIds !== null) {
      setRenderHighlightedIds(highlightedNodeIds);
      highlightedNodeIdsRef.current = highlightedNodeIds;
      hoveredNodeIdRef.current = hoveredNodeId;
    }

    if (animFrameRef.current !== null)
      cancelAnimationFrame(animFrameRef.current);

    const startValue = dimProgressRef.current;
    if (startValue === target) return;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / TRANSITION_DURATION, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const value = startValue + (target - startValue) * eased;
      dimProgressRef.current = value;
      setDimProgress(value);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else if (target === 0) {
        setRenderHighlightedIds(null);
        highlightedNodeIdsRef.current = null;
        hoveredNodeIdRef.current = null;
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null)
        cancelAnimationFrame(animFrameRef.current);
    };
  }, [highlightedNodeIds, hoveredNodeId]);

  const paintMiniLabel = useMemo(
    () =>
      makeNodeLabelPainter(
        MINI_NODE_REL_SIZE,
        12,
        () => highlightedNodeIdsRef.current,
        () => dimProgressRef.current,
        () => hoveredNodeIdRef.current,
        (id) => 1 + (miniLinkCountsRef.current.get(id) ?? 0) * 0.5,
      ),
    [],
  );

  const paintFullLabel = useMemo(
    () =>
      makeNodeLabelPainter(
        FULL_NODE_REL_SIZE,
        30,
        () => highlightedNodeIdsRef.current,
        () => dimProgressRef.current,
        () => hoveredNodeIdRef.current,
        (id) => 1 + (modalLinkCountsRef.current.get(id) ?? 0) * 0.5,
      ),
    [],
  );

  const miniNodeVal = useCallback(
    (n: unknown) =>
      1 + (miniLinkCountsRef.current.get(asNode(n).id) ?? 0) * 0.5,
    [],
  );

  const modalNodeVal = useCallback(
    (n: unknown) =>
      1 + (modalLinkCountsRef.current.get(asNode(n).id) ?? 0) * 0.5,
    [],
  );

  const nodeColor = useCallback(
    (n: unknown) => {
      const node = asNode(n);
      const isCurrent = node.id === currentBlobId;
      const isDimmed =
        renderHighlightedIds !== null && !renderHighlightedIds.has(node.id);
      if (!isDimmed || dimProgress === 0) {
        return isCurrent ? NODE_COLOR_CURRENT : NODE_COLOR_DEFAULT;
      }
      return dimmedColor(
        isCurrent ? NODE_CURRENT_RGB : NODE_DEFAULT_RGB,
        dimProgress,
        DIM_ALPHA,
      );
    },
    [currentBlobId, renderHighlightedIds, dimProgress],
  );

  const linkColor = useCallback(
    (link: unknown) => {
      if (!renderHighlightedIds || dimProgress === 0) return LINK_COLOR;
      const l = link as GraphLink;
      const src = getLinkEndId(l.source);
      const tgt = getLinkEndId(l.target);
      if (renderHighlightedIds.has(src) && renderHighlightedIds.has(tgt)) {
        const r = Math.round(
          LINK_RGB[0] + (NODE_CURRENT_RGB[0] - LINK_RGB[0]) * dimProgress,
        );
        const g = Math.round(
          LINK_RGB[1] + (NODE_CURRENT_RGB[1] - LINK_RGB[1]) * dimProgress,
        );
        const b = Math.round(
          LINK_RGB[2] + (NODE_CURRENT_RGB[2] - LINK_RGB[2]) * dimProgress,
        );
        return `rgb(${r}, ${g}, ${b})`;
      }
      return dimmedColor(LINK_RGB, dimProgress, LINK_DIM_ALPHA);
    },
    [renderHighlightedIds, dimProgress],
  );

  const handleNodeHover = useCallback((n: unknown) => {
    setHoveredNodeId(n ? asNode(n).id : null);
  }, []);

  const handleNodeClick = useCallback(
    (n: unknown) => {
      const node = asNode(n);
      if (node.appPath) {
        setModalOpen(false);
        router.push(node.appPath);
      }
    },
    [router],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [modalOpen]);

  const handleDialogClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) setModalOpen(false);
    },
    [],
  );

  if (isLoading) {
    return <div className="graph-mini-panel graph-mini-panel--loading" />;
  }

  if (error || !data) return null;

  return (
    <>
      <div className="graph-mini-panel">
        <ForceGraph2D
          graphData={graphData}
          width={MINI_WIDTH}
          height={MINI_HEIGHT}
          nodeId="id"
          nodeColor={nodeColor}
          nodeCanvasObject={paintMiniLabel}
          nodeCanvasObjectMode={nodeLabelMode}
          linkColor={linkColor}
          nodeRelSize={MINI_NODE_REL_SIZE}
          nodeVal={miniNodeVal}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
        <div className="graph-mini-panel__actions">
          <button
            type="button"
            className="graph-mini-panel__action-btn"
            aria-label="Open global graph"
            onClick={() => {
              setModalMode('global');
              setModalOpen(true);
            }}
          >
            <Network size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="graph-mini-panel__action-btn"
            aria-label="Expand local graph"
            onClick={() => {
              setModalMode('local');
              setModalOpen(true);
            }}
          >
            <Maximize2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="graph-modal"
        onClick={handleDialogClick}
        onClose={() => setModalOpen(false)}
      >
        <div className="graph-modal__inner">
          <div className="graph-modal__header">
            <span className="graph-modal__title">
              {modalMode === 'global' ? 'Global graph' : 'Local graph'}
            </span>
            <button
              className="graph-modal__close"
              aria-label="Close"
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>
          </div>
          {modalOpen && (
            <ForceGraph2D
              graphData={activeGraphData}
              width={FULL_WIDTH}
              height={FULL_HEIGHT}
              nodeId="id"
              nodeColor={nodeColor}
              nodeCanvasObject={paintFullLabel}
              nodeCanvasObjectMode={nodeLabelMode}
              linkColor={linkColor}
              nodeRelSize={FULL_NODE_REL_SIZE}
              nodeVal={modalNodeVal}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
