// Aggiungi all'inizio del file
console.log('🔄 VERSIONE APP: 2.0.0 (simulazione aggiornamento)');
const SIGNERS_KEY = "gnet_signers";
const PASSWORD_KEY = "gnet_password";

// Sostituisci con l'hash generato per "Cristian@2009"
const DEFAULT_PASSWORD_HASH = "$2a$10$e9ZxH8XQYjK3N5V7W2L9X.s3fJ2kL5mN8oP7qR4sT6uVwXyZ1A2B3C4D5E6"; 

export function getSigners(): string[] {
  if (typeof window === "undefined") return ["Comandante Rossi", "Ten. Bianchi", "Cap. Verdi"];
  try {
    const data = localStorage.getItem(SIGNERS_KEY);
    return data ? JSON.parse(data) : ["Comandante Rossi", "Ten. Bianchi", "Cap. Verdi"];
  } catch {
    return ["Comandante Rossi", "Ten. Bianchi", "Cap. Verdi"];
  }
}

export function saveSigners(signers: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIGNERS_KEY, JSON.stringify(signers));
  } catch (error) {
    console.error("Errore salvataggio firmatari:", error);
  }
}

export function getStoredHash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PASSWORD_KEY);
  } catch {
    return null;
  }
}

export function savePasswordHash(hash: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PASSWORD_KEY, hash);
  } catch (error) {
    console.error("Errore salvataggio password:", error);
  }
}