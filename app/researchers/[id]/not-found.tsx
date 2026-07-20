import Link from "next/link";

export default function ResearcherNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 text-center">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">Researcher not found</h1>
      <p className="mb-4 text-muted">The researcher may have been removed, or the link is incorrect.</p>
      <Link
        href="/researchers"
        className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
      >
        Back to researcher list
      </Link>
    </main>
  );
}
