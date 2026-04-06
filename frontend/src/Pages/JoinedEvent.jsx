import React, { useState, useEffect } from "react";
import axios from "axios";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import "../CSS/joinedEvents.css";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

function JoinedEvent() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin and redirect to forbidden page
  useEffect(() => {
    if (user && user.isAdmin) {
      navigate('/forbidden');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    // Don't fetch data if user is admin (they will be redirected)
    if (!user || user.isAdmin) return;
    
    // alert(user._id);
    const fetchRegistrations = async () => {
      try {
        const response = await axios.get(
          `${backend_link}/api/registrations/user/${user._id}`
        );
        if (response.data.success) {
          setRegistrations(response.data.registration);
        } else {
          setError("Failed to load registered events");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching events");
      } finally {
        setLoading(false);
      }
    };
    fetchRegistrations();
  }, [backend_link, user]);

  const formatDateParts = (isoDate) => {
    if (!isoDate) return { month: "—", day: "—" };
    const d = new Date(isoDate);
    const month = d.toLocaleString("default", { month: "short" }).toUpperCase();
    const day = String(d.getDate()).padStart(2, "0");
    return { month, day };
  };

  if (loading) {
    return (
      <div className="je-page">
        <Header />
        <main className="je-main">
          <p className="je-status">Loading your events...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="je-page">
        <Header />
        <main className="je-main">
          <p className="je-status je-error">{error}</p>
        </main>
        <Footer />
      </div>
    );
  }
  const eventDetails = async (eventId) => {
    console.log(eventId);
    navigate(`/events/${eventId}`);
  };

  // Don't render anything if user is admin (they will be redirected)
  if (user && user.isAdmin) {
    return null;
  }

  return (
    <div className="je-page">
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      <main className="je-main">
        <h1 className="sr-only">My Joined Events</h1>

        {registrations.length === 0 && (
          <p className="je-status">You haven't joined any events yet.</p>
        )}

        {registrations.length > 0 && (
          <div className="je-grid">
            {registrations
              .slice() // make a copy so we don’t mutate state
              .sort((a, b) => {
                const dateA = new Date(a?.eventId?.date || 0);
                const dateB = new Date(b?.eventId?.date || 0);
                return dateA - dateB; // Ascending: earliest first
              })
              .map((reg) => {
                const event = reg.eventId || {};
                const { month, day } = formatDateParts(event.date);

                return (
                  <article
                    key={reg._id}
                    className="je-card"
                    aria-labelledby={`je-title-${reg._id}`}
                    onClick={() => eventDetails(event._id)}
                  >
                    <div className="je-book">
                      <div className="je-inner">
                        {/* Inside content (visible after flip) */}
                        <div className="je-content">
                          <h2
                            id={`je-title-${reg._id}`}
                            className="je-event-title"
                            title={event.title}
                          >
                            {event.title || "Untitled Event"}
                          </h2>
                          <p className="je-meta">
                            <strong>Location:</strong>{" "}
                            {event.location || "Location TBA"}
                          </p>
                          <p className="je-meta">
                            <strong>Prize:</strong>{" "}
                            {event.prize_money
                              ? `${event.prize_money} BDT`
                              : "—"}
                          </p>
                          <p className="je-meta">
                            <strong>Fee:</strong>{" "}
                            {event.registration_fee
                              ? `${event.registration_fee} BDT`
                              : "—"}
                          </p>
                          <p className="je-meta">
                            <strong>Payment:</strong>{" "}
                            {reg.payment_status || "—"}
                          </p>
                          <p className="je-meta">
                            <strong>Registered:</strong>{" "}
                            {reg.is_registered ? "Yes" : "No"}
                          </p>
                        </div>

                        {/* Cover */}
                        <div
                          className="je-cover"
                          tabIndex={0}
                          aria-label={`Open card for ${event.title || "event"}`}
                        >
                          {event.event_image ? (
                            <img
                              src={event.event_image}
                              alt={
                                event.title
                                  ? `${event.title} cover`
                                  : "Event cover"
                              }
                              className="je-cover-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="je-cover-img je-placeholder">
                              <span>No Image</span>
                            </div>
                          )}

                          <div className="je-cover-overlay" aria-hidden="true">
                            <div className="je-date-block">
                              <span className="je-month">{month}</span>
                              <span className="je-day">{day}</span>
                            </div>
                            <div
                              className="je-cover-title"
                              title={event.title || "Untitled Event"}
                            >
                              {event.title || "Untitled Event"}
                            </div>
                            <div className="je-hint">{event.catagory}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Screen reader fallback */}
                    <div className="sr-only">
                      Event: {event.title || "Untitled Event"}. Date: {month}{" "}
                      {day}. Location: {event.location || "Location TBA"}.
                      Prize: {event.prize_money || "—"} BDT. Fee:{" "}
                      {event.registration_fee || "—"} BDT. Payment status:{" "}
                      {reg.payment_status}. Registered:{" "}
                      {reg.is_registered ? "Yes" : "No"}.
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default JoinedEvent;
