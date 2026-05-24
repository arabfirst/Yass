import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { pool, db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, "../../my-website/dist");

const PgStore = connectPgSimple(session);

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "police-secret-fallback",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use("/api", router);

// ── Roblox avatar proxy (must be before static middleware) ───────────────────
const robloxCache = new Map<string, { url: string; expiry: number }>();

app.get("/api/proxy/roblox-avatar", async (req, res) => {
  const username = ((req.query.username as string) || "").trim();
  if (!username) return res.status(400).end();
  try {
    const cached = robloxCache.get(username);
    if (cached && cached.expiry > Date.now()) {
      return res.redirect(302, cached.url);
    }
    const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    const userData = (await userRes.json()) as { data?: { id: number }[] };
    const userId = userData.data?.[0]?.id;
    if (!userId) return res.status(404).end();
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    const thumbData = (await thumbRes.json()) as { data?: { imageUrl: string }[] };
    const imageUrl = thumbData.data?.[0]?.imageUrl ?? null;
    if (!imageUrl) return res.status(404).end();
    robloxCache.set(username, { url: imageUrl, expiry: Date.now() + 1000 * 60 * 55 });
    return res.redirect(302, imageUrl);
  } catch {
    return res.status(502).end();
  }
});

// تقديم ملفات الفرونت اند المبنية من الباك اند مباشرةً
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST, { maxAge: "1h" }));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  logger.warn({ FRONTEND_DIST }, "Frontend dist not found — run 'pnpm --filter @workspace/my-website run build' first");
}

async function ensureAdminUser() {
  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    if (!existing || existing.username !== "100" || existing.password !== "1001") {
      await db.delete(usersTable).where(eq(usersTable.role, "admin"));
      await db.insert(usersTable).values({
        username: "100",
        password: "1001",
        role: "admin",
      });
      logger.info("Admin credentials updated: username=100");
    }
  } catch (err) {
    logger.error({ err }, "Failed to ensure admin user");
  }
}

ensureAdminUser();

export default app;
