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
    const sb = getServiceSupabase();
    const actorId = authUser.id;

    // If username is changing, enforce 24-hour cooldown server-side
    if (body.username !== undefined) {
      const { data: cur, error: curErr } = await sb.from('users').select('username, username_changed_at').eq('id', actorId).limit(1).single();
      if (curErr) {
        console.error('PATCH /api/users/me: error reading current profile', curErr);
        return NextResponse.json({ error: curErr.message || curErr }, { status: 500 });
      }
      const currentUsername = cur?.username;
      const lastChanged = cur?.username_changed_at;
      if (currentUsername !== body.username) {
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
    if (body.username !== undefined) {
      upd.username = body.username;
      upd.username_changed_at = new Date().toISOString();
    }
    if (body.displayName !== undefined) upd.display_name = body.displayName;
    if (body.avatarUrl !== undefined) upd.avatar_url = body.avatarUrl;
    if (body.bio !== undefined) upd.bio = body.bio;
    if (body.socialLinks !== undefined) upd.socialLinks = body.socialLinks ? JSON.stringify(body.socialLinks) : null;

    if (Object.keys(upd).length === 0) return NextResponse.json({ ok: true, user: null });

    // update payload prepared

    // Try an UPDATE first. If no rows are affected (for example the users row
    // doesn't exist yet), fall back to creating a minimal profile row using
    // the service role to avoid RLS issues.
    let data: any = null;
    try {
      console.log('[PATCH /api/users/me] updating user', actorId, 'with', upd);
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
      console.log('[PATCH /api/users/me] selected data', data);
    } catch (e) {
      console.error('[PATCH /api/users/me] unexpected update exception', e);
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
    if (data) {
      return NextResponse.json({ ok: true, user: data });
    }

    // No existing row found/updated. Create a minimal profile row.
    const insertObj: any = { id: actorId };
    if (upd.username !== undefined) insertObj.username = upd.username;
    if (upd.username_changed_at !== undefined) insertObj.username_changed_at = upd.username_changed_at;
    if (upd.display_name !== undefined) insertObj.display_name = upd.display_name;
    if (upd.avatar_url !== undefined) insertObj.avatar_url = upd.avatar_url;
    if (upd.bio !== undefined) insertObj.bio = upd.bio;
    if (upd.socialLinks !== undefined) insertObj.socialLinks = upd.socialLinks;

    // Use upsert to create the row if it doesn't exist; conflict on primary key
    // ensures this is safe in concurrent scenarios.
    try {
      // attempting upsert to create profile
      const insRes: any = await sb.from('users').upsert(insertObj).select('*').limit(1).maybeSingle();
      if (insRes.error) {
        console.error('PATCH /api/users/me: upsert error', insRes.error);
        return NextResponse.json({ error: insRes.error.message || insRes.error }, { status: 500 });
      }
      return NextResponse.json({ ok: true, user: insRes.data || null });
    } catch (e) {
      console.error('PATCH /api/users/me: unexpected upsert exception', e);
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  } catch (e: any) {
    console.error('PATCH /api/users/me: outer exception', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
