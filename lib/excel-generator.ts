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
};

const BORDER_MEDIUM: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FF000000' } };
const BORDER_THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
const NO_BORDER: Partial<ExcelJS.Borders> = {};

// ========== GENERAZIONE EXCEL ==========

export async function generateExcelFile(
  assignments: Assignments,
  date: string,
  signer: string
): Promise<Uint8Array> {
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
  
  const applyBorders = (r: number, c: number, borders: Partial<ExcelJS.Borders>) => {
    worksheet.getCell(r, c).border = borders;
  };

  // 1. C9 e D9 con bordi
  [3, 4].forEach(c => applyBorders(9, c, { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN }));

  // 2. A10:E10 con tutti i bordi
  for (let c = 1; c <= 5; c++) {
    applyBorders(10, c, {
      top: BORDER_MEDIUM, bottom: BORDER_MEDIUM,
      left: c === 1 ? BORDER_MEDIUM : BORDER_THIN,
      right: c === 5 ? BORDER_MEDIUM : BORDER_THIN
    });
  }

  // 3. Righe 11-19 (Dati tabella 1)
  for (let r = 11; r <= 19; r++) {
    for (let c = 1; c <= 5; c++) {
      applyBorders(r, c, {
        top: BORDER_THIN, bottom: r === 19 ? BORDER_MEDIUM : BORDER_THIN,
        left: c === 1 ? BORDER_MEDIUM : BORDER_THIN,
        right: c === 5 ? BORDER_MEDIUM : BORDER_THIN
      });
    }
  }

  // 4. Righe 20 e 21: NESSUN BORDO (inclusa E21)
  for (let r = 20; r <= 21; r++) {
    for (let c = 1; c <= 5; c++) applyBorders(r, c, NO_BORDER);
  }

  // 5. Riga 22: A22 e B22 NESSUN BORDO. C22 e D22 con bordi. E22 NESSUN BORDO.
  applyBorders(22, 1, NO_BORDER);
  applyBorders(22, 2, NO_BORDER);
  applyBorders(22, 3, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_THIN, right: BORDER_THIN });
  applyBorders(22, 4, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_THIN, right: BORDER_THIN });
  applyBorders(22, 5, NO_BORDER);

  // 6. Righe 23-28 (Dati tabella 2)
  for (let r = 23; r <= 28; r++) {
    for (let c = 1; c <= 5; c++) {
      applyBorders(r, c, {
        top: r === 23 ? BORDER_MEDIUM : BORDER_THIN,
        bottom: r === 28 ? BORDER_MEDIUM : BORDER_THIN,
        left: c === 1 ? BORDER_MEDIUM : BORDER_THIN,
        right: c === 5 ? BORDER_MEDIUM : BORDER_THIN
      });
    }
  }

  // 7. E31 con bordi (Box per la firma)
  applyBorders(31, 5, { top: BORDER_MEDIUM, bottom: BORDER_MEDIUM, left: BORDER_MEDIUM, right: BORDER_MEDIUM });

  // ========== ALTEZZE RIGHE ==========
  [3, 4, 5, 9, 10, 22, 23].forEach((row) => worksheet.getRow(row).height = 24);
  for (let r = 11; r <= 28; r++) worksheet.getRow(r).height = 20;

  // ========== GENERAZIONE BUFFER ==========
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
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