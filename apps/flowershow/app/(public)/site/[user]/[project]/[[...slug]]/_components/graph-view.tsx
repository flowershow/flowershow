'use client';

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

const MINI_WIDTH = 220;
const MINI_HEIGHT = 160;
const FULL_WIDTH = 800;
const FULL_HEIGHT = 600;

const NODE_COLOR_DEFAULT = '#94a3b8';
const NODE_COLOR_DEFAULT_DIM = 'rgba(148, 163, 184, 0.15)';
const NODE_COLOR_CURRENT = '#f97316';
const NODE_COLOR_CURRENT_DIM = 'rgba(249, 115, 22, 0.15)';
const LINK_COLOR = '#cbd5e1';
const LINK_COLOR_DIM = 'rgba(203, 213, 225, 0.1)';
const NODE_LABEL_COLOR = '#334155';
const NODE_LABEL_COLOR_DIM = 'rgba(51, 65, 85, 0.15)';

const MINI_NODE_REL_SIZE = 3;
const FULL_NODE_REL_SIZE = 5;

function asNode(n: unknown): GraphNode {
  return n as GraphNode;
}

function getLinkEndId(end: unknown): string {
  if (typeof end === 'string') return end;
  if (end && typeof end === 'object' && 'id' in end)
    return (end as { id: string }).id;
  return '';
}

// Painters are stable references that read hover state via a ref getter to
// avoid recreating them on every hover change.
function makeNodeLabelPainter(
  nodeRelSize: number,
  maxLen: number,
  getHighlightedIds: () => Set<string> | null,
) {
  return (n: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const node = asNode(n) as GraphNode & { x: number; y: number };
    const raw = node.title ?? node.appPath.split('/').pop() ?? '';
    const label = raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
    if (!label) return;
    const fontSize = Math.max(4, 12 / globalScale);
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const highlightedIds = getHighlightedIds();
    const dimmed = highlightedIds !== null && !highlightedIds.has(node.id);
    ctx.fillStyle = dimmed ? NODE_LABEL_COLOR_DIM : NODE_LABEL_COLOR;
    ctx.fillText(label, node.x, node.y + nodeRelSize + 2 / globalScale);
  };
}

const nodeLabelMode = () => 'after';

export default function GraphMiniPanel({ siteId, currentBlobId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const highlightedNodeIdsRef = useRef<Set<string> | null>(null);

  const { data, isLoading, error } = api.site.getGraphData.useQuery({
    siteId,
    blobId: currentBlobId,
  });

  const graphData = useMemo(
    () => ({
      nodes: ((data?.nodes ?? []) as GraphNode[]).map((n) =>
        n.id === currentBlobId ? { ...n, fx: 0, fy: 0 } : n,
      ),
      links: (data?.links ?? []) as GraphLink[],
    }),
    [data, currentBlobId],
  );

  // Hovered node + its direct neighbours. null means no hover (nothing dimmed).
  const highlightedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const ids = new Set<string>([hoveredNodeId]);
    for (const link of graphData.links) {
      const src = getLinkEndId(link.source);
      const tgt = getLinkEndId(link.target);
      if (src === hoveredNodeId || tgt === hoveredNodeId) {
        ids.add(src);
        ids.add(tgt);
      }
    }
    return ids;
  }, [hoveredNodeId, graphData.links]);

  // Keep ref in sync so the stable canvas painters always see the latest set.
  useEffect(() => {
    highlightedNodeIdsRef.current = highlightedNodeIds;
  }, [highlightedNodeIds]);

  const paintMiniLabel = useMemo(
    () =>
      makeNodeLabelPainter(
        MINI_NODE_REL_SIZE,
        12,
        () => highlightedNodeIdsRef.current,
      ),
    [],
  );

  const paintFullLabel = useMemo(
    () =>
      makeNodeLabelPainter(
        FULL_NODE_REL_SIZE,
        30,
        () => highlightedNodeIdsRef.current,
      ),
    [],
  );

  const nodeColor = useCallback(
    (n: unknown) => {
      const node = asNode(n);
      const isCurrent = node.id === currentBlobId;
      if (highlightedNodeIds !== null && !highlightedNodeIds.has(node.id)) {
        return isCurrent ? NODE_COLOR_CURRENT_DIM : NODE_COLOR_DEFAULT_DIM;
      }
      return isCurrent ? NODE_COLOR_CURRENT : NODE_COLOR_DEFAULT;
    },
    [currentBlobId, highlightedNodeIds],
  );

  const linkColor = useCallback(
    (link: unknown) => {
      if (!highlightedNodeIds) return LINK_COLOR;
      const l = link as GraphLink;
      const src = getLinkEndId(l.source);
      const tgt = getLinkEndId(l.target);
      return highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt)
        ? LINK_COLOR
        : LINK_COLOR_DIM;
    },
    [highlightedNodeIds],
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
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
        />
        <button
          type="button"
          className="graph-mini-panel__expand"
          aria-label="Expand knowledge graph"
          onClick={() => setModalOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="graph-modal"
        onClick={handleDialogClick}
        onClose={() => setModalOpen(false)}
      >
        <div className="graph-modal__inner">
          <div className="graph-modal__header">
            <span className="graph-modal__title">Knowledge graph</span>
            <button
              className="graph-modal__close"
              aria-label="Close"
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <ForceGraph2D
            graphData={graphData}
            width={FULL_WIDTH}
            height={FULL_HEIGHT}
            nodeId="id"
            nodeColor={nodeColor}
            nodeCanvasObject={paintFullLabel}
            nodeCanvasObjectMode={nodeLabelMode}
            linkColor={linkColor}
            nodeRelSize={FULL_NODE_REL_SIZE}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
          />
        </div>
      </dialog>
    </>
  );
}
