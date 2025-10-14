import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // First try Spotify oEmbed which provides a title, author_name and sometimes a thumbnail
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(urlParam)}`;
    const oembedRes = await fetch(oembedUrl);
    const oembedJson = oembedRes.ok ? await oembedRes.json() : null;

    let title = oembedJson?.title || '';
    let author_name = oembedJson?.author_name || '';
    let thumbnail_url = (oembedJson as any)?.thumbnail_url || '';

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    // If we don't have full info and server credentials are available, call Spotify Web API
    if ((!author_name || !thumbnail_url) && clientId && clientSecret) {
      const spotifyUrlMatch = urlParam.match(/https:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
      if (spotifyUrlMatch) {
        const type = spotifyUrlMatch[1];
        const id = spotifyUrlMatch[2];

        // Get client credentials token
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
          },
          body: 'grant_type=client_credentials',
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;
          const apiUrl = `https://api.spotify.com/v1/${type}s/${id}`;
          const apiRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (!author_name) {
              if (type === 'track' || type === 'album') {
                author_name = apiData.artists?.map((a: any) => a.name).join(', ') || author_name;
              } else if (type === 'playlist') {
                author_name = apiData.owner?.display_name || author_name;
              }
            }
            if (!thumbnail_url) {
              // tracks may have album.images, albums have images, playlists have images
              thumbnail_url = apiData.images?.[0]?.url || apiData.album?.images?.[0]?.url || thumbnail_url;
            }
            if (!title) {
              title = apiData.name || title;
            }
          }
        }
      }
    }

    const meta = { title, author_name, thumbnail_url };
    return NextResponse.json(meta);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch spotify metadata' }, { status: 500 });
  }
}
