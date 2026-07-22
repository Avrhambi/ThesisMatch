import { Client } from "pg";

// Deliberately excludes app_profile and cv_documents: the stored research
// profile and CV are not test data and should survive a reset.
const TABLES = [
  "researchers",
  "researcher_branches",
  "sources",
  "papers",
  "analyses",
  "paper_analysis_links",
  "claims",
  "researcher_specific_notes",
  "outreach_packages",
  "contact_events",
  "researcher_status_events",
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE;`);
    console.log(`Truncated ${TABLES.length} tables.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
