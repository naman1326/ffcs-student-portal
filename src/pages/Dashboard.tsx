import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Meeting, ClubEvent, MeetingAttendance, EventAttendance } from "../types";

interface Announcement {
  announcementId: string;
  title: string;
  body: string;
}

export default function Dashboard() {
  const { member, user } = useAuth();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ClubEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    let meetingRecords: MeetingAttendance[] = [];
    let eventRecords: EventAttendance[] = [];

    const recalculateAttendance = () => {
      const allRecords = [...meetingRecords, ...eventRecords];
      // Only marked records (status set to Present, Absent, or Other)
      const marked = allRecords.filter((r) => r.status === "Present" || r.status === "Absent" || r.status === "Other");
      const present = marked.filter((r) => r.status === "Present").length;
      setAttendanceStats(marked.length > 0 ? { present, total: marked.length } : { present: 0, total: 0 });
    };

    const unsubMeetings = onSnapshot(
      query(collection(db, "meetings"), where("status", "==", "scheduled"), where("date", ">=", todayStr), orderBy("date"), limit(5)),
      (snap) => {
        setUpcomingMeetings(snap.docs.map((d) => ({ ...d.data(), meetingId: d.data().meetingId || d.id } as Meeting)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubEvents = onSnapshot(
      query(collection(db, "events"), where("status", "==", "published"), where("date", ">=", todayStr), orderBy("date"), limit(5)),
      (snap) => {
        setUpcomingEvents(snap.docs.map((d) => ({ ...d.data(), eventId: d.data().eventId || d.id } as ClubEvent)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubAnnouncements = onSnapshot(
      query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5)),
      (snap) => {
        setAnnouncements(snap.docs.map((d) => ({ ...d.data(), announcementId: d.data().announcementId || d.id } as Announcement)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubMeetingAttendance = onSnapshot(
      query(collection(db, "meetingAttendance"), where("memberId", "==", user.uid)),
      (snap) => {
        meetingRecords = snap.docs.map((d) => d.data() as MeetingAttendance);
        recalculateAttendance();
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubEventAttendance = onSnapshot(
      query(collection(db, "eventAttendance"), where("memberId", "==", user.uid)),
      (snap) => {
        eventRecords = snap.docs.map((d) => d.data() as EventAttendance);
        recalculateAttendance();
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubMeetings();
      unsubEvents();
      unsubAnnouncements();
      unsubMeetingAttendance();
      unsubEventAttendance();
    };
  }, [user]);

  const attendanceRate = attendanceStats && attendanceStats.total > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <span>Welcome, {member?.name?.split(" ")[0] || "Member"}</span>
            <span style={{ fontSize: "1.2rem" }}>🙏</span>
          </h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
            ID: <span style={{ color: "var(--brand-saffron)", fontWeight: 600 }}>{member?.registrationNumber}</span>
          </p>
        </div>

        <div className="live-indicator-container">
          <span className="live-dot" />
          <span className="live-text">Live Sync</span>
        </div>
      </div>

      <div className="card-grid card-grid-3">
        <div className="stat-card stat-card-done">
          <div className="stat-value">
            {attendanceRate !== null ? `${attendanceRate}%` : "—"}
          </div>
          <div className="stat-label">Attendance Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{upcomingMeetings.length}</div>
          <div className="stat-label">Meetings</div>
        </div>

        <div className="stat-card stat-card-total">
          <div className="stat-value">{upcomingEvents.length}</div>
          <div className="stat-label">Events</div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="skeleton" style={{ width: "40%", height: 22, marginBottom: 14 }} />
          <div className="skeleton" style={{ width: "100%", height: 44, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: "90%", height: 44 }} />
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header-row">
              <h2>
                <span>📅</span>
                <span>Upcoming Meetings</span>
              </h2>
              <Link to="/meetings" className="btn btn-ghost btn-sm" style={{ color: "var(--brand-saffron)", padding: "4px 8px" }}>
                View All →
              </Link>
            </div>

            {upcomingMeetings.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 12px" }}>
                <div className="empty-state-icon" style={{ fontSize: "1.6rem" }}>📅</div>
                <p style={{ margin: 0 }}>No upcoming meetings scheduled.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingMeetings.map((m) => (
                  <div
                    key={m.meetingId}
                    style={{
                      padding: "12px 14px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>{m.title}</strong>
                      <span className="badge badge-scheduled" style={{ padding: "2px 8px", fontSize: "0.7rem" }}>Scheduled</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: "0.8rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
                      <span>🗓️ {m.date}</span>
                      <span>⏰ {m.startTime} – {m.endTime}</span>
                      <span>📍 {m.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header-row">
              <h2>
                <span>🚩</span>
                <span>Upcoming Events</span>
              </h2>
              <Link to="/events" className="btn btn-ghost btn-sm" style={{ color: "var(--brand-saffron)", padding: "4px 8px" }}>
                Browse →
              </Link>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 12px" }}>
                <div className="empty-state-icon" style={{ fontSize: "1.6rem" }}>🚩</div>
                <p style={{ margin: 0 }}>No published events right now.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {upcomingEvents.map((ev) => (
                  <Link
                    key={ev.eventId}
                    to={`/events/${ev.eventId}`}
                    className="card event-card"
                    style={{ margin: 0, padding: 14 }}
                  >
                    <div>
                      <h3 className="event-card-title" style={{ fontSize: "1.05rem" }}>{ev.title}</h3>
                      <div className="event-meta-badge" style={{ fontSize: "0.78rem" }}>
                        <span>🗓️ {ev.date}</span>
                        <span>•</span>
                        <span>📍 {ev.venue}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255, 107, 53, 0.1)" }}>
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        Closes: {new Date(ev.registrationDeadline).toLocaleDateString()}
                      </span>
                      <span className="btn btn-primary btn-sm" style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "28px" }}>
                        Details →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header-row">
              <h2>
                <span>📢</span>
                <span>Announcements</span>
              </h2>
            </div>

            {announcements.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 12px" }}>
                <div className="empty-state-icon" style={{ fontSize: "1.6rem" }}>📢</div>
                <p style={{ margin: 0 }}>No announcements right now.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {announcements.map((a) => (
                  <div key={a.announcementId} className="feed-item">
                    <div className="feed-item-title">{a.title}</div>
                    <p className="feed-item-body">{a.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
