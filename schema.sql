CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale TEXT NOT NULL,
  slot TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_sale_phone ON bookings (sale, phone);
CREATE INDEX IF NOT EXISTS idx_bookings_sale_slot ON bookings (sale, slot);
