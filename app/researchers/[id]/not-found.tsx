import Link from "next/link";

export default function ResearcherNotFound() {
  return (
    <main className="mx-auto max-w-3xl p-8 text-center" dir="rtl">
      <h1 className="mb-2 text-xl font-semibold">החוקר לא נמצא</h1>
      <p className="mb-4 text-gray-600">ייתכן שהחוקר הוסר או שהקישור שגוי.</p>
      <Link href="/researchers" className="text-blue-600 hover:underline">
        חזרה לרשימת החוקרים
      </Link>
    </main>
  );
}
