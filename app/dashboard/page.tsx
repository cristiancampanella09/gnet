"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSigners, saveSigners } from "@/lib/storage";
import { changePassword } from "@/lib/auth";
import {
  readPersonForRole,
  Person,
} from "@/lib/excel-reader";
import {
  buildAssignments,
  getFullName,
  getPhone,
  Assignments,
  RoleKey,
  ROLE_ORDER,
  ROLE_LABELS,
} from "@/lib/duty-assigner";
import { 
  getYears, 
  saveYears, 
  getYearData, 
  saveYearData,
  deleteYear,
  addMonthToYear,
  removeMonthFromYear,
  saveFileReference,
  removeFileReference,
  getFileReference,
  YearData 
} from "@/lib/yearly-store";
import { 
  requestRootPermission, 
  getRootHandle,
  isFileSystemAccessSupported,
  clearRootHandle,
  readFileContent
} from "@/lib/file-system";
import { downloadExcelFile } from "@/lib/excel-generator";

// MESI in italiano
const MESI_ITALIANI: Record<string, string> = {
  '01': 'Gennaio',
  '02': 'Febbraio',
  '03': 'Marzo',
  '04': 'Aprile',
  '05': 'Maggio',
  '06': 'Giugno',
  '07': 'Luglio',
  '08': 'Agosto',
  '09': 'Settembre',
  '10': 'Ottobre',
  '11': 'Novembre',
  '12': 'Dicembre'
};

const MESI_LISTA = [
  { code: '01', name: 'Gennaio' },
  { code: '02', name: 'Febbraio' },
  { code: '03', name: 'Marzo' },
  { code: '04', name: 'Aprile' },
  { code: '05', name: 'Maggio' },
  { code: '06', name: 'Giugno' },
  { code: '07', name: 'Luglio' },
  { code: '08', name: 'Agosto' },
  { code: '09', name: 'Settembre' },
  { code: '10', name: 'Ottobre' },
  { code: '11', name: 'Novembre' },
  { code: '12', name: 'Dicembre' }
];

// Stili
const S = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% 0%, #1a2a4a 0%, #080d14 60%)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    color: "white",
  } as React.CSSProperties,
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)",
    backdropFilter: "blur(20px)", position: "sticky" as const, top: 0, zIndex: 10,
    background: "rgba(8,13,20,0.8)",
  } as React.CSSProperties,
  card: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px", backdropFilter: "blur(20px)",
  } as React.CSSProperties,
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase", letterSpacing: "0.8px", margin: 0,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", boxSizing: "border-box",
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px", color: "white", fontSize: "14px", outline: "none",
};

