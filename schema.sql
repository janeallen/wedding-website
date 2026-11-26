-- RSVP storage. Apply with:
--   npx wrangler d1 execute wedding-rsvps --remote --file=schema.sql
-- One row in `rsvps` per form submission; one row in `guests` per person in that party.

CREATE TABLE IF NOT EXISTS rsvps (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  contact_name TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  attending    INTEGER NOT NULL,          -- 1 = yes, 0 = no
  note         TEXT
);

CREATE TABLE IF NOT EXISTS guests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  rsvp_id      INTEGER NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  first_course TEXT,
  main_course  TEXT,
  dietary      TEXT
);

CREATE INDEX IF NOT EXISTS guests_rsvp ON guests(rsvp_id);
