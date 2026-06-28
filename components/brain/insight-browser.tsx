'use client';

import Link from 'next/link';
import { ExternalLink, FileText, Folder, FolderOpen, List, Network, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BrainGraphEdge, BrainNoteType, PublishedBrainNote } from '@/lib/brain/types';
import { cn } from '@/lib/utils';

interface InsightBrowserProps {
  notes: PublishedBrainNote[];
  tags: string[];
  statuses: string[];
  graphEdges: BrainGraphEdge[];
}

type ViewMode = 'folders' | 'list' | 'graph';
type GraphNodeKind = BrainNoteType | 'folder';

interface GraphNode {
  id: string;
  type: GraphNodeKind;
  slug: string;
  title: string;
  excerpt: string;
  tags: readonly string[];
  status: string;
  filePath: string;
  clusterKey: string;
  clusterLabel: string;
  subtopic: string;
  href?: string;
  virtual: boolean;
  x: number;
  y: number;
  radius: number;
}

interface GraphCluster {
  key: string;
  label: string;
  centerX: number;
  centerY: number;
  haloX: number;
  haloY: number;
  haloRadius: number;
  notes: number;
  subtopicAnchors: ReadonlyMap<string, { x: number; y: number }>;
}

interface FolderTreeNode {
  name: string;
  path: string;
  childFolders: FolderTreeNode[];
  notes: PublishedBrainNote[];
  totalNotes: number;
}

const graphWidth = 1040;
const graphHeight = 660;
const graphCenterX = graphWidth / 2;
const graphCenterY = graphHeight / 2;
const graphMargin = 110;

function getNodeId(slug: string) {
  return `graph:${slug}`;
}

function noteMatchesQuery(note: PublishedBrainNote, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return note.searchText.includes(normalizedQuery);
}

