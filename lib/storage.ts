const SIGNERS_KEY = "gnet_signers";
const PASSWORD_KEY = "gnet_password";

const DEFAULT_SIGNERS = ["Comandante Rossi", "Ten. Bianchi", "Cap. Verdi"];

export function getSigners(): string[] {
  if (typeof window === "undefined") return DEFAULT_SIGNERS;
  try {
    const data = localStorage.getItem(SIGNERS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SIGNERS;
  } catch {
    return DEFAULT_SIGNERS;
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