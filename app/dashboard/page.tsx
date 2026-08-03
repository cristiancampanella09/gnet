"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSigners, saveSigners } from "@/lib/storage";
import { changePassword } from "@/lib/auth";
import {
  readPersonForRole,
  readAllGuardStatsForRole,
  Person,
  GuardStats,
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

interface RoleState {
  file: File | null;
  person: Person | null;
  allStats: GuardStats[];
  error: string;
  loading: boolean;
}

const EMPTY_ROLE_STATE: RoleState = { file: null, person: null, allStats: [], error: "", loading: false };

function makeEmptyRoleStates(): Record<RoleKey, RoleState> {
  const state = {} as Record<RoleKey, RoleState>;
  for (const role of ROLE_ORDER) state[role] = { ...EMPTY_ROLE_STATE };
  return state;
}

export default function DashboardPage() {
  const router = useRouter();
  const [signers, setSigners] = useState<string[]>([]);
  const [selectedSigner, setSelectedSigner] = useState("");
  const [newSigner, setNewSigner] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [roleStates, setRoleStates] = useState<Record<RoleKey, RoleState>>(makeEmptyRoleStates());
  const [draggingRole, setDraggingRole] = useState<RoleKey | null>(null);

  // Ricerca personale
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuard, setSelectedGuard] = useState<GuardStats | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

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
  }, [router]);

  const processRoleFile = useCallback(async (role: RoleKey, file: File, date: string) => {
    setRoleStates((prev) => ({
      ...prev,
      [role]: { ...prev[role], file, loading: true, error: "", person: null, allStats: [] },
    }));
    try {
      const monthNum = date ? new Date(date + "T00:00:00").getMonth() + 1 : 1;
      const [person, allStats] = await Promise.all([
        readPersonForRole(file, date),
        readAllGuardStatsForRole(file, monthNum, ROLE_LABELS[role]),
      ]);

      setRoleStates((prev) => ({
        ...prev,
        [role]: { ...prev[role], file, loading: false, error: "", person, allStats },
      }));
    } catch (err) {
      setRoleStates((prev) => ({
        ...prev,
        [role]: {
          ...prev[role],
          file,
          loading: false,
          person: null,
          allStats: [],
          error: err instanceof Error ? err.message : "Errore nella lettura del file.",
        },
      }));
    }
  }, []);

  function handleRoleFileSelect(role: RoleKey, file: File) {
    if (selectedDate) {
      processRoleFile(role, file, selectedDate);
    } else {
      setRoleStates((prev) => ({
        ...prev,
        [role]: { file, person: null, allStats: [], error: "", loading: false },
      }));
    }
  }

  function handleRoleFileRemove(role: RoleKey) {
    setRoleStates((prev) => ({ ...prev, [role]: { ...EMPTY_ROLE_STATE } }));
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    for (const role of ROLE_ORDER) {
      const file = roleStates[role].file;
      if (file) processRoleFile(role, file, date);
    }
  }

  function handleRoleFileInput(role: RoleKey, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleRoleFileSelect(role, file);
  }

  function handleRoleDrop(role: RoleKey, e: React.DragEvent) {
    e.preventDefault();
    setDraggingRole(null);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".xlsm"))) {
      handleRoleFileSelect(role, file);
    } else {
      setRoleStates((prev) => ({
        ...prev,
        [role]: { ...prev[role], error: "Carica solo file .xlsx o .xls" },
      }));
    }
  }

  function handleAddSigner() {
    if (!newSigner.trim() || signers.includes(newSigner.trim())) return;
    const updated = [...signers, newSigner.trim()];
    setSigners(updated); saveSigners(updated);
    setSelectedSigner(newSigner.trim()); setNewSigner("");
  }

  function handleRemoveSigner() {
    if (!selectedSigner) return;
    const updated = signers.filter((s) => s !== selectedSigner);
    setSigners(updated); saveSigners(updated);
    setSelectedSigner(updated[0] || "");
  }

  async function handleChangePassword() {
    setPwMsg(""); setPwError(false);
    if (!newPw || !confirmPw) { setPwError(true); setPwMsg("Compila tutti i campi."); return; }
    if (newPw !== confirmPw) { setPwError(true); setPwMsg("Le password non coincidono."); return; }
    if (newPw.length < 4) { setPwError(true); setPwMsg("Minimo 4 caratteri."); return; }
    await changePassword(newPw);
    setPwMsg("Password aggiornata!"); setPwError(false);
    setNewPw(""); setConfirmPw("");
    setTimeout(() => { setShowSettings(false); setPwMsg(""); }, 1500);
  }

  const allFilesLoaded = ROLE_ORDER.every(
    (role) => roleStates[role].file && !roleStates[role].loading && !roleStates[role].error
  );
  const anyLoading = ROLE_ORDER.some((role) => roleStates[role].loading);

  const assignments: Assignments | null = useMemo(() => {
    if (!allFilesLoaded) return null;
    const rolePeople: Partial<Record<RoleKey, Person | null>> = {};
    for (const role of ROLE_ORDER) rolePeople[role] = roleStates[role].person;
    return buildAssignments(rolePeople);
  }, [allFilesLoaded, roleStates]);

  const loadedCount = ROLE_ORDER.filter((role) => roleStates[role].file && !roleStates[role].error).length;

  const fullGuardDatabase = useMemo(() => {
    const list: GuardStats[] = [];
    for (const role of ROLE_ORDER) {
      list.push(...roleStates[role].allStats);
    }
    return list;
  }, [roleStates]);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return fullGuardDatabase.filter((g) => {
      const name = `${g.cognome} ${g.nome}`.toLowerCase();
      return name.includes(q);
    }).slice(0, 8);
  }, [fullGuardDatabase, searchQuery]);
  
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>Pannello di controllo</span>
          <button onClick={() => setShowSettings(true)} style={{
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px", padding: "8px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </nav>

      <main style={{ padding: "40px 32px", maxWidth: "1040px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", margin: 0 }}>Genera Documenti</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginTop: "6px" }}>
            Seleziona la data del servizio e carica il file per ciascuna categoria
          </p>
        </div>

        {/* 1. File per categoria + Data Servizio integrata */}
        <div style={{ ...S.card, padding: "28px", marginBottom: "20px" }}>
          
          {/* Header Widget + DatePicker Curato */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            paddingBottom: "20px",
            marginBottom: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div>
              <p style={{ ...labelStyle, margin: 0 }}>File turni per categoria</p>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                {loadedCount}/{ROLE_ORDER.length} file caricati
              </span>
            </div>

            {/* Selettore Data Servizio Ridisegnato */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>
                Data servizio:
              </span>
              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.06)",
                border: selectedDate ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "6px 12px",
                boxShadow: selectedDate ? "0 0 15px rgba(59,130,246,0.15)" : "none",
                transition: "all 0.2s",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedDate ? "#60a5fa" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
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
                    fontWeight: "600",
                    outline: "none",
                    colorScheme: "dark",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>
          </div>

          {!selectedDate && (
            <div style={{
              marginBottom: "20px", padding: "12px 16px",
              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "10px", color: "#93c5fd", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px"
            }}>
              <span>ℹ️</span> Seleziona una data per estrarre la persona di turno dai file Excel.
            </div>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "14px",
          }}>
            {ROLE_ORDER.map((role) => {
              const rs = roleStates[role];
              const isDragging = draggingRole === role;
              const borderColor = isDragging
                ? "rgba(59,130,246,0.7)"
                : rs.error
                ? "rgba(239,68,68,0.5)"
                : rs.file
                ? "rgba(16,185,129,0.4)"
                : "rgba(255,255,255,0.12)";
              const bg = isDragging
                ? "rgba(59,130,246,0.08)"
                : rs.error
                ? "rgba(239,68,68,0.06)"
                : rs.file
                ? "rgba(16,185,129,0.06)"
                : "transparent";

              return (
                <div key={role} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.6)" }}>
                    {ROLE_LABELS[role]}
                  </p>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDraggingRole(role); }}
                    onDragLeave={() => setDraggingRole((r) => (r === role ? null : r))}
                    onDrop={(e) => handleRoleDrop(role, e)}
                    style={{
                      position: "relative", height: "110px",
                      border: `2px dashed ${borderColor}`,
                      borderRadius: "12px", transition: "all 0.2s",
                      background: bg,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {rs.file && (
                      <button onClick={() => handleRoleFileRemove(role)} style={{
                        position: "absolute", top: "8px", right: "8px",
                        background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "6px", color: "#f87171", width: "20px", height: "20px",
                        cursor: "pointer", fontSize: "12px", display: "flex",
                        alignItems: "center", justifyContent: "center", padding: 0,
                      }}>×</button>
                    )}
                    <label style={{ cursor: "pointer", textAlign: "center", width: "100%", padding: "0 10px" }}>
                      <input type="file" accept=".xlsx,.xls,.xlsm" style={{ display: "none" }}
                        onChange={(e) => handleRoleFileInput(role, e)} />
                      {rs.loading ? (
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Verifica…</span>
                      ) : rs.error ? (
                        <>
                          <span style={{ color: "#f87171", fontSize: "12px", fontWeight: "600" }}>File non valido</span>
                          <br />
                          <span style={{ color: "rgba(248,113,113,0.7)", fontSize: "11px" }}>{rs.error}</span>
                        </>
                      ) : rs.file ? (
                        <>
                          <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "600", wordBreak: "break-all" }}>
                            📄 {rs.file.name}
                          </span>
                          <br />
                          {rs.person ? (
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                              Turno: {getFullName(rs.person)}
                            </span>
                          ) : (
                            <span style={{ color: "#eab308", fontSize: "11px" }}>
                              Nessuno di turno
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{ color: isDragging ? "#3b82f6" : "rgba(255,255,255,0.45)", fontSize: "13px", fontWeight: "500" }}>
                            {isDragging ? "Rilascia qui!" : "Carica file"}
                          </span>
                          <br />
                          <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px" }}>.xlsx / .xls</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Ricerca Cognome Nome + KPI Cards */}
        <div style={{ ...S.card, padding: "28px", marginBottom: "20px", position: "relative", zIndex: 30 }}>
          <p style={{ ...labelStyle, marginBottom: "12px" }}>Ricerca numero guardie nel mese</p>
          
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Inizia a digitare il cognome o nome..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedGuard(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              style={inputStyle}
            />

            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                marginTop: "6px", background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", overflow: "hidden",
              }}>
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedGuard(item);
                      setSearchQuery(`${item.cognome} ${item.nome}`.trim());
                      setShowSuggestions(false);
                    }}
                    style={{
                      padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(59,130,246,0.15)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>
                        {item.cognome} {item.nome}
                      </span>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginLeft: "10px" }}>
                        ({item.roleLabel})
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", background: "rgba(59,130,246,0.2)", color: "#60a5fa", padding: "4px 8px", borderRadius: "6px" }}>
                      {item.totalGuardie} guardie
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedGuard && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px", marginTop: "20px",
            }}>
              <div style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(29,78,216,0.15))",
                border: "1px solid rgba(59,130,246,0.3)", borderRadius: "14px", padding: "18px",
              }}>
                <p style={{ ...labelStyle, color: "#93c5fd" }}>Guardie Mese</p>
                <div style={{ fontSize: "36px", fontWeight: "800", color: "white", marginTop: "4px" }}>
                  {selectedGuard.totalGuardie}
                </div>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Turni 'P' trovati</span>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px", padding: "18px",
              }}>
                <p style={{ ...labelStyle }}>Nominativo</p>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "white", marginTop: "6px" }}>
                  {selectedGuard.cognome} {selectedGuard.nome}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  Ruolo: {selectedGuard.roleLabel}
                </div>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px", padding: "18px",
              }}>
                <p style={{ ...labelStyle }}>Categoria</p>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#34d399", marginTop: "6px" }}>
                  {selectedGuard.cat || "N/D"}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  Estratta dalla Colonna 3
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Firmatario (senza il vecchio campo Data) */}
        <div style={{ ...S.card, padding: "28px", marginBottom: "20px" }}>
          <div>
            <p style={{ ...labelStyle, marginBottom: "10px" }}>Firmatario</p>
            <select value={selectedSigner} onChange={(e) => setSelectedSigner(e.target.value)}
              style={{ ...inputStyle, appearance: "none" as const }}>
              {signers.map((s) => <option key={s} value={s} style={{ background: "#1a2a4a" }}>{s}</option>)}
            </select>
          </div>
          
          <div style={{ marginTop: "20px" }}>
            <p style={{ ...labelStyle, marginBottom: "10px" }}>Gestisci firmatari</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Nuovo firmatario…" value={newSigner}
                onChange={(e) => setNewSigner(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSigner()}
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleAddSigner} style={{
                padding: "0 14px", background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: "10px", color: "#3b82f6", fontSize: "18px", cursor: "pointer",
              }}>+</button>
              <button onClick={handleRemoveSigner} style={{
                padding: "0 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "10px", color: "#f87171", fontSize: "18px", cursor: "pointer",
              }}>−</button>
            </div>
          </div>
        </div>

        {/* 4. Anteprima assegnazioni */}
        {assignments && (
          <div style={{ ...S.card, padding: "28px", marginTop: "20px" }}>
            <p style={{ ...labelStyle, marginBottom: "20px" }}>Anteprima assegnazioni</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {ROLE_ORDER.map((role) => (
                <div key={role} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "12px", padding: "14px 16px",
                }}>
                  <p style={{ ...labelStyle, marginBottom: "6px" }}>{ROLE_LABELS[role]}</p>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>{getFullName(assignments[role])}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{getPhone(assignments[role])}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pulsante genera documenti */}
        <div style={{ marginTop: "24px" }}>
          <button disabled={!assignments || anyLoading} style={{
            width: "100%", padding: "16px",
            background: assignments ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(16,185,129,0.3)",
            border: "none", borderRadius: "14px", color: "white",
            fontSize: "16px", fontWeight: "700", cursor: assignments ? "pointer" : "not-allowed",
            boxShadow: assignments ? "0 8px 24px rgba(16,185,129,0.25)" : "none", transition: "all 0.2s",
          }}>
            Genera Documenti Excel
          </button>
          <p style={{ textAlign: "center", color: "rgba(59,130,246,0.7)", fontSize: "12px", marginTop: "16px", fontWeight: "500" }}>
            SE CI SONO CAMBI DI GUARDIA MODIFICA IL FILE A MONTE
          </p>
        </div>
      </main>

      {showSettings && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div style={{
            ...S.card, padding: "32px", width: "100%", maxWidth: "380px",
            margin: "24px", boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Impostazioni</h3>
              <button onClick={() => setShowSettings(false)} style={{
                background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "8px",
                color: "rgba(255,255,255,0.5)", fontSize: "18px", cursor: "pointer",
                width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>
            <p style={{ ...labelStyle, marginBottom: "16px" }}>Cambia password</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="password" placeholder="Nuova password" value={newPw}
                onChange={(e) => setNewPw(e.target.value)} style={inputStyle} />
              <input type="password" placeholder="Conferma password" value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                style={inputStyle} />
              {pwMsg && (
                <p style={{ color: pwError ? "#f87171" : "#34d399", fontSize: "13px", margin: 0, textAlign: "center" }}>
                  {pwMsg}
                </p>
              )}
              <button onClick={handleChangePassword} style={{
                padding: "13px", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none", borderRadius: "10px", color: "white",
                fontSize: "14px", fontWeight: "600", cursor: "pointer", marginTop: "4px",
              }}>Aggiorna password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}