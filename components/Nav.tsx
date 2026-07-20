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
      setModal({ kind: "error", message: "טעינת הפרופיל נכשלה" });
    }
  }

  function closeModal() {
    setModal({ kind: "closed" });
  }

  return (
    <>
      <header className="border-b border-gray-200 px-4 py-3">
        <nav className="flex items-center justify-between" dir="rtl">
          <Link href="/researchers" className="text-lg font-semibold">
            ThesisMatch
          </Link>
          <div className="flex items-center gap-4">
            <UsageIndicator />
            <Link href="/researchers" className="text-sm hover:underline">
              חוקרים
            </Link>
            <button
              onClick={openProfile}
              className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
            >
              פרופיל וקורות חיים
            </button>
          </div>
        </nav>
      </header>

      {modal.kind === "loading" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-lg bg-white p-6 text-sm text-gray-600 shadow-lg" dir="rtl">
            טוען...
          </div>
        </div>
      )}

      {modal.kind === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-lg bg-white p-6 shadow-lg" dir="rtl">
            <p className="text-sm text-red-600">{modal.message}</p>
            <div className="flex gap-2">
              <button
                onClick={openProfile}
                className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700"
              >
                ניסיון נוסף
              </button>
              <button
                onClick={closeModal}
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                סגירה
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
