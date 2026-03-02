import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaRocket,
  FaBullseye,
  FaTools,
  FaLock,
  FaChartLine,
  FaUsers,
  FaCogs,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import "../CSS/home.css";
import HeroBanner from "../Components/HeroBanner";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import Loader from "../Components/loader";

const Home = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const backend_link = import.meta.env.VITE_BACKEND_LINK;

  const [events, setEvents] = useState([]);
  const [evLoading, setEvLoading] = useState(true);
  const [evError, setEvError] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // pause on hover/focus
  const [loading, setLoading] = useState(true);

  // Basic scroll reveal (CSS class toggling)
  useEffect(() => {
    // Scroll reveal for elements with .reveal
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in-view");
        });
      },
      { threshold: 0.15 }
    );
    const revealEls = document.querySelectorAll(".reveal");
    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Fetch a small set of upcoming events (limit 6)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        let UserID = user && user._id ? user._id : "68ab36aab6a497f164b55d07";
        const { data } = await axios.get(
          `${backend_link}/api/suggested_events/${UserID}`
        );
        if (data.success) {
          console.log(data.recommended);
          setEvents(data.recommended);
        }
      } catch (e) {
        if (!ignore) setEvError("Failed to load events");
      } finally {
        if (!ignore) {
          setEvLoading(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [backend_link]);

  // Navigation handlers for single event showcase
  const nextEvent = useCallback(() => {
    setCurrentIdx((i) => (events.length ? (i + 1) % events.length : 0));
  }, [events.length]);
  const prevEvent = useCallback(() => {
    setCurrentIdx((i) =>
      events.length ? (i - 1 + events.length) % events.length : 0
    );
  }, [events.length]);

  // Autoplay (skip if user prefers reduced motion)
  useEffect(() => {
    if (isPaused) return; // paused due to hover/focus
    if (events.length < 2) return; // nothing to rotate
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return; // respect user preference
    const id = setInterval(() => {
      setCurrentIdx((i) => (i + 1) % events.length);
    }, 6500); // 6.5s interval
    return () => clearInterval(id);
  }, [events.length, isPaused]);

  // Keyboard navigation (left/right arrows) when section in view
  useEffect(() => {
    const handler = (e) => {
      if (!events.length) return;
      if (e.key === "ArrowRight") nextEvent();
      if (e.key === "ArrowLeft") prevEvent();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [events.length, nextEvent, prevEvent]);

  return (
    <div className="home-container">
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />

      <main>
        <HeroBanner />

        <section className="features-section reveal">
          <h2 className="section-title">Why CampusCrew?</h2>
          <p className="section-lead">
            A complete platform to plan, promote, and manage student events with
            ease.
          </p>

          <div className="features-grid">
            <div className="feature-card pop">
              <div className="feature-icon">
                <FaRocket />
              </div>
              <h3 className="feature-title">Create Events Easily</h3>
              <p className="feature-description">
                Set up event pages, registration forms, and schedules in
                minutes—no coding required.
              </p>
            </div>

            <div className="feature-card pop delay-1">
              <div className="feature-icon">
                <FaBullseye />
              </div>
              <h3 className="feature-title">Increase Participation</h3>
              <p className="feature-description">
                Smart reminders and personalized updates ensure students never
                miss an event.
              </p>
            </div>

            <div className="feature-card pop delay-2">
              <div className="feature-icon">
                <FaCogs />
              </div>
              <h3 className="feature-title">Simplify Management</h3>
              <p className="feature-description">
                Automate approvals, track attendance, and manage waitlists with
                zero hassle.
              </p>
            </div>

            <div className="feature-card pop delay-3">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3 className="feature-title">Get Valuable Insights</h3>
              <p className="feature-description">
                Visualize attendance trends, engagement levels, and event
                performance metrics.
              </p>
            </div>

            <div className="feature-card pop delay-4">
              <div className="feature-icon">
                <FaLock />
              </div>
              <h3 className="feature-title">Secure & Reliable</h3>
              <p className="feature-description">
                Keep data safe with role-based access and secure authentication.
              </p>
            </div>

            <div className="feature-card pop delay-5">
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h3 className="feature-title">Build Campus Community</h3>
              <p className="feature-description">
                Turn events into lasting connections and foster an active
                student network.
              </p>
            </div>
          </div>
        </section>

        {/* Event Showcase Section (Single Image Hover-Reveal) */}
        <section
          className="eventShowcase-section reveal"
          aria-labelledby="eventShowcase-heading"
        >
          <div className="eventShowcase-inner single-mode">
            <header className="eventShowcase-header">
              <h2 id="eventShowcase-heading" className="eventShowcase-title">
                Upcoming <span className="gradient-text">Spotlight</span>
              </h2>
              <p className="eventShowcase-sub">
                Hover over image to slide and reveal event details. Navigate
                with arrows.
              </p>
            </header>
            {evLoading && (
              <div className="eventShowcase-loading">Loading events...</div>
            )}
            {!evLoading && evError && (
              <div className="eventShowcase-error">{evError}</div>
            )}
            {!evLoading && !evError && events.length === 0 && (
              <div className="eventShowcase-empty">No upcoming events yet.</div>
            )}
            {!evLoading && !evError && events.length > 0 && (
              <div
                className="eventSlide-wrapper"
                role="region"
                aria-label="Event preview"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onFocus={() => setIsPaused(true)}
                onBlur={(e) => {
                  // If focus leaves the wrapper entirely
                  if (!e.currentTarget.contains(e.relatedTarget))
                    setIsPaused(false);
                }}
              >
                <button
                  aria-label="Previous event"
                  className="nav-arrow prev"
                  onClick={prevEvent}
                  disabled={events.length < 2}
                >
                  &lt;
                </button>
                <button
                  aria-label="Next event"
                  className="nav-arrow next"
                  onClick={nextEvent}
                  disabled={events.length < 2}
                >
                  &gt;
                </button>
                {events.map((ev, i) => {
                  const active = i === currentIdx;
                  const d = ev.date ? new Date(ev.date) : null;
                  const month = d
                    ? d.toLocaleDateString("en-US", { month: "short" })
                    : "--";
                  const day = d ? d.getDate() : "--";
                  const direction = i % 2 === 0 ? "left" : "right";
                  return (
                    <div
                      key={ev._id || i}
                      className={`eventSlide ${
                        active ? "is-active" : ""
                      } dir-${direction}`}
                      aria-hidden={!active}
                    >
                      <Link
                        to={`/events/${ev._id}`}
                        className="eventSlide-link"
                        tabIndex={active ? 0 : -1}
                      >
                        <div className="eventSlide-imageWrap">
                          {ev.event_image ? (
                            <img
                              src={ev.event_image}
                              alt={ev.title}
                              loading="lazy"
                            />
                          ) : (
                            <div className="img-fallback">No Image</div>
                          )}
                        </div>
                        <div className="eventSlide-details">
                          <div className="eventSlide-date">
                            <span className="m">{month}</span>
                            <span className="d">{day}</span>
                          </div>
                          <h3 className="eventSlide-title" title={ev.title}>
                            {ev.title}
                          </h3>
                          {ev.location && (
                            <p className="eventSlide-loc">{ev.location}</p>
                          )}
                          {ev.event_type && (
                            <span className="eventSlide-chip">
                              {ev.event_type}
                            </span>
                          )}
                          {ev.description && (
                            <p className="eventSlide-desc">{ev.description}</p>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="eventShowcase-ctaRow">
              <Link to="/upcoming-events" className="btn btn-primary">
                View All Events
              </Link>
            </div>
          </div>
          <div className="eventShowcase-deco orb orb-a" aria-hidden="true" />
          <div className="eventShowcase-deco orb orb-b" aria-hidden="true" />
        </section>
        <section className="process-section reveal">
          <div className="process-inner">
            <h2 className="section-title">How CampusCrew Works</h2>
            <div className="process-grid">
              {[
                {
                  step: "01",
                  title: "Create",
                  text: "Set up event details, schedules, and registration forms in minutes.",
                },
                {
                  step: "02",
                  title: "Promote",
                  text: "Share events with branded pages, email invites, and social posts.",
                },
                {
                  step: "03",
                  title: "Engage",
                  text: "Manage check-ins, send live updates, and keep students connected.",
                },
                {
                  step: "04",
                  title: "Analyze",
                  text: "View attendance stats and feedback to improve future events.",
                },
              ].map((item) => (
                <div key={item.step} className="process-card pop">
                  <span className="badge-step">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="testimonial-band reveal">
          <div className="marquee">
            <div className="marquee-track">
              {[
                '“Attendance jumped 40%." – Club Lead',
                '“Setup was unbelievably fast." – Event Admin',
                '“Analytics justified our funding." – Treasurer',
                '“Students loved the UX." – Society President',
              ].map((t, i) => (
                <span key={i} className="marquee-item">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* <footer className="home-footer">
        <p>&copy; 2025 Your Company. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer> */}
      <Footer />
    </div>
  );
};

export default Home;
