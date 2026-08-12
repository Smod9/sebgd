import type { Post, PostStatus, PostType } from "@/lib/types";

export const ADMIN_TOKEN_KEY = "sebgd_admin_token";

export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)?.trim() || null;
}

export function setStoredAdminToken(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

export function clearStoredAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function adminFetch<T>(
  path: string,
  options: {
    token: string;
    method?: string;
    body?: unknown;
    formData?: FormData;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    Accept: "application/json",
  };
  if (options.body !== undefined && !options.formData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.formData
      ? options.formData
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { error: text || res.statusText };
  }

  if (!res.ok) {
    const message =
      json &&
      typeof json === "object" &&
      "error" in json &&
      typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Request failed (${res.status})`;
    throw new AdminApiError(res.status, message);
  }

  return json as T;
}

export type CreatePostPayload = {
  type: PostType;
  title: string;
  slug?: string;
  body?: string;
  status?: PostStatus;
  tags?: string[];
  cover_blob_url?: string;
};

export type UpdatePostPayload = {
  type?: PostType;
  title?: string;
  slug?: string;
  body?: string;
  status?: PostStatus;
  tags?: string[];
  cover_blob_url?: string | null;
  action?: "publish";
};

export async function listAdminPosts(
  token: string,
  opts?: { type?: PostType; status?: "draft" | "published" | "all" },
) {
  const q = new URLSearchParams();
  q.set("status", opts?.status ?? "all");
  if (opts?.type) q.set("type", opts.type);
  return adminFetch<{ posts: Post[] }>(`/api/admin/posts?${q}`, { token });
}

export async function getAdminPost(token: string, id: string) {
  return adminFetch<{ post: Post }>(
    `/api/admin/posts/${encodeURIComponent(id)}`,
    { token },
  );
}

export async function createAdminPost(
  token: string,
  payload: CreatePostPayload,
) {
  return adminFetch<{ post: Post }>("/api/admin/posts", {
    token,
    method: "POST",
    body: payload,
  });
}

export async function updateAdminPost(
  token: string,
  id: string,
  payload: UpdatePostPayload,
) {
  return adminFetch<{ post: Post }>(
    `/api/admin/posts/${encodeURIComponent(id)}`,
    { token, method: "PATCH", body: payload },
  );
}

export async function deleteAdminPost(token: string, id: string) {
  return adminFetch<{ post: Post; deleted: boolean }>(
    `/api/admin/posts/${encodeURIComponent(id)}`,
    { token, method: "DELETE" },
  );
}

export async function getAdminNow(token: string) {
  return adminFetch<{ items: string[] }>("/api/admin/now", { token });
}

export async function setAdminNow(token: string, items: string[]) {
  return adminFetch<{ items: string[] }>("/api/admin/now", {
    token,
    method: "PUT",
    body: { items },
  });
}

export async function uploadAdminImage(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return adminFetch<{
    url: string;
    pathname: string;
    contentType: string | null;
    size: number;
  }>("/api/admin/upload", {
    token,
    method: "POST",
    formData: form,
  });
}
