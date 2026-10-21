"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThoughtReaction } from "@/lib/thought-likes";

type State = { reactions: Record<string, ThoughtReaction>; ready: boolean; error: string | null; errorId: string | null; toggle: (id: string) => Promise<void>; busy: string[] };
const Context = createContext<State | null>(null);

export function ThoughtLikes({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [reactions, setReactions] = useState<Record<string, ThoughtReaction>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const key = ids.join(",");
  useEffect(() => {
    let active = true;
    if (!key) return;
    fetch(`/api/thought-likes?ids=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Likes unavailable"); return response.json(); })
      .then((data) => { if (active) { setReactions(data.reactions); setReady(true); } })
      .catch(() => { if (active) setError("Likes unavailable"); });
    return () => { active = false; };
  }, [key]);

  async function toggle(id: string) {
    if (busy.includes(id) || !ready) return;
    setBusy((current) => [...current, id]);
    setError(null);
    setErrorId(null);
    try {
      const response = await fetch("/api/thought-likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, liked: !reactions[id]?.liked }) });
      if (!response.ok) throw new Error("Could not save");
      const data = await response.json();
      setReactions((current) => ({ ...current, [id]: data.reaction }));
    } catch { setError("Couldn’t save. Try again."); setErrorId(id); }
    finally { setBusy((current) => current.filter((value) => value !== id)); }
  }
  return <Context.Provider value={{ reactions, ready, error, errorId, toggle, busy }}>{children}</Context.Provider>;
}

export function ThoughtLikeButton({ id }: { id: string }) {
  const state = useContext(Context);
  if (!state) return null;
  const reaction = state.reactions[id];
  return <span className="thought-like-control">
    <button type="button" className="thought-like" aria-label={reaction?.liked ? "Remove thumbs up" : "Thumbs up"} aria-pressed={reaction?.liked ?? false} disabled={!state.ready || state.busy.includes(id)} onClick={() => void state.toggle(id)} title={state.error ?? undefined}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v10H3V10h4Zm0 0 5-8c2 0 3 2 2 4l-1 4h5a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 1H7" /></svg>
      <span>{state.ready ? reaction?.count ?? 0 : "…"}</span>
    </button>
    {state.error && state.errorId === id ? <span className="thought-like-error" role="status">{state.error}</span> : null}
  </span>;
}
