"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  isFileSystemAccessSupported
} from "@/lib/file-system";
import { 
  ROLE_ORDER, 
  ROLE_LABELS, 
  RoleKey 
} from "@/lib/duty-assigner";

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

export default function FileManagementPage() {
  const router = useRouter();
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [newYear, setNewYear] = useState<string>("");
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [monthFiles, setMonthFiles] = useState<MonthFileState>({});
  const [isRootSet, setIsRootSet] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Carica lista anni
  useEffect(() => {
    const savedYears = getYears();
    setYears(savedYears);
    if (savedYears.length > 0 && !selectedYear) {
      setSelectedYear(savedYears[0]);
    }
    setIsSupported(isFileSystemAccessSupported());
  }, []);

  // Carica dati anno selezionato
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

  // Carica file quando cambia il mese
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

  const handleSelectRoot = async () => {
    if (!isSupported) {
      setMessage({ text: "Il tuo browser non supporta la selezione di cartelle. Usa Chrome.", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const success = await requestRootPermission();
    setIsRootSet(success);
    if (success) {
      setMessage({ text: "Cartella root selezionata con successo!", type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ text: "Errore nella selezione della cartella", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

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
    
    const newData: YearData = {
      year,
      months: [],
      files: {}
    };
    saveYearData(year, newData);
    setYearData(newData);
    
    setMessage({ text: `Anno ${year} aggiunto!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteYear = (year: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'anno ${year}?`)) return;
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
    
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const available = months.filter(m => !yearData.months.includes(m));
    if (available.length === 0) {
      setMessage({ text: "Tutti i mesi sono già stati aggiunti!", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    const newMonth = available[0];
    addMonthToYear(selectedYear, newMonth);
    
    const updatedData = getYearData(selectedYear);
    setYearData(updatedData);
    setSelectedMonth(newMonth);
    
    setMessage({ text: `Mese ${newMonth} aggiunto!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemoveMonth = (month: string) => {
    if (!selectedYear || !confirm(`Sei sicuro di voler eliminare il mese ${month}?`)) return;
    removeMonthFromYear(selectedYear, month);
    
    const updatedData = getYearData(selectedYear);
    setYearData(updatedData);
    if (selectedMonth === month) {
      setSelectedMonth(updatedData?.months[0] || "");
    }
    
    setMessage({ text: `Mese ${month} eliminato`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFileUpload = async (role: RoleKey, file: File) => {
    if (!selectedYear || !selectedMonth) {
      setMessage({ text: "Seleziona anno e mese", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!isRootSet) {
      setMessage({ text: "Seleziona prima la cartella root", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setMonthFiles(prev => ({
      ...prev,
      [role]: { ...prev[role], loading: true, error: null }
    }));

    try {
      const root = await getRootHandle();
      if (!root) {
        throw new Error("Cartella root non disponibile");
      }

      const yearDir = await root.getDirectoryHandle(selectedYear, { create: true });
      const monthDir = await yearDir.getDirectoryHandle(`mese_${selectedMonth}`, { create: true });

      const fileHandle = await monthDir.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      saveFileReference(selectedYear, selectedMonth, role, file.name);

      setMonthFiles(prev => ({
        ...prev,
        [role]: { fileName: file.name, loading: false, error: null }
      }));

      setMessage({ text: `File ${file.name} caricato per ${ROLE_LABELS[role]}`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error('Errore caricamento file:', error);
      setMonthFiles(prev => ({
        ...prev,
        [role]: { ...prev[role], loading: false, error: "Errore caricamento" }
      }));
      setMessage({ text: "Errore nel caricamento del file", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemoveFile = (role: RoleKey) => {
    if (!selectedYear || !selectedMonth) return;
    if (!confirm(`Rimuovere il file per ${ROLE_LABELS[role]}?`)) return;

    removeFileReference(selectedYear, selectedMonth, role);
    setMonthFiles(prev => ({
      ...prev,
      [role]: { fileName: null, loading: false, error: null }
    }));

    setMessage({ text: `File rimosso per ${ROLE_LABELS[role]}`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!isSupported) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, padding: "60px 40px", maxWidth: "600px", margin: "100px auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>⚠️ Browser non supportato</h2>
          <p style={{ color: "rgba(255,255,255,0.6)" }}>
            Questa funzionalità richiede il File System Access API, disponibile su Chrome.
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>
            Per favore, usa <strong>Google Chrome</strong> per questa applicazione.
          </p>
          <button 
            onClick={() => router.push("/dashboard")}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: "10px",
              color: "#60a5fa",
              cursor: "pointer",
            }}
          >
            Torna al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/dashboard")} style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "6px 12px",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontSize: "13px",
          }}>
            ← Torna al dashboard
          </button>
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
          <span style={{ fontWeight: "700", fontSize: "17px", letterSpacing: "-0.3px" }}>Gestione File</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ 
            fontSize: "11px", 
            color: isRootSet ? "#34d399" : "#f87171",
            background: isRootSet ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            padding: "4px 12px",
            borderRadius: "20px",
            border: `1px solid ${isRootSet ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`
          }}>
            {isRootSet ? "✅ Root impostata" : "⚠️ Root non impostata"}
          </span>
          <button onClick={handleSelectRoot} style={{
            background: "rgba(59,130,246,0.2)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: "8px",
            padding: "6px 14px",
            color: "#60a5fa",
            cursor: "pointer",
            fontSize: "13px",
          }}>
            Seleziona cartella
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

        <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
          {/* Colonna sinistra - Anni/Mesi */}
          <div style={{ 
            ...S.card, 
            padding: "24px", 
            width: "280px", 
            flexShrink: 0,
            position: "sticky",
            top: "100px",
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto"
          }}>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ ...labelStyle, marginBottom: "10px" }}>Anno</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Es. 2025"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddYear()}
                  style={{ ...inputStyle, flex: 1 }}
                  maxLength={4}
                />
                <button onClick={handleAddYear} style={{
                  padding: "0 14px",
                  background: "rgba(59,130,246,0.2)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: "10px",
                  color: "#3b82f6",
                  fontSize: "18px",
                  cursor: "pointer",
                }}>+</button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ ...labelStyle, marginBottom: "8px" }}>Seleziona Anno</p>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ ...inputStyle }}
              >
                <option value="">Seleziona...</option>
                {years.map((year) => (
                  <option key={year} value={year} style={{ background: "#1a2a4a" }}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {selectedYear && yearData && (
              <>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginBottom: "12px"
                }}>
                  <p style={{ ...labelStyle }}>Mesi ({yearData.months.length}/12)</p>
                  <button onClick={handleAddMonth} style={{
                    padding: "4px 12px",
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "6px",
                    color: "#34d399",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}>
                    + Aggiungi mese
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {yearData.months.map((month) => {
                    const fileCount = Object.keys(yearData.files).filter(key => key.startsWith(`${month}_`)).length;
                    return (
                      <div key={month} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        background: selectedMonth === month ? "rgba(59,130,246,0.15)" : "transparent",
                        borderRadius: "8px",
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
                        <span style={{ fontSize: "14px", fontWeight: "600", flex: 1 }}>
                          {month}
                          {fileCount > 0 && (
                            <span style={{ 
                              fontSize: "10px", 
                              color: "#34d399", 
                              marginLeft: "6px",
                              fontWeight: "400"
                            }}>
                              ({fileCount} file)
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
                            padding: "2px 6px",
                            fontSize: "12px",
                            opacity: 0.6,
                            transition: "opacity 0.2s",
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
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <button onClick={() => handleDeleteYear(selectedYear)} style={{
                      width: "100%",
                      padding: "8px",
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "8px",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}>
                      Elimina anno {selectedYear}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Colonna destra - Gestione file per mese */}
          <div style={{ flex: 1 }}>
            {!selectedYear || !selectedMonth ? (
              <div style={{ ...S.card, padding: "40px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.5)" }}>
                  {!selectedYear ? "Seleziona un anno" : "Seleziona un mese"} per gestire i file
                </p>
              </div>
            ) : (
              <>
                <div style={{ ...S.card, padding: "28px", marginBottom: "20px" }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "20px"
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
                        Mese {selectedMonth} - {selectedYear}
                      </h3>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginTop: "4px" }}>
                        Carica i file Excel per ogni categoria
                      </p>
                    </div>
                    <span style={{ 
                      fontSize: "12px", 
                      color: "rgba(255,255,255,0.4)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "4px 12px",
                      borderRadius: "20px"
                    }}>
                      {Object.values(monthFiles).filter(f => f.fileName).length}/{ROLE_ORDER.length} file caricati
                    </span>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "16px",
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
                          borderRadius: "12px",
                          padding: "16px",
                          transition: "all 0.2s",
                        }}>
                          <p style={{ 
                            ...labelStyle, 
                            marginBottom: "8px",
                            color: isLoaded ? "#34d399" : "rgba(255,255,255,0.6)"
                          }}>
                            {ROLE_LABELS[role]}
                          </p>

                          {isLoaded ? (
                            <div>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                              }}>
                                <span style={{ 
                                  fontSize: "13px", 
                                  color: "white",
                                  fontWeight: "500",
                                  wordBreak: "break-all",
                                }}>
                                  📄 {state.fileName}
                                </span>
                                <button
                                  onClick={() => handleRemoveFile(role)}
                                  style={{
                                    background: "rgba(239,68,68,0.15)",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                    borderRadius: "6px",
                                    color: "#f87171",
                                    cursor: "pointer",
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                  }}
                                >
                                  Rimuovi
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label style={{
                              display: "block",
                              padding: "12px",
                              border: "2px dashed rgba(255,255,255,0.15)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              textAlign: "center",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
                            >
                              <input
                                type="file"
                                accept=".xlsx,.xls,.xlsm"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(role, file);
                                }}
                              />
                              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                                {isLoading ? "⏳ Caricamento..." : "📤 Clicca per caricare"}
                              </span>
                              {error && (
                                <div style={{ color: "#f87171", fontSize: "11px", marginTop: "4px" }}>
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

                <div style={{ ...S.card, padding: "20px" }}>
                  <p style={{ ...labelStyle, marginBottom: "12px" }}>Riepilogo mensile</p>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "8px",
                  }}>
                    {ROLE_ORDER.map((role) => {
                      const state = monthFiles[role];
                      return (
                        <div key={role} style={{
                          padding: "8px 12px",
                          background: state?.fileName ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}>
                          <span style={{ fontSize: "16px" }}>
                            {state?.fileName ? "✅" : "⬜"}
                          </span>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                            {ROLE_LABELS[role].substring(0, 20)}
                            {ROLE_LABELS[role].length > 20 ? "..." : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}