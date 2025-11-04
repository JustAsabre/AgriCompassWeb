import bcrypt from "bcryptjs";
import { User } from "@shared/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session user type (stored in session)
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  region: string | null;
  verified: boolean;
}

export function sanitizeUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    region: user.region,
    verified: user.verified,
  };
}

// Extend Express session to include user
declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}
