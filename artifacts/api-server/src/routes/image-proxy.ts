import { Router } from "express";

const router = Router();

const cache = new Map<string, { url: string; expiry: number }>();

router.get("/proxy/roblox-avatar", async (req, res) => {
  const username = (req.query.username as string || "").trim();
  if (!username) return res.status(400).end();

  try {
    const cached = cache.get(username);
    if (cached && cached.expiry > Date.now()) {
      return res.redirect(302, cached.url);
    }

    const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    const userData = await userRes.json() as { data?: { id: number }[] };
    const userId = userData.data?.[0]?.id;
    if (!userId) return res.status(404).end();

    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    const thumbData = await thumbRes.json() as { data?: { imageUrl: string }[] };
    const imageUrl = thumbData.data?.[0]?.imageUrl ?? null;
    if (!imageUrl) return res.status(404).end();

    cache.set(username, { url: imageUrl, expiry: Date.now() + 1000 * 60 * 55 });

    return res.redirect(302, imageUrl);
  } catch {
    return res.status(502).end();
  }
});

export default router;