function getNoteFolderPath(note: Pick<PublishedBrainNote, 'filePath'>) {
  const segments = note.filePath.replace(/^brain\//, '').split('/');

  return segments.slice(0, -1).join('/') || '.';
}

function getDisplayPath(note: Pick<PublishedBrainNote, 'filePath'>) {
  return note.filePath.replace(/^brain\//, '');
}

function titleizeSlug(slug: string) {
  const acronymByPart = new Map([
    ['ai', 'AI'],
    ['api', 'API'],
    ['apis', 'APIs'],
    ['llm', 'LLM'],
    ['llms', 'LLMs'],
    ['pr', 'PR'],
    ['prs', 'PRs'],
    ['sdk', 'SDK'],
    ['sdks', 'SDKs'],
    ['stt', 'STT'],
    ['tts', 'TTS'],
    ['vad', 'VAD'],
  ]);

  return slug
    .split('-')
    .map((part) => acronymByPart.get(part) ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function truncateLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1)}…`;
}

function getGraphClusterKey(note: Pick<PublishedBrainNote, 'filePath' | 'type'>) {
  const segments = note.filePath.replace(/^brain\//, '').split('/');

  if (segments[0] === 'insights' && segments[1]) {
    return segments[1];
  }

  if (segments[0] === 'post-seeds' && segments[1]) {
    return segments[1];
  }

  return segments[0] ?? note.type;
}

function getGraphSubtopic(note: Pick<PublishedBrainNote, 'filePath' | 'type'>) {
  const segments = note.filePath.replace(/^brain\//, '').split('/');

  if (segments[0] === 'insights' && segments[2]) {
    return segments[2];
  }

  if (segments[0] === 'post-seeds') {
    return 'post-seeds';
  }

  return note.type;
}

function getTopicNodeSlug(clusterKey: string, subtopic: string) {
  return `folder:${clusterKey}:${subtopic}`;
}

function hashToUnit(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function createFolderNode(name: string, folderPath: string): FolderTreeNode {
  return {
    name,
    path: folderPath,
    childFolders: [],
    notes: [],
    totalNotes: 0,
  };
}

function buildFolderTree(notes: PublishedBrainNote[]) {
  const root = createFolderNode('brain', '');
  const nodeByPath = new Map<string, FolderTreeNode>([['', root]]);

  notes.forEach((note) => {
    const folderPath = getNoteFolderPath(note);
    const segments = folderPath === '.' ? [] : folderPath.split('/');
    let currentNode = root;
    let currentPath = '';

    segments.forEach((segment) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let nextNode = nodeByPath.get(currentPath);

      if (!nextNode) {
        nextNode = createFolderNode(segment, currentPath);
        nodeByPath.set(currentPath, nextNode);
        currentNode.childFolders.push(nextNode);
      }

      currentNode = nextNode;
    });

    currentNode.notes.push(note);
  });

  function sortAndCount(node: FolderTreeNode): number {
    node.childFolders.sort((a, b) => a.name.localeCompare(b.name));
    node.notes.sort((a, b) => a.title.localeCompare(b.title));
    node.totalNotes =
      node.notes.length +
      node.childFolders.reduce((total, child) => total + sortAndCount(child), 0);

    return node.totalNotes;
  }

  sortAndCount(root);

  return {
    root,
    nodeByPath,
  };
}

function findDefaultFolderPath(nodeByPath: ReadonlyMap<string, FolderTreeNode>) {
  if (nodeByPath.has('insights')) {
    return 'insights';
  }

  return Array.from(nodeByPath.keys()).find((path) => path) ?? '';
}

function getFolderOptions(root: FolderTreeNode) {
  const folders: FolderTreeNode[] = [];

  function visit(node: FolderTreeNode) {
    folders.push(node);
    node.childFolders.forEach(visit);
  }

  visit(root);

  return folders;
}

function getFolderSubtreeNotes(folder: FolderTreeNode): PublishedBrainNote[] {
  return folder.childFolders.reduce<PublishedBrainNote[]>((notes, childFolder) => {
    return notes.concat(getFolderSubtreeNotes(childFolder));
  }, folder.notes);
}

function getClusterCenter(index: number, count: number) {
  if (count === 1) {
    return { x: graphCenterX, y: graphCenterY };
  }

  if (count === 2) {
    return {
      x: graphCenterX + (index === 0 ? -290 : 290),
      y: graphCenterY,
    };
  }

  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;

  return {
    x: graphCenterX + Math.cos(angle) * 305,
    y: graphCenterY + Math.sin(angle) * 210,
  };
}

function buildClusterLayouts(notes: PublishedBrainNote[]) {
  const clusterKeys = Array.from(new Set(notes.map(getGraphClusterKey))).sort();
  const subtopicsByCluster = new Map<string, Set<string>>();

  notes.forEach((note) => {
    const clusterKey = getGraphClusterKey(note);
    const subtopics = subtopicsByCluster.get(clusterKey) ?? new Set<string>();
    subtopics.add(getGraphSubtopic(note));
    subtopicsByCluster.set(clusterKey, subtopics);
  });

  return new Map(
    clusterKeys.map((clusterKey, index) => {
      const center = getClusterCenter(index, clusterKeys.length);
      const subtopics = Array.from(subtopicsByCluster.get(clusterKey) ?? []).sort();
      const petalSubtopics = subtopics.filter((subtopic) => subtopic !== 'post-seeds');
      const petalRadius = clusterKeys.length <= 2 ? 150 : 118;
      const subtopicAnchors = new Map<string, { x: number; y: number }>();

      subtopicAnchors.set('post-seeds', center);
      petalSubtopics.forEach((subtopic, subtopicIndex) => {
        const angle =
          -Math.PI / 2 + (subtopicIndex / Math.max(petalSubtopics.length, 1)) * Math.PI * 2;
        subtopicAnchors.set(subtopic, {
          x: center.x + Math.cos(angle) * petalRadius,
          y: center.y + Math.sin(angle) * petalRadius,
        });
      });

      return [
        clusterKey,
        {
          key: clusterKey,
          label: titleizeSlug(clusterKey),
          centerX: center.x,
          centerY: center.y,
          haloX: center.x,
          haloY: center.y,
          haloRadius: 120,
          notes: 0,
          subtopicAnchors,
        } satisfies GraphCluster,
      ];
    })
  );
}

function getNodeRadius(node: Pick<GraphNode, 'type'>, degree: number) {
  if (node.type === 'post-seed') {
    return 31;
  }

  if (node.type === 'folder') {
    return 23;
  }

  return 14 + Math.min(degree, 6) * 1.6;
}

function dedupeGraphEdges(notes: PublishedBrainNote[], graphEdges: BrainGraphEdge[]) {
  const visibleSlugs = new Set(notes.map((note) => note.slug));
  const edgesByPair = new Map<string, BrainGraphEdge>();

  graphEdges.forEach((edge) => {
    if (!visibleSlugs.has(edge.sourceSlug) || !visibleSlugs.has(edge.targetSlug)) {
      return;
    }

    if (edge.sourceSlug === edge.targetSlug) {
      return;
    }

    const [firstSlug, secondSlug] = [edge.sourceSlug, edge.targetSlug].sort();
    const pairKey = `${firstSlug}<->${secondSlug}`;
    const existingEdge = edgesByPair.get(pairKey);

    if (existingEdge) {
      const relations = new Set(existingEdge.relation.split(', ').concat(edge.relation));
      edgesByPair.set(pairKey, {
        ...existingEdge,
        relation: Array.from(relations).sort().join(', '),
      });
      return;
    }

    edgesByPair.set(pairKey, {
      ...edge,
      id: pairKey,
      sourceSlug: firstSlug,
      targetSlug: secondSlug,
    });
  });

  return Array.from(edgesByPair.values());
}

function shouldRerouteSeedEdge(edge: BrainGraphEdge, nodeBySlug: ReadonlyMap<string, GraphNode>) {
  const source = nodeBySlug.get(edge.sourceSlug);
  const target = nodeBySlug.get(edge.targetSlug);

  if (!source || !target) {
    return false;
  }

  if (source.clusterKey !== target.clusterKey) {
    return false;
  }

  return source.type === 'post-seed' || target.type === 'post-seed';
}

function getNodeAnchor(node: GraphNode, clusterByKey: ReadonlyMap<string, GraphCluster>) {
  const cluster = clusterByKey.get(node.clusterKey);

  if (!cluster) {
    throw new Error(`Missing graph cluster for ${node.clusterKey}`);
  }

  return (
    cluster.subtopicAnchors.get(node.subtopic) ?? {
      x: cluster.centerX,
      y: cluster.centerY,
    }
  );
}

function simulateGraphLayout(
  nodes: GraphNode[],
  edges: BrainGraphEdge[],
  clusterByKey: ReadonlyMap<string, GraphCluster>
) {
  const nodeBySlug = new Map(nodes.map((node) => [node.slug, node]));
  const velocities = new Map(nodes.map((node) => [node.slug, { x: 0, y: 0 }]));
  const linkedNodePairs = edges.map((edge) => {
    const source = nodeBySlug.get(edge.sourceSlug);
    const target = nodeBySlug.get(edge.targetSlug);

    if (!source || !target) {
      throw new Error(`Missing graph node for edge ${edge.id}`);
    }

    return { source, target };
  });

  for (let iteration = 0; iteration < 340; iteration += 1) {
    const alpha = 1 - iteration / 340;
    const attractionStrength = 0.025 * alpha;
    const linkStrength = 0.018 * alpha;
    const chargeStrength = 1700 * alpha;

    nodes.forEach((node) => {
      const velocity = velocities.get(node.slug);

      if (!velocity) {
        throw new Error(`Missing graph velocity for ${node.slug}`);
      }

      const anchor = getNodeAnchor(node, clusterByKey);
      const cluster = clusterByKey.get(node.clusterKey);
      const targetX = node.type === 'post-seed' ? (cluster?.centerX ?? anchor.x) : anchor.x;
      const targetY = node.type === 'post-seed' ? (cluster?.centerY ?? anchor.y) : anchor.y;
      const strength = node.type === 'post-seed' ? attractionStrength * 2.8 : attractionStrength;

      velocity.x += (targetX - node.x) * strength;
      velocity.y += (targetY - node.y) * strength;
    });

    linkedNodePairs.forEach(({ source, target }) => {
      const sourceVelocity = velocities.get(source.slug);
      const targetVelocity = velocities.get(target.slug);

      if (!sourceVelocity || !targetVelocity) {
        throw new Error(`Missing graph velocity for linked nodes ${source.slug} -> ${target.slug}`);
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
      const desiredDistance =
        source.clusterKey === target.clusterKey
          ? source.type === 'post-seed' || target.type === 'post-seed'
            ? 112
            : 86
          : 180;
      const force = (distance - desiredDistance) * linkStrength;
      const forceX = (dx / distance) * force;
      const forceY = (dy / distance) * force;

      sourceVelocity.x += forceX;
      sourceVelocity.y += forceY;
      targetVelocity.x -= forceX;
      targetVelocity.y -= forceY;
    });

    for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
        const firstNode = nodes[firstIndex];
        const secondNode = nodes[secondIndex];

        if (!firstNode || !secondNode) {
          throw new Error('Missing graph node during collision simulation');
        }

        const firstVelocity = velocities.get(firstNode.slug);
        const secondVelocity = velocities.get(secondNode.slug);

        if (!firstVelocity || !secondVelocity) {
          throw new Error(`Missing graph velocity for ${firstNode.slug} or ${secondNode.slug}`);
        }

        const dx = secondNode.x - firstNode.x;
        const dy = secondNode.y - firstNode.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
        const collisionDistance = firstNode.radius + secondNode.radius + 24;
        const clusterMultiplier = firstNode.clusterKey === secondNode.clusterKey ? 1 : 1.45;
        const repulsion = (chargeStrength * clusterMultiplier) / (distance * distance);
        const forceX = (dx / distance) * repulsion;
        const forceY = (dy / distance) * repulsion;

        firstVelocity.x -= forceX;
        firstVelocity.y -= forceY;
        secondVelocity.x += forceX;
        secondVelocity.y += forceY;

        if (distance < collisionDistance) {
          const overlap = (collisionDistance - distance) * 0.11 * alpha;
          const overlapX = (dx / distance) * overlap;
          const overlapY = (dy / distance) * overlap;

          firstVelocity.x -= overlapX;
          firstVelocity.y -= overlapY;
          secondVelocity.x += overlapX;
          secondVelocity.y += overlapY;
        }
      }
    }

    nodes.forEach((node) => {
      const velocity = velocities.get(node.slug);

      if (!velocity) {
        throw new Error(`Missing graph velocity for ${node.slug}`);
      }

      velocity.x *= 0.72;
      velocity.y *= 0.72;
      node.x += velocity.x;
      node.y += velocity.y;
    });
  }
}

function fitGraphToViewport(nodes: GraphNode[]) {
  const minX = Math.min(...nodes.map((node) => node.x - node.radius));
  const maxX = Math.max(...nodes.map((node) => node.x + node.radius));
  const minY = Math.min(...nodes.map((node) => node.y - node.radius));
  const maxY = Math.max(...nodes.map((node) => node.y + node.radius));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(
    1,
    (graphWidth - graphMargin * 2) / width,
    (graphHeight - graphMargin * 2) / height
  );
  const offsetX = graphMargin + (graphWidth - graphMargin * 2 - width * scale) / 2 - minX * scale;
  const offsetY = graphMargin + (graphHeight - graphMargin * 2 - height * scale) / 2 - minY * scale;

  nodes.forEach((node) => {
    node.x = node.x * scale + offsetX;
    node.y = node.y * scale + offsetY;
  });
}

function finalizeClusterHalos(nodes: GraphNode[], clusterByKey: Map<string, GraphCluster>) {
  clusterByKey.forEach((cluster) => {
    const clusterNodes = nodes.filter((node) => node.clusterKey === cluster.key);

    if (clusterNodes.length === 0) {
      return;
    }

    const haloX =
      clusterNodes.reduce((total, node) => total + node.x, 0) / Math.max(clusterNodes.length, 1);
    const haloY =
      clusterNodes.reduce((total, node) => total + node.y, 0) / Math.max(clusterNodes.length, 1);
    const haloRadius = Math.max(
      82,
      ...clusterNodes.map((node) => {
        const dx = node.x - haloX;
        const dy = node.y - haloY;

        return Math.sqrt(dx * dx + dy * dy) + node.radius + 38;
      })
    );

    cluster.haloX = haloX;
    cluster.haloY = haloY;
    cluster.haloRadius = haloRadius;
    cluster.notes = clusterNodes.filter((node) => !node.virtual).length;
  });
}

function buildGraph(notes: PublishedBrainNote[], graphEdges: BrainGraphEdge[]) {
  const orderedNotes = [...notes].sort((a, b) => a.title.localeCompare(b.title));
  const clusterByKey = buildClusterLayouts(orderedNotes);
  const noteNodes: GraphNode[] = orderedNotes.map((note) => {
    const clusterKey = getGraphClusterKey(note);
    const cluster = clusterByKey.get(clusterKey);

    if (!cluster) {
      throw new Error(`Missing graph cluster for ${clusterKey}`);
    }

    const subtopic = getGraphSubtopic(note);
    const anchor = cluster.subtopicAnchors.get(subtopic) ?? {
      x: cluster.centerX,
      y: cluster.centerY,
    };
    const seedAngle = hashToUnit(note.slug) * Math.PI * 2;
    const seedRadius = note.type === 'post-seed' ? 0 : 28 + hashToUnit(`${note.slug}:r`) * 38;

    return {
      id: getNodeId(note.slug),
      type: note.type,
      slug: note.slug,
      title: note.title,
      excerpt: note.excerpt,
      tags: note.tags,
      status: note.status,
      filePath: note.filePath,
      clusterKey,
      clusterLabel: cluster.label,
      subtopic,
      href: `/brain/${note.slug}`,
      virtual: false,
      x: anchor.x + Math.cos(seedAngle) * seedRadius,
      y: anchor.y + Math.sin(seedAngle) * seedRadius,
      radius: 18,
    };
  });
  const topicNodes: GraphNode[] = Array.from(clusterByKey.values()).flatMap((cluster) => {
    return Array.from(cluster.subtopicAnchors.entries()).flatMap(([subtopic, anchor]) => {
      if (subtopic === 'post-seeds') {
        return [];
      }

      const notesInSubtopic = noteNodes.filter((node) => {
        return node.clusterKey === cluster.key && node.subtopic === subtopic;
      });

      if (notesInSubtopic.length === 0) {
        return [];
      }

      const slug = getTopicNodeSlug(cluster.key, subtopic);

      return [
        {
          id: getNodeId(slug),
          type: 'folder' as const,
          slug,
          title: titleizeSlug(subtopic),
          excerpt: `${notesInSubtopic.length} notes in ${cluster.label}.`,
          tags: [],
          status: 'folder',
          filePath: `brain/insights/${cluster.key}/${subtopic}/`,
          clusterKey: cluster.key,
          clusterLabel: cluster.label,
          subtopic,
          href: undefined,
          virtual: true,
          x: anchor.x,
          y: anchor.y,
          radius: 23,
        },
      ];
    });
  });
  const nodes = [...noteNodes, ...topicNodes];
  const nodeBySlug = new Map(nodes.map((node) => [node.slug, node]));
  const actualEdges = dedupeGraphEdges(orderedNotes, graphEdges).filter((edge) => {
    return !shouldRerouteSeedEdge(edge, nodeBySlug);
  });
  const postSeedByCluster = new Map(
    noteNodes.filter((node) => node.type === 'post-seed').map((node) => [node.clusterKey, node])
  );
  const folderEdges: BrainGraphEdge[] = topicNodes.flatMap((topicNode) => {
    const postSeed = postSeedByCluster.get(topicNode.clusterKey);
    const notesInSubtopic = noteNodes.filter((node) => {
      return node.clusterKey === topicNode.clusterKey && node.subtopic === topicNode.subtopic;
    });
    const topicEdges = notesInSubtopic.map((note) => ({
      id: `${topicNode.slug}<->${note.slug}`,
      sourceSlug: topicNode.slug,
      targetSlug: note.slug,
      relation: 'contains',
    }));

    if (!postSeed) {
      return topicEdges;
    }

    return [
      {
        id: `${postSeed.slug}<->${topicNode.slug}`,
        sourceSlug: postSeed.slug,
        targetSlug: topicNode.slug,
        relation: 'groups',
      },
      ...topicEdges,
    ];
  });
  const edges = [...actualEdges, ...folderEdges];
  const degreeBySlug = new Map<string, number>();

  edges.forEach((edge) => {
    degreeBySlug.set(edge.sourceSlug, (degreeBySlug.get(edge.sourceSlug) ?? 0) + 1);
    degreeBySlug.set(edge.targetSlug, (degreeBySlug.get(edge.targetSlug) ?? 0) + 1);
  });

  nodes.forEach((node) => {
    node.radius = getNodeRadius(node, degreeBySlug.get(node.slug) ?? 0);
  });

  simulateGraphLayout(nodes, edges, clusterByKey);
  fitGraphToViewport(nodes);
  finalizeClusterHalos(nodes, clusterByKey);

  return {
    nodes,
    edges,
    clusters: Array.from(clusterByKey.values()).sort((a, b) => a.label.localeCompare(b.label)),
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    nodeBySlug,
  };
}

function getEdgePath(source: GraphNode, target: GraphNode) {
  const controlX = (source.x + target.x) / 2 + (source.y - target.y) * 0.08;
  const controlY = (source.y + target.y) / 2 + (target.x - source.x) * 0.08;

  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function isNodeConnected(nodeId: string, activeNodeId: string | null, edges: BrainGraphEdge[]) {
  if (!activeNodeId || nodeId === activeNodeId) {
    return true;
  }

  const activeSlug = activeNodeId.replace(/^graph:/, '');
  const nodeSlug = nodeId.replace(/^graph:/, '');

  return edges.some((edge) => {
    return (
      (edge.sourceSlug === activeSlug && edge.targetSlug === nodeSlug) ||
      (edge.targetSlug === activeSlug && edge.sourceSlug === nodeSlug)
    );
  });
}

function getRequiredNode(nodeBySlug: ReadonlyMap<string, GraphNode>, slug: string) {
  const node = nodeBySlug.get(slug);

  if (!node) {
    throw new Error(`Missing graph node for visible edge: ${slug}`);
  }

  return node;
}

function getRequiredCluster(clusters: ReadonlyMap<string, GraphCluster>, key: string) {
  const cluster = clusters.get(key);

  if (!cluster) {
    throw new Error(`Missing graph cluster for visible node: ${key}`);
  }

  return cluster;
}

function getNodeLabelLayout(node: GraphNode, cluster: GraphCluster) {
  if (node.type === 'post-seed') {
    return {
      x: node.x,
      y: node.y + node.radius + 17,
      textAnchor: 'middle' as const,
      dominantBaseline: 'hanging' as const,
    };
  }

  if (node.type !== 'folder') {
    return {
      x: node.x,
      y: node.y + node.radius + 12,
      textAnchor: 'middle' as const,
      dominantBaseline: 'hanging' as const,
    };
  }

  const dx = node.x - cluster.haloX;
  const dy = node.y - cluster.haloY;
  const horizontal = Math.abs(dx) > Math.abs(dy) * 0.72;
  const offset = node.radius + 10;

  if (horizontal) {
    let direction = dx >= 0 ? 1 : -1;
    let x = node.x + direction * offset;

    if (x < 150) {
      direction = 1;
      x = node.x + offset;
    }

    if (x > graphWidth - 150) {
      direction = -1;
      x = node.x - offset;
    }

    return {
      x,
      y: node.y,
      textAnchor: direction > 0 ? ('start' as const) : ('end' as const),
      dominantBaseline: 'middle' as const,
    };
  }

  const direction = dy >= 0 ? 1 : -1;

  return {
    x: node.x,
    y: node.y + direction * offset,
    textAnchor: 'middle' as const,
    dominantBaseline: direction > 0 ? ('hanging' as const) : ('alphabetic' as const),
  };
}

function getNodeLabelMaxLength(node: Pick<GraphNode, 'type'>) {
  if (node.type === 'post-seed') {
    return 25;
  }

  if (node.type === 'folder') {
    return 17;
  }

  return 22;
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border border-dashed px-2.5 py-1 text-xs uppercase tracking-[0.08em] transition-colors',
        active
          ? 'border-primary bg-[var(--hover)] text-primary'
          : 'text-muted-foreground hover:border-primary hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function GraphView({
  filteredNotes,
  graphEdges,
}: {
  filteredNotes: PublishedBrainNote[];
  graphEdges: BrainGraphEdge[];
}) {
  const { clusters, edges, nodes, nodeBySlug } = useMemo(() => {
    return buildGraph(filteredNotes, graphEdges);
  }, [filteredNotes, graphEdges]);
  const clusterByKey = useMemo(() => {
    return new Map(clusters.map((cluster) => [cluster.key, cluster]));
  }, [clusters]);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const requestedActiveNodeId = hoveredNodeId ?? selectedNodeId;
  const activeNode = nodes.find((node) => node.id === requestedActiveNodeId) ?? null;
  const resolvedActiveNodeId = activeNode?.id ?? null;
  const activeEdges = activeNode
    ? edges.filter((edge) => {
        return edge.sourceSlug === activeNode.slug || edge.targetSlug === activeNode.slug;
      })
    : [];

  if (filteredNotes.length === 0) {
    return (
      <div className="border border-dashed border-border bg-[var(--hover)] p-6 text-sm text-muted-foreground">
        No graph nodes match this query.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="overflow-x-auto border border-dashed border-border bg-[var(--hover)]">
        <svg
          className="h-[660px] w-full min-w-[860px] lg:min-w-0"
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Brain note graph"
        >
          <rect width={graphWidth} height={graphHeight} fill="transparent" />

          {clusters.map((cluster) => (
            <g key={cluster.key} aria-hidden="true">
              <circle
                cx={cluster.haloX}
                cy={cluster.haloY}
                r={cluster.haloRadius}
                fill="transparent"
                stroke="currentColor"
                strokeDasharray="3 10"
                strokeWidth="1"
                className="text-primary/20"
              />
              <text
                x={cluster.haloX}
                y={cluster.haloY - cluster.haloRadius + 21}
                textAnchor="middle"
                paintOrder="stroke"
                stroke="var(--hover)"
                strokeWidth="6"
                className="fill-primary font-mono text-[12px] font-semibold uppercase tracking-[0.14em]"
              >
                {cluster.label}
              </text>
            </g>
          ))}

          {edges.map((edge) => {
            const source = getRequiredNode(nodeBySlug, edge.sourceSlug);
            const target = getRequiredNode(nodeBySlug, edge.targetSlug);
            const active =
              !activeNode ||
              edge.sourceSlug === activeNode.slug ||
              edge.targetSlug === activeNode.slug;

            return (
              <path
                key={edge.id}
                d={getEdgePath(source, target)}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth={
                  edge.relation.includes('groups')
                    ? 1.7
                    : edge.relation.includes('feeds-into')
                      ? 1.45
                      : 0.95
                }
                className={cn(
                  'text-primary transition-opacity',
                  active ? 'opacity-[0.32]' : 'opacity-[0.07]'
                )}
              />
            );
          })}

          {nodes.map((node) => {
            const cluster = getRequiredCluster(clusterByKey, node.clusterKey);
            const active = isNodeConnected(node.id, resolvedActiveNodeId, edges);
            const selected = selectedNodeId === node.id;
            const hovered = hoveredNodeId === node.id;
            const showLabel = node.type === 'folder' || selected || hovered;
            const fill =
              node.type === 'post-seed' || node.type === 'folder'
                ? 'var(--hover)'
                : 'var(--background)';
            const stroke =
              node.type === 'post-seed' || node.type === 'folder' || selected
                ? 'var(--primary)'
                : 'var(--border)';
            const labelLayout = getNodeLabelLayout(node, cluster);

            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={node.title}
                onClick={() =>
                  setSelectedNodeId((current) => (current === node.id ? null : node.id))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedNodeId((current) => (current === node.id ? null : node.id));
                  }
                }}
                onFocus={() => setHoveredNodeId(node.id)}
                onBlur={() => setHoveredNodeId(null)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={cn(
                  'cursor-pointer outline-none transition-opacity',
                  active ? 'opacity-100' : 'opacity-25'
                )}
              >
                <title>{`${node.title} · ${node.clusterLabel} / ${node.subtopic}`}</title>
                {selected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 7}
                    fill="transparent"
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={node.type === 'post-seed' || node.type === 'folder' ? 1.8 : 1.2}
                  className={cn('transition-all', hovered && 'drop-shadow-sm')}
                />
                {showLabel && (
                  <text
                    x={labelLayout.x}
                    y={labelLayout.y}
                    textAnchor={labelLayout.textAnchor}
                    dominantBaseline={labelLayout.dominantBaseline}
                    paintOrder="stroke"
                    stroke="var(--hover)"
                    strokeWidth={node.type === 'folder' || node.type === 'post-seed' ? 5 : 3}
                    className={cn(
                      'pointer-events-none select-none font-mono font-semibold',
                      node.type === 'post-seed' || node.type === 'folder'
                        ? 'fill-primary text-[11px]'
                        : 'fill-foreground text-[11px]'
                    )}
                  >
                    {truncateLabel(node.title, getNodeLabelMaxLength(node))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="border border-dashed border-border bg-[var(--hover)] p-4 lg:min-h-[660px]">
        {activeNode ? (
          <>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {activeNode.clusterLabel} / {activeNode.subtopic}
            </p>
            <h3 className="text-base font-semibold leading-snug">{activeNode.title}</h3>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {activeNode.excerpt}
            </p>
            <p className="mt-3 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
              {getDisplayPath(activeNode)}
            </p>
            {activeNode.href && (
              <Link
                href={activeNode.href}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary underline decoration-dashed underline-offset-4"
              >
                Open note
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}

            <div className="mt-5 border-t border-dashed border-[var(--hair)] pt-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connected links
              </h4>
              {activeEdges.length > 0 ? (
                <div className="space-y-3">
                  {activeEdges.slice(0, 7).map((edge) => {
                    const otherSlug =
                      edge.sourceSlug === activeNode.slug ? edge.targetSlug : edge.sourceSlug;
                    const otherNode = getRequiredNode(nodeBySlug, otherSlug);
                    const commonClassName =
                      'mt-1 block text-left font-semibold text-primary underline decoration-dashed underline-offset-4';

                    return (
                      <div key={edge.id} className="text-xs leading-relaxed">
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {edge.relation}
                        </p>
                        {otherNode.href ? (
                          <Link href={otherNode.href} className={commonClassName}>
                            {otherNode.title}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(otherNode.id)}
                            className={commonClassName}
                          >
                            {otherNode.title}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {activeEdges.length > 7 && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      showing 7 / {activeEdges.length} visible links
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No visible links in this filtered view.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Graph overview
            </p>
            <h3 className="text-base font-semibold leading-snug">Clustered brain graph</h3>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Notes are pulled toward their research area and subfolder, then spaced with a
              deterministic force layout. Hover or select a node to inspect its local links.
            </p>
            <div className="mt-5 space-y-3 border-t border-dashed border-[var(--hair)] pt-4">
              {clusters.map((cluster) => (
                <div key={cluster.key} className="text-xs leading-relaxed">
                  <p className="font-semibold">{cluster.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {cluster.notes} notes
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function FolderTreeItem({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: FolderTreeNode;
  selectedPath: string;
  onSelect: (folderPath: string) => void;
  depth: number;
}) {
  const selected = selectedPath === node.path;
  const Icon = selected ? FolderOpen : Folder;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          'flex h-7 w-full items-center gap-1.5 px-1.5 text-left font-mono text-[11px] transition-colors',
          selected
            ? 'bg-[var(--hover)] text-primary'
            : 'text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'
        )}
        style={{ paddingLeft: `${depth * 9 + 6}px` }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        <span className="shrink-0 text-[10px]">{node.totalNotes}</span>
      </button>

      {node.childFolders.map((childNode) => (
        <FolderTreeItem
          key={childNode.path}
          node={childNode}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function FolderContentRow({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    'flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left no-underline transition-colors hover:bg-[var(--hover)] sm:px-4';

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function FolderFileRow({ note }: { note: PublishedBrainNote }) {
  return (
    <FolderContentRow href={`/brain/${note.slug}`}>
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h4 className="truncate text-sm font-semibold text-foreground">{note.title}</h4>
          <span className="font-mono text-[11px] text-muted-foreground">{note.status}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{note.excerpt}</p>
      </div>
      <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground md:inline">
        {note.slug}.md
      </span>
    </FolderContentRow>
  );
}

function FolderBrowserView({
  filteredNotes,
  isSearching,
  selectedFolderPath,
  onSelectFolder,
}: {
  filteredNotes: PublishedBrainNote[];
  isSearching: boolean;
  selectedFolderPath: string | null;
  onSelectFolder: (folderPath: string) => void;
}) {
  const { root, nodeByPath } = useMemo(() => buildFolderTree(filteredNotes), [filteredNotes]);
  const fallbackPath = isSearching ? '' : findDefaultFolderPath(nodeByPath);
  const requestedPath = selectedFolderPath ?? fallbackPath;
  const selectedFolder = nodeByPath.get(requestedPath) ?? nodeByPath.get(fallbackPath) ?? root;
  const folderOptions = useMemo(() => getFolderOptions(root), [root]);
  const visibleNotes = useMemo(() => {
    if (isSearching) {
      return getFolderSubtreeNotes(selectedFolder).sort((a, b) => a.title.localeCompare(b.title));
    }

    return selectedFolder.notes;
  }, [isSearching, selectedFolder]);

  if (filteredNotes.length === 0) {
    return (
      <div className="border border-dashed border-border bg-[var(--hover)] p-6 text-sm text-muted-foreground">
        No brain notes match this query.
      </div>
    );
  }

  return (
    <div data-folder-browser className="border border-dashed border-border">
      <div className="bg-[var(--hover)] md:hidden">
        <div className="border-b border-dashed border-[var(--hair)] px-3 py-3">
          <label
            htmlFor="mobile-brain-folder"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Folder
          </label>
          <select
            id="mobile-brain-folder"
            value={selectedFolder.path}
            onChange={(event) => onSelectFolder(event.target.value)}
            className="mt-2 h-10 w-full border border-dashed border-border bg-background px-2 font-mono text-xs text-primary outline-none focus:border-primary"
          >
            {folderOptions.map((folder) => (
              <option key={folder.path} value={folder.path}>
                brain{folder.path ? `/${folder.path}` : ''} ({folder.totalNotes})
              </option>
            ))}
          </select>
        </div>

        {selectedFolder.childFolders.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 py-2">
            {selectedFolder.childFolders.map((folder) => (
              <button
                key={folder.path}
                type="button"
                onClick={() => onSelectFolder(folder.path)}
                data-mobile-folder-shortcut
                className="inline-flex h-8 max-w-[200px] shrink-0 items-center gap-1.5 border border-dashed border-border px-2 font-mono text-[11px] text-primary"
              >
                <Folder className="h-3 w-3" />
                <span className="min-w-0 truncate">{folder.name}</span>
                <span className="text-muted-foreground">{folder.totalNotes}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:min-h-[560px] md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-dashed border-[var(--hair)] bg-[var(--hover)] md:block">
          <div className="border-b border-dashed border-[var(--hair)] px-3 py-2.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Vault
            </p>
          </div>
          <div className="py-1">
            <FolderTreeItem
              node={root}
              selectedPath={selectedFolder.path}
              onSelect={onSelectFolder}
              depth={0}
            />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[var(--hair)] bg-[var(--hover)] px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground md:block">
                Folder
              </p>
              <h3 className="break-all font-mono text-xs font-semibold text-primary md:mt-1 md:text-sm">
                brain{selectedFolder.path ? `/${selectedFolder.path}` : ''}
              </h3>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {selectedFolder.childFolders.length} folders · {visibleNotes.length}{' '}
              {isSearching ? 'matching files' : 'files'}
            </p>
          </header>

          <div className="divide-y divide-dashed divide-[var(--hair)]">
            {selectedFolder.childFolders.map((folder) => (
              <FolderContentRow key={folder.path} onClick={() => onSelectFolder(folder.path)}>
                <Folder className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-mono text-sm font-semibold text-foreground">
                    {folder.name}
                  </h4>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {folder.totalNotes} files
                  </p>
                </div>
                <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground md:inline">
                  folder
                </span>
              </FolderContentRow>
            ))}

            {visibleNotes.map((note) => (
              <FolderFileRow key={note.slug} note={note} />
            ))}

            {selectedFolder.childFolders.length === 0 && visibleNotes.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">This folder is empty.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlatListView({ notes }: { notes: PublishedBrainNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="border border-dashed border-border bg-[var(--hover)] p-6 text-sm text-muted-foreground">
        No brain notes match this query.
      </div>
    );
  }

  return (
    <div className="divide-y divide-dashed divide-[var(--hair)] border border-dashed border-border">
      {notes.map((note) => (
        <Link
          key={note.slug}
          href={`/brain/${note.slug}`}
          className="grid gap-2 px-4 py-3 no-underline transition-colors hover:bg-[var(--hover)] md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-semibold text-foreground">{note.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 pl-6 text-xs leading-relaxed text-muted-foreground">
              {note.excerpt}
            </p>
            <p className="mt-1 break-all pl-6 font-mono text-[11px] text-muted-foreground">
              {getDisplayPath(note)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-6 md:justify-end md:pl-0">
            <span className="border border-dashed border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {note.type}
            </span>
            <span className="border border-dashed border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {note.status}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              links={note.links.length}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function InsightBrowser({ notes, tags, statuses, graphEdges }: InsightBrowserProps) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<BrainNoteType | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const noteTypes = useMemo(() => {
    return Array.from(new Set(notes.map((note) => note.type))).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      const matchesType = !activeType || note.type === activeType;
      const matchesStatus = !activeStatus || note.status === activeStatus;
      const matchesQuery = noteMatchesQuery(note, normalizedQuery);

      return matchesTag && matchesType && matchesStatus && matchesQuery;
    });
  }, [activeStatus, activeTag, activeType, normalizedQuery, notes]);

  return (
    <section aria-labelledby="brain-notes" className="pb-8">
      <div className="mb-5">
        <label htmlFor="brain-search" className="sr-only">
          Search brain notes
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="brain-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, tags, links, sources..."
            className="h-11 w-full border border-dashed border-border bg-transparent pr-10 pl-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2" aria-label="Type filters">
          <ToggleButton active={!activeType} onClick={() => setActiveType(null)}>
            all types
          </ToggleButton>
          {noteTypes.map((type) => (
            <ToggleButton
              key={type}
              active={activeType === type}
              onClick={() => setActiveType((current) => (current === type ? null : type))}
            >
              {type}
            </ToggleButton>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Status filters">
          <ToggleButton active={!activeStatus} onClick={() => setActiveStatus(null)}>
            all statuses
          </ToggleButton>
          {statuses.map((status) => (
            <ToggleButton
              key={status}
              active={activeStatus === status}
              onClick={() => setActiveStatus((current) => (current === status ? null : status))}
            >
              {status}
            </ToggleButton>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Tag filters">
          <ToggleButton active={!activeTag} onClick={() => setActiveTag(null)}>
            all tags
          </ToggleButton>
          {tags.map((tag) => (
            <ToggleButton
              key={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
            >
              {tag}
            </ToggleButton>
          ))}
        </div>

        <div className="flex border border-dashed border-border md:w-fit" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewMode('folders')}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.08em] transition-colors',
              viewMode === 'folders'
                ? 'bg-[var(--hover)] text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Folder className="h-3.5 w-3.5" />
            Folders
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex items-center gap-2 border-l border-dashed border-border px-3 py-1.5 text-xs uppercase tracking-[0.08em] transition-colors',
              viewMode === 'list'
                ? 'bg-[var(--hover)] text-primary'
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
              'inline-flex items-center gap-2 border-l border-dashed border-border px-3 py-1.5 text-xs uppercase tracking-[0.08em] transition-colors',
              viewMode === 'graph'
                ? 'bg-[var(--hover)] text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Network className="h-3.5 w-3.5" />
            Graph
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="brain-notes" className="section-kicker">
          Notes / links / research
        </h2>
        <p className="text-xs text-muted-foreground">
          {filteredNotes.length} / {notes.length} notes
        </p>
      </div>

      {viewMode === 'graph' ? (
        <GraphView filteredNotes={filteredNotes} graphEdges={graphEdges} />
      ) : viewMode === 'folders' ? (
        <FolderBrowserView
          filteredNotes={filteredNotes}
          isSearching={normalizedQuery.length > 0}
          selectedFolderPath={selectedFolderPath}
          onSelectFolder={setSelectedFolderPath}
        />
      ) : filteredNotes.length > 0 ? (
        <FlatListView notes={filteredNotes} />
      ) : (
        <div className="border border-dashed border-border bg-[var(--hover)] p-6 text-sm text-muted-foreground">
          No brain notes match this query.
        </div>
      )}
    </section>
  );
}
