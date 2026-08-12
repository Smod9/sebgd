"use client";

import { useRef, useState } from "react";
import { uploadAdminImage } from "@/lib/admin-client";

type Props = {
  token: string;
  onUploaded: (url: string, alt: string) => void;
  onSetCover?: (url: string) => void;
  disabled?: boolean;
};

export function ImageUploadField({
  token,
  onUploaded,
  onSetCover,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await uploadAdminImage(token, file);
      setLastUrl(result.url);
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      onUploaded(result.url, alt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="admin-upload">
      <div className="admin-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Attach image"}
        </button>
        {lastUrl && onSetCover ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled || busy}
            onClick={() => onSetCover(lastUrl)}
          >
            Use as cover
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error ? <p className="admin-error">{error}</p> : null}
      {lastUrl ? (
        <p className="muted tiny admin-upload-url">
          Uploaded:{" "}
          <a href={lastUrl} target="_blank" rel="noreferrer">
            {lastUrl}
          </a>
        </p>
      ) : null}
    </div>
  );
}
