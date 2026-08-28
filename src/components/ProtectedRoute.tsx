import { useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, member, loading, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="login-shell fatal-screen">
        <div className="card fatal-card" style={{ padding: "40px 30px" }}>
          <div className="skeleton" style={{ width: "80px", height: "80px", margin: "0 auto 20px", borderRadius: "50%" }} />
          <div className="skeleton" style={{ width: "60%", margin: "0 auto 12px" }} />
          <div className="skeleton" style={{ width: "40%", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!member) {
    const copyUid = () => {
      if (user.uid) {
        navigator.clipboard.writeText(user.uid);
        setCopied(true);
        toast.success("User UID copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
      }
    };

    return (
      <div className="login-shell fatal-screen">
        <div className="card fatal-card" style={{ maxWidth: 460 }}>
          <div className="gate-brand-container" style={{ marginBottom: 16 }}>
            <img src="/logo.png" alt="Swarajya Logo" className="gate-logo-img" style={{ width: 56, height: 56 }} />
            <span className="eyebrow">Setup Required</span>
            <h2 className="fatal-headline" style={{ color: "var(--text-primary)" }}>
              Account Profile Pending
            </h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 16 }}>
            Your login authentication succeeded, but no registered member profile was found in Firestore for <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>.
          </p>

          <div className="note-bubble" style={{ textAlign: "left", marginBottom: 16, fontSize: "0.82rem" }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Your Firebase Authentication UID:
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <code style={{ wordBreak: "break-all", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: 4, flex: 1, color: "var(--brand-saffron)" }}>
                {user.uid}
              </code>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ padding: "4px 10px", fontSize: "0.75rem", border: "1px solid var(--border)" }}
                onClick={copyUid}
              >
                {copied ? "✓ Copied" : "Copy UID"}
              </button>
            </div>
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "left", marginBottom: 20, lineHeight: 1.5 }}>
            💡 <strong>How to fix:</strong> In the Firebase Console Firestore database, add a document under the <code style={{ color: "var(--brand-saffron)" }}>members</code> collection with Document ID <code style={{ color: "var(--brand-saffron)" }}>{user.uid}</code> and fields:
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li><code>name</code> (string)</li>
              <li><code>registrationNumber</code> (string)</li>
              <li><code>collegeEmail</code> (string: {user.email})</li>
              <li><code>role</code> ("member")</li>
              <li><code>isActive</code> (boolean: true)</li>
            </ul>
          </div>

          <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!member.isActive) {
    return (
      <div className="login-shell fatal-screen">
        <div className="card fatal-card">
          <div className="gate-brand-container" style={{ marginBottom: 16 }}>
            <img src="/logo.png" alt="Swarajya Logo" className="gate-logo-img" style={{ width: 56, height: 56 }} />
            <span className="eyebrow" style={{ color: "var(--duplicate)" }}>Access Restricted</span>
            <h2 className="fatal-headline" style={{ color: "var(--text-primary)" }}>
              Account Deactivated
            </h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>
            Your membership account for {user.email} has been marked as inactive.
          </p>
          <button className="btn btn-ghost" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return children;
}
