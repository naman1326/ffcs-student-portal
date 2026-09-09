import { useState, FormEvent } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../lib/api";
import logo from "../assets/logo.png";

export default function Login() {
  const { user, signIn } = useAuth();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      toast.error(friendlyError(err) === "Something went wrong. Please try again." ? "Invalid email or password." : friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendSetupLink(e?: FormEvent) {
    if (e) e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your registered college email address.");
      return;
    }
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setResetting(true);
    try {
      try {
        await sendPasswordResetEmail(auth, trimmed, {
          url: window.location.origin,
          handleCodeInApp: false,
        });
      } catch (innerErr: any) {
        // Fallback without actionCodeSettings if redirect URL domain is not yet authorized in Firebase Console
        if (
          innerErr?.code === "auth/unauthorized-continue-uri" ||
          innerErr?.code === "auth/invalid-continue-uri"
        ) {
          await sendPasswordResetEmail(auth, trimmed);
        } else {
          throw innerErr;
        }
      }
      setSentEmail(trimmed);
      toast.success("Setup link sent! Check your inbox.");
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        toast.error("No registered member account found with this email. Please check your spelling or contact a club admin to be enrolled.");
      } else if (err?.code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        toast.error("Too many requests sent. Please wait a few moments before trying again.");
      } else {
        toast.error(friendlyError(err));
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="login-shell gate-screen">
      <div className="card login-card gate-card">
        <div className="gate-brand-container">
          <img src={logo} alt="Swarajya Logo" className="gate-logo-img" />
          <span className="gate-brand-title brand-title">स्वराज्य</span>
          <span className="gate-brand-subtitle brand-subtitle">FFCS Member Portal</span>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setSentEmail(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${mode === "setup" ? "active" : ""}`}
            onClick={() => {
              setMode("setup");
              setSentEmail(null);
            }}
          >
            First-Time Setup / Reset
          </button>
        </div>

        {mode === "login" ? (
          <>
            <form onSubmit={handleSubmit}>
              <label htmlFor="email">College Email Address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="student@vitstudent.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label htmlFor="password">Account Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 22, height: "46px" }}
                disabled={submitting}
              >
                {submitting ? "Authenticating..." : "Sign In to Portal"}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: "center", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setMode("setup");
                  setSentEmail(null);
                }}
                style={{ color: "var(--brand-saffron)", fontSize: "0.85rem" }}
              >
                First time logging in? <strong>Get Setup Link →</strong>
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setMode("setup");
                  setSentEmail(null);
                }}
                style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
              >
                Forgot password?
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="setup-notice">
              <strong>Account Setup & Password Link</strong>
              <p style={{ margin: "4px 0 0" }}>
                Enrolled club members can request a secure email link to set up or reset their portal password.
              </p>
            </div>

            {sentEmail ? (
              <div>
                <div className="setup-success-box">
                  <div className="setup-success-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Setup Link Dispatched!</span>
                  </div>
                  <div className="setup-success-text">
                    A password setup link was dispatched to <strong>{sentEmail}</strong>.
                  </div>
                  <ul className="setup-success-steps">
                    <li>Check your inbox and your <strong>Spam / Junk</strong> folder.</li>
                    <li>Click the link in the email to define your new password.</li>
                    <li>Once saved, return here to sign in with your credentials.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%", height: "46px", marginBottom: 10 }}
                  onClick={() => {
                    setMode("login");
                    setSentEmail(null);
                  }}
                >
                  Proceed to Sign In →
                </button>

                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}
                    disabled={resetting}
                    onClick={() => handleSendSetupLink()}
                  >
                    {resetting ? "Resending..." : "Didn't receive email? Click to resend"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendSetupLink}>
                <label htmlFor="setup-email">Registered College Email</label>
                <input
                  id="setup-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="student@vitstudent.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 20, height: "46px" }}
                  disabled={resetting}
                >
                  {resetting ? "Dispatching Setup Link..." : "Send Setup Link →"}
                </button>

                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setMode("login")}
                    style={{ fontSize: "0.84rem" }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="note-bubble" style={{ marginTop: 18, textAlign: "center", fontSize: "0.8rem" }}>
          Not an enrolled member yet? Contact a club administrator to be registered.
        </div>
      </div>
    </div>
  );
}
