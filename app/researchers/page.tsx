import ResearchersList from "../../components/ResearchersList";
import ReadyForReviewPanel from "../../components/ReadyForReviewPanel";

export default function ResearchersPage() {
  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Researchers</h1>
        <div className="mt-6">
          <ReadyForReviewPanel />
        </div>
      </div>
      <ResearchersList />
    </main>
  );
}
