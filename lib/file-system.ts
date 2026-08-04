// lib/file-system.ts
let rootHandle: any = null;

export async function requestRootPermission(): Promise<boolean> {
  try {
    // @ts-ignore - File System Access API
    const handle = await window.showDirectoryPicker();
    rootHandle = handle;
    // Salva l'handle in sessionStorage per riutilizzarlo
    sessionStorage.setItem('gnet_root_handle', JSON.stringify({
      name: handle.name
    }));
    return true;
  } catch (error) {
    console.error('Errore selezione cartella:', error);
    return false;
  }
}

export async function getRootHandle(): Promise<any> {
  if (rootHandle) return rootHandle;
  
  // Prova a recuperare dal sessionStorage
  try {
    const saved = sessionStorage.getItem('gnet_root_handle');
    if (saved) {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      rootHandle = handle;
      return handle;
    }
  } catch (error) {
    console.error('Errore recupero handle:', error);
  }
  return null;
}

export async function saveFileHandle(month: string, role: string, fileHandle: any): Promise<void> {
  const key = `gnet_file_${month}_${role}`;
  try {
    const handleData = {
      name: fileHandle.name
    };
    localStorage.setItem(key, JSON.stringify(handleData));
  } catch (error) {
    console.error('Errore salvataggio handle file:', error);
  }
}

export async function getFileHandle(month: string, role: string): Promise<any> {
  const key = `gnet_file_${month}_${role}`;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    
    const handleData = JSON.parse(saved);
    const root = await getRootHandle();
    if (!root) return null;
    
    // Cerca il file nella struttura
    const fileHandle = await findFileInDirectory(root, handleData.name);
    return fileHandle;
  } catch (error) {
    console.error('Errore recupero handle file:', error);
    return null;
  }
}

async function findFileInDirectory(
  dirHandle: any,
  fileName: string
): Promise<any> {
  try {
    // Cerca il file nella directory corrente
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name === fileName) {
        return entry;
      }
      if (entry.kind === 'directory') {
        const subDir = await dirHandle.getDirectoryHandle(entry.name);
        const found = await findFileInDirectory(subDir, fileName);
        if (found) return found;
      }
    }
    return null;
  } catch (error) {
    console.error('Errore ricerca file:', error);
    return null;
  }
}

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
    const options = { mode: 'read' };
    const permission = await fileHandle.requestPermission(options);
    return permission === 'granted';
  } catch (error) {
    console.error('Errore richiesta permesso:', error);
    return false;
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}