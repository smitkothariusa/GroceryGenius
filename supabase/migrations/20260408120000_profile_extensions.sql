-- Extend profiles table with personalization fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cooking_level        text,
  ADD COLUMN IF NOT EXISTS age                  integer,
  ADD COLUMN IF NOT EXISTS weight_kg            numeric(5,2),
  ADD COLUMN IF NOT EXISTS height_cm            integer,
  ADD COLUMN IF NOT EXISTS biological_sex       text,
  ADD COLUMN IF NOT EXISTS activity_level       text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_dietary_labels jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add check constraints
ALTER TABLE profiles
  ADD CONSTRAINT profiles_cooking_level_check
    CHECK (cooking_level IN ('beginner','home_cook','intermediate','advanced') OR cooking_level IS NULL),
  ADD CONSTRAINT profiles_biological_sex_check
    CHECK (biological_sex IN ('male','female') OR biological_sex IS NULL),
  ADD CONSTRAINT profiles_activity_level_check
    CHECK (activity_level IN ('sedentary','light','moderate','active','very_active') OR activity_level IS NULL);
