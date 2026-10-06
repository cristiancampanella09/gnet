import * as ExcelJS from 'exceljs';
import { Assignments } from './duty-assigner';

// ========== HELPERS ==========

function getFullNameClean(person: any): string {
  if (!person) return '';
  return `${person.grado} ${person.cognome.toUpperCase()} ${person.nome.toUpperCase()}`;
}

function getCell(person: any): string {
  if (!person) return '';
  return person.cell || '';
}

function getTelUff(person: any): string {
  if (!person) return '';
  return person.tel_uff || '';
}

function formatDate(date: string, separator: string = '-'): string {
  const dateObj = new Date(date + 'T00:00:00');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}${separator}${month}${separator}${year}`;
}

// Path del template nella cartella public di Next.js.
// Il file Assetto_generale.xlsx deve trovarsi in: public/templates/Assetto_generale.xlsx
const TEMPLATE_URL = '/templates/Assetto_generale.xlsx';

// Scrive i dati di una singola "colonna" (Servizio) in una riga del template:
// nomeCol = colonna Cognome e Nome, cellCol = colonna Cell., telCol = colonna Tel. Ufficio
function writePerson(
  worksheet: ExcelJS.Worksheet,
  row: number,
  nomeCol: number,
  cellCol: number,
  telCol: number,
  person: any
) {
  worksheet.getCell(row, nomeCol).value = getFullNameClean(person);
  worksheet.getCell(row, cellCol).value = getCell(person);
  worksheet.getCell(row, telCol).value = getTelUff(person);
}

// Riempie un blocco (Piano San Lazzaro + Borgo Rodi) del template.
// rowOffset = 0 per il blocco "Giorno in rosso" (righe 2-13),
// rowOffset = 14 per il blocco "Giorno dopo" (righe 16-27).
function fillBlock(worksheet: ExcelJS.Worksheet, rowOffset: number, assignments: Assignments) {
  // PIANO SAN LAZZARO: colonne C (nome), D (cell), E (tel ufficio)
  writePerson(worksheet, 5 + rowOffset, 3, 4, 5, assignments.ufficiale);
  writePerson(worksheet, 7 + rowOffset, 3, 4, 5, assignments.capo1_psl);
  writePerson(worksheet, 8 + rowOffset, 3, 4, 5, assignments.capo2_psl);
  writePerson(worksheet, 10 + rowOffset, 3, 4, 5, assignments.assist1_psl);
  writePerson(worksheet, 11 + rowOffset, 3, 4, 5, assignments.assist2_psl);
  writePerson(worksheet, 13 + rowOffset, 3, 4, 5, assignments.mensa);

  // BORGO RODI: colonne G (nome), H (cell), I (tel ufficio)
  // "Uff.le di Guardia" va messo SOLO a Piano San Lazzaro: qui riga 5 resta vuota.
  writePerson(worksheet, 7 + rowOffset, 7, 8, 9, assignments.capo1_br);
  writePerson(worksheet, 8 + rowOffset, 7, 8, 9, assignments.capo2_br);
  // Riga 10 = intestazione fissa "ISP. MOLO ATHOS FRATERNALE" (non si tocca).
  // Riga 11 = "Sott.le Ispezione" -> dati del ruolo Ispezione Porto Athos.
  writePerson(worksheet, 11 + rowOffset, 7, 8, 9, assignments.ispezione_br);
  // Servizio Mensa: stessa persona anche sul lato Borgo Rodi.
  writePerson(worksheet, 13 + rowOffset, 7, 8, 9, assignments.mensa);
}

// ========== GENERAZIONE EXCEL ==========

export async function generateAssettoFile(
  assignmentsOggi: Assignments,
  assignmentsDomani: Assignments,
  dataOggi: string,
  dataDomani: string
): Promise<ArrayBuffer> {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(
      `Impossibile caricare il template Assetto (${TEMPLATE_URL}). Assicurati che il file sia presente in public/templates/.`
    );
  }
  const templateBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);
  const worksheet = workbook.worksheets[0];

  // ===== Titoli con le date =====
  const titoloOggiCell = worksheet.getCell(2, 6); // F2
  titoloOggiCell.value = String(titoloOggiCell.value).replace(
    'GIORNO IN ROSSO',
    formatDate(dataOggi)
  );

  const titoloDomaniCell = worksheet.getCell(16, 6); // F16
  titoloDomaniCell.value = String(titoloDomaniCell.value).replace(
    'GIORNO DOPO',
    formatDate(dataDomani)
  );

  // ===== Blocco "Giorno in rosso" (righe 2-13) =====
  fillBlock(worksheet, 0, assignmentsOggi);

  // ===== Blocco "Giorno dopo" (righe 16-27) =====
  fillBlock(worksheet, 14, assignmentsDomani);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

// ========== DOWNLOAD EXCEL ==========

export async function downloadAssettoFile(
  assignmentsOggi: Assignments,
  assignmentsDomani: Assignments,
  dataOggi: string,
  dataDomani: string
): Promise<void> {
  const data = await generateAssettoFile(assignmentsOggi, assignmentsDomani, dataOggi, dataDomani);
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `Assetto del giorno ${formatDate(dataOggi, '_')}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}