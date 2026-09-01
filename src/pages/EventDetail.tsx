import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { ClubEvent, EventAttendance } from "../types";

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, member } = useAuth();
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [myAttendance, setMyAttendance] = useState<EventAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !user) return;

    const unsubEvent = onSnapshot(
      doc(db, "events", eventId),
      (snap) => {
        setEvent(snap.exists() ? ({ ...snap.data(), eventId: snap.data()?.eventId || snap.id } as ClubEvent) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubAtt = onSnapshot(
      doc(db, "eventAttendance", `${eventId}_${user.uid}`),
      (snap) => {
        setMyAttendance(snap.exists() ? (snap.data() as EventAttendance) : null);
      }
    );

    return () => {
      unsubEvent();
      unsubAtt();
    };
  }, [eventId, user]);

  if (loading) {
    return (
      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="skeleton" style={{ width: "60%", height: 28, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: "40%", height: 18, marginBottom: 18 }} />
          <div className="skeleton" style={{ width: "100%", height: 80 }} />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="card">
        <div className="error-state">
          <div className="empty-state-icon">⚠️</div>
          <h2>Event Not Found</h2>
          <p>The requested event could not be located.</p>
          <Link to="/events" className="btn btn-primary" style={{ marginTop: 14 }}>
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link to="/events" className="btn btn-ghost btn-sm" style={{ color: "var(--brand-saffron)", paddingLeft: 0 }}>
          ← Back to Events
        </Link>
      </div>

      {/* Event Details Card */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ marginBottom: 4, fontSize: "clamp(1.25rem, 5vw, 1.6rem)" }}>{event.title}</h1>
            <div className="event-meta-badge" style={{ fontSize: "0.82rem", flexWrap: "wrap" }}>
              <span>🗓️ {event.date}</span>
              <span>•</span>
              <span>⏰ {event.startTime} – {event.endTime}</span>
              <span>•</span>
              <span>📍 {event.venue}</span>
            </div>
          </div>
          <span className="badge badge-published">
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            {event.status}
          </span>
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255, 107, 53, 0.12)" }}>
          <h3 style={{ fontSize: "0.95rem", color: "var(--brand-saffron)", marginBottom: 6 }}>About the Event</h3>
          <p style={{ color: "var(--text-primary)", fontSize: "0.92rem", lineHeight: 1.6, margin: 0 }}>
            {event.description || "No description provided for this event."}
          </p>
        </div>
      </div>

      {/* Attendance Status Card for the Logged-in Student */}
      <div className="card">
        <div className="card-header-row">
          <h2>
            <span>✅</span>
            <span>My Attendance</span>
          </h2>
          {myAttendance ? (
            <span className={`badge badge-${myAttendance.status.toLowerCase()}`}>
              <span className={`status-dot ${myAttendance.status === "Present" ? "is-done" : ""}`} />
              {myAttendance.status}
            </span>
          ) : (
            <span className="badge badge-scheduled">
              <span className="status-dot" />
              Not Marked
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--input-bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <div className="user-avatar" style={{ width: 34, height: 34, fontSize: "0.85rem" }}>
              {member?.name ? member.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : "M"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{member?.name || "Club Member"}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--brand-saffron)" }}>ID: {member?.registrationNumber || "—"}</div>
            </div>
          </div>

          {myAttendance ? (
            <>
              {myAttendance.status === "Present" && (
                <div className="note-bubble" style={{ background: "rgba(31, 174, 95, 0.12)", borderLeftColor: "var(--confirm)", color: "#34d399", margin: 0 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>✓</span> Marked Present
                  </strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    You have been recorded as present for this event session.
                  </p>
                </div>
              )}

              {myAttendance.status === "Absent" && (
                <div className="note-bubble" style={{ background: "rgba(226, 73, 58, 0.12)", borderLeftColor: "var(--duplicate)", color: "#f87171", margin: 0 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>✕</span> Marked Absent
                  </strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    You were recorded as absent for this event session.
                  </p>
                </div>
              )}

              {myAttendance.status === "Other" && (
                <div className="note-bubble" style={{ background: "rgba(255, 153, 51, 0.12)", borderLeftColor: "var(--brand-saffron-alt)", color: "#fbbf24", margin: 0 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📋</span> Other / On-Duty
                  </strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {myAttendance.otherReason ? `Reason: ${myAttendance.otherReason}` : "Assigned custom attendance status."}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="note-bubble" style={{ margin: 0 }}>
              <strong>⏳ Attendance Pending</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Your attendance for this event has not been recorded yet. Coordinators will update your attendance record during or after the session.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
