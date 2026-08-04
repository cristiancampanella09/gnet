// lib/file-system.ts
let rootHandle: any = null;

export async function requestRootPermission(): Promise<boolean> {
  try {
    // @ts-ignore - File System Access API
    const handle = await window.showDirectoryPicker();
    rootHandle = handle;
    
    // Richiedi permessi di scrittura subito
    // @ts-ignore
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      sessionStorage.setItem('gnet_root_folder', handle.name);
      sessionStorage.setItem('gnet_root_set', 'true');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Errore selezione cartella:', error);
    return false;
  }
}

export async function getRootHandle(): Promise<any> {
  if (rootHandle) {
    try {
      // @ts-ignore
      const permission = await rootHandle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        return rootHandle;
      }
    } catch (e) {
      console.error('Errore verifica permessi root:', e);
    }
  }
  
  const isRootSet = sessionStorage.getItem('gnet_root_set') === 'true';
  if (!isRootSet) {
    return null;
  }
  
  try {
    // @ts-ignore
    const handle = await window.showDirectoryPicker();
    // @ts-ignore
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      rootHandle = handle;
      sessionStorage.setItem('gnet_root_folder', handle.name);
      return handle;
    }
    return null;
  } catch (error) {
    console.error('Errore selezione cartella:', error);
    return null;
  }
}

export async function ensureRootPermission(): Promise<boolean> {
  try {
    const root = await getRootHandle();
    if (!root) return false;
    
    // @ts-ignore
    const permission = await root.requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch (error) {
    console.error('Errore permessi root:', error);
    return false;
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function clearRootHandle(): void {
  rootHandle = null;
  sessionStorage.removeItem('gnet_root_folder');
  sessionStorage.removeItem('gnet_root_set');
}

// ========== FUNZIONI PER LEGGERE FILE ==========
export async function readFileContent(fileHandle: any): Promise<ArrayBuffer> {
  try {
    const file = await fileHandle.getFile();
    return await file.arrayBuffer();
  } catch (error) {
    console.error('Errore lettura file:', error);
    throw error;
  }
}

export async function getFilePermission(fileHandle: any): Promise<boolean> {
  try {
    // @ts-ignore
    const permission = await fileHandle.requestPermission({ mode: 'read' });
    return permission === 'granted';
  } catch (error) {
    console.error('Errore richiesta permesso:', error);
    return false;
  }
}