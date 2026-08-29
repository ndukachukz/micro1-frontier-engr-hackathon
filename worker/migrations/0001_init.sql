-- Chata initial schema. All timestamps are ISO 8601 strings; money is integer naira.

CREATE TABLE catalog_items (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_ngn INTEGER NOT NULL,
  stock INTEGER NOT NULL
);

CREATE TABLE payment_records (
  id TEXT PRIMARY KEY,
  amount_ngn INTEGER NOT NULL,
  sender_ref TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  matched INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE conversations (
  wa_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  text TEXT NOT NULL,
  PRIMARY KEY (wa_id, timestamp, direction)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_wa_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  items_json TEXT NOT NULL DEFAULT '[]',
  total_ngn INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  action TEXT,
  payment_status TEXT NOT NULL DEFAULT 'n/a',
  matched_payment_id TEXT,
  flags_json TEXT NOT NULL DEFAULT '[]',
  instance_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE approvals (
  order_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  resolved_at TEXT,
  note TEXT
);

CREATE TABLE trajectories (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  case_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE eval_runs (
  id TEXT PRIMARY KEY,
  agents_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE INDEX idx_orders_customer ON orders (customer_wa_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_payments_ref ON payment_records (sender_ref);
CREATE INDEX idx_conversations_wa ON conversations (wa_id, timestamp);
