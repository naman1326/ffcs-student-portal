import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, member, loading, signOut } = useAuth();

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
    return (
      <div className="login-shell fatal-screen">
        <div className="card fatal-card">
          <div className="gate-brand-container" style={{ marginBottom: 16 }}>
            <img src="/logo.png" alt="Swarajya Logo" className="gate-logo-img" style={{ width: 56, height: 56 }} />
            <span className="eyebrow">Setup Required</span>
            <h2 className="fatal-headline" style={{ color: "var(--text-primary)" }}>
              Account Profile Pending
            </h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>
            Your login authentication succeeded, but no registered member profile was found in the database.
          </p>
          <div className="note-bubble" style={{ textAlign: "left", marginBottom: 20 }}>
            Please contact the Swarajya club coordinators to provision your member permissions.
          </div>
          <button className="btn btn-ghost" onClick={() => signOut()}>
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
            Your membership account has been marked as inactive by the administration.
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
