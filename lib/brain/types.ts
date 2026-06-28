export type BrainNoteType = 'insight' | 'source' | 'post-seed' | 'note';

export interface BrainLink {
  targetSlug: string;
  label: string;
  relation: string;
}

export interface PublishedBrainNote {
  type: BrainNoteType;
  title: string;
  slug: string;
  created: string;
  status: string;
  publish: true;
  tags: string[];
  updated?: string;
  excerpt: string;
  content: string;
  filePath: string;
  links: BrainLink[];
  searchText: string;
}

export interface BrainGraphEdge {
  id: string;
  sourceSlug: string;
  targetSlug: string;
  relation: string;
}
