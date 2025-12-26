import { NextApiRequest, NextApiResponse } from "next";
import { getUserFromReq } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

const MIN_SECONDS = parseInt(process.env.MIN_SECONDS_BETWEEN_GAME_REWARDS || "60", 10);
const MAX_DAILY = parseInt(process.env.MAX_DAILY_GAME_REWARDS || "10", 10);
const AUTO_THRESHOLD = parseInt(process.env.AUTO_REDEEM_THRESHOLD || "100", 10);

// helper: count today's events
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  const { pointsAwarded } = req.body;
  if (!pointsAwarded || typeof pointsAwarded !== "number") return res.status(400).json({ message: "Missing points" });

  // rate limits: last event time
  const lastEvent = await prisma.gameEvent.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
  if (lastEvent) {
    const diff = (Date.now() - new Date(lastEvent.createdAt).getTime()) / 1000;
    if (diff < MIN_SECONDS) return res.status(429).json({ message: `Please wait ${Math.ceil(MIN_SECONDS - diff)}s before another reward.` });
  }

  // daily cap
  const todayCount = await prisma.gameEvent.count({
    where: { userId: user.id, createdAt: { gte: startOfDay() } }
  });
  if (todayCount >= MAX_DAILY) return res.status(429).json({ message: "Daily reward limit reached." });

  // award points (transactional)
  const updated = await prisma.$transaction(async (tx) => {
    const ge = await tx.gameEvent.create({
      data: {
        userId: user.id,
        pointsAwarded,
        providerPayload: "game_clear"
      }
    });
    const t = await tx.transaction.create({
      data: {
        userId: user.id,
        amount: pointsAwarded,
        kind: "game_reward",
        ref: `gameEvent:${ge.id}`
      }
    });
    const u = await tx.user.update({
      where: { id: user.id },
      data: { points: { increment: pointsAwarded } }
    });
    return { ge, t, u };
  });

  // check auto-redeem
  if (updated.u.points >= AUTO_THRESHOLD) {
    // initiate background redemption (best to queue it in real system)
    try {
      await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/redemptions/redeem`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "cookie": req.headers.cookie || "" },
        body: JSON.stringify({ points: AUTO_THRESHOLD })
      });
    } catch (e) {
      console.error("Auto redeem failed", e);
    }
  }

  res.json({ ok: true, pointsAwarded, newBalance: updated.u.points });
}