import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import CommunityCardServer from '@/app/components/CommunityCardServer';
import CommunityCardClient from '@/app/components/CommunityCardClient';

export default async function CommunitiesPage() {
  // Fetch list of communities server-side. Use RPC if available (serverSupabase configured).
  const sb = getServiceSupabase();
  try {
    const result = await sb.rpc('get_communities_ordered_by_activity');
    const rows = (result && result.data) || [];

    // Render server markup for the list and include client components for interactivity.
    return (
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong>Communities</strong>
              <span className="dim">Communities and threads with latest activity are displayed first</span>
            </h1>
          </div>
        </div>

        <div className="content-body space-y-6">
          {rows.length === 0 ? (
            <div className="card">
              <p>No communities yet. Be the first to create one!</p>
            </div>
          ) : (
            rows.map((c: any) => (
              <div key={c.id}>
                <CommunityCardServer
                  id={c.id}
                  name={c.name}
                  slug={c.slug}
                  description={c.description}
                  imageUrl={c.image_url}
                  memberCount={c.member_count}
                  threadCount={c.thread_count}
                  creator={c.creator}
                />
                {/* Mount client component under the server-rendered markup to handle join/leave */}
                <CommunityCardClient
                  communityId={c.id}
                  initialIsMember={!!c.is_member}
                  initialMemberCount={c.member_count || 0}
                  creatorId={c.creator?.id}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  } catch (e) {
    // Fallback: render a simple server message when RPC not available
    return (
      <div className="communities">
        <div className="content-header mt-8">
          <div className="text-center w-full">
            <h1 className="content-title inline-flex items-center justify-center gap-2">
              <strong>Communities</strong>
              <span className="dim">Unable to load communities</span>
            </h1>
          </div>
        </div>
        <div className="content-body">
          <div className="card">
            <p>Failed to fetch communities on the server.</p>
          </div>
        </div>
      </div>
    );
  }
}