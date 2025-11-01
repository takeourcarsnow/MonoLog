#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function main() {
  const apiUrl = process.env.SPOTIFY_TRACKS_API_URL || 'http://localhost:3000/api/posts/spotify-tracks';
  let data;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    data = await response.json();
  } catch (err) {
    console.error('Failed to fetch from API:', err.message);
    // Fallback to file
    const file = path.resolve(__dirname, '..', 'spotify-tracks.json');
    if (!fs.existsSync(file)) {
      console.error('spotify-tracks.json not found at', file);
      process.exit(1);
    }

    let buf = fs.readFileSync(file);
    let raw;
    // detect UTF-16 LE BOM
    if (buf[0] === 0xFF && buf[1] === 0xFE) {
      raw = buf.toString('utf16le');
    } else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      raw = buf.toString('utf8');
    } else {
      // fallback to utf8
      raw = buf.toString('utf8');
    }
    // strip common wrappers or BOMs that might exist
    raw = raw.replace(/^\uFEFF/, ''); // BOM
    // If file accidentally contains markdown code fences, remove them
    raw = raw.replace(/^\s*```json\s*/, '');
    raw = raw.replace(/\s*```\s*$/, '');
    // Trim leading characters before the first JSON object
    const firstBrace = raw.indexOf('{');
    if (firstBrace > 0) raw = raw.slice(firstBrace);
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      console.error('Failed to parse spotify-tracks.json — raw start:\n', raw.slice(0,200));
      throw parseErr;
    }
  }

  const tracks = Array.isArray(data.tracks) ? data.tracks : [];

  tracks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  function pad(s, n) { return (s+'').padEnd(n).slice(0,n); }
  console.log('\nFound ' + tracks.length + ' spotify links:\n');
  console.log(pad('createdAt',24) + '  ' + pad('username',18) + '  ' + pad('postId',36) + '  ' + 'spotifyLink');
  console.log('-'.repeat(120));
  tracks.forEach(t => {
    const when = t.createdAt || '';
    const user = t.user && t.user.username ? t.user.username : (t.user && t.user.displayName) || '';
    const postId = t.postId || '';
    const link = (t.spotifyLink || '').trim();
    console.log(pad(when,24) + '  ' + pad(user,18) + '  ' + pad(postId,36) + '  ' + link);
  });
  console.log('\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
