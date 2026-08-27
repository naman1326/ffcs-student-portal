import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { api, fileToBase64, friendlyError } from "../lib/api";
import { ClubEvent, EventAttendance } from "../types";

const REG_NO_HINT = "Format: 24BCE5051 (Year + Branch + Roll).";
const MAX_BYTES = 1 * 1024 * 1024;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [myAttendance, setMyAttendance] = useState<EventAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  // External registration form state
  const [studentRegNo, setStudentRegNo] = useState("");
  const [externalFile, setExternalFile] = useState<File | null>(null);
  const [externalSubmitting, setExternalSubmitting] = useState(false);
  const [externalDone, setExternalDone] = useState<string | null>(null);
  const debouncedRegNo = useDebounced(studentRegNo, 500);
  const [availability, setAvailability] = useState<{ available: boolean; isClubMember: boolean; valid: boolean } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Own registration form state
  const [ownFile, setOwnFile] = useState<File | null>(null);
  const [ownSubmitting, setOwnSubmitting] = useState(false);
  const [ownDone, setOwnDone] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !user) return;
    async function load() {
      const [eventSnap, attSnap] = await Promise.all([
        getDoc(doc(db, "events", eventId!)),
        getDoc(doc(db, "eventAttendance", `${eventId}_${user!.uid}`)),
      ]);
      setEvent(eventSnap.exists() ? (eventSnap.data() as ClubEvent) : null);
      setMyAttendance(attSnap.exists() ? (attSnap.data() as EventAttendance) : null);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [eventId, user]);

  const checkAvailability = useCallback(async () => {
    if (!eventId || debouncedRegNo.trim().length < 5) {
      setAvailability(null);
      return;
    }
    setCheckingAvailability(true);
    try {
      const res = await api.checkRegistrationAvailability({ eventId, studentRegistrationNumber: debouncedRegNo });
      setAvailability(res.data);
    } catch {
      setAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  }, [eventId, debouncedRegNo]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  function validateFile(file: File | null): string | null {
    if (!file) return "Please choose a PDF receipt file.";
    if (file.type !== "application/pdf") return "Only PDF files are accepted.";
    if (file.size > MAX_BYTES) return "Receipt file must be 1 MB or smaller.";
    return null;
  }

  async function submitExternal() {
    if (!eventId) return;
    const fileErr = validateFile(externalFile);
    if (fileErr) return toast.error(fileErr);
    if (availability && !availability.valid) return toast.error("Enter a valid registration number.");
    if (availability?.isClubMember) return toast.error("You cannot submit the registration of another club member as an external registration.");
    if (availability && !availability.available) return toast.error("This student registration has already been brought in by another member.");

    setExternalSubmitting(true);
    try {
      const fileBase64 = await fileToBase64(externalFile!);
      const res = await api.submitExternalRegistration({ eventId, studentRegistrationNumber: studentRegNo, fileBase64 });
      setExternalDone(res.data.fileName);
      setStudentRegNo("");
      setExternalFile(null);
      toast.success("External registration submitted successfully.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setExternalSubmitting(false);
    }
  }

  async function submitOwn() {
    if (!eventId) return;
    const fileErr = validateFile(ownFile);
    if (fileErr) return toast.error(fileErr);

    setOwnSubmitting(true);
    try {
      const fileBase64 = await fileToBase64(ownFile!);
      const res = await api.submitOwnRegistration({ eventId, fileBase64 });
      setOwnDone(res.data.fileName);
      setOwnFile(null);
      toast.success("Your event registration receipt was submitted.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setOwnSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton" style={{ width: "60%", height: 28, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: "40%", height: 18, marginBottom: 18 }} />
        <div className="skeleton" style={{ width: "100%", height: 80 }} />
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

  const deadlinePassed = new Date(event.registrationDeadline).getTime() < Date.now();
  const registrationOpen = event.status === "published" && !deadlinePassed;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link to="/events" className="btn btn-ghost btn-sm" style={{ color: "var(--brand-saffron)", paddingLeft: 0 }}>
          ← Back to Events
        </Link>
      </div>

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
          <span className={`badge ${deadlinePassed ? "badge-absent" : "badge-confirmed"}`}>
            {deadlinePassed ? "Registration Closed" : "Open for Registration"}
          </span>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255, 107, 53, 0.12)" }}>
          <p style={{ color: "var(--text-primary)", fontSize: "0.9rem", lineHeight: 1.5, margin: 0 }}>
            {event.description || "No description provided."}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12, fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <span>Deadline: <strong style={{ color: "var(--text-secondary)" }}>{new Date(event.registrationDeadline).toLocaleDateString()}</strong></span>
          {myAttendance && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Attendance:
              <span className={`badge badge-${myAttendance.status.toLowerCase()}`}>
                <span className={`status-dot ${myAttendance.status === "Present" ? "is-done" : ""}`} />
                {myAttendance.status}
              </span>
            </span>
          )}
        </div>
      </div>

      {!registrationOpen ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h2>Registration Closed</h2>
            <p>
              {event.status === "cancelled"
                ? "This event has been cancelled."
                : deadlinePassed
                ? "The registration deadline has expired."
                : "Registration is not currently accepting submissions."}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* External Student Registration Box */}
          <div className="card">
            <div className="card-header-row">
              <h2>
                <span>👥</span>
                <span>External Participant</span>
              </h2>
            </div>
            <p className="page-subtitle" style={{ marginBottom: 14 }}>
              Submit a registration receipt for an outside student you recruited.
            </p>

            {externalDone ? (
              <div className="note-bubble" style={{ background: "rgba(31, 174, 95, 0.12)", borderLeftColor: "var(--confirm)", color: "#34d399", padding: 14 }}>
                <strong>✓ Submitted successfully!</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Receipt: <code style={{ color: "var(--brand-saffron)" }}>{externalDone}</code>
                </p>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, color: "var(--brand-saffron)" }}
                  onClick={() => setExternalDone(null)}
                >
                  + Submit Another Student
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="studentRegNo">Student Registration Number</label>
                <input
                  id="studentRegNo"
                  value={studentRegNo}
                  onChange={(e) => setStudentRegNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 24BCE5051"
                  autoCapitalize="characters"
                />
                <p className="field-hint">{REG_NO_HINT}</p>

                {checkingAvailability && (
                  <p className="field-hint" style={{ color: "var(--brand-saffron)" }}>⏳ Validating...</p>
                )}
                {!checkingAvailability && availability?.isClubMember && (
                  <p className="field-error">⚠️ Club member — cannot submit externally.</p>
                )}
                {!checkingAvailability && availability && !availability.isClubMember && !availability.available && (
                  <p className="field-error">❌ Already claimed by another member.</p>
                )}
                {!checkingAvailability && availability?.available && !availability.isClubMember && (
                  <p className="field-hint" style={{ color: "var(--confirm)", fontWeight: 600 }}>✓ Eligible and available.</p>
                )}

                <label htmlFor="externalFile">Registration Receipt (PDF)</label>
                <div className="file-upload-box">
                  <input
                    id="externalFile"
                    type="file"
                    accept="application/pdf"
                    className="file-upload-input"
                    onChange={(e) => setExternalFile(e.target.files?.[0] ?? null)}
                  />
                  <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>📄</div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: externalFile ? "var(--brand-saffron)" : "var(--text-primary)" }}>
                    {externalFile ? externalFile.name : "Tap to choose PDF receipt"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {externalFile ? `${(externalFile.size / 1024).toFixed(1)} KB` : "Max 1 MB (PDF only)"}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 16 }}
                  disabled={externalSubmitting || !externalFile || !studentRegNo || (availability ? !availability.available || availability.isClubMember : false)}
                  onClick={submitExternal}
                >
                  {externalSubmitting ? "Submitting..." : "Submit Registration"}
                </button>
              </div>
            )}
          </div>

          {/* Own Registration Box */}
          <div className="card">
            <div className="card-header-row">
              <h2>
                <span>🎫</span>
                <span>My Own Entry</span>
              </h2>
            </div>
            <p className="page-subtitle" style={{ marginBottom: 14 }}>
              Upload your own receipt for this event, linked to your member ID.
            </p>

            {ownDone ? (
              <div className="note-bubble" style={{ background: "rgba(31, 174, 95, 0.12)", borderLeftColor: "var(--confirm)", color: "#34d399", padding: 14 }}>
                <strong>✓ Receipt uploaded!</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Verified: <code style={{ color: "var(--brand-saffron)" }}>{ownDone}</code>
                </p>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, color: "var(--brand-saffron)" }}
                  onClick={() => setOwnDone(null)}
                >
                  Re-upload Receipt
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="ownFile">Your Event Receipt (PDF)</label>
                <div className="file-upload-box">
                  <input
                    id="ownFile"
                    type="file"
                    accept="application/pdf"
                    className="file-upload-input"
                    onChange={(e) => setOwnFile(e.target.files?.[0] ?? null)}
                  />
                  <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>📑</div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: ownFile ? "var(--brand-saffron)" : "var(--text-primary)" }}>
                    {ownFile ? ownFile.name : "Tap to choose your PDF receipt"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {ownFile ? `${(ownFile.size / 1024).toFixed(1)} KB` : "Max 1 MB (PDF only)"}
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 16 }}
                  disabled={ownSubmitting || !ownFile}
                  onClick={submitOwn}
                >
                  {ownSubmitting ? "Uploading..." : "Submit My Receipt"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
