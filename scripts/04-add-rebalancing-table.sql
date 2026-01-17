-- Create rebalancing suggestions table to track which containers should be moved
CREATE TABLE IF NOT EXISTS rebalancing_suggestions (
  id BIGSERIAL PRIMARY KEY,
  container_id BIGINT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  from_depot_id BIGINT NOT NULL REFERENCES depots(id),
  to_depot_id BIGINT NOT NULL REFERENCES depots(id),
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'critical', 'high', 'normal'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'executed', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rebalancing_suggestions_status ON rebalancing_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_rebalancing_suggestions_from_depot ON rebalancing_suggestions(from_depot_id);
