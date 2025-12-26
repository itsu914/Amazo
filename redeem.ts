import { NextApiRequest, NextApiResponse } from "next";
import { getUserFromReq } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { issueGift } from "../../lib/giftProvider";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  const { points } = req.body;
  if (!points || typeof points !== "number") return res.status(400).json({ message: "Missing points" });

  // simple validation: user must have enough points
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh) return res.status(404).json({ message: "User not found" });
  if (fresh.points < points) return res.status(400).json({ message: "Insufficient points" });

  const cents = Math.floor(points * 5); // demo: 1pt -> $0.05 => 5 cents per point -> change as wanted
  // create redemption record and deduct points atomically
  const redemption = await prisma.$transaction(async (tx) => {
    const r = await tx.redemption.create({
      data: {
        userId: user.id,
        pointsSpent: points,
        valueCents: cents,
        provider: process.env.GIFT_PROVIDER || "mock",
        status: "pending"
      }
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: -points,
        kind: "redemption",
        ref: `redemption:${r.id}`
      }
    });
    await tx.user.update({
      where: { id: user.id },
      data: { points: { decrement: points } }
    });
    return r;
  });

  // call provider
  try {
    const result = await issueGift({ userEmail: user.email, valueCents: cents });
    if (result.success) {
      const updated = await prisma.redemption.update({
        where: { id: redemption.id },
        data: {
          providerTxId: result.providerTxId,
          code: result.code,
          status: "sent"
        }
      });
      return res.json({ ok: true, id: updated.id, code: updated.code });
    } else {
      await prisma.redemption.update({
        where: { id: redemption.id },
        data: { status: "failed" }
      });
      return res.status(502).json({ message: "Gift provider failed", detail: result.raw });
    }
  } catch (e) {
    console.error(e);
    await prisma.redemption.update({
      where: { id: redemption.id },
      data: { status: "failed" }
    });
    return res.status(500).json({ message: "Provider error" });
  }
}