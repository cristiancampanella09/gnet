import bcrypt from "bcryptjs";
import { getStoredHash, savePasswordHash } from "./storage";

export const MIN_PASSWORD_LENGTH = 6;

/** true se è già stata impostata una password (esiste un hash salvato). */
export function isPasswordSet(): boolean {
  return !!getStoredHash();
}

/** Verifica la password solo contro l'hash salvato. Nessun fallback. */
export async function verifyPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const storedHash = getStoredHash();
  if (!storedHash) return false;

  try {
    return await bcrypt.compare(password, storedHash);
  } catch (error) {
    console.error("Errore verifica password:", error);
    return false;
  }
}

/** Imposta o cambia la password (genera e salva un nuovo hash). */
export async function changePassword(newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 10);
  savePasswordHash(hash);
}