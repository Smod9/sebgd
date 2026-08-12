"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AdminApiError,
  clearStoredAdminToken,
  getStoredAdminToken,
  listAdminPosts,
  setStoredAdminToken,
} from "@/lib/admin-client";

const AdminTokenContext = createContext<string | null>(null);

export function useAdminToken(): string {
  const token = useContext(AdminTokenContext);
  if (!token) {
    throw new Error("useAdminToken requires AdminGate");
  }
  return token;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (value: string) => {
    setChecking(true);
    setError(null);
    try {
      await listAdminPosts(value);
      setStoredAdminToken(value);
      setToken(value);
    } catch (err) {
      clearStoredAdminToken();
      setToken(null);
      if (err instanceof AdminApiError && err.status === 401) {
        setError("Invalid admin token.");
      } else if (err instanceof AdminApiError && err.status === 503) {
        setError("Admin token is not configured on the server.");
      } else {
        setError(err instanceof Error ? err.message : "Could not verify token.");
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredAdminToken();
    if (!stored) {
      setChecking(false);
      return;
    }
    void verify(stored);
  }, [verify]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) {
      setError("Paste the admin token to continue.");
      return;
    }
    void verify(draft.trim());
  }

  function signOut() {
    clearStoredAdminToken();
    setToken(null);
    setDraft("");
    setError(null);
  }

  if (checking && !token) {
    return (
      <div className="admin-panel">
        <p className="kicker">Admin</p>
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="admin-panel admin-gate">
        <p className="kicker">Admin</p>
        <h1>Sign in</h1>
        <p className="muted admin-gate-copy">
          Paste the site admin token. It stays in this browser tab
          (sessionStorage) and is sent as a Bearer header to{" "}
          <code>/api/admin/*</code>.
        </p>
        <form className="admin-form" onSubmit={onSubmit}>
          <label className="admin-label" htmlFor="admin-token">
            Admin token
          </label>
          <input
            id="admin-token"
            className="admin-input"
            type="password"
            autoComplete="current-password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="SEBGD_ADMIN_TOKEN"
          />
          {error ? <p className="admin-error">{error}</p> : null}
          <div className="admin-actions">
            <button type="submit" className="btn btn-primary" disabled={checking}>
              {checking ? "Checking…" : "Unlock"}
            </button>
            <Link href="/" className="btn btn-secondary">
              Back to site
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return (
    <AdminTokenContext.Provider value={token}>
      <div className="admin-root">
        <div className="admin-toolbar">
          <div className="admin-toolbar-left">
            <Link href="/admin" className="admin-tool-link">
              Write
            </Link>
            <span className="muted mono tiny">admin</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary admin-signout"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
        {children}
      </div>
    </AdminTokenContext.Provider>
  );
}
