export const POST_TYPES = [
  "note",
  "essay",
  "work",
  "boat_log",
  "quest",
  "now",
] as const;

export type PostType = (typeof POST_TYPES)[number];

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type Post = {
  id: string;
  slug: string;
  type: PostType;
  title: string;
  body: string;
  status: PostStatus;
  published_at: string | null;
  number: number | null;
  tags: string[];
  cover_blob_url: string | null;
  meta: Record<string, unknown>;
  deleted_at: string | null;
};

export type PostInput = {
  slug?: string;
  type: PostType;
  title: string;
  body?: string;
  status?: PostStatus;
  published_at?: string | null;
  number?: number | null;
  tags?: string[];
  cover_blob_url?: string | null;
  meta?: Record<string, unknown>;
};

export type PostUpdate = Partial<PostInput> & { id?: string; slug?: string };
