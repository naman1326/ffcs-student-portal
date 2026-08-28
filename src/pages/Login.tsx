import { useState, FormEvent } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../lib/api";

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your college email above first, then click 'Forgot password?'.");
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      toast.success("If that email has an account, a reset link has been sent.");
    } catch {
      // Same message whether or not the account exists, so we don't leak
      // which emails are registered.
      toast.success("If that email has an account, a reset link has been sent.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="login-shell gate-screen">
      <div className="card login-card gate-card">
        <div className="gate-brand-container">
          <img src="/logo.png" alt="Swarajya Logo" className="gate-logo-img" />
          <span className="gate-brand-title brand-title">स्वराज्य</span>
          <span className="gate-brand-subtitle brand-subtitle">FFCS Member Portal</span>
        </div>

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

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleForgotPassword}
            disabled={resetting}
            style={{ color: "var(--brand-saffron)", fontSize: "0.85rem" }}
          >
            {resetting ? "Dispatching reset link..." : "Forgot password?"}
          </button>
        </div>

        <div className="note-bubble" style={{ marginTop: 18, textAlign: "center", fontSize: "0.8rem" }}>
          Don't have an active account? Contact a club administrator to be enrolled.
        </div>
      </div>
    </div>
  );
}
