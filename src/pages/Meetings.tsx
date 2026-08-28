import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Meeting } from "../types";

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "meetings"), orderBy("date", "desc")),
      (snap) => {
        setMeetings(snap.docs.map((d) => ({ ...d.data(), meetingId: d.data().meetingId || d.id } as Meeting)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const scheduledCount = meetings.filter((m) => m.status === "scheduled").length;
  const completedCount = meetings.filter((m) => m.status === "completed").length;
  const cancelledCount = meetings.filter((m) => m.status === "cancelled").length;

  const filteredMeetings = meetings.filter((m) => {
    if (filter !== "all" && m.status.toLowerCase() !== filter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = m.title.toLowerCase();
      const location = m.location?.toLowerCase() || "";
      const date = m.date || "";
      return title.includes(q) || location.includes(q) || date.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1>Club Meetings</h1>
        <p className="page-subtitle">Schedule of internal assembly, discussion, and planning meetings.</p>
      </div>

      <div className="card-grid card-grid-3">
        <div className="stat-card">
          <div className="stat-value">{scheduledCount}</div>
          <div className="stat-label">Scheduled</div>
        </div>
        <div className="stat-card stat-card-done">
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card stat-card-absent">
          <div className="stat-value">{cancelledCount}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search meetings by title, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          {["all", "scheduled", "completed", "cancelled"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`filter-chip ${filter === tab ? "is-active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="skeleton" style={{ width: "100%", height: 32, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: "100%", height: 32, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: "100%", height: 32 }} />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No club meetings matching the selected criteria.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="card table-wrap desktop-table-view" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Meeting Title</th>
                  <th>Date</th>
                  <th>Time Window</th>
                  <th>Location / Venue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeetings.map((m) => (
                  <tr key={m.meetingId}>
                    <td>
                      <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                        {m.title}
                      </strong>
                      {m.description && (
                        <p style={{ margin: "3px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          {m.description}
                        </p>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      🗓️ {m.date}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      ⏰ {m.startTime} – {m.endTime}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      📍 {m.location || "TBD"}
                    </td>
                    <td>
                      <span className={`badge badge-${m.status}`}>
                        <span className={`status-dot ${m.status === "completed" ? "is-done" : ""}`} />
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-card-list">
            {filteredMeetings.map((m) => (
              <div key={m.meetingId} className="mobile-data-card">
                <div className="mobile-card-top">
                  <span className="mobile-card-title">{m.title}</span>
                  <span className={`badge badge-${m.status}`}>
                    <span className={`status-dot ${m.status === "completed" ? "is-done" : ""}`} />
                    {m.status}
                  </span>
                </div>

                <div className="mobile-card-meta">
                  <span>🗓️ {m.date}</span>
                  <span>⏰ {m.startTime} – {m.endTime}</span>
                  <span>📍 {m.location || "TBD"}</span>
                </div>

                {m.description && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {m.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
