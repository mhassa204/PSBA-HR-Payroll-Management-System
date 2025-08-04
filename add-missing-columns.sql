-- Add missing columns to Employee table
-- This script adds the missing_note and profile_picture columns

-- Add missing_note column
ALTER TABLE "Employee" ADD COLUMN "missing_note" TEXT;

-- Add profile_picture column  
ALTER TABLE "Employee" ADD COLUMN "profile_picture" TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Employee' 
AND column_name IN ('missing_note', 'profile_picture');
