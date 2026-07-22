-- The BGU staff directory labels the S3 institute one way, but discovery was
-- mapping that single institute to TWO branch values (s3 and
-- software_systems_security), so every S3 researcher showed two identical
-- branches (e.g. Dr. Gil Einziger). The real fifth institute that was missing
-- is "Institute for Applied AI Research". This migration:
--   1. adds the applied_ai_research branch value, and
--   2. merges the duplicate software_systems_security rows into s3.
-- Postgres cannot DROP an enum value, so software_systems_security stays in the
-- type but is no longer produced by discovery or shown in the UI.

ALTER TYPE research_branch ADD VALUE IF NOT EXISTS 'applied_ai_research';

-- Discovery always paired s3 with software_systems_security, so an s3 row
-- almost always already exists; delete the duplicate where it does, then
-- rename any lone leftover to s3.
DELETE FROM researcher_branches ssb
WHERE ssb.branch = 'software_systems_security'
  AND EXISTS (
    SELECT 1 FROM researcher_branches s3
    WHERE s3.researcher_id = ssb.researcher_id AND s3.branch = 's3'
  );

UPDATE researcher_branches
SET branch = 's3'
WHERE branch = 'software_systems_security';