interface MonthFileState {
  [role: string]: {
    fileName: string | null;
    loading: boolean;
    error: string | null;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  
  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  
  // File System
  const [isRootSet, setIsRootSet] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [rootLoading, setRootLoading] = useState(false);
  
  // Anni/Mesi
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [newYear, setNewYear] = useState<string>("");
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [monthFiles, setMonthFiles] = useState<MonthFileState>({});
  
  // Firmatari
  const [signers, setSigners] = useState<string[]>([]);
  const [selectedSigner, setSelectedSigner] = useState("");
  const [newSigner, setNewSigner] = useState("");
  
  // Data servizio
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  // Assegnazioni
  const [assignments, setAssignments] = useState<Assignments | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState(false);
  
  // Message
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ========== AUTH ==========
  useEffect(() => {
    const auth = sessionStorage.getItem("gnet_auth");
    if (!auth) {
      router.replace("/login");
      return;
    }
    setAuthorized(true);
    setAuthChecked(true);
    
    const saved = getSigners();
    setSigners(saved);
    setSelectedSigner(saved[0] || "");
    
    setIsSupported(isFileSystemAccessSupported());
    const rootSet = sessionStorage.getItem('gnet_root_set') === 'true';
    setIsRootSet(rootSet);
    
    const savedYears = getYears();
    setYears(savedYears);
    if (savedYears.length > 0) {
      setSelectedYear(savedYears[0]);
    }
  }, [router]);

  // ========== ANNI/MESI ==========
  useEffect(() => {
    if (selectedYear) {
      const data = getYearData(selectedYear);
      setYearData(data);
      if (data && selectedMonth && data.months.includes(selectedMonth)) {
        loadMonthFiles(selectedYear, selectedMonth);
      } else if (data && data.months.length > 0 && !selectedMonth) {
        setSelectedMonth(data.months[0]);
      }
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      loadMonthFiles(selectedYear, selectedMonth);
    }
  }, [selectedMonth]);

  const loadMonthFiles = useCallback(async (year: string, month: string) => {
    const states: MonthFileState = {};
    for (const role of ROLE_ORDER) {
      const fileName = getFileReference(year, month, role);
      states[role] = {
        fileName,
        loading: false,
        error: null
      };
    }
    setMonthFiles(states);
  }, []);

  // ========== ROOT ==========
  const handleSelectRoot = async () => {
    if (!isSupported) {
      setMessage({ text: "Usa Chrome per questa funzionalità.", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setRootLoading(true);
    const success = await requestRootPermission();
    setIsRootSet(success);
    setRootLoading(false);
    
    if (success) {
      setMessage({ text: "✅ Root selezionata!", type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ text: "❌ Errore selezione root.", type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleResetRoot = () => {
    clearRootHandle();
    setIsRootSet(false);
    setMessage({ text: "Root rimossa.", type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  // ========== GESTIONE ANNI/MESI ==========
  const handleAddYear = () => {
    if (!newYear.trim()) {
      setMessage({ text: "Inserisci un anno valido", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    const year = newYear.trim();
    if (years.includes(year)) {
      setMessage({ text: `L'anno ${year} esiste già`, type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    const newYears = [...years, year].sort();
    setYears(newYears);
    saveYears(newYears);
    setSelectedYear(year);
    setNewYear("");
    
    const newData: YearData = { year, months: [], files: {} };
    saveYearData(year, newData);
    setYearData(newData);
    
    setMessage({ text: `Anno ${year} aggiunto!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteYear = (year: string) => {
    if (!confirm(`Eliminare l'anno ${year}?`)) return;
    deleteYear(year);
    setYears(years.filter(y => y !== year));
    if (selectedYear === year) {
      setSelectedYear(years.length > 1 ? years.filter(y => y !== year)[0] : "");
    }
    setMessage({ text: `Anno ${year} eliminato`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddMonth = () => {
    if (!selectedYear || !yearData) {
      setMessage({ text: "Seleziona prima un anno", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    const available = MESI_LISTA.filter(m => !yearData.months.includes(m.code));
    if (available.length === 0) {
      setMessage({ text: "Tutti i mesi sono già stati aggiunti!", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    const newMonth = available[0].code;
    addMonthToYear(selectedYear, newMonth);
    const updatedData = getYearData(selectedYear);
    setYearData(updatedData);
    setSelectedMonth(newMonth);
    
    setMessage({ text: `Mese ${MESI_ITALIANI[newMonth]} aggiunto!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemoveMonth = (month: string) => {
    if (!selectedYear || !confirm(`Eliminare il mese ${MESI_ITALIANI[month]}?`)) return;
    removeMonthFromYear(selectedYear, month);
    const updatedData = getYearData(selectedYear);
    setYearData(updatedData);
    if (selectedMonth === month) {
      setSelectedMonth(updatedData?.months[0] || "");
    }
    setMessage({ text: `Mese ${MESI_ITALIANI[month]} eliminato`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  // ========== CARICAMENTO FILE ==========
  const handleFileUpload = async (role: RoleKey, file: File) => {
    if (!selectedYear || !selectedMonth) {
      setMessage({ text: "Seleziona anno e mese", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!isRootSet) {
      setMessage({ text: "Seleziona prima la root", type: 'error' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setMonthFiles(prev => ({
      ...prev,
      [role]: { ...prev[role], loading: true, error: null }
    }));

    try {
      const root = await getRootHandle();
      if (!root) {
        setIsRootSet(false);
        throw new Error("Root non disponibile");
      }

      const permission = await root.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        throw new Error("Permessi non concessi");
      }

      const yearDir = await root.getDirectoryHandle(selectedYear, { create: true });
      const monthName = MESI_ITALIANI[selectedMonth];
      const monthDir = await yearDir.getDirectoryHandle(monthName, { create: true });

      const fileHandle = await monthDir.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      saveFileReference(selectedYear, selectedMonth, role, file.name);

      setMonthFiles(prev => ({
        ...prev,
        [role]: { fileName: file.name, loading: false, error: null }
      }));

      setMessage({ text: `✅ ${file.name} caricato`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Errore:', error);
      setMonthFiles(prev => ({
        ...prev,
        [role]: { ...prev[role], loading: false, error: error instanceof Error ? error.message : "Errore" }
      }));
      setMessage({ text: `❌ ${error instanceof Error ? error.message : "Errore"}`, type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleRemoveFile = (role: RoleKey) => {
    if (!selectedYear || !selectedMonth) return;
    if (!confirm(`Rimuovere il file?`)) return;
    removeFileReference(selectedYear, selectedMonth, role);
    setMonthFiles(prev => ({
      ...prev,
      [role]: { fileName: null, loading: false, error: null }
    }));
    setMessage({ text: `File rimosso`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  // ========== CARICAMENTO ASSEGNAZIONI ==========
  const loadAssignments = useCallback(async (dateOverride?: string) => {
    const dateToUse = dateOverride || selectedDate;
    console.log(`🔍 loadAssignments: data="${dateToUse}", anno="${selectedYear}", mese="${selectedMonth}"`);
    
    if (!dateToUse || !selectedYear || !selectedMonth) {
      console.warn('⚠️ loadAssignments: dati mancanti');
      return;
    }
    
    setLoadingAssignments(true);
    
    try {
      const root = await getRootHandle();
      if (!root) {
        setIsRootSet(false);
        throw new Error("Root non disponibile");
      }

      const permission = await root.requestPermission({ mode: 'read' });
      if (permission !== 'granted') {
        throw new Error("Permessi non concessi");
      }

      const yearDir = await root.getDirectoryHandle(selectedYear);
      const monthName = MESI_ITALIANI[selectedMonth];
      const monthDir = await yearDir.getDirectoryHandle(monthName);

      const rolePeople: Partial<Record<RoleKey, Person | null>> = {};
      
      for (const role of ROLE_ORDER) {
        const fileName = getFileReference(selectedYear, selectedMonth, role);
        if (fileName) {
          try {
            const fileHandle = await monthDir.getFileHandle(fileName);
            const fileContent = await readFileContent(fileHandle);
            const file = new File([fileContent], fileName);
            
            console.log(`📂 Lettura ${ROLE_LABELS[role]} con data: ${dateToUse}`);
            const result = await readPersonForRole(file, dateToUse);
            rolePeople[role] = result.person;
            
          } catch (err) {
            console.error(`Errore lettura ${role}:`, err);
            rolePeople[role] = null;
          }
        } else {
          rolePeople[role] = null;
        }
      }

      setAssignments(buildAssignments(rolePeople));
      
    } catch (error) {
      console.error('Errore caricamento assegnazioni:', error);
      setMessage({ text: `❌ Errore caricamento dati`, type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    }
    setLoadingAssignments(false);
  }, [selectedDate, selectedYear, selectedMonth]);

  // ========== FIRMATARI ==========
  const handleAddSigner = () => {
    if (!newSigner.trim() || signers.includes(newSigner.trim())) return;
    const updated = [...signers, newSigner.trim()];
    setSigners(updated);
    saveSigners(updated);
    setSelectedSigner(newSigner.trim());
    setNewSigner("");
  };

  const handleRemoveSigner = () => {
    if (!selectedSigner) return;
    const updated = signers.filter((s) => s !== selectedSigner);
    setSigners(updated);
    saveSigners(updated);
    setSelectedSigner(updated[0] || "");
  };

  // ========== PASSWORD ==========
  async function handleChangePassword() {
    setPwMsg("");
    setPwError(false);
    if (!newPw || !confirmPw) {
      setPwError(true);
      setPwMsg("Compila tutti i campi.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(true);
      setPwMsg("Le password non coincidono.");
      return;
    }
    if (newPw.length < 4) {
      setPwError(true);
      setPwMsg("Minimo 4 caratteri.");
      return;
    }
    await changePassword(newPw);
    setPwMsg("Password aggiornata!");
    setPwError(false);
    setNewPw("");
    setConfirmPw("");
    setTimeout(() => { setShowSettings(false); setPwMsg(""); }, 1500);
  }

  // ========== DATA SERVIZIO ==========
  const handleDateChange = async (date: string) => {
    console.log(`📅 handleDateChange: ${date}`);
    setSelectedDate(date);
    if (date && selectedYear && selectedMonth) {
      console.log(`🔄 Carico assegnazioni per: ${date}`);
      await loadAssignments(date);
    }
  };

  // ========== GENERA EXCEL ==========
  const handleGenerateExcel = async () => {
    if (assignments && selectedDate && selectedSigner) {
      console.log(`📄 Generazione Excel per: ${selectedDate} con firmatario ${selectedSigner}`);
      downloadExcelFile(assignments, selectedDate, selectedSigner);
    } else {
      console.warn('⚠️ Dati mancanti per generare Excel');
    }
  };

  // ========== STATISTICHE ==========
  const loadedCount = Object.values(monthFiles).filter(f => f.fileName).length;
  const allFilesLoaded = loadedCount === ROLE_ORDER.length;

  if (!authChecked || !authorized) {
    return null;
  }

  return (
    <div style={S.page}>
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "400px",
        background: "radial-gradient(ellipse, rgba(99,179,237,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* NAV */}
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
          }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M8 24V14l8-6 8 6v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="13" y="18" width="6" height="6" rx="1" stroke="white" strokeWidth="2.5"/>
            </svg>
          </div>
          <span style={{ fontWeight: "700", fontSize: "17px", letterSpacing: "-0.3px" }}>GnET</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={handleSelectRoot} style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: isRootSet ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${isRootSet ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "8px",
            padding: "6px 14px",
            color: isRootSet ? "#34d399" : "#f87171",
            cursor: "pointer",
            fontSize: "13px",
          }}>
            <span>{isRootSet ? "✅" : "⚠️"}</span>
            {rootLoading ? "⏳..." : isRootSet ? "Root OK" : "Seleziona Root"}
          </button>
          {isRootSet && (
            <button onClick={handleResetRoot} style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              padding: "4px 10px",
              color: "#f87171",
              cursor: "pointer",
              fontSize: "11px",
            }}>
              ✕
            </button>
          )}
          <button onClick={() => setShowSettings(true)} style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </nav>

      <main style={{ padding: "40px 32px", maxWidth: "1400px", margin: "0 auto" }}>
        {message && (
          <div style={{
            padding: "12px 16px",
            marginBottom: "20px",
            background: message.type === 'success' ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${message.type === 'success' ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: "10px",
            color: message.type === 'success' ? "#34d399" : "#f87171",
            fontSize: "13px",
          }}>
            {message.text}
          </div>
        )}

        {/* LAYOUT A 2 COLONNE */}
        <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>

          {/* ===== COLONNA SINISTRA: GESTIONE ANNI/MESI/FILE ===== */}
          <div style={{ 
            ...S.card, 
            padding: "24px", 
            width: "320px", 
            flexShrink: 0,
            position: "sticky",
            top: "100px",
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>
              📁 Gestione File
            </h3>

            {/* Anno */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{ ...labelStyle, marginBottom: "6px" }}>Anno</p>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="Es. 2025"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddYear()}
                  style={{ ...inputStyle, flex: 1, padding: "8px 10px", fontSize: "13px" }}
                  maxLength={4}
                />
                <button onClick={handleAddYear} style={{
                  padding: "0 12px",
                  background: "rgba(59,130,246,0.2)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: "8px",
                  color: "#3b82f6",
                  fontSize: "16px",
                  cursor: "pointer",
                }}>+</button>
              </div>
            </div>

            {/* Selezione Anno */}
            <div style={{ marginBottom: "12px" }}>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ ...inputStyle, padding: "8px 10px", fontSize: "13px" }}
              >
                <option value="">Seleziona...</option>
                {years.map((year) => (
                  <option key={year} value={year} style={{ background: "#1a2a4a" }}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Mesi */}
            {selectedYear && yearData && (
              <>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "8px"
                }}>
                  <p style={{ ...labelStyle }}>Mesi ({yearData.months.length}/12)</p>
                  <button onClick={handleAddMonth} style={{
                    padding: "2px 10px",
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "6px",
                    color: "#34d399",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}>
                    + Aggiungi
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "12px" }}>
                  {yearData.months.map((month) => {
                    const fileCount = Object.keys(yearData.files).filter(key => key.startsWith(`${month}_`)).length;
                    const monthName = MESI_ITALIANI[month] || month;
                    return (
                      <div key={month} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        background: selectedMonth === month ? "rgba(59,130,246,0.15)" : "transparent",
                        borderRadius: "6px",
                        border: selectedMonth === month ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onClick={() => setSelectedMonth(month)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={(e) => {
                        if (selectedMonth !== month) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: "600", flex: 1 }}>
                          {monthName}
                          {fileCount > 0 && (
                            <span style={{ fontSize: "10px", color: "#34d399", marginLeft: "4px" }}>
                              ({fileCount})
                            </span>
                          )}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveMonth(month); }}
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "4px",
                            color: "#f87171",
                            cursor: "pointer",
                            padding: "1px 5px",
                            fontSize: "11px",
                            opacity: 0.6,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {selectedYear && (
                  <button onClick={() => handleDeleteYear(selectedYear)} style={{
                    width: "100%",
                    padding: "6px",
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "6px",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}>
                    Elimina anno {selectedYear}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ===== COLONNA DESTRA: CONTENUTO PRINCIPALE ===== */}
          <div style={{ flex: 1 }}>

            {/* SEZIONE: File per mese */}
            {selectedYear && selectedMonth ? (
              <div style={{ ...S.card, padding: "24px", marginBottom: "20px" }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "16px"
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                      {MESI_ITALIANI[selectedMonth] || selectedMonth} - {selectedYear}
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "2px" }}>
                      {loadedCount}/{ROLE_ORDER.length} file caricati
                    </p>
                  </div>
                  {!isRootSet && (
                    <span style={{ color: "#f87171", fontSize: "12px" }}>
                      ⚠️ Root non impostata
                    </span>
                  )}
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "10px",
                }}>
                  {ROLE_ORDER.map((role) => {
                    const state = monthFiles[role];
                    const isLoaded = state?.fileName;
                    const isLoading = state?.loading;
                    const error = state?.error;

                    return (
                      <div key={role} style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${isLoaded ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: "10px",
                        padding: "12px",
                      }}>
                        <p style={{ 
                          ...labelStyle, 
                          marginBottom: "6px",
                          fontSize: "10px",
                          color: isLoaded ? "#34d399" : "rgba(255,255,255,0.5)"
                        }}>
                          {ROLE_LABELS[role]}
                        </p>

                        {isLoaded ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "white", wordBreak: "break-all", flex: 1 }}>
                              📄 {state.fileName}
                            </span>
                            <button
                              onClick={() => handleRemoveFile(role)}
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                borderRadius: "4px",
                                color: "#f87171",
                                cursor: "pointer",
                                padding: "2px 6px",
                                fontSize: "11px",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label style={{
                            display: "block",
                            padding: "8px",
                            border: "2px dashed rgba(255,255,255,0.1)",
                            borderRadius: "6px",
                            cursor: isRootSet ? "pointer" : "not-allowed",
                            textAlign: "center",
                            opacity: isRootSet ? 1 : 0.4,
                          }}>
                            <input
                              type="file"
                              accept=".xlsx,.xls,.xlsm"
                              style={{ display: "none" }}
                              disabled={!isRootSet}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && isRootSet) {
                                  handleFileUpload(role, file);
                                }
                                e.target.value = '';
                              }}
                            />
                            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                              {isLoading ? "⏳..." : isRootSet ? "📤 Carica" : "🔒"}
                            </span>
                            {error && (
                              <div style={{ color: "#f87171", fontSize: "10px", marginTop: "2px" }}>
                                {error}
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ ...S.card, padding: "40px", textAlign: "center", marginBottom: "20px" }}>
                <p style={{ color: "rgba(255,255,255,0.4)" }}>
                  {!selectedYear ? "Seleziona un anno" : "Seleziona un mese"} a sinistra
                </p>
              </div>
            )}

            {/* SEZIONE: Data Servizio */}
            <div style={{ ...S.card, padding: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <p style={{ ...labelStyle, margin: 0 }}>Data servizio</p>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: selectedDate ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  padding: "4px 10px",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={selectedDate ? "#60a5fa" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px" }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "500",
                      outline: "none",
                      colorScheme: "dark",
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  />
                </div>
                {loadingAssignments && (
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>⏳ Caricamento...</span>
                )}
                {selectedDate && (
                  <span style={{ 
                    fontSize: "11px", 
                    color: "rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}>
                    {new Date(selectedDate).toLocaleDateString('it-IT')}
                  </span>
                )}
              </div>
            </div>

            {/* SEZIONE: Anteprima Assegnazioni */}
            {assignments && selectedDate && (
              <div style={{ ...S.card, padding: "24px", marginBottom: "20px" }}>
                <p style={{ ...labelStyle, marginBottom: "16px" }}>
                  Assegnazioni per il {new Date(selectedDate).toLocaleDateString('it-IT')}
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}>
                  {ROLE_ORDER.map((role) => {
                    const person = assignments[role];
                    return (
                      <div key={role} style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "10px",
                        padding: "12px 14px",
                      }}>
                        <p style={{ ...labelStyle, marginBottom: "4px", fontSize: "10px" }}>
                          {ROLE_LABELS[role]}
                        </p>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
                          {getFullName(person)}
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                          {getPhone(person)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEZIONE: Firmatario */}
            <div style={{ ...S.card, padding: "20px", marginBottom: "20px" }}>
              <div>
                <p style={{ ...labelStyle, marginBottom: "6px" }}>Firmatario</p>
                <select 
                  value={selectedSigner} 
                  onChange={(e) => setSelectedSigner(e.target.value)}
                  style={{ ...inputStyle, padding: "8px 10px", fontSize: "13px" }}
                >
                  {signers.map((s) => (
                    <option key={s} value={s} style={{ background: "#1a2a4a" }}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: "12px" }}>
                <p style={{ ...labelStyle, marginBottom: "6px" }}>Gestisci firmatari</p>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input 
                    placeholder="Nuovo firmatario…" 
                    value={newSigner}
                    onChange={(e) => setNewSigner(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSigner()}
                    style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: "13px" }} 
                  />
                  <button onClick={handleAddSigner} style={{
                    padding: "0 12px",
                    background: "rgba(59,130,246,0.2)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: "8px",
                    color: "#3b82f6",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}>+</button>
                  <button onClick={handleRemoveSigner} style={{
                    padding: "0 12px",
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "8px",
                    color: "#f87171",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}>−</button>
                </div>
              </div>
            </div>

            {/* Pulsante Genera */}
            <button 
              onClick={handleGenerateExcel}
              disabled={!selectedDate || !assignments || loadingAssignments} 
              style={{
                width: "100%", 
                padding: "14px",
                background: selectedDate && assignments && !loadingAssignments
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                  : "rgba(16,185,129,0.2)",
                border: "none", 
                borderRadius: "12px", 
                color: "white",
                fontSize: "15px", 
                fontWeight: "700", 
                cursor: selectedDate && assignments && !loadingAssignments ? "pointer" : "not-allowed",
                boxShadow: selectedDate && assignments && !loadingAssignments 
                  ? "0 4px 16px rgba(16,185,129,0.3)" 
                  : "none",
                transition: "all 0.2s",
              }}
            >
              {loadingAssignments ? "⏳ Caricamento..." : "📄 Genera Documenti Excel"}
            </button>
            <p style={{ textAlign: "center", color: "rgba(59,130,246,0.5)", fontSize: "11px", marginTop: "8px" }}>
              {!selectedDate && "Seleziona una data"}
              {selectedDate && !assignments && !loadingAssignments && ` Carica tutti i file per il mese`}
              {selectedDate && assignments && !loadingAssignments && " Pronto per generare i documenti"}
            </p>
          </div>
        </div>
      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div style={{
          position: "fixed", 
          inset: 0, 
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)", 
          display: "flex", 
          alignItems: "center",
          justifyContent: "center", 
          zIndex: 100,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div style={{
            ...S.card, 
            padding: "32px", 
            width: "100%", 
            maxWidth: "380px",
            margin: "24px", 
            boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              marginBottom: "24px" 
            }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Impostazioni</h3>
              <button onClick={() => setShowSettings(false)} style={{
                background: "rgba(255,255,255,0.07)", 
                border: "none", 
                borderRadius: "8px",
                color: "rgba(255,255,255,0.5)", 
                fontSize: "18px", 
                cursor: "pointer",
                width: "32px", 
                height: "32px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
              }}>×</button>
            </div>
            <p style={{ ...labelStyle, marginBottom: "16px" }}>Cambia password</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input 
                type="password" 
                placeholder="Nuova password" 
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)} 
                style={inputStyle} 
              />
              <input 
                type="password" 
                placeholder="Conferma password" 
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                style={inputStyle} 
              />
              {pwMsg && (
                <p style={{ 
                  color: pwError ? "#f87171" : "#34d399", 
                  fontSize: "13px", 
                  margin: 0, 
                  textAlign: "center" 
                }}>
                  {pwMsg}
                </p>
              )}
              <button onClick={handleChangePassword} style={{
                padding: "13px", 
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none", 
                borderRadius: "10px", 
                color: "white",
                fontSize: "14px", 
                fontWeight: "600", 
                cursor: "pointer", 
                marginTop: "4px",
              }}>
                Aggiorna password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}