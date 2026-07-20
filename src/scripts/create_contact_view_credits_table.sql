CREATE TABLE IF NOT EXISTS user_contact_view_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  remaining_views INTEGER NOT NULL DEFAULT 0,
  used_free_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_contact_view_credits_user_id ON user_contact_view_credits(user_id);

-- Give 3 free views to all existing users
INSERT INTO user_contact_view_credits (user_id, remaining_views, used_free_views)
SELECT id, 3, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Create view log table
CREATE TABLE IF NOT EXISTS contact_view_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_view_log_user_id ON contact_view_log(user_id);
