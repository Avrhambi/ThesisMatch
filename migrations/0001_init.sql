CREATE TYPE research_branch AS ENUM ('s3','interdisciplinary_computational_science','theory_of_computing','foundations_of_ai','software_systems_security');
CREATE TYPE match_level AS ENUM ('unknown','low','medium','high');
CREATE TYPE evidence_status AS ENUM ('verified','inferred','conflicting','missing');
CREATE TYPE access_level AS ENUM ('metadata_only','abstract','full_text_open','user_uploaded_pdf','unavailable');
CREATE TYPE decision_status AS ENUM ('new','interested','analyze_later','not_interested','already_contacted','contact_planned','waiting_for_reply','meeting_scheduled','temporarily_unavailable','closed');
CREATE TYPE analysis_kind AS ENUM ('researcher_deep_analysis','additional_papers_analysis','outreach_generation');
CREATE TYPE analysis_state AS ENUM ('pending','running','completed','completed_with_gaps','failed');
CREATE TYPE source_type AS ENUM ('bgu','cris','personal','orcid','openalex','crossref','semantic_scholar','publisher','arxiv','repository','user_upload');
CREATE TYPE cv_recommendation_type AS ENUM ('reorder','rewrite','emphasize','add_supported_information','missing_evidence');

CREATE TABLE app_profile (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  research_profile_text text NOT NULL CHECK (length(research_profile_text) BETWEEN 100 AND 20000),
  research_profile_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cv_documents (
  id uuid PRIMARY KEY,
  filename text NOT NULL,
  extracted_text text NOT NULL,
  redacted_text text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  page_count integer NOT NULL CHECK (page_count BETWEEN 1 AND 20),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cv_one_current_idx ON cv_documents (is_current) WHERE is_current;

CREATE TABLE researchers (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  normalized_name text NOT NULL,
  cris_url text NOT NULL UNIQUE,
  bgu_url text,
  personal_url text,
  orcid text UNIQUE,
  decision decision_status NOT NULL DEFAULT 'new',
  personal_note text,
  preliminary_match match_level NOT NULL DEFAULT 'unknown',
  identity_verified boolean NOT NULL DEFAULT false,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  refreshed_at timestamptz,
  UNIQUE (normalized_name, cris_url)
);

CREATE TABLE researcher_branches (
  researcher_id uuid NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  branch research_branch NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  PRIMARY KEY (researcher_id, branch)
);

CREATE TABLE sources (
  id uuid PRIMARY KEY,
  researcher_id uuid REFERENCES researchers(id) ON DELETE CASCADE,
  paper_id uuid,
  type source_type NOT NULL,
  url text NOT NULL,
  title text,
  retrieved_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  access access_level NOT NULL,
  extracted_text text,
  UNIQUE (url, content_hash)
);
CREATE INDEX sources_researcher_idx ON sources(researcher_id);

CREATE TABLE papers (
  id uuid PRIMARY KEY,
  researcher_id uuid NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  title text NOT NULL,
  normalized_title text NOT NULL,
  doi text,
  publication_year integer CHECK (publication_year BETWEEN 1900 AND 2100),
  venue text,
  abstract text,
  access access_level NOT NULL DEFAULT 'metadata_only',
  full_text_source_id uuid REFERENCES sources(id),
  added_by_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (researcher_id, doi),
  UNIQUE (researcher_id, normalized_title, publication_year)
);
ALTER TABLE sources ADD CONSTRAINT sources_paper_fk FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE;
CREATE INDEX papers_researcher_year_idx ON papers(researcher_id, publication_year DESC);

CREATE TABLE analyses (
  id uuid PRIMARY KEY,
  researcher_id uuid NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  kind analysis_kind NOT NULL,
  state analysis_state NOT NULL DEFAULT 'pending',
  local_date date NOT NULL,
  is_extra boolean NOT NULL DEFAULT false,
  input_hash text NOT NULL,
  result_json jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (researcher_id, kind, input_hash)
);
CREATE INDEX analyses_daily_idx ON analyses(local_date, state);

CREATE TABLE paper_analysis_links (
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  PRIMARY KEY (analysis_id, paper_id)
);

CREATE TABLE claims (
  id uuid PRIMARY KEY,
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  claim_type text NOT NULL,
  value text NOT NULL,
  status evidence_status NOT NULL,
  evidence_source_ids uuid[] NOT NULL CHECK (cardinality(evidence_source_ids) > 0 OR status IN ('missing','conflicting'))
);

CREATE TABLE researcher_specific_notes (
  researcher_id uuid PRIMARY KEY REFERENCES researchers(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outreach_packages (
  id uuid PRIMARY KEY,
  analysis_id uuid NOT NULL UNIQUE REFERENCES analyses(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL CHECK (length(body) <= 3000),
  cv_recommendations jsonb NOT NULL,
  excluded_claims jsonb NOT NULL,
  copied_at timestamptz,
  sent_at timestamptz
);

CREATE TABLE contact_events (
  id uuid PRIMARY KEY,
  researcher_id uuid NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('contacted','reply_received','meeting_scheduled','closed')),
  occurred_at timestamptz NOT NULL,
  note text
);
CREATE INDEX contact_events_researcher_idx ON contact_events(researcher_id, occurred_at DESC);
