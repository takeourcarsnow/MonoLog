-- SQL to set up reports tables for MonoLog content moderation
-- Run this in your Supabase SQL editor or PostgreSQL database

-- Create reports table for post reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'copyright', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT
);

-- Create comment_reports table for comment reports
CREATE TABLE IF NOT EXISTS comment_reports (
    id TEXT PRIMARY KEY,
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'hate_speech', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_post_id ON comment_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON comment_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at DESC);

-- Prevent duplicate reports (same user reporting same content)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique ON reports(post_id, reporter_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_reports_unique ON comment_reports(comment_id, reporter_id);

-- Row Level Security (RLS) policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert reports
CREATE POLICY "Users can insert reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can insert comment reports" ON comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Only allow viewing reports for moderation purposes (you may want to restrict this further)
CREATE POLICY "Authenticated users can view reports" ON reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view comment reports" ON comment_reports
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow moderators to update report status (adjust as needed for your moderation workflow)
CREATE POLICY "Moderators can update reports" ON reports
    FOR UPDATE USING (auth.role() = 'authenticated'); -- You may want to create a moderator role

CREATE POLICY "Moderators can update comment reports" ON comment_reports
    FOR UPDATE USING (auth.role() = 'authenticated'); -- You may want to create a moderator role

-- Optional: Create a view for easier moderation dashboard
CREATE OR REPLACE VIEW moderation_reports AS
SELECT
    'post' as content_type,
    r.id,
    r.post_id as content_id,
    r.reporter_id,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    r.reviewed_at,
    r.reviewed_by,
    r.notes,
    p.caption as content_text,
    u.username as reporter_username,
    pu.username as content_owner_username
FROM reports r
LEFT JOIN posts p ON r.post_id = p.id
LEFT JOIN users u ON r.reporter_id = u.id
LEFT JOIN users pu ON p.user_id = pu.id

UNION ALL

SELECT
    'comment' as content_type,
    cr.id,
    cr.comment_id as content_id,
    cr.reporter_id,
    cr.reason,
    cr.details,
    cr.status,
    cr.created_at,
    cr.reviewed_at,
    cr.reviewed_by,
    cr.notes,
    c.text as content_text,
    u.username as reporter_username,
    cu.username as content_owner_username
FROM comment_reports cr
LEFT JOIN comments c ON cr.comment_id = c.id
LEFT JOIN users u ON cr.reporter_id = u.id
LEFT JOIN users cu ON c.user_id = cu.id
ORDER BY created_at DESC;

-- Grant permissions (adjust based on your user roles)
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT, INSERT ON comment_reports TO authenticated;
GRANT SELECT ON moderation_reports TO authenticated;