import React, { useEffect, useState, useRef } from "react";
import { Sparkles, AlertCircle, Shield } from "lucide-react";
import { api } from "../api/client";
import { User } from "../types";

interface AuthProps {
  onAuthenticated: (user: User) => void;
}

export const AuthScreen: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gsiRenderedRef = useRef(false);

  const initializeGoogleGSI = (clientId: string) => {
    if ((window as any).google?.accounts?.id && !gsiRenderedRef.current) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
          auto_select: false,
        });

        const btnEl = document.getElementById("google-signin-btn-container");
        if (btnEl) {
          btnEl.innerHTML = "";
          (window as any).google.accounts.id.renderButton(btnEl, {
            theme: "filled_blue",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: 320,
            logo_alignment: "left",
          });
          gsiRenderedRef.current = true;
        }
      } catch (err) {
        console.warn("GSI init warning:", err);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    api
      .getAuthConfig()
      .then((res) => {
        if (!mounted) return;
        setGoogleConfigured(res.googleConfigured);
        setGoogleClientId(res.googleClientId);

        if (res.googleConfigured && res.googleClientId) {
          const interval = setInterval(() => {
            if ((window as any).google?.accounts?.id) {
              clearInterval(interval);
              initializeGoogleGSI(res.googleClientId!);
            }
          }, 200);
          setTimeout(() => clearInterval(interval), 5000);
        }
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || "Failed to load authentication configuration.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleCallback = async (response: any) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.loginGoogle(response.credential);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnconfiguredClick = () => {
    setError("Google Sign-In is awaiting your GOOGLE_CLIENT_ID in .env. Configure it in your server .env file to enable authentication.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "40px 36px",
          boxShadow: "var(--glass-shadow-lg)",
          textAlign: "center",
        }}
      >
        {/* Brand Header */}
        <div style={{ marginBottom: 32 }}>
          <div
            className="brand-icon"
            style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: "var(--radius-lg)" }}
          >
            <Sparkles size={28} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.9rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            HomeSync
          </h1>
          <p
            style={{
              fontSize: "0.92rem",
              color: "var(--text-muted)",
              lineHeight: 1.5,
              maxWidth: 340,
              margin: "0 auto",
            }}
          >
            Real-time household scheduling, medicine coordination, grocery synchronization, and location sharing.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: "var(--radius-md)",
              background: "rgba(255,23,68,0.12)",
              border: "1px solid rgba(255,23,68,0.3)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              textAlign: "left",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* PRIMARY ACTION: ONLY CONTINUE WITH GOOGLE */}
        <div style={{ margin: "28px 0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {googleConfigured ? (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div id="google-signin-btn-container" style={{ minHeight: 44, display: "flex", justifyContent: "center" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Verified Google Account sign-in
              </span>
            </div>
          ) : (
            <div style={{ width: "100%" }}>
              <button
                type="button"
                onClick={handleUnconfiguredClick}
                className="btn"
                style={{
                  width: "100%",
                  height: 50,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderRadius: "9999px",
                  background: "#ffffff",
                  color: "#1f1f1f",
                  border: "1px solid rgba(0,0,0,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Official Google G Logo SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Shield size={14} color="var(--accent-teal)" />
          <span>Strict OAuth 2.0 security. Passwords and credentials never exposed.</span>
        </div>
      </div>
    </div>
  );
};
