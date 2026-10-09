"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenziali non valide.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: "600",
    color: "rgba(255,255,255,0.5)", textTransform: "uppercase",
    letterSpacing: "0.8px", marginBottom: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    color: "white",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const disabled = loading || !password || !email;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #1a2a4a 0%, #080d14 60%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "300px",
        background: "radial-gradient(ellipse, rgba(99,179,237,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "40px 32px",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px auto",
            boxShadow: "0 8px 20px rgba(59,130,246,0.3)",
          }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M8 24V14l8-6 8 6v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="13" y="18" width="6" height="6" rx="1" stroke="white" strokeWidth="2.5"/>
            </svg>
          </div>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: "700", margin: 0 }}>GnET</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "6px" }}>Accedi con le tue credenziali</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="nome@esempio.it"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Inserisci la password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{ ...inputStyle, padding: "14px 44px 14px 16px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Nascondi password" : "Mostra password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "6px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: "13px", margin: 0, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={disabled}
            style={{
              width: "100%",
              padding: "14px",
              background: disabled
                ? "rgba(59,130,246,0.4)"
                : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              border: "none",
              borderRadius: "12px",
              color: "white",
              fontSize: "15px",
              fontWeight: "600",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              letterSpacing: "0.2px",
            }}
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </div>
      </div>
    </div>
  );
}