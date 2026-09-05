'use client';

import Link from 'next/link';
import { FileText, Folder, FolderOpen, List, Network, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BrainGraphEdge, BrainNoteType, PublishedBrainNote } from '@/lib/brain/types';
import { cn } from '@/lib/utils';
import { InsightGraph } from './insight-graph';

interface InsightBrowserProps {
  notes: PublishedBrainNote[];
  tags: string[];
  statuses: string[];
  graphEdges: BrainGraphEdge[];
}

type ViewMode = 'folders' | 'list' | 'graph';
interface FolderTreeNode {
  name: string;
  path: string;
  childFolders: FolderTreeNode[];
  notes: PublishedBrainNote[];
  totalNotes: number;
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
      aria-pressed={active}
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
        <details className="group rounded-md border border-border/30 px-3 py-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Filter notes
            {[activeType, activeStatus, activeTag].some(Boolean) && (
              <span className="ml-2 text-primary">
                · {[activeType, activeStatus, activeTag].filter(Boolean).join(' / ')}
              </span>
            )}
          </summary>
          <div className="mt-4 space-y-3 pb-2">
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
          </div>
        </details>

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
        <InsightGraph
          key={filteredNotes.map((note) => note.slug).join('|')}
          notes={filteredNotes}
          graphEdges={graphEdges}
        />
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
