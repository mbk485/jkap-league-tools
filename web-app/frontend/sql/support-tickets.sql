-- Support Tickets System
-- Run this in Supabase SQL Editor

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  username TEXT NOT NULL,
  email TEXT,
  
  -- Ticket details
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'feature', 'question', 'account', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  
  -- File attachments (stored as JSON array of URLs)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Admin response
  admin_notes TEXT,
  assigned_to UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  resolution TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket_comments table for conversation threads
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  username TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
  ));

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
  ));

-- RLS Policies for ticket_comments
DROP POLICY IF EXISTS "Users can view comments on own tickets" ON ticket_comments;
CREATE POLICY "Users can view comments on own tickets" ON ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_comments.ticket_id 
      AND (support_tickets.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
      ))
    )
  );

DROP POLICY IF EXISTS "Users can add comments to own tickets" ON ticket_comments;
CREATE POLICY "Users can add comments to own tickets" ON ticket_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_comments.ticket_id 
      AND (support_tickets.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
      ))
    )
  );

-- Create storage bucket for ticket attachments (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true)
-- ON CONFLICT DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_timestamp();

-- Grant permissions (adjust as needed for your setup)
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON ticket_comments TO authenticated;
