import ResearchersList from "../../components/ResearchersList";

export default function ResearchersPage() {
  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Researchers</h1>
      </div>
      <ResearchersList />
    </main>
  );
}
