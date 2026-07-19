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
        setProfileError(data.error ?? "השמירה נכשלה");
        return;
      }
      setProfileSavedAt(new Date().toLocaleTimeString("he-IL"));
    } catch {
      setProfileError("השמירה נכשלה");
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
        setCvError(data.error ?? "העלאת הקובץ נכשלה");
        return;
      }
      setCurrentCv(data.cv);
    } catch {
      setCvError("העלאת הקובץ נכשלה");
    } finally {
      setCvUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg" dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">פרופיל וקורות חיים</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">
            סגירה
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="mb-1 block text-sm font-medium">פרופיל מחקרי</label>
            <textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={8}
              className="w-full rounded border border-gray-300 p-2 text-sm"
              placeholder="תארו את תחומי המחקר, המיומנויות והכיוונים המבוקשים (100–20,000 תווים)"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{profileText.trim().length} תווים</span>
              {profileSavedAt && <span>נשמר בשעה {profileSavedAt}</span>}
            </div>
            {profileError && <p className="mt-1 text-sm text-red-600">{profileError}</p>}
            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="mt-2 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {profileSaving ? "שומר..." : "שמירת פרופיל"}
            </button>
          </section>

          <section>
            <label className="mb-1 block text-sm font-medium">קורות חיים (PDF, עד 5MB, עד 20 עמודים)</label>
            {currentCv ? (
              <p className="text-sm text-gray-700">
                קובץ נוכחי: {currentCv.filename} ({currentCv.pageCount} עמודים)
              </p>
            ) : (
              <p className="text-sm text-gray-500">לא הועלה קובץ קורות חיים</p>
            )}
            <input
              type="file"
              accept="application/pdf"
              disabled={cvUploading}
              onChange={(e) => uploadCv(e.target.files)}
              className="mt-2 text-sm"
            />
            {cvUploading && <p className="mt-1 text-sm text-gray-500">מעלה ומחלץ טקסט...</p>}
            {cvError && <p className="mt-1 text-sm text-red-600">{cvError}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
