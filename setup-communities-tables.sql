-- SQL to set up communities and threads tables for MonoLog
-- Run this in your Supabase SQL editor or PostgreSQL database

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    description TEXT NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create community_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS community_members (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create thread_replies table
CREATE TABLE IF NOT EXISTS thread_replies (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_communities_creator_id ON communities(creator_id);
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_joined_at ON community_members(joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_threads_community_id ON threads(community_id);
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_id ON thread_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_user_id ON thread_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_created_at ON thread_replies(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_replies ENABLE ROW LEVEL SECURITY;

-- Communities policies
CREATE POLICY "Anyone can view communities" ON communities
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities" ON communities
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Community creators can update their communities" ON communities
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Community creators can delete their communities" ON communities
    FOR DELETE USING (auth.uid() = creator_id);

-- Community members policies
CREATE POLICY "Anyone can view community members" ON community_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join communities" ON community_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" ON community_members
    FOR DELETE USING (auth.uid() = user_id);

-- Threads policies
CREATE POLICY "Anyone can view threads" ON threads
    FOR SELECT USING (true);

CREATE POLICY "Community members can create threads" ON threads
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM community_members
            WHERE community_id = threads.community_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Thread authors can update their threads" ON threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Thread authors can delete their threads" ON threads
    FOR DELETE USING (auth.uid() = user_id);

-- Thread replies policies
CREATE POLICY "Anyone can view thread replies" ON thread_replies
    FOR SELECT USING (true);

CREATE POLICY "Community members can create replies" ON thread_replies
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM threads t
            JOIN community_members cm ON t.community_id = cm.community_id
            WHERE t.id = thread_replies.thread_id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Reply authors can update their replies" ON thread_replies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Reply authors can delete their replies" ON thread_replies
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON communities TO authenticated;
GRANT SELECT, INSERT, DELETE ON community_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON thread_replies TO authenticated;