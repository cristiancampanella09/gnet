import bcrypt from "bcryptjs";
import { getStoredHash, savePasswordHash } from "./storage";

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = getStoredHash();
  return bcrypt.compare(password, hash);
}

export async function changePassword(newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 10);
  savePasswordHash(hash);
} 
