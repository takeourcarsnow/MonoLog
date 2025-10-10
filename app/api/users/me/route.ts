import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';

export async function PATCH(req: Request) {
  try {
    // server-side user update
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const body = await req.json();
    // Debug: log incoming body (avoid printing tokens/secrets)
    try {
      const keys = Object.keys(body || {});
      const sample = JSON.stringify(body ? Object.fromEntries(keys.slice(0,10).map(k => [k, body[k]])) : {});
      console.log('[PATCH /api/users/me] incoming body keys', keys, 'sample', sample);
    } catch (_) {}
    const sb = getServiceSupabase();
    const actorId = authUser.id;

    // Normalize incoming body to accept camelCase or snake_case keys
    const usernameIncoming = body.username ?? body.user_name;
    const displayNameIncoming = body.displayName ?? body.display_name;
    const avatarUrlIncoming = body.avatarUrl ?? body.avatar_url;
    const bioIncoming = body.bio ?? body.bio;
    const socialLinksIncoming = body.socialLinks ?? body.social_links;

    // If username is changing, enforce 24-hour cooldown server-side
    if (usernameIncoming !== undefined) {
  try { console.log('[PATCH /api/users/me] actorId', actorId, 'usernameIncoming', usernameIncoming); } catch (_) {}
      const { data: cur, error: curErr } = await sb.from('users').select('username, username_changed_at').eq('id', actorId).limit(1).single();
      if (curErr) {
        console.error('PATCH /api/users/me: error reading current profile', curErr);
        return NextResponse.json({ error: curErr.message || curErr }, { status: 500 });
      }
      const currentUsername = cur?.username;
      const lastChanged = cur?.username_changed_at;
      if (currentUsername !== usernameIncoming) {
        if (lastChanged) {
          const lastChangedTime = new Date(lastChanged).getTime();
          const now = Date.now();
          const hoursSince = (now - lastChangedTime) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            const hoursRemaining = Math.ceil(24 - hoursSince);
            const nextChange = new Date(lastChangedTime + 24 * 60 * 60 * 1000);
            return NextResponse.json({ error: `You can only change your username once every 24 hours. Try again in ${hoursRemaining} hour(s) (${nextChange.toLocaleString()}).` }, { status: 403 });
          }
        }
      }
    }

  const upd: any = {};
    if (usernameIncoming !== undefined) {
      upd.username = usernameIncoming;
      upd.username_changed_at = new Date().toISOString();
    }
    if (displayNameIncoming !== undefined) upd.display_name = displayNameIncoming;
    if (avatarUrlIncoming !== undefined) upd.avatar_url = avatarUrlIncoming;
    if (bioIncoming !== undefined) upd.bio = bioIncoming;
  if (socialLinksIncoming !== undefined) upd.social_links = socialLinksIncoming ? JSON.stringify(socialLinksIncoming) : null;

  // Debug: what we're about to write to the DB
  try { console.log('[PATCH /api/users/me] computed upd', upd); } catch (_) {}
  if (Object.keys(upd).length === 0) {
    try { console.log('[PATCH /api/users/me] no update fields, returning null'); } catch (_) {}
    return NextResponse.json(null);
  }

    // update payload prepared

    // Try an UPDATE first. If no rows are affected (for example the users row
    // doesn't exist yet), fall back to creating a minimal profile row using
    // the service role to avoid RLS issues.
    let data: any = null;
    try {
      const { error } = await sb.from('users').update(upd).eq('id', actorId);
      if (error) {
        console.error('[PATCH /api/users/me] update error', error);
        return NextResponse.json({ error: error.message || error }, { status: 500 });
      }
      const { data: selData, error: selErr } = await sb.from('users').select('*').eq('id', actorId).limit(1).single();
      if (selErr) {
        console.error('[PATCH /api/users/me] select error', selErr);
        return NextResponse.json({ error: selErr.message || selErr }, { status: 500 });
      }
      data = selData;
  try { console.log('[PATCH /api/users/me] update result selected', !!data, data?.id); } catch (_) {}
    } catch (e) {
      console.error('[PATCH /api/users/me] unexpected update exception', e);
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
    if (data) {
      // Return the profile object directly so the client receives the
      // updated profile (client expects the raw profile JSON, not a wrapper).
      return NextResponse.json(data);
    }

    // No existing row found/updated. Create a minimal profile row.
    const insertObj: any = { id: actorId };
    if (upd.username !== undefined) insertObj.username = upd.username;
    if (upd.username_changed_at !== undefined) insertObj.username_changed_at = upd.username_changed_at;
    if (upd.display_name !== undefined) insertObj.display_name = upd.display_name;
    if (upd.avatar_url !== undefined) insertObj.avatar_url = upd.avatar_url;
    if (upd.bio !== undefined) insertObj.bio = upd.bio;
  if (upd.social_links !== undefined) insertObj.social_links = upd.social_links;

    // Use upsert to create the row if it doesn't exist; conflict on primary key
    // ensures this is safe in concurrent scenarios.
    try {
      // attempting upsert to create profile
      const insRes: any = await sb.from('users').upsert(insertObj).select('*').limit(1).maybeSingle();
      if (insRes.error) {
        console.error('PATCH /api/users/me: upsert error', insRes.error);
        return NextResponse.json({ error: insRes.error.message || insRes.error }, { status: 500 });
      }
  try { console.log('[PATCH /api/users/me] upsert result', !!insRes.data, insRes.data?.id); } catch (_) {}
      return NextResponse.json(insRes.data || null);
    } catch (e) {
      console.error('PATCH /api/users/me: unexpected upsert exception', e);
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  } catch (e: any) {
    console.error('PATCH /api/users/me: outer exception', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
