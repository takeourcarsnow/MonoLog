(async () => {
  // Lightweight inspector to print hydrated posts using the local API adapter
  try {
    const path = require('path');
    const apiModule = require(path.join(__dirname, '..', 'src', 'lib', 'api', 'local'));
    const seed = require(path.join(__dirname, '..', 'src', 'lib', 'seed'));
    const localApi = apiModule.localApi;
    await localApi.init();
    // seed demo data unconditionally for inspection
    const seedData = require(path.join(__dirname, '..', 'src', 'lib', 'seed'));
    // reuse seed function to populate
    await seed.seedIfNeeded(localApi).catch(() => {});
    const posts = await localApi.getExploreFeed();
    console.log('Found posts:', posts.length);
    for (let i = 0; i < Math.min(6, posts.length); i++) {
      const p = posts[i];
      console.log(`post ${i} id=${p.id} images=${Array.isArray(p.imageUrls) ? p.imageUrls.length : String(p.imageUrls)}`);
    }
  } catch (e) {
    console.error('inspect failed', e);
    process.exit(1);
  }
})();
