import * as XLSX from "xlsx";

export interface Person {
  grado: string;
  cat: string;
  cognome: string;
  nome: string;
  cell: string;
  tel_uff: string;
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

function dateToExcelSerial(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00Z");
  return Math.floor(date.getTime() / 86400000) + 25569;
}

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
    if (str.includes("cognome") || str.includes("nome")) return i;
  }
  return -1;
}

function findDateColumnIndex(rows: unknown[][], headerIdx: number, dateStr: string): number {
  const targetDay = parseInt(dateStr.split("-")[2], 10);
  const targetSerial = dateToExcelSerial(dateStr);

  if (headerIdx >= 0) {
    const hRow = rows[headerIdx];
    for (let c = 0; c < hRow.length; c++) {
      const val = hRow[c];
      if (val === targetDay || val === String(targetDay) || val === targetSerial) return c;
    }
  }
  return 7 + (targetDay - 1);
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

        const dateColIdx = findDateColumnIndex(rows, headerIdx, dateStr);
        const people: Person[] = [];

        for (let r = headerIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;
          const cellVal = String(row[dateColIdx] ?? "").trim().toUpperCase();

          if (cellVal === "P") {
            const cognome = String(row[3] ?? "").trim();
            const nome = String(row[4] ?? "").trim();
            if (!cognome && !nome) continue;

            people.push({
              grado: String(row[1] ?? "").trim(), // Colonna 2 (Indice 1) = Grado
              cat: String(row[2] ?? "").trim(),   // Colonna 3 (Indice 2) = Categoria
              cognome,
              nome,
              cell: String(row[5] ?? "").trim(),
              tel_uff: String(row[6] ?? "").trim(),
            });
          }
        }

        if (people.length === 0) resolve(null);
        else resolve(people[0]);
      } catch (err) { reject(err); }
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
          for (let c = 7; c < row.length; c++) {
            if (String(row[c] ?? "").trim().toUpperCase() === "P") countP++;
          }

          result.push({
            cat: String(row[2] ?? "").trim(), // Colonna 3 (Indice 2) = Categoria
            cognome,
            nome,
            totalGuardie: countP,
            roleLabel,
          });
        }
        resolve(result);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}