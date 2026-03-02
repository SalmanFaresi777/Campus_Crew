import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../CSS/upEventPage.css";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import Loader from "../Components/loader";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

function EventsPage() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [feeFilter, setFeeFilter] = useState(""); // '', 'free', 'paid'
  const [isShrunk, setIsShrunk] = useState(false);
  const [sortOption, setSortOption] = useState("new"); // 'new' | 'popular' | 'relevant'
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(0);
  const [perPage, setPerPage] = useState(12);

  const CACHE_KEY = "events_cache";
  const CACHE_TTL = 1000 * 60 * 2; // 2 minutes instead of 10 minutes for more frequent updates

  // Extract unique categories
  const categories = [
    ...new Set(events.map((e) => e.category).filter(Boolean)),
  ];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // 🔹 1. Try loading cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setEvents(data);
            setFilteredEvents(data);
            setLoading(false);
            return; // ✅ Load from cache, skip API
          }
        }

        // 🔹 2. No cache or stale cache, fetch from API
        const response = await axios.get(`${backend_link}/api/events`);
        if (response.data.success) {
          const eventData = response.data.events || [];
          setEvents(eventData);
          setFilteredEvents(eventData);

          // 🔹 3. Save new data to localStorage
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: eventData, timestamp: Date.now() })
          );
        } else {
          setError("Failed to load events");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [backend_link]);

  // Scroll listener for sticky + blur search bar
  useEffect(() => {
    const handleScroll = () => {
      setIsShrunk(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset scroll when focusing search input
  const handleFocus = () => {
    setIsShrunk(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Force refresh events by clearing cache and refetching
  const handleRefresh = async () => {
    setLoading(true);
    localStorage.removeItem(CACHE_KEY); // Clear cache
    
    try {
      const response = await axios.get(`${backend_link}/api/events`);
      if (response.data.success) {
        const eventData = response.data.events || [];
        setEvents(eventData);
        setFilteredEvents(eventData);
        
        // Save new data to localStorage
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: eventData, timestamp: Date.now() })
        );
      } else {
        setError("Failed to load events");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching events");
    } finally {
      setLoading(false);
    }
  };

  // Combined search and filters (title, category, fee)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    let working = events.filter(
      (event) => !q || (event.title || "").toLowerCase().includes(q)
    );

    if (categoryFilter) {
      working = working.filter(
        (event) => event.category && event.category === categoryFilter
      );
    }

    if (feeFilter) {
      if (feeFilter === "free") {
        working = working.filter((e) => Number(e.registration_fee) === 0);
      } else if (feeFilter === "paid") {
        working = working.filter((e) => Number(e.registration_fee) > 0);
      }
    }

    // Sorting
    const sorters = {
      new: (a, b) => {
        const da = new Date(a.createdAt || a.date || 0).getTime();
        const db = new Date(b.createdAt || b.date || 0).getTime();
        return da - db;
      },
      popular: (a, b) => {
        const pop = (e) =>
          e.registrations_count ??
          e.registrationCount ??
          e.popularity ??
          e.participants ??
          e.prize_money ??
          0;
        return pop(a) - pop(b);
      },
      relevant: (a, b) => {
        const now = Date.now();
        const ta = new Date(a.date || a.createdAt || 0).getTime();
        const tb = new Date(b.date || b.createdAt || 0).getTime();
        const aPast = ta < now;
        const bPast = tb < now;
        if (aPast !== bPast) return aPast ? 1 : -1;
        return ta - tb;
      },
    };

    if (sorters[sortOption]) {
      working = [...working].sort(sorters[sortOption]);
    }

    if (sortDir === "desc") {
      working.reverse();
    }

    setFilteredEvents(working);
    setCurrentPage(0); // reset page when filters change
  }, [searchQuery, categoryFilter, feeFilter, events, sortOption, sortDir]);

  if (loading) return <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />;
  if (error) return <p className="eventsPage-error">{error}</p>;
  return (
    <div className="eventsPage-container">
      <Header />
      <main className="eventsPage-main">
        <h1 className="sr-only">Upcoming Events</h1>

        {/* 🔹 Search + Filters */}
        <div
          className={`eventsPage-searchWrapper fx-bar sticky-top ${
            isShrunk ? "eventsPage-searchWrapper--scrolled" : ""
          }`}
        >
          <div className="eventsPage-searchRow fx-inner">
            {/* Search Input with Icon */}
            <div className="eventsPage-searchBox fx-item">
              <span className="eventsPage-searchIcon">🔍</span>
              <input
                id="eventSearch"
                type="text"
                placeholder="Search by event title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleFocus}
                onClick={handleFocus}
                className="eventsPage-searchInput fx-input"
              />
            </div>

            {/* Category Filter */}
            <div className="fx-selectWrap fx-item">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                onFocus={handleFocus}
                onClick={handleFocus}
                className="eventsPage-filterSelect fx-select"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <span className="fx-selectBorder" aria-hidden="true" />
            </div>

            {/* Fee Toggle Pills */}
            <div
              className="fx-feeToggle fx-item"
              role="group"
              aria-label="Filter by pricing"
            >
              {[
                { label: "All", val: "" },
                { label: "Free", val: "free" },
                { label: "Paid", val: "paid" },
              ].map((btn) => (
                <button
                  key={btn.val || "all"}
                  type="button"
                  className="fx-pill"
                  data-active={feeFilter === btn.val}
                  onClick={() => {
                    setFeeFilter(btn.val);
                    handleFocus();
                  }}
                >
                  {btn.label}
                </button>
              ))}
              <span
                className="fx-pill-indicator"
                style={{
                  "--fx-index":
                    feeFilter === "free" ? 1 : feeFilter === "paid" ? 2 : 0,
                }}
              />
            </div>

            {/* Sorting Controls */}
            <div
              className="fx-sortControls fx-item"
              role="group"
              aria-label="Sort events"
            >
              <select
                className="fx-sortSelect"
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  handleFocus();
                }}
                onFocus={handleFocus}
                aria-label="Sort criteria"
              >
                <option value="new">New</option>
                <option value="popular">Most Popular</option>
                <option value="relevant">Relevant</option>
              </select>
              <button
                type="button"
                className="fx-sortDirBtn"
                onClick={() =>
                  setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                title={`Toggle sort direction (currently ${
                  sortDir === "asc" ? "Ascending" : "Descending"
                })`}
                aria-label="Toggle sort direction"
              >
                {sortDir === "asc" ? "↑" : "↓"}
              </button>
            </div>

            {/* Refresh Button */}
            <div className="fx-item">
              <button
                type="button"
                className="fx-refreshBtn"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh events"
                aria-label="Refresh events"
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? "⟳" : "🔄"}
              </button>
            </div>
          </div>
        </div>

        {filteredEvents.length === 0 && (
          <p className="eventsPage-noEvents">No events found.</p>
        )}

        <div className="eventCard-grid">
          {filteredEvents
            .slice(currentPage * perPage, (currentPage + 1) * perPage)
            .map((event, index) => {
            const startDate = event.date ? new Date(event.date) : null;
            const endDate = event.end_date ? new Date(event.end_date) : null;

            const formatMonth = (d) =>
              d.toLocaleDateString("en-US", { month: "short" });
            const formatDay = (d) => d.getDate();

            let dateTop = "";
            let dateBottom = "";

            if (startDate && endDate) {
              if (startDate.getMonth() === endDate.getMonth()) {
                dateTop = formatMonth(startDate);
                dateBottom = `${formatDay(startDate)}-${formatDay(endDate)}`;
              } else {
                dateTop = `${formatMonth(startDate)} ${formatDay(startDate)}`;
                dateBottom = `${formatMonth(endDate)} ${formatDay(endDate)}`;
              }
            } else if (startDate) {
              dateTop = formatMonth(startDate);
              dateBottom = formatDay(startDate);
            } else {
              dateTop = "--";
              dateBottom = "--";
            }

            return (
              <Link
                to={`/events/${event._id}`}
                key={event._id || index}
                className="eventCard"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {event.event_image ? (
                  <img
                    src={event.event_image}
                    alt={event.title}
                    className="eventCard-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="eventCard-image eventCard-image--placeholder">
                    <span>No Image</span>
                  </div>
                )}

                {/* Full dark gradient overlay */}
                <div className="eventCard-gradient" aria-hidden="true" />

                {/* Blurred info bar */}
                <div className="eventCard-infoBar">
                  <div className="eventCard-dateBlock">
                    <span className="eventCard-dateTop">{dateTop}</span>
                    <span className="eventCard-dateBottom">{dateBottom}</span>
                  </div>

                  <div className="eventCard-divider" aria-hidden="true" />

                  <div className="eventCard-meta">
                    <span className="eventCard-category">
                      {(
                        event.category ||
                        event.event_type ||
                        "EVENT"
                      ).toUpperCase()}
                    </span>
                    <h3 className="eventCard-title" title={event.title}>
                      {event.title}
                    </h3>
                    {event.location && (
                      <p className="eventCard-location">{event.location}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {filteredEvents.length > perPage && (
          <div className="pagination-wrap" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            margin: '2rem auto',
            maxWidth: '1200px',
            padding: '0 1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div className="per-page" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Show
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {[6, 12, 18, 24].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                events
              </label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  background: currentPage === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  color: currentPage === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                  borderRadius: '6px',
                  cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FaChevronLeft size={12} /> Prev
              </button>
              
              <div className="page-numbers" style={{ display: 'flex', gap: '2px' }}>
                {Array.from({
                  length: Math.ceil(filteredEvents.length / perPage),
                }).map((_, i) => (
                  <button
                    key={i}
                    className={
                      "page-btn" + (i === currentPage ? " active" : "")
                    }
                    onClick={() => setCurrentPage(i)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border-light)',
                      background: i === currentPage ? 'var(--accent-color)' : 'var(--bg-primary)',
                      color: i === currentPage ? 'white' : 'var(--text-primary)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      minWidth: '36px'
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              
              <div className="page-info" style={{ 
                fontSize: '0.9rem', 
                color: 'var(--text-muted)',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                Page {currentPage + 1} / {Math.ceil(filteredEvents.length / perPage)}
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
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  background: currentPage >= Math.ceil(filteredEvents.length / perPage) - 1 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  color: currentPage >= Math.ceil(filteredEvents.length / perPage) - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  borderRadius: '6px',
                  cursor: currentPage >= Math.ceil(filteredEvents.length / perPage) - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Next <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default EventsPage;
