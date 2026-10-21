-- Runs once, on first start of an empty data volume.
--
-- The application connects as a NON-superuser role: PostgreSQL superusers
-- bypass Row-Level Security, which would silently disable tenant isolation.
-- Tables are owned by this role, so every tenant table also declares
-- FORCE ROW LEVEL SECURITY (owners bypass RLS otherwise).

CREATE ROLE mouna8amti LOGIN PASSWORD 'secret' NOSUPERUSER NOCREATEROLE NOBYPASSRLS;

CREATE DATABASE mouna8amti OWNER mouna8amti;
CREATE DATABASE mouna8amti_testing OWNER mouna8amti;
