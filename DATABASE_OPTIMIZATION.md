# Database Query Optimization Recommendations

## Required Database Indexes

To improve query performance, add the following indexes in your Supabase database:

### Search Performance Indexes
```sql
-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- For post caption searches
CREATE INDEX IF NOT EXISTS idx_posts_caption_gin ON posts USING gin (caption gin_trgm_ops);

-- For user searches (create on users table since public_profiles is a view)
CREATE INDEX IF NOT EXISTS idx_users_username_gin ON users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_display_name_gin ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_bio_gin ON users USING gin (bio gin_trgm_ops);

-- For community searches
CREATE INDEX IF NOT EXISTS idx_communities_name_gin ON communities USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_communities_description_gin ON communities USING gin (description gin_trgm_ops);
```

### Foreign Key and Common Query Indexes
```sql
-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_public_created_at ON posts (public, created_at DESC);

-- Community members indexes
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members (community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members (user_id);

-- Threads indexes
CREATE INDEX IF NOT EXISTS idx_threads_community_id ON threads (community_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
-- Note: email column may not exist in all deployments
```

### Follow/Favorite Indexes
```sql
-- If following is stored as JSONB array, consider normalizing to a separate table
-- For now, if using JSONB:
CREATE INDEX IF NOT EXISTS idx_users_following_gin ON users USING gin (following);

-- Favorites (stored as JSONB array in users table, not separate table)
-- No additional indexes needed for favorites functionality
```

## Query Optimizations Implemented

1. **Search API**: Changed from N+1 queries to batched queries for community member counts
2. **Communities API**: Changed from N+1 queries to batched queries for member/thread counts
3. **Redundant Joins**: Kept both users and public_profiles joins as they serve as fallbacks for data consistency

## Additional Recommendations

1. **Pagination**: All list endpoints now use proper LIMIT/OFFSET pagination
2. **Caching**: Explore feed uses server-side caching to reduce database load
3. **Connection Pooling**: Ensure Supabase connection pooling is enabled for production
4. **Query Monitoring**: Set up Supabase query performance monitoring to identify slow queries