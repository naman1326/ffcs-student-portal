import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, icon: "📊" },
  { to: "/meetings", label: "Meetings", icon: "📅" },
  { to: "/attendance", label: "Attendance", icon: "✅" },
  { to: "/events", label: "Events", icon: "🚩" },
];

export default function Layout() {
  const { member, signOut } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "M";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar (visible on > 768px) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon-wrapper">
              <img src="/logo.png" alt="Swarajya Logo" className="brand-logo-img" />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">स्वराज्य</span>
              <span className="brand-subtitle">FFCS Member Portal</span>
            </div>
          </div>
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{getInitials(member?.name)}</div>
            <div className="user-info">
              <span className="user-name" title={member?.name}>
                {member?.name || "Club Member"}
              </span>
              <span className="user-reg">{member?.registrationNumber || "Member"}</span>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: "100%", justifyContent: "center", color: "var(--duplicate)" }}
            onClick={() => signOut()}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main">
        {/* Mobile Top App Bar (visible on <= 768px) */}
        <header className="topbar">
          <div className="topbar-brand">
            <img src="/logo.png" alt="Swarajya Logo" className="topbar-logo-img" />
            <span className="brand-title" style={{ fontSize: "1.3rem" }}>
              स्वराज्य
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="live-indicator-container">
              <span className="live-dot" />
              <span className="live-text">Live</span>
            </div>

            <button
              className="topbar-profile-btn"
              onClick={() => setProfileModalOpen(true)}
              aria-label="User Profile"
            >
              <div className="user-avatar" style={{ width: 34, height: 34, fontSize: "0.85rem" }}>
                {getInitials(member?.name)}
              </div>
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar (visible on <= 768px) */}
        <nav className="bottom-nav-bar" aria-label="Mobile Bottom Navigation">
          <ul className="bottom-nav-items">
            {NAV_ITEMS.map((item) => (
              <li key={item.to} style={{ flex: 1, height: "100%" }}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `bottom-nav-link ${isActive ? "active" : ""}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile Profile & Sign Out Modal */}
      {profileModalOpen && (
        <div className="modal-backdrop" onClick={() => setProfileModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                className="user-avatar"
                style={{ width: 56, height: 56, fontSize: "1.4rem", margin: "0 auto 12px" }}
              >
                {getInitials(member?.name)}
              </div>
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 4px" }}>{member?.name || "Club Member"}</h2>
              <div style={{ color: "var(--brand-saffron)", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "0.88rem" }}>
                Reg. No: {member?.registrationNumber || "—"}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>
                {member?.collegeEmail || ""}
              </div>
            </div>

            <div className="note-bubble" style={{ fontSize: "0.8rem", textAlign: "center", marginBottom: 18 }}>
              Role: <strong style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>{member?.role || "Member"}</strong> · Status: <span style={{ color: "var(--confirm)", fontWeight: 600 }}>Active</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn btn-danger"
                style={{ width: "100%", height: 44 }}
                onClick={() => {
                  setProfileModalOpen(false);
                  signOut();
                }}
              >
                <span>🚪</span>
                <span>Sign Out of Account</span>
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: "100%", height: 40 }}
                onClick={() => setProfileModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
