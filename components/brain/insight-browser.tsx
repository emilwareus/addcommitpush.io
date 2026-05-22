'use client';

import Link from 'next/link';
import { ExternalLink, List, Network, Search, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import type {
  BrainGraphDocument,
  InsightGraphEdge,
  InsightGraphNodeType,
  PublishedInsight,
} from '@/lib/insights';
import { cn } from '@/lib/utils';

interface InsightBrowserProps {
  insights: PublishedInsight[];
  topics: string[];
  graphDocuments: BrainGraphDocument[];
}

type ViewMode = 'list' | 'graph';

interface GraphNode {
  id: string;
  kind: InsightGraphNodeType;
  slug: string;
  title: string;
  summary: string;
  href?: string;
  topics: readonly string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisibleGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: InsightGraphEdge['relation'];
  strength: InsightGraphEdge['strength'];
  note: string;
}

const graphWidth = 900;
const graphHeight = 620;
const graphCenterX = graphWidth / 2;
const graphCenterY = graphHeight / 2;

function getInsightNodeId(slug: string) {
  return `insight:${slug}`;
}

function getDocumentNodeId(document: Pick<BrainGraphDocument, 'type' | 'slug'>) {
  return `${document.type}:${document.slug}`;
}

function getEdgeTargetNodeId(edge: Pick<InsightGraphEdge, 'targetType' | 'targetSlug'>) {
  return `${edge.targetType}:${edge.targetSlug}`;
}

function getDocumentSearchText(document: BrainGraphDocument) {
  return [
    document.title,
    document.slug,
    document.status,
    document.summary,
    ...document.topics,
    ...document.tags,
  ]
    .join(' ')
    .toLowerCase();
}

function toSearchText(insight: PublishedInsight) {
  return [
    insight.title,
    insight.slug,
    insight.summary,
    insight.conclusion,
    insight.problem,
    insight.whyItMatters,
    ...insight.sections.flatMap((section) => [
      section.heading,
      ...section.body,
      section.quote?.text ?? '',
      section.quote?.sourceTitle ?? '',
    ]),
    ...insight.topics,
    ...insight.tags,
    ...insight.sources.map((source) => source.title),
    ...insight.evidence.flatMap((evidence) => [
      evidence.claim,
      evidence.detail,
      ...evidence.sourceTitles,
    ]),
    ...insight.graph.edges.flatMap((edge) => [
      edge.targetSlug,
      edge.targetType,
      edge.relation,
      edge.note,
    ]),
  ]
    .join(' ')
    .toLowerCase();
}

function insightMatchesQuery(
  insight: PublishedInsight,
  normalizedQuery: string,
  documentSearchById: ReadonlyMap<string, string>
) {
  if (!normalizedQuery) {
    return true;
  }

  if (toSearchText(insight).includes(normalizedQuery)) {
    return true;
  }

  return insight.graph.edges.some((edge) => {
    const documentSearchText = documentSearchById.get(getEdgeTargetNodeId(edge));

    return documentSearchText?.includes(normalizedQuery) ?? false;
  });
}

function getDocumentPosition(document: BrainGraphDocument, index: number, count: number) {
  if (document.slug === 'write-code-ai-agents-love') {
    return { x: graphCenterX, y: graphCenterY };
  }

  const secondaryIndex = Math.max(index - 1, 0);
  const secondaryCount = Math.max(count - 1, 1);
  const angle = Math.PI / 2 + (secondaryIndex / secondaryCount) * Math.PI * 2;

  return {
    x: graphCenterX + Math.cos(angle) * 120,
    y: graphCenterY + Math.sin(angle) * 96,
  };
}

function getInsightPosition(index: number, count: number) {
  const angle = -Math.PI / 2 + (index / Math.max(count, 1)) * Math.PI * 2;
  const radiusX = count <= 4 ? 270 : 335;
  const radiusY = count <= 4 ? 195 : 245;

  return {
    x: graphCenterX + Math.cos(angle) * radiusX,
    y: graphCenterY + Math.sin(angle) * radiusY,
  };
}

function buildGraph(insights: PublishedInsight[], graphDocuments: BrainGraphDocument[]) {
  const visibleDocumentIds = new Set<string>();

  insights.forEach((insight) => {
    insight.graph.edges.forEach((edge) => {
      if (edge.targetType !== 'insight') {
        visibleDocumentIds.add(getEdgeTargetNodeId(edge));
      }
    });
  });

  const visibleDocuments = graphDocuments
    .filter((document) => visibleDocumentIds.has(getDocumentNodeId(document)))
    .sort((a, b) => {
      if (a.slug === 'write-code-ai-agents-love') {
        return -1;
      }

      if (b.slug === 'write-code-ai-agents-love') {
        return 1;
      }

      return a.title.localeCompare(b.title);
    });

  const documentNodes: GraphNode[] = visibleDocuments.map((document, index) => {
    const position = getDocumentPosition(document, index, visibleDocuments.length);

    return {
      id: getDocumentNodeId(document),
      kind: document.type,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      href: document.href,
      topics: document.topics,
      x: position.x,
      y: position.y,
      width: document.slug === 'write-code-ai-agents-love' ? 190 : 165,
      height: document.slug === 'write-code-ai-agents-love' ? 84 : 72,
    };
  });

  const orderedInsights = [...insights].sort((a, b) => a.title.localeCompare(b.title));
  const insightNodes: GraphNode[] = orderedInsights.map((insight, index) => {
    const position = getInsightPosition(index, orderedInsights.length);

    return {
      id: getInsightNodeId(insight.slug),
      kind: 'insight',
      slug: insight.slug,
      title: insight.title,
      summary: insight.summary,
      href: `/brain/${insight.slug}`,
      topics: insight.topics,
      x: position.x,
      y: position.y,
      width: 150,
      height: 70,
    };
  });

  const nodes = [...documentNodes, ...insightNodes];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: VisibleGraphEdge[] = orderedInsights.flatMap((insight) => {
    const sourceId = getInsightNodeId(insight.slug);

    return insight.graph.edges.flatMap((edge) => {
      const targetId = getEdgeTargetNodeId(edge);

      if (!nodeIds.has(targetId)) {
        return [];
      }

      return [
        {
          id: `${sourceId}->${targetId}:${edge.relation}`,
          sourceId,
          targetId,
          relation: edge.relation,
          strength: edge.strength,
          note: edge.note,
        },
      ];
    });
  });

  return {
    edges,
    nodes,
    nodeById: new Map(nodes.map((node) => [node.id, node])),
  };
}

function getEdgePath(source: GraphNode, target: GraphNode) {
  const controlX = (source.x + target.x) / 2 + (source.y - target.y) * 0.08;
  const controlY = (source.y + target.y) / 2 + (target.x - source.x) * 0.08;

  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function isNodeConnected(nodeId: string, activeNodeId: string | null, edges: VisibleGraphEdge[]) {
  if (!activeNodeId || nodeId === activeNodeId) {
    return true;
  }

  return edges.some((edge) => {
    return (
      (edge.sourceId === activeNodeId && edge.targetId === nodeId) ||
      (edge.targetId === activeNodeId && edge.sourceId === nodeId)
    );
  });
}

function getRequiredNode(nodeById: ReadonlyMap<string, GraphNode>, nodeId: string) {
  const node = nodeById.get(nodeId);

  if (!node) {
    throw new Error(`Missing graph node for visible edge: ${nodeId}`);
  }

  return node;
}

function getNodeKindLabel(kind: InsightGraphNodeType) {
  if (kind === 'blog-post') {
    return 'blog';
  }

  return kind;
}

function getNodeClassName(node: GraphNode, active: boolean, selected: boolean) {
  return cn(
    'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col justify-center rounded-lg border px-3 text-left shadow-sm outline-none transition-all',
    'focus-visible:ring-2 focus-visible:ring-primary',
    node.kind === 'insight' && 'bg-card/95 text-foreground',
    node.kind === 'blog-post' && 'border-primary/70 bg-primary/15 text-primary',
    node.kind === 'presentation' && 'border-secondary/70 bg-secondary/15 text-secondary',
    active ? 'opacity-100' : 'opacity-35',
    selected && 'scale-105 border-primary shadow-primary/20'
  );
}

function GraphView({
  filteredInsights,
  graphDocuments,
}: {
  filteredInsights: PublishedInsight[];
  graphDocuments: BrainGraphDocument[];
}) {
  const { edges, nodes, nodeById } = useMemo(() => {
    return buildGraph(filteredInsights, graphDocuments);
  }, [filteredInsights, graphDocuments]);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const defaultNodeId = nodes[0]?.id ?? null;
  const requestedActiveNodeId = hoveredNodeId ?? selectedNodeId ?? defaultNodeId;
  const activeNode =
    nodes.find((node) => node.id === requestedActiveNodeId) ?? nodes[0] ?? null;
  const activeNodeId = activeNode?.id ?? null;
  const activeEdges = activeNode
    ? edges.filter((edge) => edge.sourceId === activeNode.id || edge.targetId === activeNode.id)
    : [];

  if (filteredInsights.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No graph nodes match this query.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="overflow-x-auto rounded-lg border bg-card/40">
        <div className="relative h-[620px] min-w-[560px] md:min-w-[760px] lg:min-w-0">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            role="img"
            aria-label="Insight graph"
          >
            <rect width={graphWidth} height={graphHeight} fill="transparent" />
            {edges.map((edge) => {
              const source = getRequiredNode(nodeById, edge.sourceId);
              const target = getRequiredNode(nodeById, edge.targetId);

              const active =
                !activeNodeId || edge.sourceId === activeNodeId || edge.targetId === activeNodeId;

              return (
                <path
                  key={edge.id}
                  d={getEdgePath(source, target)}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={1 + edge.strength * 0.8}
                  className={cn(
                    'text-border transition-opacity',
                    active ? 'opacity-80' : 'opacity-15'
                  )}
                />
              );
            })}
          </svg>

          {nodes.map((node) => {
            const active = isNodeConnected(node.id, activeNodeId, edges);
            const selected = selectedNodeId === node.id;
            const style: CSSProperties = {
              left: `${(node.x / graphWidth) * 100}%`,
              top: `${(node.y / graphHeight) * 100}%`,
              width: node.width,
              height: node.height,
            };

            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setSelectedNodeId((current) => (current === node.id ? null : node.id))
                }
                onFocus={() => setHoveredNodeId(node.id)}
                onBlur={() => setHoveredNodeId(null)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={getNodeClassName(node, active, selected)}
                style={style}
              >
                <span className="mb-1 font-mono text-[10px] uppercase tracking-wide opacity-75">
                  {getNodeKindLabel(node.kind)}
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-snug">
                  {node.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="rounded-lg border bg-card p-4">
        {activeNode ? (
          <>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {getNodeKindLabel(activeNode.kind)} / {activeNode.slug}
            </p>
            <h3 className="text-base font-semibold leading-snug">{activeNode.title}</h3>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {activeNode.summary}
            </p>

            {activeNode.href && (
              <Link
                href={activeNode.href}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary underline underline-offset-4"
              >
                Open node
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}

            <div className="mt-5 border-t pt-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connected edges
              </h4>
              {activeEdges.length > 0 ? (
                <div className="space-y-3">
                  {activeEdges.slice(0, 7).map((edge) => {
                    const otherNodeId =
                      edge.sourceId === activeNode.id ? edge.targetId : edge.sourceId;
                    const otherNode = getRequiredNode(nodeById, otherNodeId);

                    return (
                      <div key={edge.id} className="text-xs leading-relaxed">
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {edge.relation} · strength={edge.strength}
                        </p>
                        <p className="mt-1 font-semibold">{otherNode.title}</p>
                        <p className="mt-1 text-muted-foreground">{edge.note}</p>
                      </div>
                    );
                  })}
                  {activeEdges.length > 7 && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      showing 7 / {activeEdges.length} visible edges
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No visible edges in this filtered view.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Hover or select a node to inspect it.</p>
        )}
      </aside>
    </div>
  );
}

export function InsightBrowser({ insights, topics, graphDocuments }: InsightBrowserProps) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const normalizedQuery = query.trim().toLowerCase();

  const documentSearchById = useMemo(() => {
    return new Map(
      graphDocuments.map((graphDocument) => [
        getDocumentNodeId(graphDocument),
        getDocumentSearchText(graphDocument),
      ])
    );
  }, [graphDocuments]);

  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
      const matchesTopic = !activeTopic || insight.topics.includes(activeTopic);
      const matchesQuery = insightMatchesQuery(insight, normalizedQuery, documentSearchById);

      return matchesTopic && matchesQuery;
    });
  }, [activeTopic, documentSearchById, insights, normalizedQuery]);

  return (
    <section aria-labelledby="brain-insights">
      <div className="mb-5">
        <label htmlFor="brain-search" className="sr-only">
          Search insights
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="brain-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search insights, graph edges, sources, blog posts..."
            className="h-11 w-full rounded-lg border bg-card pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Topic filters">
          <button
            type="button"
            onClick={() => setActiveTopic(null)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs transition-colors',
              activeTopic
                ? 'text-muted-foreground hover:border-primary/50 hover:text-foreground'
                : 'border-primary bg-primary/10 text-primary'
            )}
          >
            all
          </button>
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() =>
                setActiveTopic((currentTopic) => (currentTopic === topic ? null : topic))
              }
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs transition-colors',
                activeTopic === topic
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 rounded-lg border bg-card p-1" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors',
              viewMode === 'list'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('graph')}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors',
              viewMode === 'graph'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Network className="h-3.5 w-3.5" />
            Graph
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="brain-insights" className="text-sm font-semibold uppercase tracking-wide">
          Insight traces
        </h2>
        <p className="text-xs text-muted-foreground">
          {filteredInsights.length} / {insights.length} insights
        </p>
      </div>

      {viewMode === 'graph' ? (
        <GraphView filteredInsights={filteredInsights} graphDocuments={graphDocuments} />
      ) : filteredInsights.length > 0 ? (
        <div className="divide-y rounded-lg border">
          {filteredInsights.map((insight) => (
            <Link
              key={insight.slug}
              href={`/brain/${insight.slug}`}
              className="block p-3 transition-colors hover:bg-muted/30 sm:p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-sm font-semibold leading-snug text-balance">{insight.title}</h3>
                <p className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  sources={insight.sources.length} edges={insight.graph.edges.length}
                </p>
              </div>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {insight.summary}
              </p>

              <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
                topics=[{insight.topics.join(', ')}]
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No insight traces match this query.
        </div>
      )}
    </section>
  );
}
