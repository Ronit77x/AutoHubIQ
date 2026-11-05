
-- ============================================
-- AutoHubIQ: Application Schema
-- Database: autohubiq
-- PostgreSQL: 18.6
-- ============================================

-- Create a dedicated schema for application objects.
CREATE SCHEMA IF NOT EXISTS app;

-- Add a description to the schema.
COMMENT ON SCHEMA app IS
'Application schema for the AutoHubIQ used-car marketplace and dealership analytics platform.';
