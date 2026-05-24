import { type Request, type Response, type NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
    soldierId: number | null;
    soldierName: string | null;
    soldierRank: string | null;
  soldierDiscordUsername: string | null;
  }
}

const RANK_ORDER = [
  "Cadet", "Officer 1", "Officer 2", "Officer 3",
  "Sergeant 1", "Sergeant 2", "Sergeant 3",
  "Lieutenant", "First Lieutenant", "Captain", "Major",
  "Lieutenant Colonel", "Colonel", "Brigadier General",
  "Major General", "Lieutenant General", "General",
  "Deputy Commander", "High Commander", "Chief of Marshal", "Police Chief",
  "Minister of Interior",
] as const;

const LIEUTENANT_RANK_INDEX = 7;

export function rankIndex(rank: string): number {
  const i = RANK_ORDER.indexOf(rank as any);
  return i === -1 ? -1 : i;
}

export function isLieutenantOrAbove(rank: string | null | undefined): boolean {
  if (!rank) return false;
  return rankIndex(rank) >= LIEUTENANT_RANK_INDEX;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "صلاحيات القيادة فقط" });
    return;
  }
  next();
}

export function requireLieutenantOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (req.session.role === "admin") {
    next();
    return;
  }
  if (!isLieutenantOrAbove(req.session.soldierRank)) {
    res.status(403).json({ error: "يتطلب رتبة ملازم أو أعلى للوصول لهذه الصفحة" });
    return;
  }
  next();
}
