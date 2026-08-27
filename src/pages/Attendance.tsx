import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Meeting, MeetingAttendance } from "../types";

interface Row extends MeetingAttendance {
  meeting?: Meeting;
}

export default function Attendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    async function load() {
      const attSnap = await getDocs(query(collection(db, "meetingAttendance"), where("memberId", "==", user!.uid)));
      const records = attSnap.docs.map((d) => d.data() as MeetingAttendance);

      const meetingsSnap = await getDocs(collection(db, "meetings"));
      const meetingsById = new Map<string, Meeting>();
      meetingsSnap.docs.forEach((d) => meetingsById.set(d.id, d.data() as Meeting));

      const merged = records
        .map((r) => ({ ...r, meeting: meetingsById.get(r.meetingId) }))
        .sort((a, b) => (b.meeting?.date ?? "").localeCompare(a.meeting?.date ?? ""));
      setRows(merged);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user]);

  const present = rows.filter((r) => r.status === "Present").length;
  const absent = rows.filter((r) => r.status === "Absent").length;
  const other = rows.filter((r) => r.status === "Other").length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  const filteredRows = rows.filter((r) => {
    if (filter !== "all" && r.status.toLowerCase() !== filter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = r.meeting?.title?.toLowerCase() || "";
      const reason = r.otherReason?.toLowerCase() || "";
      const date = r.meeting?.date || "";
      return title.includes(q) || reason.includes(q) || date.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1>Attendance</h1>
        <p className="page-subtitle">
          Summary of your attendance record across meetings. (Present ÷ Total Meetings).
        </p>
      </div>

      <div className="card-grid">
        <div className="stat-card stat-card-done" style={{ gridColumn: "1 / -1" }}>
          <div className="stat-value">{pct !== null ? `${pct}%` : "—"}</div>
          <div className="stat-label">Overall Attendance Rate</div>
        </div>

        <div className="stat-card stat-card-present">
          <div className="stat-value">{present}</div>
          <div className="stat-label">Present</div>
        </div>

        <div className="stat-card stat-card-absent">
          <div className="stat-value">{absent}</div>
          <div className="stat-label">Absent</div>
        </div>

        <div className="stat-card stat-card-other">
          <div className="stat-value">{other}</div>
          <div className="stat-label">Duty / Other</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Marked</div>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search by title, date, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          {["all", "present", "absent", "other"].map((tab) => (
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
      ) : filteredRows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No matching attendance records found.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="card table-wrap desktop-table-view" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Notes / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.meetingId}>
                    <td>
                      <strong style={{ color: "var(--text-primary)" }}>
                        {r.meeting?.title ?? "(Unassigned Meeting)"}
                      </strong>
                      {r.meeting?.location && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                          📍 {r.meeting.location}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {r.meeting?.date ?? "—"}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status.toLowerCase()}`}>
                        <span className={`status-dot ${r.status === "Present" ? "is-done" : ""}`} />
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.otherReason ? (
                        <div className="note-bubble" style={{ margin: 0, padding: "4px 8px" }}>
                          {r.otherReason}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-card-list">
            {filteredRows.map((r) => (
              <div key={r.meetingId} className="mobile-data-card">
                <div className="mobile-card-top">
                  <span className="mobile-card-title">
                    {r.meeting?.title ?? "(Unassigned Meeting)"}
                  </span>
                  <span className={`badge badge-${r.status.toLowerCase()}`}>
                    <span className={`status-dot ${r.status === "Present" ? "is-done" : ""}`} />
                    {r.status}
                  </span>
                </div>

                <div className="mobile-card-meta">
                  <span>🗓️ {r.meeting?.date ?? "—"}</span>
                  {r.meeting?.location && <span>📍 {r.meeting.location}</span>}
                </div>

                {r.otherReason && (
                  <div className="note-bubble" style={{ margin: 0, padding: "6px 8px", fontSize: "0.8rem" }}>
                    <strong>Note:</strong> {r.otherReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
