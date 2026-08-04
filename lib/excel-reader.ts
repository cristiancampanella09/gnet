import * as XLSX from "xlsx";

export interface Person {
  grado: string;
  cat: string;
  cognome: string;
  nome: string;
  servizio: string;
  grcgnnm: string;
  ente: string;
  cell: string;
  tel_uff: string;
  email: string;
}

export interface GuardStats {
  cat: string;
  cognome: string;
  nome: string;
  totalGuardie: number;
  roleLabel: string;
}

const MESI_IT: Record<number, string> = {
  1: "gennaio", 2: "febbraio", 3: "marzo", 4: "aprile",
  5: "maggio", 6: "giugno", 7: "luglio", 8: "agosto",
  9: "settembre", 10: "ottobre", 11: "novembre", 12: "dicembre",
};

function findSheet(workbook: XLSX.WorkBook, month: number): XLSX.WorkSheet {
  const nomeMese = MESI_IT[month];
  const found = workbook.SheetNames.find((n) => n.trim().toLowerCase() === nomeMese);
  if (found) return workbook.Sheets[found];
  return workbook.Sheets[workbook.SheetNames[0]];
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    const str = row.map((cell) => String(cell ?? "").toLowerCase()).join(" ");
    // Cerchiamo "grado" o "cognome" nell'intestazione
    if (str.includes("grado") || str.includes("cognome")) return i;
  }
  return -1;
}

function findDateColumnIndex(dateStr: string): number {
  const day = parseInt(dateStr.split("-")[2], 10);
  // Colonna L = indice 11 = 1° del mese
  // Quindi: indice = 10 + giorno
  return 10 + day;
}

export async function readPersonForRole(file: File, dateStr: string): Promise<Person | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const month = parseInt(dateStr.split("-")[1], 10);
        const sheet = findSheet(workbook, month);
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        const headerIdx = findHeaderRow(rows);
        if (headerIdx === -1) { resolve(null); return; }

        const dateColIdx = findDateColumnIndex(dateStr);
        
        // Verifica che la colonna esista
        if (dateColIdx >= rows[headerIdx]?.length) {
          resolve(null);
          return;
        }

        for (let r = headerIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;
          
          // La colonna del giorno potrebbe avere "P" o "p" o essere vuota
          const cellVal = String(row[dateColIdx] ?? "").trim().toUpperCase();

          if (cellVal === "P") {
            // Colonna A (indice 0) = NUMERO RIGA (da ignorare)
            // Colonna B (indice 1) = GRADO
            // Colonna C (indice 2) = CAT
            // Colonna D (indice 3) = COGNOME
            // Colonna E (indice 4) = NOME
            // Colonna F (indice 5) = SERVIZIO
            // Colonna G (indice 6) = GrCgnNm
            // Colonna H (indice 7) = ENTE
            // Colonna I (indice 8) = CELL
            // Colonna J (indice 9) = TEL UFF
            // Colonna K (indice 10) = E-MAIL
            
            const grado = String(row[1] ?? "").trim();
            const cat = String(row[2] ?? "").trim();
            const cognome = String(row[3] ?? "").trim();
            const nome = String(row[4] ?? "").trim();
            
            if (!cognome && !nome) continue;

            resolve({
              grado,
              cat,
              cognome,
              nome,
              servizio: String(row[5] ?? "").trim(),
              grcgnnm: String(row[6] ?? "").trim(),
              ente: String(row[7] ?? "").trim(),
              cell: String(row[8] ?? "").trim(),
              tel_uff: String(row[9] ?? "").trim(),
              email: String(row[10] ?? "").trim(),
            });
            return;
          }
        }

        resolve(null);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function readAllGuardStatsForRole(
  file: File,
  monthNum: number,
  roleLabel: string
): Promise<GuardStats[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = findSheet(workbook, monthNum);
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        const headerIdx = findHeaderRow(rows);
        if (headerIdx === -1) { resolve([]); return; }

        const result: GuardStats[] = [];

        for (let r = headerIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const cognome = String(row[3] ?? "").trim(); // Colonna D (indice 3)
          const nome = String(row[4] ?? "").trim();    // Colonna E (indice 4)
          if (!cognome && !nome) continue;

          let countP = 0;
          // Conta le "P" da colonna L (indice 11) in poi
          for (let c = 11; c < row.length; c++) {
            if (String(row[c] ?? "").trim().toUpperCase() === "P") countP++;
          }

          if (countP > 0) {
            result.push({
              cat: String(row[2] ?? "").trim(), // Colonna C (indice 2)
              cognome,
              nome,
              totalGuardie: countP,
              roleLabel,
            });
          }
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}