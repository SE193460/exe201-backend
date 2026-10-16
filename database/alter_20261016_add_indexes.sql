-- Add missing indexes. All statements are idempotent and safe to run
-- against an existing database.

-- Listings
CREATE INDEX IF NOT EXISTS idx_listings_owner_status ON listings(owner_id, status);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Listing relations
CREATE INDEX IF NOT EXISTS idx_listing_amenity_amenity_id ON listing_amenity(amenity_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id ON saved_listings(listing_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_listing_id ON payment_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- Reports
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter_id ON listing_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON listing_reports(status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications(user_id, created_at DESC);

-- Contact views
CREATE INDEX IF NOT EXISTS idx_contact_view_log_user_id ON contact_view_log(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_view_log_listing_id ON contact_view_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_contact_view_log_user_listing ON contact_view_log(user_id, listing_id);

-- Analytics / feedback
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing_id ON analytics_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);

-- Promotions
CREATE INDEX IF NOT EXISTS idx_listing_promotions_listing_id ON listing_promotions(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_promotions_expires_at ON listing_promotions(expires_at);
