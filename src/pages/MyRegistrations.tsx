import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { ClubEvent, ExternalEventRegistration, OwnEventRegistration } from "../types";

export default function MyRegistrations() {
  const { user } = useAuth();
  const [external, setExternal] = useState<ExternalEventRegistration[]>([]);
  const [own, setOwn] = useState<OwnEventRegistration[]>([]);
  const [eventsById, setEventsById] = useState<Map<string, ClubEvent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"external" | "own">("external");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;

    const unsubExternal = onSnapshot(
      query(collection(db, "eventRegistrations"), where("broughtByMemberId", "==", user.uid)),
      (snap) => {
        setExternal(snap.docs.map((d) => d.data() as ExternalEventRegistration));
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubOwn = onSnapshot(
      query(collection(db, "ownEventRegistrations"), where("memberId", "==", user.uid)),
      (snap) => {
        setOwn(snap.docs.map((d) => d.data() as OwnEventRegistration));
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubEvents = onSnapshot(
      collection(db, "events"),
      (snap) => {
        const map = new Map<string, ClubEvent>();
        snap.docs.forEach((d) => map.set(d.id, d.data() as ClubEvent));
        setEventsById(map);
      }
    );

    return () => {
      unsubExternal();
      unsubOwn();
      unsubEvents();
    };
  }, [user]);

  const filteredExternal = external.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const eventTitle = eventsById.get(r.eventId)?.title?.toLowerCase() || "";
    const regNo = r.studentRegistrationNumber.toLowerCase();
    return eventTitle.includes(q) || regNo.includes(q);
  });

  const filteredOwn = own.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const eventTitle = eventsById.get(r.eventId)?.title?.toLowerCase() || "";
    const regNo = r.memberRegistrationNumber.toLowerCase();
    return eventTitle.includes(q) || regNo.includes(q);
  });

  if (loading) {
    return (
      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="skeleton" style={{ width: "50%", height: 28, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: "30%", height: 18 }} />
        </div>
        <div className="card">
          <div className="skeleton" style={{ width: "100%", height: 36, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: "100%", height: 36 }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1>My Registrations</h1>
        <p className="page-subtitle">
          Track external student recruits brought in alongside your own event entries.
        </p>
      </div>

      <div className="card-grid">
        <div
          className={`stat-card ${tab === "external" ? "stat-card-other" : ""}`}
          style={{ cursor: "pointer" }}
          onClick={() => setTab("external")}
        >
          <div className="stat-value">{external.length}</div>
          <div className="stat-label">External Recruits</div>
        </div>

        <div
          className={`stat-card stat-card-done`}
          style={{ cursor: "pointer" }}
          onClick={() => setTab("own")}
        >
          <div className="stat-value">{own.length}</div>
          <div className="stat-label">My Event Entries</div>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search by event or reg no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${tab === "external" ? "is-active" : ""}`}
            onClick={() => setTab("external")}
          >
            👥 External ({external.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${tab === "own" ? "is-active" : ""}`}
            onClick={() => setTab("own")}
          >
            🎫 My Entries ({own.length})
          </button>
        </div>
      </div>

      {tab === "external" ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
              External Registrations ({filteredExternal.length})
            </h2>
          </div>

          {filteredExternal.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>No external student registrations found.</p>
              <Link to="/events" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                Browse Events
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-wrap desktop-table-view" style={{ border: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Student Reg. No.</th>
                      <th>Submitted At</th>
                      <th>Receipt Document</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExternal.map((r) => {
                      const ev = eventsById.get(r.eventId);
                      return (
                        <tr key={`${r.eventId}_${r.studentRegistrationNumber}`}>
                          <td>
                            {ev ? (
                              <Link to={`/events/${ev.eventId}`} style={{ color: "var(--brand-saffron)", fontWeight: 600 }}>
                                {ev.title}
                              </Link>
                            ) : (
                              <strong>{r.eventId}</strong>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, color: "var(--text-primary)" }}>
                              {r.studentRegistrationNumber}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleString() : "—"}
                          </td>
                          <td>
                            {r.driveFileName ? (
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                📄 {r.driveFileName}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Pending storage</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${r.status === "complete" ? "complete" : "uploading"}`}>
                              <span className={`status-dot ${r.status === "complete" ? "is-done" : ""}`} />
                              {r.status === "complete" ? "Verified" : "Processing"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="mobile-card-list" style={{ padding: "12px 14px" }}>
                {filteredExternal.map((r) => {
                  const ev = eventsById.get(r.eventId);
                  return (
                    <div key={`${r.eventId}_${r.studentRegistrationNumber}`} className="mobile-data-card">
                      <div className="mobile-card-top">
                        <span className="mobile-card-title">
                          {ev ? (
                            <Link to={`/events/${ev.eventId}`} style={{ color: "var(--brand-saffron)" }}>
                              {ev.title}
                            </Link>
                          ) : (
                            r.eventId
                          )}
                        </span>
                        <span className={`badge badge-${r.status === "complete" ? "complete" : "uploading"}`}>
                          <span className={`status-dot ${r.status === "complete" ? "is-done" : ""}`} />
                          {r.status === "complete" ? "Verified" : "Processing"}
                        </span>
                      </div>

                      <div className="mobile-card-meta">
                        <span>🎓 Reg: <strong style={{ color: "var(--text-primary)" }}>{r.studentRegistrationNumber}</strong></span>
                        <span>•</span>
                        <span>🗓️ {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString() : "—"}</span>
                      </div>

                      {r.driveFileName && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                          📄 {r.driveFileName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
              My Own Event Registrations ({filteredOwn.length})
            </h2>
          </div>

          {filteredOwn.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              <p>You haven't registered yourself for any events yet.</p>
              <Link to="/events" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                Browse Events
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-wrap desktop-table-view" style={{ border: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>My Member Reg. No.</th>
                      <th>Submitted At</th>
                      <th>Receipt Document</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOwn.map((r) => {
                      const ev = eventsById.get(r.eventId);
                      return (
                        <tr key={r.eventId}>
                          <td>
                            {ev ? (
                              <Link to={`/events/${ev.eventId}`} style={{ color: "var(--brand-saffron)", fontWeight: 600 }}>
                                {ev.title}
                              </Link>
                            ) : (
                              <strong>{r.eventId}</strong>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, color: "var(--text-primary)" }}>
                              {r.memberRegistrationNumber}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleString() : "—"}
                          </td>
                          <td>
                            {r.driveFileName ? (
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                📄 {r.driveFileName}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Pending storage</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${r.status === "complete" ? "complete" : "uploading"}`}>
                              <span className={`status-dot ${r.status === "complete" ? "is-done" : ""}`} />
                              {r.status === "complete" ? "Verified" : "Processing"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="mobile-card-list" style={{ padding: "12px 14px" }}>
                {filteredOwn.map((r) => {
                  const ev = eventsById.get(r.eventId);
                  return (
                    <div key={r.eventId} className="mobile-data-card">
                      <div className="mobile-card-top">
                        <span className="mobile-card-title">
                          {ev ? (
                            <Link to={`/events/${ev.eventId}`} style={{ color: "var(--brand-saffron)" }}>
                              {ev.title}
                            </Link>
                          ) : (
                            r.eventId
                          )}
                        </span>
                        <span className={`badge badge-${r.status === "complete" ? "complete" : "uploading"}`}>
                          <span className={`status-dot ${r.status === "complete" ? "is-done" : ""}`} />
                          {r.status === "complete" ? "Verified" : "Processing"}
                        </span>
                      </div>

                      <div className="mobile-card-meta">
                        <span>🎓 Reg: <strong style={{ color: "var(--text-primary)" }}>{r.memberRegistrationNumber}</strong></span>
                        <span>•</span>
                        <span>🗓️ {r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleDateString() : "—"}</span>
                      </div>

                      {r.driveFileName && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                          📄 {r.driveFileName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
