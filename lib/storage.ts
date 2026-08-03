const SIGNERS_KEY = "gnet_signers";
const PASSWORD_KEY = "gnet_password";

const DEFAULT_PASSWORD_HASH = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

export function getSigners(): string[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(SIGNERS_KEY);
  return data ? JSON.parse(data) : ["Comandante Rossi", "Ten. Bianchi", "Cap. Verdi"];
}

export function saveSigners(signers: string[]): void {
  localStorage.setItem(SIGNERS_KEY, JSON.stringify(signers));
}

export function getStoredHash(): string {
  if (typeof window === "undefined") return DEFAULT_PASSWORD_HASH;
  return localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD_HASH;
}

export function savePasswordHash(hash: string): void {
  localStorage.setItem(PASSWORD_KEY, hash);
}