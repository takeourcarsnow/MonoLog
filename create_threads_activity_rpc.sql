-- RPC function to get community threads ordered by last activity
CREATE OR REPLACE FUNCTION get_community_threads_ordered_by_activity(p_community_id TEXT)
RETURNS TABLE (
    id TEXT,
    community_id TEXT,
    user_id UUID,
    title TEXT,
    slug TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    "user" JSONB,
    community JSONB,
    reply_count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.community_id,
        t.user_id,
        t.title,
        t.slug,
        t.content,
        t.created_at,
        t.updated_at,
        jsonb_build_object(
            'id', u.id,
            'username', u.username,
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
        ) as "user",
        jsonb_build_object(
            'id', c.id,
            'name', c.name
        ) as community,
        COALESCE(r.reply_count, 0) as reply_count,
        GREATEST(
            t.created_at,
            COALESCE(r.max_reply_created, t.created_at)
        ) as last_activity
    FROM threads t
    JOIN users u ON t.user_id = u.id
    JOIN communities c ON t.community_id = c.id
    LEFT JOIN (
        SELECT thread_id, COUNT(*) as reply_count, MAX(thread_replies.created_at) as max_reply_created
        FROM thread_replies
        GROUP BY thread_id
    ) r ON t.id = r.thread_id
    WHERE t.community_id = p_community_id
    ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;