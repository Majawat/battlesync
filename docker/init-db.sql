-- Initialize database with required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- This file is run when the PostgreSQL container starts for the first time
-- Prisma will handle the actual schema creation