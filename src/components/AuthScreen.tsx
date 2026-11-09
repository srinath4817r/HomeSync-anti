import React, { useEffect, useState, useRef, useCallback } from "react";
import { Home, AlertCircle, Shield, User as UserIcon, ArrowRight } from "lucide-react";
import { api } from "../api/client";
import { User } from "../types";

interface AuthProps {
  onAuthenticated: (user: User) => void;
}

export const AuthScreen: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDevForm, setShowDevForm] = useState(false);
  const [devEmail, setDevEmail] = useState("alex@homesync.local");
  const [devName, setDevName] = useState("Alex Johnson");
  const [gsiButtonRendered, setGsiButtonRendered] = useState(false);

  const gsiContainerRef = useRef<HTMLDivElement>(null);

  const handleGoogleCallback = useCallback(
    async (response: any) => {
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
    },
    [onAuthenticated]
  );

  const initGsi = useCallback(
    (clientId: string) => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !gsiContainerRef.current) return false;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
          auto_select: false,
        });

        gsiContainerRef.current.innerHTML = "";
        google.accounts.id.renderButton(gsiContainerRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
          logo_alignment: "left",
        });

        // Verify if Google actually rendered the button inside the container
        setTimeout(() => {
          if (gsiContainerRef.current && gsiContainerRef.current.children.length > 0) {
            setGsiButtonRendered(true);
          }
        }, 300);

        return true;
      } catch (err) {
        console.warn("Google Identity initialization error:", err);
        return false;
      }
    },
    [handleGoogleCallback]
  );

  useEffect(() => {
    let mounted = true;
    api
      .getAuthConfig()
      .then((res) => {
        if (!mounted) return;
        setGoogleConfigured(res.googleConfigured);
        setGoogleClientId(res.googleClientId);
        setIsDev(res.environment === "development");

        if (res.googleConfigured && res.googleClientId) {
          // Poll for window.google to be available from script tag
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            if ((window as any).google?.accounts?.id) {
              const success = initGsi(res.googleClientId!);
              if (success || attempts > 20) {
                clearInterval(interval);
              }
            } else if (attempts > 30) {
              clearInterval(interval);
            }
          }, 250);

          return () => clearInterval(interval);
        }
      })
      .catch((err: any) => {
        if (mounted) {
          setError(err.message || "Failed to load authentication configuration.");
          setIsDev(true); // default to enabling dev helper if server is starting
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [initGsi]);

  const handleCustomGoogleClick = () => {
    setError(null);
    const google = (window as any).google;

    if (google?.accounts?.id) {
      if (googleClientId) {
        try {
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
          });
        } catch {}
      }

      // Try Google One Tap / Prompt
      try {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const reason = notification.getNotDisplayedReason?.() || notification.getSkippedReason?.() || "";
            console.log("Google Prompt status:", reason);
            if (reason === "opt_out_or_no_session") {
              setError("Please sign in to your Google Account in your browser first.");
            } else if (reason.includes("origin")) {
              setError("Google OAuth origin not registered: add http://localhost:5173 to Authorized JavaScript Origins in Google Cloud Console.");
            }
          }
        });
      } catch (err: any) {
        setError(err.message || "Unable to trigger Google sign-in prompt.");
      }
    } else if (!googleConfigured) {
      setError("Google Sign-In is awaiting GOOGLE_CLIENT_ID in your .env file.");
    } else {
      setError("Google Sign-In script is loading or blocked by your browser/adblocker. Please disable adblockers on localhost.");
    }
  };

  const handleDevLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!devEmail) {
      setError("Please provide an email for demo sign-in.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.devLogin(devEmail, devName);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err.message || "Demo sign-in failed.");
    } finally {
      setLoading(false);
    }
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
        <div style={{ marginBottom: 28 }}>
          <div
            className="brand-icon-box"
            style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: "var(--radius-md)" }}
          >
            <Home size={28} strokeWidth={1.8} />
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

        {/* Error / Alert */}
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

        {/* PRIMARY GOOGLE LOGIN BUTTON */}
        <div style={{ margin: "24px 0 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 320, minHeight: 46 }}>
            {/* Always-Visible Google Sign-in Button */}
            <button
              type="button"
              onClick={handleCustomGoogleClick}
              disabled={loading}
              className="btn"
              style={{
                width: "100%",
                height: 48,
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                cursor: loading ? "wait" : "pointer",
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
              <span>{loading ? "Signing in..." : "Continue with Google"}</span>
            </button>

            {/* Official Google GSI Render Mount (Overlaid cleanly if rendered) */}
            <div
              ref={gsiContainerRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: gsiButtonRendered ? 1 : 0.001,
                pointerEvents: gsiButtonRendered ? "auto" : "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            />
          </div>

          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 10 }}>
            Verified Google Account sign-in
          </span>
        </div>

        {/* DEV / DEMO MODE HELPER (In Development) */}
        {isDev && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px dashed var(--glass-border-subtle)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {!showDevForm ? (
              <button
                type="button"
                onClick={() => handleDevLogin()}
                disabled={loading}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UserIcon size={14} />
                <span>Quick Sign-In as Demo User (Dev)</span>
              </button>
            ) : (
              <form onSubmit={handleDevLogin} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="Enter email..."
                  className="input"
                  style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                >
                  Continue <ArrowRight size={14} />
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setShowDevForm(!showDevForm)}
              style={{
                background: "none",
                border: "none",
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {showDevForm ? "Use default demo account" : "Sign in as custom test user"}
            </button>
          </div>
        )}

        {/* Security badge */}
        <div
          style={{
            marginTop: 20,
            fontSize: "0.76rem",
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
