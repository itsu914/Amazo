import jwt from "jsonwebtoken";
import { NextApiRequest } from "next";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "change_this";

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string | undefined) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (e) {
    return null;
  }
}

export async function getUserFromReq(req: NextApiRequest) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.split(";").map(s => s.trim()).find(s => s.startsWith("token="));
  if (!match) return null;
  const token = match.split("=")[1];
  const data = verifyToken(token);
  if (!data) return null;
  const user = await prisma.user.findUnique({ where: { id: (data as any).id } });
  return user;
}