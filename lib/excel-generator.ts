import * as ExcelJS from 'exceljs';
import { Assignments } from './duty-assigner';

// ========== HELPERS GLOBALI ==========

function getPhoneClean(person: any): string {
  if (!person) return '';
  if (person.tel_uff && person.tel_uff !== '' && person.tel_uff !== '0') {
    return person.tel_uff;
  }
  return person.cell || '';
}

function getFullNameClean(person: any): string {
  if (!person) return '';
  return `${person.grado} ${person.cognome.toUpperCase()} ${person.nome.toUpperCase()}`;
}

function formatDate(date: string, separator: string = '-'): string {
  const dateObj = new Date(date + 'T00:00:00');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}${separator}${month}${separator}${year}`;
}

// ========== STILI E BORDI CENTRALIZZATI ==========

const STYLES = {
  boldCenter: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } },
  boldLeft: { font: { bold: true }, alignment: { horizontal: 'left', vertical: 'middle' } },
  normalLeft: { font: { bold: false }, alignment: { horizontal: 'left', vertical: 'middle' } },
  normalCenter: { font: { bold: false }, alignment: { horizontal: 'center', vertical: 'middle' } },
} as const;

const BORDER_MEDIUM: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FF000000' } };
const BORDER_THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
const NO_BORDER: Partial<ExcelJS.Borders> = {};

// ========== GENERAZIONE EXCEL ==========

// Cambiato il tipo di ritorno in Promise<ArrayBuffer>
export async function generateExcelFile(
  assignments: Assignments,
  date: string,
  signer: string
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Servizio di Guardia');

  // Impostazioni colonne (Colonna D allargata a 25)
  worksheet.columns = [
    { width: 30 }, // A
    { width: 15 }, // B
    { width: 35 }, // C
    { width: 25 }, // D
    { width: 35 }  // E
  ];

  // Helper locale per scrivere celle
  function setCell(row: number, col: number, value: string, style?: Partial<ExcelJS.Style>) {
    const cell = worksheet.getCell(row, col);
    cell.value = value;
    if (style) {
      if (style.font) cell.font = style.font;
      if (style.alignment) cell.alignment = style.alignment;
    }
    return cell;
  }

  // Helper locale per scrivere una riga intera con uno stile
  function fillRow(row: number, values: string[], style: Partial<ExcelJS.Style>) {
    values.forEach((val, idx) => setCell(row, idx + 1, val, style));
  }

  // ========== INTESTAZIONE ==========
  setCell(3, 3, 'QUARTIER GENERALE MARINA', STYLES.boldCenter);
  setCell(4, 3, '*ANCONA*', STYLES.boldCenter);
  setCell(5, 3, 'SEZIONE SERVIZI - NUCLEO SORVEGLIANZA E ARMERIA', STYLES.boldCenter);

  setCell(7, 3, 'Servizio di Guardia del Giorno', STYLES.boldLeft);
  setCell(7, 5, formatDate(date), STYLES.normalLeft);

  setCell(9, 3, 'Comprensorio Piano San Lazzaro', STYLES.boldCenter);
  setCell(9, 4, 'Comprensorio Borgo Rodi', STYLES.boldCenter);
  fillRow(10, ['Incarico', 'Telefono', 'Nominativo', 'Telefono', 'Nominativo'], STYLES.boldCenter);

  // ========== DATI PERSONALE (Righe 11-19) ==========
  const personRowsConfig = [
    { row: 11, label: "Uff.le/Sott.le d'Ispezione", psl: assignments.ufficiale, br: null },
    { row: 12, label: 'Capo Guardia 1ª Muta', psl: assignments.capo1_psl, br: assignments.capo1_br },
    { row: 13, label: 'Capo Guardia 2ª Muta', psl: assignments.capo2_psl, br: assignments.capo2_br },
    { row: 14, label: 'Assistente 1ª Muta', psl: assignments.assist1_psl, br: null },
    { row: 15, label: 'Assistente 2ª Muta', psl: assignments.assist2_psl, br: null },
    { row: 16, label: 'Servizio Mensa Nota (4)', psl: assignments.mensa, br: assignments.mensa },
  ];

  personRowsConfig.forEach(({ row, label, psl, br }) => {
    setCell(row, 1, label, STYLES.boldLeft);
    setCell(row, 2, psl ? getPhoneClean(psl) : '', STYLES.normalLeft);
    setCell(row, 3, psl ? getFullNameClean(psl) : '', STYLES.normalLeft);
    setCell(row, 4, br ? getPhoneClean(br) : '', STYLES.normalLeft);
    setCell(row, 5, br ? getFullNameClean(br) : '', STYLES.normalLeft);
  });

  // Righe Tandem vuote
  const tandemLabels = [
    'Tandem Uff. Ispez. P.S.L.',
    'Tandem Capo Guardia P.S.L./B.R.',
    'Tandem Assistente P.S.L.'
  ];
  tandemLabels.forEach((label, idx) => {
    const row = 17 + idx;
    setCell(row, 1, label, STYLES.boldLeft);
    for (let c = 2; c <= 5; c++) setCell(row, c, '', STYLES.normalLeft);
  });

  // ========== ALTRI SERVIZI (Righe 22-28) ==========
  setCell(22, 3, 'Altri servizi', STYLES.boldCenter);
  setCell(22, 4, 'ISPEZIONE UFFICIO PORTO', STYLES.boldCenter);
  fillRow(23, ['Servizio', 'Telefono', 'Nominativo', 'Telefono', 'SOTT.le/SOTT.po'], STYLES.boldCenter);

  const serviceRowsConfig = [
    { row: 24, vals: ['', '', '', assignments.ispezione_br ? getPhoneClean(assignments.ispezione_br) : '', assignments.ispezione_br ? getFullNameClean(assignments.ispezione_br) : ''] },
    { row: 25, vals: ['Servizio Sanitario Nota (3)', '', 'Primo Soccorso Aziendale', '', ''] },
    { row: 26, vals: ['Servizio Tecnico Infermeria', 'Nota 5', assignments.infermeria ? getFullNameClean(assignments.infermeria) : '', '', ''] },
    { row: 27, vals: ['Servizio Automezzi', 'Nota 2', 'Come da Servizio Allegato', '', ''] },
    { row: 28, vals: ['Ronda di RICOSED', '', '', '', ''] },
  ];

  serviceRowsConfig.forEach(({ row, vals }) => {
    setCell(row, 1, vals[0], STYLES.boldLeft);
    for (let c = 2; c <= 5; c++) setCell(row, c, vals[c - 1], STYLES.normalLeft);
  });

  // ========== NOTE E FIRMA (Righe 31-35) ==========
  setCell(31, 1, 'Note:', STYLES.boldLeft);
  setCell(31, 5, signer, STYLES.boldLeft);

  const notes = [
    '1. Tutti i TANDEM siano limitati al solo orario lavorativo;',
    '2. Servizi Assicurati a cura dall\'Autoreparto (Vedasi Consegne Giornaliere);',
    '3. Servizio Assicurato (Orario Lavorativo) a cura di Maricenselez Ancona;',
    '4. Servizio Assicurato a cura del QGM Ancona;',
    '5. Numero reperibilità custodita in busta sigillata presso Corpo di Guardia.'
  ];
  notes.forEach((note, idx) => setCell(31 + idx, 2, note, STYLES.normalLeft));

  // ========== APPLICAZIONE BORDI PERSONALIZZATI ==========
  // NOTA: questa sezione è stata riscritta per rispecchiare ESATTAMENTE i bordi
  // presenti nel file modello reale (utility.xlsx), verificati cella per cella.
  // Regola generale osservata nel modello: il bordo SINISTRO è medium solo sulla
  // colonna A (le altre colonne non hanno bordo sinistro); il bordo DESTRO è
  // medium su TUTTE le colonne (funge da divisore verticale interno).

  const applyBorders = (r: number, c: number, borders: Partial<ExcelJS.Borders>) => {
    worksheet.getCell(r, c).border = borders;
  };

  // 1. Riga 9 (intestazioni "Comprensorio ...") — bordi non uniformi come nel modello
  applyBorders(9, 1, NO_BORDER);
  applyBorders(9, 2, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(9, 3, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM });
  applyBorders(9, 4, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM });
  applyBorders(9, 5, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });

  // 2. Riga 10 (intestazione colonne tabella 1) — B10 e D10 (Telefono) senza bordo superiore
  applyBorders(10, 1, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(10, 2, { bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(10, 3, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(10, 4, { bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(10, 5, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });

  // 3. Righe 11-18 (corpo tabella 1, bordi thin) — right sempre medium, left medium solo su col.1
  for (let r = 11; r <= 18; r++) {
    for (let c = 1; c <= 5; c++) {
      applyBorders(r, c, {
        top: BORDER_THIN,
        bottom: BORDER_THIN,
        left: c === 1 ? BORDER_MEDIUM : undefined,
        right: BORDER_MEDIUM,
      });
    }
  }

  // 3b. Riga 19 (chiusura tabella 1, bordo inferiore medium)
  for (let c = 1; c <= 5; c++) {
    applyBorders(19, c, {
      top: BORDER_THIN,
      bottom: BORDER_MEDIUM,
      left: c === 1 ? BORDER_MEDIUM : undefined,
      right: BORDER_MEDIUM,
    });
  }

  // 4. Righe 20 e 21: NESSUN BORDO (inclusa E21)
  for (let r = 20; r <= 21; r++) {
    for (let c = 1; c <= 5; c++) applyBorders(r, c, NO_BORDER);
  }

  // 5. Riga 22: A22 e B22 NESSUN BORDO. C22/D22 con left medium (no right). E22 con right medium.
  applyBorders(22, 1, NO_BORDER);
  applyBorders(22, 2, NO_BORDER);
  applyBorders(22, 3, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM });
  applyBorders(22, 4, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM });
  applyBorders(22, 5, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });

  // 6. Riga 23 (intestazione tabella 2) — D23 (Telefono) senza bordo superiore
  applyBorders(23, 1, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(23, 2, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(23, 3, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(23, 4, { bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });
  applyBorders(23, 5, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, right: BORDER_MEDIUM });

  // 7. Riga 24 (prima riga dati tabella 2) — nessun bordo superiore (già chiuso da riga 23)
  for (let c = 1; c <= 5; c++) {
    applyBorders(24, c, {
      bottom: BORDER_THIN,
      left: c === 1 ? BORDER_MEDIUM : undefined,
      right: BORDER_MEDIUM,
    });
  }

  // 8. Righe 25-27 (corpo tabella 2, bordi thin)
  for (let r = 25; r <= 27; r++) {
    for (let c = 1; c <= 5; c++) {
      applyBorders(r, c, {
        top: BORDER_THIN,
        bottom: BORDER_THIN,
        left: c === 1 ? BORDER_MEDIUM : undefined,
        right: BORDER_MEDIUM,
      });
    }
  }

  // 9. Riga 28 (chiusura tabella 2, bordo inferiore medium)
  for (let c = 1; c <= 5; c++) {
    applyBorders(28, c, {
      top: BORDER_THIN,
      bottom: BORDER_MEDIUM,
      left: c === 1 ? BORDER_MEDIUM : undefined,
      right: BORDER_MEDIUM,
    });
  }

  // 10. E31 con bordi (Box per la firma)
  applyBorders(31, 5, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM, right: BORDER_MEDIUM });

  // ========== ALTEZZE RIGHE ==========
  [3, 4, 5, 9, 10, 22, 23].forEach((row) => worksheet.getRow(row).height = 24);
  for (let r = 11; r <= 28; r++) worksheet.getRow(r).height = 20;

  // ========== GENERAZIONE BUFFER ==========
  const buffer = await workbook.xlsx.writeBuffer();
  // Cast esplicito ad ArrayBuffer per risolvere l'incompatibilità di tipo in Next.js
  return buffer as ArrayBuffer; 
}

// ========== DOWNLOAD EXCEL ==========

export async function downloadExcelFile(
  assignments: Assignments,
  date: string,
  signer: string
): Promise<void> {
  const data = await generateExcelFile(assignments, date, signer);
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = `Servizio di guardia del ${formatDate(date, '_')}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}