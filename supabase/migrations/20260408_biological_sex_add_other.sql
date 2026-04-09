-- Allow 'other' as a valid value for biological_sex (adding gender-inclusive option)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_biological_sex_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_biological_sex_check
    CHECK (biological_sex IN ('male', 'female', 'other') OR biological_sex IS NULL);
