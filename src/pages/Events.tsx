import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { ClubEvent } from "../types";

export default function Events() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "events"), where("status", "==", "published"), orderBy("date")),
      (snap) => {
        setEvents(snap.docs.map((d) => ({ ...d.data(), eventId: d.data().eventId || d.id } as ClubEvent)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.venue?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1>Club Events</h1>
        <p className="page-subtitle">Official festivals, flagship summits, and community gatherings.</p>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search events by title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-published">
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            {events.length} Published
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          <div className="card" style={{ height: 160 }}><div className="skeleton" style={{ width: "80%", height: 22 }} /></div>
          <div className="card" style={{ height: 160 }}><div className="skeleton" style={{ width: "80%", height: 22 }} /></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚩</div>
            <p>No published events found matching your search.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {filteredEvents.map((ev) => {
            const deadlinePassed = new Date(ev.registrationDeadline).getTime() < Date.now();
            return (
              <Link
                key={ev.eventId}
                to={`/events/${ev.eventId}`}
                className="card event-card"
                style={{ padding: 18 }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <h2 className="event-card-title" style={{ margin: 0, fontSize: "1.1rem" }}>{ev.title}</h2>
                    <span className={`badge ${deadlinePassed ? "badge-absent" : "badge-confirmed"}`}>
                      {deadlinePassed ? "Closed" : "Open"}
                    </span>
                  </div>

                  <div className="event-meta-badge" style={{ marginTop: 4 }}>
                    <span>🗓️ {ev.date}</span>
                    <span>•</span>
                    <span>⏰ {ev.startTime} – {ev.endTime}</span>
                    <span>•</span>
                    <span>📍 {ev.venue}</span>
                  </div>

                  {ev.description && (
                    <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ev.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255, 107, 53, 0.12)" }}>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Deadline: {new Date(ev.registrationDeadline).toLocaleDateString()}
                  </div>
                  <span className="btn btn-primary btn-sm" style={{ minHeight: "32px", padding: "4px 12px" }}>
                    Details →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
