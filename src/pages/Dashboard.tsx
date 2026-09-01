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
  const [meetingStats, setMeetingStats] = useState<{ attended: number; total: number }>({ attended: 0, total: 0 });
  const [eventStats, setEventStats] = useState<{ attended: number; total: number }>({ attended: 0, total: 0 });
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    let meetingRecords: MeetingAttendance[] = [];
    let eventRecords: EventAttendance[] = [];
    let publishedEventsById = new Map<string, ClubEvent>();
    let meetingsById = new Map<string, Meeting>();

    const recalculateAttendance = () => {
      const markedMeetings = meetingRecords.filter((r) => {
        const m = meetingsById.get(r.meetingId);
        return m && m.status !== "cancelled" && (r.status === "Present" || r.status === "Absent" || r.status === "Other");
      });
      const presentMeetings = markedMeetings.filter((r) => r.status === "Present").length;
      setMeetingStats({ attended: presentMeetings, total: markedMeetings.length });

      const markedEvents = eventRecords.filter((r) => {
        const ev = publishedEventsById.get(r.eventId);
        return ev && ev.status === "published" && (r.status === "Present" || r.status === "Absent" || r.status === "Other");
      });
      const presentEvents = markedEvents.filter((r) => r.status === "Present").length;
      setEventStats({ attended: presentEvents, total: markedEvents.length });

      const allMarked = [...markedMeetings, ...markedEvents];
      const allPresent = presentMeetings + presentEvents;
      setAttendanceStats(allMarked.length > 0 ? { present: allPresent, total: allMarked.length } : { present: 0, total: 0 });
    };

    const unsubMeetings = onSnapshot(
      collection(db, "meetings"),
      (snap) => {
        const map = new Map<string, Meeting>();
        snap.docs.forEach((d) => map.set(d.id, { ...d.data(), meetingId: d.data().meetingId || d.id } as Meeting));
        meetingsById = map;

        const upcoming = Array.from(map.values())
          .filter((m) => m.status === "scheduled" && m.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5);
        setUpcomingMeetings(upcoming);

        recalculateAttendance();
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubEvents = onSnapshot(
      query(collection(db, "events"), where("status", "==", "published")),
      (snap) => {
        const map = new Map<string, ClubEvent>();
        snap.docs.forEach((d) => map.set(d.id, { ...d.data(), eventId: d.data().eventId || d.id } as ClubEvent));
        publishedEventsById = map;

        const upcoming = Array.from(map.values())
          .filter((ev) => ev.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5);
        setUpcomingEvents(upcoming);

        recalculateAttendance();
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
          <div className="stat-value">
            {meetingStats.attended}/{meetingStats.total}
          </div>
          <div className="stat-label">Meetings</div>
        </div>

        <div className="stat-card stat-card-other">
          <div className="stat-value">
            {eventStats.attended}/{eventStats.total}
          </div>
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
                        ⏰ {ev.startTime} – {ev.endTime}
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
