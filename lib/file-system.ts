// lib/file-system.ts
// Gestione della cartella root con persistenza dell'handle in IndexedDB.

const DB_NAME = "gnet_fs";
const STORE = "handles";
const ROOT_KEY = "root";

export type RootState = "granted" | "prompt" | "none";

let rootHandle: any = null;

// ---------- IndexedDB helpers ----------
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- API pubblica ----------
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Click su "Seleziona Root": sceglie la cartella e la salva in IndexedDB. */
export async function requestRootPermission(): Promise<boolean> {
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    rootHandle = handle;
    await idbSet(ROOT_KEY, handle);
    return true;
  } catch (error) {
    console.error("Selezione cartella annullata o fallita:", error);
    return false;
  }
}

/** Al mount: recupera l'handle salvato senza mostrare prompt. */
export async function restoreRoot(): Promise<RootState> {
  try {
    const handle = await idbGet<any>(ROOT_KEY);
    if (!handle) return "none";
    rootHandle = handle;
    const perm = await handle.queryPermission({ mode: "readwrite" });
    return perm === "granted" ? "granted" : "prompt";
  } catch (error) {
    console.error("Errore ripristino root:", error);
    return "none";
  }
}

/** Da chiamare dentro un click: richiede di nuovo il permesso sull'handle salvato. */
export async function reauthorizeRoot(): Promise<boolean> {
  if (!rootHandle) return false;
  try {
    const perm = await rootHandle.requestPermission({ mode: "readwrite" });
    return perm === "granted";
  } catch (error) {
    console.error("Errore riautorizzazione root:", error);
    return false;
  }
}

/** Per le operazioni di I/O: nessun prompt, solo verifica del permesso. */
export async function getRootHandle(): Promise<any> {
  if (!rootHandle) return null;
  try {
    const perm = await rootHandle.queryPermission({ mode: "readwrite" });
    return perm === "granted" ? rootHandle : null;
  } catch {
    return null;
  }
}

export async function clearRootHandle(): Promise<void> {
  rootHandle = null;
  try {
    await idbDelete(ROOT_KEY);
  } catch (error) {
    console.error("Errore rimozione root:", error);
  }
}

/** true se l'errore indica che cartella/file non esistono più (spostati o rinominati). */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

export async function readFileContent(fileHandle: any): Promise<ArrayBuffer> {
  const file = await fileHandle.getFile();
  return file.arrayBuffer();
}