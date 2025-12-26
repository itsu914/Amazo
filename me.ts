import { NextApiRequest, NextApiResponse } from "next";
import { getUserFromReq } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  // fetch recent redemptions
  const redemptions = await prisma.redemption.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  res.json({
    user: { id: user.id, email: user.email, points: user.points },
    redemptions
  });
}