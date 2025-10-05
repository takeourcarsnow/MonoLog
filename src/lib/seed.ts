import type { Api, User, Post, Comment } from "./types";

const avatars = [
  "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=256&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=256&auto=format&fit=crop",
];

const sampleImages = [
  "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520357456838-6c5f6ef1a8bb?q=80&w=1200&auto=format&fit=crop"
];

export async function seedIfNeeded(api: Api) {
  const users = await api.getUsers();
  if (users && users.length) return;

  const u: User[] = Array.from({ length: 5 }).map((_, i) => ({
    id: `u${i+1}`,
    username: ["lina","kai","mara","jo","tess"][i],
    displayName: ["Lina Park","Kai Ito","Mara Quinn","Jordan Lee","Tess Rivera"][i],
    avatarUrl: avatars[i],
    bio: ["photolog","daily sky","coffee + code","urban notes","plants & places"][i],
    joinedAt: new Date(Date.now() - (50 - i) * 86400000).toISOString(),
    following: i === 0 ? ["u2","u3"] : i === 1 ? ["u1"] : [],
  }));

  const now = Date.now();
  const posts: Post[] = [];
  for (let dayOffset = 0; dayOffset < 16; dayOffset++) {
    for (let j = 0; j < u.length; j++) {
      if (Math.random() < 0.5) continue;
      const d = new Date(now - dayOffset * 86400000 - Math.floor(Math.random()* 10) * 3600000);
      // pick 1-3 images for this post to demonstrate multi-image support
      const count = 1 + Math.floor(Math.random() * 3);
      const imgs = Array.from({ length: count }).map((_, k) => sampleImages[(dayOffset + j + k) % sampleImages.length]);
      posts.push({
        id: `p_${dayOffset}_${j}`,
        userId: u[j].id,
        imageUrls: imgs,
        alt: imgs.map((_, idx) => `Daily photo ${idx+1}`),
        caption: ["mood","on the way","tiny moment","quiet light","city hum","morning breeze","notes from today"][ (dayOffset+j) % 7 ],
        createdAt: d.toISOString(),
        public: true,
      } as any);
    }
  }

  const comments: Comment[] = posts.slice(0, 12).map((p, i) => ({
    id: `c_${i}`,
    postId: p.id,
    userId: u[(i+1)%u.length].id,
    text: ["love this","nice tones","what a vibe","so calm","great framing"][i%5],
    createdAt: new Date(new Date(p.createdAt).getTime() + 3600000).toISOString(),
  }));

  await api.seed({ users: u, posts, comments });
}
