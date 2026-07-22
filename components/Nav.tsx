"use client";

import Link from "next/link";
import { useState } from "react";
import ProfilePanel, { type CurrentCv } from "./ProfilePanel";
import UsageIndicator from "./UsageIndicator";

interface ProfileResponse {
  profile: { researchProfileText: string; updatedAt: string } | null;
}

interface CvResponse {
  cv: CurrentCv | null;
}

type ModalState =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; profileText: string; cv: CurrentCv | null };

export default function Nav() {
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  async function openProfile() {
    setModal({ kind: "loading" });
    try {
      const [profileRes, cvRes] = await Promise.all([fetch("/api/profile"), fetch("/api/cv")]);
      if (!profileRes.ok || !cvRes.ok) throw new Error("failed");
      const profileData: ProfileResponse = await profileRes.json();
      const cvData: CvResponse = await cvRes.json();
      setModal({
        kind: "loaded",
        profileText: profileData.profile?.researchProfileText ?? "",
        cv: cvData.cv,
      });
    } catch {
      setModal({ kind: "error", message: "Failed to load your profile" });
    }
  }

  function closeModal() {
    setModal({ kind: "closed" });
  }

  return (
    <>
      <header className="border-b border-rule bg-paper px-6 py-4">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/researchers"
            className="font-display text-lg font-semibold tracking-tight text-ink"
          >
            ThesisMatch
          </Link>
          <div className="flex items-center gap-5">
            <UsageIndicator />
            <Link
              href="/researchers"
              className="text-sm text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:decoration-accent hover:text-accent"
            >
              Researchers
            </Link>
            <button
              onClick={openProfile}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Profile &amp; CV
            </button>
          </div>
        </nav>
      </header>

      {modal.kind === "loading" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="rounded-[var(--radius-card)] border border-rule bg-paper p-6 text-sm text-muted shadow-lg">
            Loading&hellip;
          </div>
        </div>
      )}

      {modal.kind === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-[var(--radius-card)] border border-rule bg-paper p-6 shadow-lg">
            <p className="text-sm text-danger">{modal.message}</p>
            <div className="flex gap-2">
              <button
                onClick={openProfile}
                className="rounded-[var(--radius-input)] bg-accent px-3 py-1.5 text-sm text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90"
              >
                Try again
              </button>
              <button
                onClick={closeModal}
                className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.kind === "loaded" && (
        <ProfilePanel
          initialProfileText={modal.profileText}
          initialCv={modal.cv}
          onClose={closeModal}
        />
      )}
    </>
  );
}
