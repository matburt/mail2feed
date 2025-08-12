-- Initialize PostgreSQL database for mail2feed
-- This file is run automatically when the PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The actual schema will be created by running migrations
-- This file just ensures the database is ready for connections
SELECT 'PostgreSQL database initialized for mail2feed' as status;