-- Create depots table
CREATE TABLE IF NOT EXISTS depots (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  capacity_teu DECIMAL NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create containers table
CREATE TABLE IF NOT EXISTS containers (
  id BIGSERIAL PRIMARY KEY,
  depot_id BIGINT NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  container_number TEXT NOT NULL UNIQUE,
  size_teu DECIMAL DEFAULT 1,
  status TEXT DEFAULT 'available',
  allocated_to TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create allocation history table
CREATE TABLE IF NOT EXISTS allocation_history (
  id BIGSERIAL PRIMARY KEY,
  container_id BIGINT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  from_depot_id BIGINT REFERENCES depots(id),
  to_depot_id BIGINT NOT NULL REFERENCES depots(id),
  quantity_teu DECIMAL NOT NULL,
  reason TEXT,
  allocated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert depot data
INSERT INTO depots (name, capacity_teu, location) VALUES
  ('Depo Yon', 1872, 'Yon'),
  ('Depo Teluk Bayur', 1167.5, 'Teluk Bayur'),
  ('Depo Japfa', 2414, 'Japfa'),
  ('Depo 4', 716, 'Location 4');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_containers_depot_id ON containers(depot_id);
CREATE INDEX IF NOT EXISTS idx_allocation_history_container_id ON allocation_history(container_id);
CREATE INDEX IF NOT EXISTS idx_allocation_history_created_at ON allocation_history(created_at);
