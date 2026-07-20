import ResearchersList from "../../components/ResearchersList";

export default function ResearchersPage() {
  return (
    <main className="mx-auto max-w-3xl p-8" dir="rtl">
      <h1 className="mb-4 text-xl font-semibold">חוקרים</h1>
      <ResearchersList />
    </main>
  );
}
