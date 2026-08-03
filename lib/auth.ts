import bcrypt from "bcryptjs";
import { getStoredHash, savePasswordHash } from "./storage";

// Password di default (in chiaro) per fallback
const DEFAULT_PASSWORD = "Cristian@2009";
// Hash generato per la password (lo ottieni dal punto 1)
const DEFAULT_HASH = "$2a$10$e9ZxH8XQYjK3N5V7W2L9X.s3fJ2kL5mN8oP7qR4sT6uVwXyZ1A2B3C4D5E6"; 

export async function verifyPassword(password: string): Promise<boolean> {
  if (!password) return false;
  
  // Ottieni l'hash salvato o quello di default
  const storedHash = getStoredHash() || DEFAULT_HASH;
  
  try {
    // Verifica con bcrypt (hash salvato o di default)
    const isValid = await bcrypt.compare(password, storedHash);
    
    // Se la verifica fallisce, prova con la password in chiaro (fallback)
    if (!isValid) {
      return password === DEFAULT_PASSWORD;
    }
    
    return isValid;
  } catch (error) {
    console.error("Errore verifica password:", error);
    // Fallback: verifica in chiaro
    return password === DEFAULT_PASSWORD;
  }
}

export async function changePassword(newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 10);
  savePasswordHash(hash);
}