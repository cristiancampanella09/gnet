// lib/yearly-store.ts
export interface YearMonth {
  year: string;
  month: string; // '01' - '12'
}

export interface FileReference {
  month: string;
  role: string;
  fileName: string;
}

export interface YearData {
  year: string;
  months: string[]; // ['01', '02', ...]
  files: Record<string, string>; // key: "01_ufficiale" -> value: "filename.xlsx"
}

const YEARS_KEY = 'gnet_years';

export function getYears(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(YEARS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveYears(years: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(YEARS_KEY, JSON.stringify(years));
  } catch (error) {
    console.error('Errore salvataggio anni:', error);
  }
}

export function getYearData(year: string): YearData | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `gnet_year_${year}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveYearData(year: string, data: YearData): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `gnet_year_${year}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Errore salvataggio dati anno:', error);
  }
}

export function deleteYear(year: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `gnet_year_${year}`;
    localStorage.removeItem(key);
    const years = getYears().filter(y => y !== year);
    saveYears(years);
  } catch (error) {
    console.error('Errore eliminazione anno:', error);
  }
}

export function addMonthToYear(year: string, month: string): void {
  const data = getYearData(year);
  if (!data) {
    const newData: YearData = {
      year,
      months: [month],
      files: {}
    };
    saveYearData(year, newData);
    const years = getYears();
    if (!years.includes(year)) {
      saveYears([...years, year]);
    }
    return;
  }
  
  if (!data.months.includes(month)) {
    data.months.push(month);
    data.months.sort();
    saveYearData(year, data);
  }
}

export function removeMonthFromYear(year: string, month: string): void {
  const data = getYearData(year);
  if (!data) return;
  
  data.months = data.months.filter(m => m !== month);
  // Rimuovi anche i file associati a questo mese
  const prefix = `${month}_`;
  const keysToRemove = Object.keys(data.files).filter(key => key.startsWith(prefix));
  for (const key of keysToRemove) {
    delete data.files[key];
  }
  saveYearData(year, data);
}

export function saveFileReference(year: string, month: string, role: string, fileName: string): void {
  const data = getYearData(year);
  if (!data) return;
  
  const key = `${month}_${role}`;
  data.files[key] = fileName;
  saveYearData(year, data);
}

export function removeFileReference(year: string, month: string, role: string): void {
  const data = getYearData(year);
  if (!data) return;
  
  const key = `${month}_${role}`;
  delete data.files[key];
  saveYearData(year, data);
}

export function getFileReference(year: string, month: string, role: string): string | null {
  const data = getYearData(year);
  if (!data) return null;
  
  const key = `${month}_${role}`;
  return data.files[key] || null;
}

export function getMonthsForYear(year: string): string[] {
  const data = getYearData(year);
  return data ? data.months : [];
}

export function getAllFileReferences(year: string, month: string): Record<string, string> {
  const data = getYearData(year);
  if (!data) return {};
  
  const prefix = `${month}_`;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.files)) {
    if (key.startsWith(prefix)) {
      const role = key.substring(prefix.length);
      result[role] = value;
    }
  }
  return result;
}