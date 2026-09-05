'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Minus, Pause, Play, Plus, Scan, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { BrainGraphEdge, PublishedBrainNote } from '@/lib/brain/types';
import styles from './insight-graph.module.css';

interface GraphPoint {
  note: PublishedBrainNote;
  x: number;
  y: number;
}

interface Topic {
  key: string;
  label: string;
  notes: PublishedBrainNote[];
}

const acronyms = new Set(['ai', 'llm', 'tts', 'api']);

function topicKey(note: PublishedBrainNote) {
  const parts = note.filePath.replace(/^brain\//, '').split('/');
  if (parts[0] === 'post-seeds') return note.slug;
  if (parts[0] === 'insights') return parts.length > 2 ? parts[1] : 'other-research';
  return parts[0];
}

function topicLabel(key: string) {
  return key
    .split('-')
    .map((word, index) => {
      if (acronyms.has(word)) return word.toUpperCase();
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}

function buildTopics(notes: PublishedBrainNote[]): Topic[] {
  const groups = new Map<string, PublishedBrainNote[]>();
  for (const note of notes) {
    const key = topicKey(note);
    const group = groups.get(key) ?? [];
    group.push(note);
    groups.set(key, group);
  }
  return Array.from(groups, ([key, group]) => ({ key, label: topicLabel(key), notes: group })).sort(
    (a, b) => b.notes.length - a.notes.length || a.label.localeCompare(b.label)
  );
}

const graphWidth = 1000;
const graphHeight = 760;

function layoutGraph(topics: Topic[], degree: ReadonlyMap<string, number>) {
  const clusters = topics.map((topic, index) => {
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    return {
      ...topic,
      x: Math.cos(angle) * Math.sqrt(index) * 150,
      y: Math.sin(angle) * Math.sqrt(index) * 150,
      radius: Math.max(86, 30 + Math.sqrt(topic.notes.length) * 22),
    };
  });
  // Pack topic areas on one plane. Reserve space for labels as well as nodes.
  for (let step = 0; step < 260; step++) {
    for (const cluster of clusters) {
      cluster.x *= 0.997;
      cluster.y *= 0.997;
    }
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const first = clusters[i];
        const second = clusters[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const overlap = first.radius + second.radius + 28 - distance;
        if (overlap <= 0) continue;
        const shift = overlap / distance / 2;
        first.x -= dx * shift;
        first.y -= dy * shift;
        second.x += dx * shift;
        second.y += dy * shift;
      }
    }
  }
  if (clusters.length === 0) return { clusters: [], points: [] };
  const minX = Math.min(...clusters.map((cluster) => cluster.x - cluster.radius));
  const maxX = Math.max(...clusters.map((cluster) => cluster.x + cluster.radius));
  const minY = Math.min(...clusters.map((cluster) => cluster.y - cluster.radius - 30));
  const maxY = Math.max(...clusters.map((cluster) => cluster.y + cluster.radius));
  const scale = Math.min(
    (graphWidth - 100) / (maxX - minX),
    (graphHeight - 100) / (maxY - minY),
    1.7
  );
  for (const cluster of clusters) {
    cluster.x = graphWidth / 2 + (cluster.x - (minX + maxX) / 2) * scale;
    cluster.y = graphHeight / 2 + (cluster.y - (minY + maxY) / 2) * scale;
    cluster.radius *= scale;
  }
  const points: GraphPoint[] = clusters.flatMap((cluster) => {
    const ordered = [...cluster.notes].sort(
      (a, b) =>
        (degree.get(b.slug) ?? 0) - (degree.get(a.slug) ?? 0) || a.slug.localeCompare(b.slug)
    );
    return ordered.map((note, index) => {
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const radius =
        Math.sqrt(index / Math.max(ordered.length - 1, 1)) *
        Math.min(cluster.radius - 22, Math.sqrt(ordered.length) * 22 * scale);
      return {
        note,
        x: cluster.x + Math.cos(angle) * radius,
        y: cluster.y + Math.sin(angle) * radius,
      };
    });
  });
  return { clusters, points };
}

function wrapTopicLabel(label: string) {
  const words = label.split(' ');
  const lines = [''];
  for (const word of words) {
    const last = lines.length - 1;
    if (lines[last].length + word.length > 22) lines.push(word);
    else lines[last] += `${lines[last] ? ' ' : ''}${word}`;
  }
  return lines;
}

export function InsightGraph({
  notes,
  graphEdges,
}: {
  notes: PublishedBrainNote[];
  graphEdges: BrainGraphEdge[];
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 0,
    top: 0,
    maxWidth: 280,
    alignEnd: false,
    above: false,
  });

  function showNodeName(slug: string, element: SVGGElement) {
    const canvas = canvasRef.current!.getBoundingClientRect();
    const node = element.getBoundingClientRect();
    const centerX = node.left + node.width / 2 - canvas.left;
    const centerY = node.top + node.height / 2 - canvas.top;
    const alignEnd = centerX > canvas.width / 2;
    const above = centerY > canvas.height / 2;
    const left = Math.max(12, Math.min(canvas.width - 12, centerX + (alignEnd ? -18 : 18)));
    const top = Math.max(12, Math.min(canvas.height - 12, centerY + (above ? -18 : 18)));
    setTooltipPosition({
      left,
      top,
      alignEnd,
      above,
      maxWidth: Math.min(280, alignEnd ? left - 12 : canvas.width - left - 12),
    });
    setHoveredSlug(slug);
  }

  const [paused, setPaused] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function pointerPosition(event: PointerEvent<SVGSVGElement>) {
    const point = event.currentTarget.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(event.currentTarget.getScreenCTM()!.inverse());
  }

  function changeZoom(factor: number) {
    setCamera((current) => {
      const zoom = Math.max(1, Math.min(3, current.zoom * factor));
      const ratio = zoom / current.zoom;
      return {
        zoom,
        x: graphWidth / 2 + (current.x - graphWidth / 2) * ratio,
        y: graphHeight / 2 + (current.y - graphHeight / 2) * ratio,
      };
    });
  }

  useEffect(() => {
    function clearSelection(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setSelectedSlug(null);
      setHoveredSlug(null);
      setTopic(null);
    }
    function clearHover() {
      setHoveredSlug(null);
    }
    window.addEventListener('keydown', clearSelection);
    window.addEventListener('resize', clearHover);
    return () => {
      window.removeEventListener('keydown', clearSelection);
      window.removeEventListener('resize', clearHover);
    };
  }, []);

  const { topics, noteBySlug, edges, degree } = useMemo(() => {
    const noteBySlug = new Map(notes.map((note) => [note.slug, note]));
    const edges = graphEdges.filter(
      (edge) =>
        noteBySlug.has(edge.sourceSlug) &&
        noteBySlug.has(edge.targetSlug) &&
        edge.sourceSlug !== edge.targetSlug
    );
    const neighbours = new Map<string, Set<string>>();
    for (const edge of edges) {
      for (const [source, target] of [
        [edge.sourceSlug, edge.targetSlug],
        [edge.targetSlug, edge.sourceSlug],
      ]) {
        const group = neighbours.get(source) ?? new Set<string>();
        group.add(target);
        neighbours.set(source, group);
      }
    }
    return {
      topics: buildTopics(notes),
      noteBySlug,
      edges,
      degree: new Map(Array.from(neighbours, ([slug, links]) => [slug, links.size])),
    };
  }, [notes, graphEdges]);

  const activeSlug = hoveredSlug ?? selectedSlug;
  const activeNote = activeSlug ? noteBySlug.get(activeSlug) : undefined;
  // The panel stays on the selected note while the pointer explores the map.
  const detailNote = selectedSlug ? noteBySlug.get(selectedSlug) : undefined;
  const connectedSlugs = new Set<string>();
  const connections = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.sourceSlug === activeSlug) connectedSlugs.add(edge.targetSlug);
    if (edge.targetSlug === activeSlug) connectedSlugs.add(edge.sourceSlug);
    if (edge.sourceSlug !== selectedSlug && edge.targetSlug !== selectedSlug) continue;
    const other = edge.sourceSlug === selectedSlug ? edge.targetSlug : edge.sourceSlug;
    const relations = connections.get(other) ?? new Set<string>();
    relations.add(edge.relation.replaceAll('-', ' '));
    connections.set(other, relations);
  }
  const { clusters, points } = useMemo(() => layoutGraph(topics, degree), [topics, degree]);
  const pointBySlug = new Map(points.map((point) => [point.note.slug, point]));
  const pairs = new Set<string>();
  const visibleEdges = edges.filter((edge) => {
    const pair = [edge.sourceSlug, edge.targetSlug].sort().join('|');
    if (pairs.has(pair)) return false;
    pairs.add(pair);
    return true;
  });
  const currentTopic = topics.find((group) => group.key === topic);

  function selectNote(slug: string) {
    setSelectedSlug(slug);
    setHoveredSlug(null);
    setTopic(null);
    const point = pointBySlug.get(slug)!;
    if (camera.zoom > 1)
      setCamera((current) => ({
        ...current,
        x: graphWidth / 2 - point.x * current.zoom,
        y: graphHeight / 2 - point.y * current.zoom,
      }));
  }

  function resetView() {
    setTopic(null);
    setSelectedSlug(null);
    setHoveredSlug(null);
  }

  if (notes.length === 0) {
    return (
      <div className={styles.empty}>
        No notes match these filters. Clear a filter to see the map.
      </div>
    );
  }

  return (
    <div className={styles.graph} data-paused={paused}>
      <header className={styles.toolbar}>
        <div>
          <p className={styles.eyebrow}>Explore the connections</p>
          <h3>A map of ideas</h3>
          <p className={styles.description}>One graph. Follow the links between ideas.</p>
        </div>
        <div className={styles.controls}>
          {topic && (
            <button type="button" onClick={resetView}>
              <ArrowLeft size={14} /> All topics
            </button>
          )}
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
            className={styles.motionControl}
            aria-label={paused ? 'Resume graph motion' : 'Pause graph motion'}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? 'Resume' : 'Pause motion'}
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <div className={styles.mapArea}>
          <div className={styles.legend}>
            <span>
              <i className={styles.noteKey} /> Note
            </span>
            <span>
              <i className={styles.seedKey} /> Post idea
            </span>
            <span>
              <i className={styles.linkKey} /> Note link
            </span>
            <span className={styles.total}>
              {notes.length} notes · {topics.length} topics
            </span>
          </div>
          <div ref={canvasRef} className={styles.canvas}>
            <div className={styles.zoomControls} aria-label="Graph zoom">
              <button
                type="button"
                aria-label="Zoom in"
                disabled={camera.zoom >= 3}
                onClick={() => changeZoom(1.4)}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                disabled={camera.zoom <= 1}
                onClick={() => changeZoom(1 / 1.4)}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                aria-label="Fit graph"
                onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
              >
                <Scan size={16} />
              </button>
            </div>
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className={styles.constellation}
              role="group"
              aria-label="Connected insight graph"
              onPointerDown={(event) => {
                if (
                  event.button !== 0 ||
                  drag.current ||
                  (event.target as Element).closest('[role="button"]')
                )
                  return;
                const point = pointerPosition(event);
                drag.current = {
                  pointerId: event.pointerId,
                  x: point.x,
                  y: point.y,
                  originX: camera.x,
                  originY: camera.y,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const gesture = drag.current;
                if (!gesture || gesture.pointerId !== event.pointerId) return;
                const point = pointerPosition(event);
                // React can process this update after release or capture loss clears the ref.
                const x = gesture.originX + point.x - gesture.x;
                const y = gesture.originY + point.y - gesture.y;
                setCamera((current) => ({ ...current, x, y }));
              }}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
            >
              <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
                <g className={styles.drift}>
                  {visibleEdges.map((edge) => {
                    const source = pointBySlug.get(edge.sourceSlug)!;
                    const target = pointBySlug.get(edge.targetSlug)!;
                    const active = activeSlug
                      ? edge.sourceSlug === activeSlug || edge.targetSlug === activeSlug
                      : Boolean(topic) &&
                        (topicKey(source.note) === topic || topicKey(target.note) === topic);
                    return (
                      <path
                        key={edge.id}
                        data-source={edge.sourceSlug}
                        data-target={edge.targetSlug}
                        d={`M ${source.x} ${source.y} Q ${(source.x + target.x) / 2 + 12} ${(source.y + target.y) / 2 - 12} ${target.x} ${target.y}`}
                        className={styles.edge}
                        data-active={active}
                        data-muted={Boolean(activeSlug || topic) && !active}
                      />
                    );
                  })}
                  {clusters.map((cluster) => (
                    <g
                      key={cluster.key}
                      className={styles.clusterLabel}
                      role="button"
                      tabIndex={0}
                      aria-label={`Highlight ${cluster.label}`}
                      aria-pressed={topic === cluster.key}
                      data-muted={Boolean(topic) && topic !== cluster.key}
                      onClick={() => {
                        setTopic(topic === cluster.key ? null : cluster.key);
                        setSelectedSlug(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        setTopic(topic === cluster.key ? null : cluster.key);
                        setSelectedSlug(null);
                      }}
                    >
                      <text x={cluster.x} y={cluster.y - cluster.radius} textAnchor="middle">
                        {wrapTopicLabel(cluster.label).map((line, index) => (
                          <tspan key={line} x={cluster.x} dy={index === 0 ? 0 : 16}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  ))}
                  {points.map(({ note, x, y }) => {
                    const active = activeSlug === note.slug;
                    const selected = selectedSlug === note.slug;
                    const connected = connectedSlugs.has(note.slug);
                    const radius =
                      note.type === 'post-seed'
                        ? 10
                        : 5 + Math.min(degree.get(note.slug) ?? 0, 8) * 0.35;
                    return (
                      <g
                        key={note.slug}
                        role="button"
                        tabIndex={0}
                        data-note={note.slug}
                        aria-label={`${note.title}, ${degree.get(note.slug) ?? 0} connected notes`}
                        aria-pressed={selected}
                        aria-describedby={hoveredSlug === note.slug ? tooltipId : undefined}
                        className={styles.node}
                        data-muted={
                          activeSlug
                            ? !active && !connected
                            : Boolean(topic) && topicKey(note) !== topic
                        }
                        data-active={active || selected}
                        data-connected={connected}
                        onClick={() => selectNote(note.slug)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectNote(note.slug);
                          }
                        }}
                        onMouseEnter={(event) => showNodeName(note.slug, event.currentTarget)}
                        onMouseLeave={() => setHoveredSlug(null)}
                        onFocus={(event) => showNodeName(note.slug, event.currentTarget)}
                        onBlur={() => setHoveredSlug(null)}
                      >
                        <circle cx={x} cy={y} r={15} fill="transparent" />
                        <circle className={styles.nodeRing} cx={x} cy={y} r={radius + 6} />
                        <circle
                          className={styles.dot}
                          cx={x}
                          cy={y}
                          r={radius}
                          data-seed={note.type === 'post-seed'}
                        />
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>
            {hoveredSlug && activeNote && (
              <div
                id={tooltipId}
                className={styles.tooltip}
                role="tooltip"
                data-align-end={tooltipPosition.alignEnd}
                data-above={tooltipPosition.above}
                style={{
                  left: tooltipPosition.left,
                  top: tooltipPosition.top,
                  maxWidth: tooltipPosition.maxWidth,
                }}
              >
                {activeNote.title}
              </div>
            )}
          </div>
          <div className={styles.mapCaption} aria-live="polite">
            <span>
              {activeNote
                ? activeNote.title
                : currentTopic
                  ? `Highlighted: ${currentTopic.label}. All notes remain on the map.`
                  : 'Drag to move. Zoom to explore. Lines connect notes across topics.'}
            </span>
            {activeNote && (
              <small>
                {connectedSlugs.size} connected {connectedSlugs.size === 1 ? 'note' : 'notes'}
              </small>
            )}
          </div>
        </div>

        <aside
          className={styles.details}
          data-selected={Boolean(detailNote)}
          aria-label="Note details"
        >
          {detailNote ? (
            <>
              <div className={styles.detailHeader}>
                <p className={styles.eyebrow}>
                  {detailNote.type === 'post-seed' ? 'Post idea' : 'Selected note'}
                </p>
                <button
                  type="button"
                  aria-label="Clear selected note"
                  onClick={() => setSelectedSlug(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <h4>{detailNote.title}</h4>
              <p className={styles.excerpt}>{detailNote.excerpt}</p>
              <Link href={`/brain/${detailNote.slug}`} className={styles.openNote}>
                Read note <ArrowUpRight size={16} />
              </Link>
              <div className={styles.connections}>
                <p className={styles.eyebrow}>
                  Connected notes <span>{connections.size}</span>
                </p>
                {connections.size === 0 && (
                  <p className={styles.description}>No links to other notes in this view.</p>
                )}
                {Array.from(connections, ([slug, relations]) => {
                  const note = noteBySlug.get(slug)!;
                  return (
                    <button
                      key={slug}
                      type="button"
                      className={styles.connection}
                      onClick={() => {
                        selectNote(slug);
                      }}
                    >
                      <span>{note.title}</span>
                      <small>{Array.from(relations).join(' · ')}</small>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className={styles.eyebrow}>Start exploring</p>
              <h4>One idea leads to another.</h4>
              <p className={styles.excerpt}>
                Select a dot to read about a note and see its connections. Select a topic to
                highlight it on the map.
              </p>
              <div className={styles.topicList}>
                {topics.map((group, index) => (
                  <button
                    type="button"
                    key={group.key}
                    aria-pressed={topic === group.key}
                    onClick={() => setTopic(topic === group.key ? null : group.key)}
                  >
                    <span className={styles.topicNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <span>{group.label}</span>
                    <small>{group.notes.length}</small>
                  </button>
                ))}
              </div>
              <p className={styles.keyboardHint}>
                Tab to move between notes. Enter to select. Esc to clear.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
