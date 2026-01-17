-- Add voyage and discharge tracking fields to containers table
ALTER TABLE containers
ADD COLUMN IF NOT EXISTS voyage_number TEXT,
ADD COLUMN IF NOT EXISTS vessel_name TEXT,
ADD COLUMN IF NOT EXISTS discharge_status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consignee_name TEXT;

-- Add indexes for discharge status and voyage tracking
CREATE INDEX IF NOT EXISTS idx_containers_voyage_number ON containers(voyage_number);
CREATE INDEX IF NOT EXISTS idx_containers_discharge_status ON containers(discharge_status);
CREATE INDEX IF NOT EXISTS idx_containers_vessel_name ON containers(vessel_name);

-- Create manifest table for tracking kapal shipments
CREATE TABLE IF NOT EXISTS manifests (
  id BIGSERIAL PRIMARY KEY,
  vessel_name TEXT NOT NULL,
  voyage_number TEXT NOT NULL,
  eta_date TIMESTAMP WITH TIME ZONE,
  total_containers BIGINT,
  total_teu DECIMAL,
  status TEXT DEFAULT 'incoming',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vessel_name, voyage_number)
);

-- Create manifest items for individual containers
CREATE TABLE IF NOT EXISTS manifest_items (
  id BIGSERIAL PRIMARY KEY,
  manifest_id BIGINT NOT NULL REFERENCES manifests(id) ON DELETE CASCADE,
  container_number TEXT NOT NULL,
  size_teu DECIMAL DEFAULT 1,
  activity TEXT,
  consignee_name TEXT,
  discharged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manifest_items_manifest_id ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS idx_manifest_items_container_number ON manifest_items(container_number);
