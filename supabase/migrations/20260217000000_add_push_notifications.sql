-- Add push notification support to users table
-- Migration: 20260217000000_add_push_notifications.sql

-- Add expo_push_token column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_push_token_update TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_push_enabled ON users(push_notifications_enabled) WHERE push_notifications_enabled = true;

-- Create push_notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  channel_id TEXT DEFAULT 'default',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  expo_ticket_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for push_notifications table
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_sent_at ON push_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON push_notifications(status);

-- Add RLS policies for push_notifications table
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own push notifications
CREATE POLICY "Users can view their own push notifications"
  ON push_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert push notifications
CREATE POLICY "Service role can insert push notifications"
  ON push_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Comment the tables
COMMENT ON COLUMN users.expo_push_token IS 'Expo push notification token for mobile app';
COMMENT ON COLUMN users.push_notifications_enabled IS 'Whether user has enabled push notifications';
COMMENT ON COLUMN users.last_push_token_update IS 'Last time the push token was updated';
COMMENT ON TABLE push_notifications IS 'Log of sent push notifications';
