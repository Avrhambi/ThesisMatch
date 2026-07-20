"use client";

import { useState } from "react";

export interface CurrentCv {
  id: string;
  filename: string;
  pageCount: number;
  createdAt: string;
}

export default function ProfilePanel({
  initialProfileText,
  initialCv,
  onClose,
}: {
  initialProfileText: string;
  initialCv: CurrentCv | null;
  onClose: () => void;
}) {
  const [profileText, setProfileText] = useState(initialProfileText);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  const [currentCv, setCurrentCv] = useState<CurrentCv | null>(initialCv);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchProfileText: profileText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error ?? "Failed to save");
        return;
      }
      setProfileSavedAt(new Date().toLocaleTimeString("en-US"));
    } catch {
      setProfileError("Failed to save");
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadCv(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setCvUploading(true);
    setCvError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/cv", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setCvError(data.error ?? "Failed to upload the file");
        return;
      }
      setCurrentCv(data.cv);
    } catch {
      setCvError("Failed to upload the file");
    } finally {
      setCvUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-xl rounded-[var(--radius-card)] border border-rule bg-paper p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Profile &amp; CV</h2>
          <button onClick={onClose} className="text-sm text-muted hover:text-accent">
            Close
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="mb-1 block text-sm font-medium text-ink">Research profile</label>
            <textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={8}
              className="w-full rounded-[var(--radius-input)] border border-rule bg-paper p-2 text-sm text-ink focus:border-accent"
              placeholder="Describe your research areas, skills, and preferred directions (100–20,000 characters)"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span className="font-mono">{profileText.trim().length} characters</span>
              {profileSavedAt && <span>Saved at {profileSavedAt}</span>}
            </div>
            {profileError && <p className="mt-1 text-sm text-danger">{profileError}</p>}
            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="mt-2 rounded-[var(--radius-input)] bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
            >
              {profileSaving ? "Saving…" : "Save profile"}
            </button>
          </section>

          <section>
            <label className="mb-1 block text-sm font-medium text-ink">CV (PDF, up to 5MB, up to 20 pages)</label>
            {currentCv ? (
              <p className="text-sm text-ink">
                Current file: {currentCv.filename} ({currentCv.pageCount} pages)
              </p>
            ) : (
              <p className="text-sm text-muted">No CV uploaded</p>
            )}
            <input
              type="file"
              accept="application/pdf"
              disabled={cvUploading}
              onChange={(e) => uploadCv(e.target.files)}
              className="mt-2 text-sm"
            />
            {cvUploading && <p className="mt-1 text-sm text-muted">Uploading and extracting text&hellip;</p>}
            {cvError && <p className="mt-1 text-sm text-danger">{cvError}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
