import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Meeting, ClubEvent, MeetingAttendance, EventAttendance, AttendanceStatus } from "../types";

interface UnifiedAttendanceRow {
  id: string;
  type: "meeting" | "event";
  title: string;
  locationOrVenue: string;
  date: string;
  status: AttendanceStatus;
  otherReason: string | null;
}

export default function Attendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UnifiedAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    let meetingRecords: MeetingAttendance[] = [];
    let eventRecords: EventAttendance[] = [];
    let meetingsById = new Map<string, Meeting>();
    let eventsById = new Map<string, ClubEvent>();

    const mergeAndSet = () => {
      const meetingRows: UnifiedAttendanceRow[] = meetingRecords
        .filter((r) => r.status === "Present" || r.status === "Absent" || r.status === "Other")
        .map((r) => {
          const m = meetingsById.get(r.meetingId);
          return {
            id: `meeting_${r.meetingId}`,
            type: "meeting",
            title: m?.title ?? "(Unassigned Meeting)",
            locationOrVenue: m?.location ?? "",
            date: m?.date ?? "",
            status: r.status,
            otherReason: r.otherReason,
          };
        });

      const eventRows: UnifiedAttendanceRow[] = eventRecords
        .filter((r) => r.status === "Present" || r.status === "Absent" || r.status === "Other")
        .map((r) => {
          const ev = eventsById.get(r.eventId);
          return {
            id: `event_${r.eventId}`,
            type: "event",
            title: ev?.title ?? "(Unassigned Event)",
            locationOrVenue: ev?.venue ?? "",
            date: ev?.date ?? "",
            status: r.status,
            otherReason: r.otherReason,
          };
        });

      const merged = [...meetingRows, ...eventRows].sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? "")
      );

      setRows(merged);
      setLoading(false);
    };

    const unsubMeetingAttendance = onSnapshot(
      query(collection(db, "meetingAttendance"), where("memberId", "==", user.uid)),
      (snap) => {
        meetingRecords = snap.docs.map((d) => d.data() as MeetingAttendance);
        mergeAndSet();
      },
      () => setLoading(false)
    );

    const unsubEventAttendance = onSnapshot(
      query(collection(db, "eventAttendance"), where("memberId", "==", user.uid)),
      (snap) => {
        eventRecords = snap.docs.map((d) => d.data() as EventAttendance);
        mergeAndSet();
      },
      () => setLoading(false)
    );

    const unsubMeetings = onSnapshot(
      collection(db, "meetings"),
      (snap) => {
        const map = new Map<string, Meeting>();
        snap.docs.forEach((d) => map.set(d.id, { ...d.data(), meetingId: d.data().meetingId || d.id } as Meeting));
        meetingsById = map;
        mergeAndSet();
      },
      () => setLoading(false)
    );

    const unsubEvents = onSnapshot(
      collection(db, "events"),
      (snap) => {
        const map = new Map<string, ClubEvent>();
        snap.docs.forEach((d) => map.set(d.id, { ...d.data(), eventId: d.data().eventId || d.id } as ClubEvent));
        eventsById = map;
        mergeAndSet();
      },
      () => setLoading(false)
    );

    return () => {
      unsubMeetingAttendance();
      unsubEventAttendance();
      unsubMeetings();
      unsubEvents();
    };
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
      const title = r.title.toLowerCase();
      const reason = r.otherReason?.toLowerCase() || "";
      const date = r.date || "";
      const loc = r.locationOrVenue.toLowerCase();
      return title.includes(q) || reason.includes(q) || date.includes(q) || loc.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1>Attendance</h1>
        <p className="page-subtitle">
          Summary of your attendance record across meetings and events.
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
                  <th>Session / Activity</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Notes / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: 4, background: r.type === "event" ? "rgba(255, 107, 53, 0.15)" : "rgba(255, 255, 255, 0.08)", color: r.type === "event" ? "var(--brand-saffron)" : "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                          {r.type === "event" ? "🚩 Event" : "📅 Meeting"}
                        </span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {r.title}
                        </strong>
                      </div>
                      {r.locationOrVenue && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                          📍 {r.locationOrVenue}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {r.date || "—"}
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
              <div key={r.id} className="mobile-data-card">
                <div className="mobile-card-top">
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ alignSelf: "flex-start", fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, background: r.type === "event" ? "rgba(255, 107, 53, 0.15)" : "rgba(255, 255, 255, 0.08)", color: r.type === "event" ? "var(--brand-saffron)" : "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                      {r.type === "event" ? "🚩 Event" : "📅 Meeting"}
                    </span>
                    <span className="mobile-card-title">
                      {r.title}
                    </span>
                  </div>
                  <span className={`badge badge-${r.status.toLowerCase()}`}>
                    <span className={`status-dot ${r.status === "Present" ? "is-done" : ""}`} />
                    {r.status}
                  </span>
                </div>

                <div className="mobile-card-meta">
                  <span>🗓️ {r.date || "—"}</span>
                  {r.locationOrVenue && <span>📍 {r.locationOrVenue}</span>}
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
