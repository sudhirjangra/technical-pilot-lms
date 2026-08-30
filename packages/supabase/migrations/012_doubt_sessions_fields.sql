ALTER TABLE doubt_slots
  ADD COLUMN IF NOT EXISTS topic varchar(200),
  ADD COLUMN IF NOT EXISTS description text;
