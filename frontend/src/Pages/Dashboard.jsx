import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import "../CSS/dashboard.css";
import "../CSS/upEventPage.css"; // reuse existing search bar / fx styles
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../utils/apiService";
import { FaEdit, FaTrash, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";
import ReactPaginate from "react-paginate";
import { useNavigate } from "react-router-dom";

// Admin dashboard with event table, edit/delete, and stats
function Dashboard() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, upcoming: 0, attendees: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [perPage, setPerPage] = useState(6);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minAttendees, setMinAttendees] = useState("");
  const [sortOption, setSortOption] = useState("new"); // 'new' | 'attendees'
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'
  const [filteredEvents, setFilteredEvents] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await apiService.getEvents();
        if (!res?.data?.success) throw new Error("Failed to fetch events");
        // Filter events created by this admin
        const all = res.data.events || [];
        const myEvents = all.filter(
          (ev) =>
            String(ev.createdBy) === String(user?._id) ||
            String(ev.createdBy?._id) === String(user?._id)
        );

        // For each event, fetch attendee count
        // Fetch attendee counts sequentially but could be optimized with backend aggregation
        const counts = [];
        for (const ev of myEvents) {
          try {
            const r = await apiService.getEventRegistrations(ev._id);
            if (r?.data?.success && Array.isArray(r.data.registration)) {
              counts.push({ id: ev._id, count: r.data.registration.length });
            } else counts.push({ id: ev._id, count: 0 });
          } catch {
            // 404 or other => treat as zero attendees
            counts.push({ id: ev._id, count: 0 });
          }
        }

        // attach counts
        const withCounts = myEvents.map((ev) => {
          const match = counts.find((c) => c.id === ev._id);
          // derive a reliable creation timestamp: prefer ev.createdAt; else decode from ObjectId; else fallback to event date
          let derivedCreatedAt = ev.createdAt;
          if (
            !derivedCreatedAt &&
            ev._id &&
            typeof ev._id === "string" &&
            ev._id.length >= 8
          ) {
            try {
              const ts = parseInt(ev._id.substring(0, 8), 16) * 1000; // ObjectId timestamp seconds -> ms
              derivedCreatedAt = new Date(ts).toISOString();
            } catch {
              /* ignore */
            }
          }
          if (!derivedCreatedAt && ev.date) derivedCreatedAt = ev.date;
          return {
            ...ev,
            attendees: match ? match.count : 0,
            _createdAt: derivedCreatedAt,
          };
        });

        if (!mounted) return;
        setEvents(withCounts);
        setFilteredEvents(withCounts); // initial

        // compute stats
        const now = Date.now();
        const total = withCounts.length;
        const upcoming = withCounts.filter(
          (ev) => new Date(ev.date).getTime() >= now
        ).length;
        const attendees = withCounts.reduce(
          (s, e) => s + (Number(e.attendees) || 0),
          0
        );
        setStats({ total, upcoming, attendees });
      } catch (e) {
        console.error(e);
        if (mounted) setError("Failed to load events");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (user?.isAdmin) load();

    return () => {
      mounted = false;
    };
  }, [user]);

  // show modal
  const handleDelete = (eventId) => {
    setPendingDeleteId(eventId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleteLoading(true);
    try {
      await apiService.deleteEvent(pendingDeleteId);
      setEvents((prev) => {
        const updated = prev.filter((e) => e._id !== pendingDeleteId);
        const now = Date.now();
        const total = updated.length;
        const upcoming = updated.filter(
          (ev) => new Date(ev.date).getTime() >= now
        ).length;
        const attendees = updated.reduce(
          (s, e) => s + (Number(e.attendees) || 0),
          0
        );
        setStats({ total, upcoming, attendees });
        return updated;
      });
      setShowDeleteModal(false);
      setPendingDeleteId(null);
      showSuccessToast("Event deleted");
    } catch (e) {
      console.error(e);
      setError("Failed to delete event");
      showErrorToast("Failed to delete event");
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setShowDeleteModal(false);
  };

  // Build category list (unique)
  const categories = Array.from(
    new Set(events.map((e) => e.category).filter(Boolean))
  );

  // Filtering + sorting
  useEffect(() => {
    let list = [...events];
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((e) => (e.title || "").toLowerCase().includes(q));
    if (categoryFilter)
      list = list.filter((e) => e.category === categoryFilter);
    if (minAttendees !== "" && !isNaN(minAttendees)) {
      const minA = Number(minAttendees);
      list = list.filter((e) => (e.attendees || 0) >= minA);
    }
    // sort
    // Sorting: 'new' uses _createdAt (injected) or createdAt -> ObjectId derived timestamp -> event date.
    const getCreated = (e) =>
      new Date(
        e._createdAt ||
          e.createdAt ||
          (e._id && typeof e._id === "string" && e._id.length >= 8
            ? parseInt(e._id.substring(0, 8), 16) * 1000
            : e.date || 0)
      );
    const sorter = {
      new: (a, b) => getCreated(a) - getCreated(b),
      attendees: (a, b) => (a.attendees || 0) - (b.attendees || 0),
    }[sortOption];
    if (sorter) list.sort(sorter);
    if (sortDir === "desc") list.reverse();
    setFilteredEvents(list);
    setCurrentPage(0); // reset page when filters change
  }, [searchQuery, categoryFilter, minAttendees, sortOption, sortDir, events]);

  const eventAttendee = async (e) => {
    // console.log(e);
    navigate(`/event-attendee/${e}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Silevena",
      }}
    >
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      <main
        className="layout-container"
        style={{ flex: 1, padding: "2.5rem 0" }}
      >
        <header
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div>
            <h1 className="ed-title" style={{ margin: 0 }}>
              Admin Dashboard
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>
              Welcome {user?.username} — manage and analyze your events.
            </p>
          </div>
          {/* Unified styled search / filter bar */}
          <div
            className={`dash-search fx-bar`}
            style={{ padding: "14px 20px" }}
          >
            <div
              className="eventsPage-searchRow fx-inner"
              style={{ justifyContent: "flex-start" }}
            >
              {/* Search */}
              <div
                className="eventsPage-searchBox fx-item"
                style={{ flex: "2 1 260px" }}
              >
                <span className="eventsPage-searchIcon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by event title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="eventsPage-searchInput fx-input"
                />
              </div>
              {/* Category */}
              <div
                className="fx-selectWrap fx-item"
                style={{ flex: "1 1 170px" }}
              >
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="eventsPage-filterSelect fx-select"
                  aria-label="Filter by category"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="fx-selectBorder" aria-hidden="true" />
              </div>
              {/* Attendee thresholds (pills reuse fee toggle styling) */}
              <div
                className="fx-feeToggle fx-item"
                role="group"
                aria-label="Filter by attendees"
                data-count="4"
                style={{ minWidth: "230px" }}
              >
                {[
                  { label: "ALL", val: "" },
                  { label: "10+", val: "10" },
                  { label: "50+", val: "50" },
                  { label: "100+", val: "100" },
                ].map((pill, idx) => (
                  <button
                    key={pill.val || "all"}
                    type="button"
                    className="fx-pill"
                    data-active={minAttendees === pill.val}
                    onClick={() => setMinAttendees(pill.val)}
                  >
                    {pill.label}
                  </button>
                ))}
                <span
                  className="fx-pill-indicator"
                  style={{
                    "--fx-index":
                      minAttendees === "10"
                        ? 1
                        : minAttendees === "50"
                        ? 2
                        : minAttendees === "100"
                        ? 3
                        : 0,
                    width: "calc((100% - 16px - 16px)/4)",
                  }}
                />
              </div>
              {/* Sort controls */}
              <div
                className="fx-sortControls fx-item"
                style={{ display: "flex", gap: "8px" }}
              >
                <select
                  className="fx-sortSelect"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  aria-label="Sort criteria"
                >
                  <option value="new">NEW</option>
                  <option value="attendees">ATTENDEES</option>
                </select>
                <button
                  type="button"
                  className="fx-sortDirBtn"
                  onClick={() =>
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                  }
                  title={`Toggle sort direction (${
                    sortDir === "asc" ? "Ascending" : "Descending"
                  })`}
                  aria-label="Toggle sort direction"
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
              {(searchQuery ||
                categoryFilter ||
                minAttendees !== "" ||
                sortOption !== "new" ||
                sortDir !== "desc") && (
                <button
                  className="btn btn-danger fx-item"
                  style={{ marginLeft: "8px" }}
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("");
                    setMinAttendees("");
                    setSortOption("new");
                    setSortDir("desc");
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </header>

        <section style={{ marginTop: "1.25rem" }}>
          {loading && <div className="surface p-md">Loading...</div>}
          {error && (
            <div
              className="surface p-md"
              style={{ color: "var(--accent-color)" }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-3" style={{ marginTop: "1rem" }}>
            <div className="surface p-md">
              <div
                className="text-muted"
                style={{
                  fontSize: ".75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Events
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                {stats.total}
              </div>
            </div>
            <div className="surface p-md">
              <div
                className="text-muted"
                style={{
                  fontSize: ".75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Upcoming
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                {stats.upcoming}
              </div>
            </div>
            <div className="surface p-md">
              <div
                className="text-muted"
                style={{
                  fontSize: ".75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Attendees
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                {stats.attendees}
              </div>
            </div>
          </div>

          <section style={{ marginTop: "1.5rem" }}>
            <h2 style={{ marginBottom: ".5rem" }}>Your Events</h2>
            {filteredEvents.length === 0 && !loading ? (
              <div className="surface p-md">
                You haven't created any events yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  className="dashboard-table"
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid var(--border-light)",
                      }}
                    >
                      <th style={{ padding: "12px" }}>Title</th>
                      <th style={{ padding: "12px" }}>Date</th>
                      <th style={{ padding: "12px" }}>Location</th>
                      <th style={{ padding: "12px" }}>Attendees</th>
                      <th style={{ padding: "12px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading &&
                      [...Array(3)].map((_, idx) => (
                        <tr key={"skeleton-" + idx} className="skeleton-row">
                          <td colSpan={5}>
                            <div className="skeleton-line" />
                          </td>
                        </tr>
                      ))}
                    {!loading &&
                      filteredEvents
                        .slice(
                          currentPage * perPage,
                          (currentPage + 1) * perPage
                        )
                        .map((ev) => (
                          <tr
                            key={ev._id}
                            style={{
                              borderBottom: "1px solid var(--border-light)",
                            }}
                          >
                            <td
                              style={{ padding: "12px", cursor: "pointer" }} // hand icon
                              onClick={() => eventAttendee(ev._id)}
                            >
                              {ev.title}
                            </td>
                            <td style={{ padding: "12px" }}>
                              {new Date(ev.date).toLocaleString()}
                            </td>
                            <td style={{ padding: "12px" }}>{ev.location}</td>
                            <td style={{ padding: "12px" }}>
                              {ev.attendees ?? 0}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <div className="action-buttons">
                                <a
                                  href={`/events/${ev._id}/edit`}
                                  className="action-btn btn-outline"
                                  title="Edit"
                                >
                                  <FaEdit style={{ marginRight: 8 }} />
                                  <span>edit</span>
                                </a>
                                <button
                                  className="action-btn btn-danger"
                                  onClick={() => handleDelete(ev._id)}
                                  title="Delete"
                                >
                                  <FaTrash style={{ marginRight: 8 }} />
                                  <span>delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
                {/* pagination controls */}
                {filteredEvents.length > perPage && (
                  <div className="pagination-wrap">
                    <div className="per-page">
                      <label>
                        Show
                        <select
                          value={perPage}
                          onChange={(e) => {
                            setPerPage(Number(e.target.value));
                            setCurrentPage(0);
                          }}
                        >
                          {[6, 10, 15, 20].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <FaChevronLeft /> Prev
                    </button>
                    <div className="page-numbers">
                      {Array.from({
                        length: Math.ceil(filteredEvents.length / perPage),
                      }).map((_, i) => (
                        <button
                          key={i}
                          className={
                            "page-btn" + (i === currentPage ? " active" : "")
                          }
                          onClick={() => setCurrentPage(i)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <div className="page-info">
                      Page {currentPage + 1} /{" "}
                      {Math.ceil(filteredEvents.length / perPage)}
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(
                            Math.ceil(filteredEvents.length / perPage) - 1,
                            p + 1
                          )
                        )
                      }
                      disabled={
                        currentPage >=
                        Math.ceil(filteredEvents.length / perPage) - 1
                      }
                    >
                      Next <FaChevronRight />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      </main>
      <Footer />

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="db-modal-overlay" role="dialog" aria-modal="true">
          <div className="db-modal">
            <h3>Confirm delete</h3>
            <p>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                className="btn btn-outline"
                onClick={cancelDelete}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
