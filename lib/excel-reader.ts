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
    if (str.includes("grado") || str.includes("cognome") || str.includes("nome")) return i;
  }
  return -1;
}

function findDayColumnIndex(headerRow: unknown[], day: number): number {
  for (let i = 11; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (cell === undefined || cell === null) continue;
    const cellStr = String(cell).trim();
    if (cellStr === String(day) || cellStr === `${day}`) {
      return i;
    }
  }
  // Fallback: L + (day - 1)
  return 10 + day;
}

export async function readPersonForRole(file: File, dateStr: string): Promise<Person | null> {
  console.log(`📂 readPersonForRole: data="${dateStr}", file="${file.name}"`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        const dateParts = dateStr.split("-");
        if (dateParts.length !== 3) {
          console.error(`❌ Data non valida: ${dateStr}`);
          resolve(null);
          return;
        }
        
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        
        console.log(`📅 Mese: ${month}, Giorno: ${day}`);
        
        const sheet = findSheet(workbook, month);
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        const headerIdx = findHeaderRow(rows);
        if (headerIdx === -1) {
          console.warn('❌ Intestazione non trovata');
          resolve(null);
          return;
        }

        const headerRow = rows[headerIdx];
        const dateColIdx = findDayColumnIndex(headerRow, day);
        const colLetter = String.fromCharCode(65 + dateColIdx);
        console.log(`📌 Colonna giorno: ${colLetter} (indice ${dateColIdx})`);

        if (dateColIdx >= rows[headerIdx]?.length) {
          console.warn(`❌ Colonna ${dateColIdx} non esiste`);
          resolve(null);
          return;
        }

        for (let r = headerIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;
          
          const cellVal = String(row[dateColIdx] ?? "").trim().toUpperCase();
          
          if (cellVal === "P" || cellVal === "X") {
            const grado = String(row[1] ?? "").trim();
            const cat = String(row[2] ?? "").trim();
            const cognome = String(row[3] ?? "").trim();
            const nome = String(row[4] ?? "").trim();
            
            if (!cognome && !nome) continue;

            const person: Person = {
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
            };

            console.log(`✅ Trovato: ${grado} ${cognome} ${nome}`);
            resolve(person);
            return;
          }
        }

        console.warn(`❌ Nessuna "P" trovata per il giorno ${day}`);
        resolve(null);
      } catch (err) {
        console.error('Errore lettura file:', err);
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

          const cognome = String(row[3] ?? "").trim();
          const nome = String(row[4] ?? "").trim();
          if (!cognome && !nome) continue;

          let countP = 0;
          for (let c = 11; c < row.length; c++) {
            const val = String(row[c] ?? "").trim().toUpperCase();
            if (val === "P" || val === "X") countP++;
          }

          if (countP > 0) {
            result.push({
              cat: String(row[2] ?? "").trim(),
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