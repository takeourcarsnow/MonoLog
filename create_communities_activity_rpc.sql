-- RPC function to get communities ordered by last activity
CREATE OR REPLACE FUNCTION get_communities_ordered_by_activity()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    slug TEXT,
    description TEXT,
    creator_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    creator JSONB,
    member_count BIGINT,
    thread_count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.creator_id,
        c.created_at,
        c.updated_at,
        c.image_url,
        jsonb_build_object(
            'id', u.id,
            'username', u.username,
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
        ) as creator,
        COALESCE(cm.member_count, 0) as member_count,
        COALESCE(t.thread_count, 0) as thread_count,
        GREATEST(
            c.created_at,
            COALESCE(t.max_thread_created, c.created_at),
            COALESCE(r.max_reply_created, c.created_at)
        ) as last_activity
    FROM communities c
    JOIN users u ON c.creator_id = u.id
    LEFT JOIN (
        SELECT community_id, COUNT(*) as member_count
        FROM community_members
        GROUP BY community_id
    ) cm ON c.id = cm.community_id
    LEFT JOIN (
        SELECT community_id, COUNT(*) as thread_count, MAX(threads.created_at) as max_thread_created
        FROM threads
        GROUP BY community_id
    ) t ON c.id = t.community_id
    LEFT JOIN (
        SELECT th.community_id, MAX(tr.created_at) as max_reply_created
        FROM thread_replies tr
        JOIN threads th ON tr.thread_id = th.id
        GROUP BY th.community_id
    ) r ON c.id = r.community_id
    ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;