-- ==============================================================================
-- BANDspirit — PostgreSQL Initialisierung
-- ==============================================================================
-- Wird beim ersten Start des Containers ausgeführt.
-- ==============================================================================

-- UUID-Erweiterung (für Prisma @default(uuid()))
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Volltextsuche Deutsch
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Performance-Statistiken
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
