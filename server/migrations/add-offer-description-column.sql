
-- Migration to add missing description column to offer_management table
ALTER TABLE offer_management ADD COLUMN IF NOT EXISTS description TEXT;
