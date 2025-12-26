import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { signToken } from "../../../lib/auth";
import cookie from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ message: "Email already registered" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash: hash } });
  const token = signToken({ id: user.id, email: user.email });
  res.setHeader("Set-Cookie", cookie.serialize("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60*60*24*30
  }));
  res.json({ ok: true });
}