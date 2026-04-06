import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { apiService } from "../utils/apiService";
import { clearEventCaches } from "../utils/cacheUtils";
import { useAuth } from "../contexts/AuthContext";
import { ToastContainer } from "react-toastify";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";
import Loader from "../Components/loader";
import "../CSS/upEventPage.css";
import "../CSS/eventDetails.css";
import axios from "axios";

// Helper to format date/time elegantly
const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shimmerLines = Array.from({ length: 6 });

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [regError, setRegError] = useState("");
  const backend = import.meta.env.VITE_BACKEND_LINK;
  // editing handled on separate page now
  const eventID = useParams(id);
  const getRegistration = async () => {
    const eventId = eventID.id;
    try {
      const { data } = await axios.get(
        `${backend}/api/event/${eventId}/user/${user._id}`
      );
      if (data.success) {
        setIsRegistered(true);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiService.getEvent(id);
        if (data.success) {
          setEvent(data.event);
          getRegistration();
        } else {
          setError(data.message || "Failed to load event");
        }
      } catch (e) {
        setError(e.response?.data?.message || "Error loading event");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openEdit = () => {
    if (event) navigate(`/events/${event._id}/edit`);
  };

  const deleteEvent = async () => {
    if (!event) return;
    if (!confirm("Delete this event?")) return;
    try {
      const { data } = await apiService.deleteEvent(event._id);
      if (data.success) {
        showSuccessToast("Event deleted");
        
        // Clear events cache to ensure deleted event is removed from listings
        clearEventCaches();
        
        navigate("/upcoming-events");
      } else {
        setRegError(data.message || "Delete failed");
      }
    } catch (err) {
      setRegError(err.response?.data?.message || "Delete failed");
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!event) return;
    if (isRegistered) {
      return;
    }
    if (new Date(event.registration_deadline) < new Date()) return;

    setRegError("");
    try {
      if (event.registration_fee === 0) {
        try {
          const { data } = await axios.post(`${backend}/api/register-event`, {
            userId: user._id,
            eventId: event._id,
          });
          if (data.success) {
            showSuccessToast("Registration completed.");
            setIsRegistered(true);
          }
        } catch (error) {
          console.log(error.message);
        }
      } else {
        console.log(event.registration_fee);
        console.log(typeof event.registration_fee);
        // alert("Bkash");
        try {
          const { data } = await axios.post(
            `${backend}/api/bkash/pay`,
            {
              amount: event.registration_fee,
              eventId: event._id,
              userId: user._id,
            },
            { withCredentials: true }
          );
          window.location.href = data.bkashURL;
          console.log(data);
        } catch (error) {
          console.log(error);
        }
      }

      // window.location.href = data.url;
    } catch (e) {
      setRegError(e.response?.data?.message || "Registration failed");
    } finally {
    }
  };

  const handleUnRegister = async () => {
    console.log("unregister");
    console.log(event._id);
    console.log(user._id);
    try {
      const { data } = await axios.put(`${backend}/api/unregister`, {
        userId: user._id,
        eventId: event._id,
      });
      if (data.success) {
        console.log(data);
        showSuccessToast("Unregistered successfully. ");
        showSuccessToast(data.message);
      }
    } catch (error) {
      showErrorToast("Unregistration failed.");
    }
  };

  return (
    <div className="eventDetails-wrapper" style={{ fontFamily: "Silevena" }}>
      <Header />
      <main className="eventDetails-main">
        <button
          className="ed-backBtn"
          onClick={() => navigate(-1)}
          aria-label="Back to events"
        >
          <span className="ed-backIcon">←</span> Back
        </button>

        {loading && (
          <div className="ed-loadingCard">
            <div className="ed-imageSkeleton shimmer" />
            <div className="ed-contentSkeleton">
              {shimmerLines.map((_, i) => (
                <div
                  key={i}
                  className="ed-line shimmer"
                  style={{ width: `${80 - i * 7}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="ed-error">
            <p>{error}</p>
            <button
              onClick={() => navigate("/upcoming-events")}
              className="ed-primaryBtn"
            >
              Go Back
            </button>
          </div>
        )}

        {!loading && !error && event && (
          <article className="ed-card" key={event._id}>
            <div className="ed-media">
              {event.event_image ? (
                <img
                  src={event.event_image}
                  alt={event.title}
                  className="ed-heroImage"
                />
              ) : (
                <div className="ed-heroPlaceholder">No Image</div>
              )}
              <div className="ed-mediaGradient" />
              <div className="ed-badgeGroup">
                <span className="ed-badge type">
                  {(event.event_type || "event").toUpperCase()}
                </span>
                {new Date(event.date) > new Date() ? (
                  <span className="ed-badge upcoming">UPCOMING</span>
                ) : (
                  <span className="ed-badge past">PAST</span>
                )}
              </div>
            </div>

            <div className="ed-body">
              <header className="ed-header">
                <h1 className="ed-title">{event.title}</h1>
                <p className="ed-organizer">
                  Hosted by <strong>{event.organizer}</strong>
                </p>
              </header>

              <section className="ed-metaGrid">
                <div className="ed-metaBox">
                  <h4>Date & Time</h4>
                  <p>{formatDateTime(event.date)}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Registration Ends</h4>
                  <p>{formatDateTime(event.registration_deadline)}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Location</h4>
                  <p>{event.location}</p>
                </div>
                {event.registration_fee !== 0 && (
                  <div className="ed-metaBox">
                    <h4>Fee</h4>
                    <p>
                      {event.registration_fee
                        ? `৳ ${event.registration_fee}`
                        : "Free"}
                    </p>
                  </div>
                )}
                {event.prize_money !== 0 && (
                  <div className="ed-metaBox">
                    <h4>Prize Money</h4>
                    <p>{event.prize_money ? `৳ ${event.prize_money}` : "—"}</p>
                  </div>
                )}
                <div className="ed-metaBox">
                  <h4>Created</h4>
                  <p>{formatDateTime(event.createdAt)}</p>
                </div>
                <div className="ed-metaBox">
                  <h4>Category</h4>
                  <p>{event.category}</p>
                </div>
              </section>

              <section className="ed-description">
                <h3>About this event</h3>
                <p>{event.description}</p>
              </section>

              <div className="ed-actions">
                {user?.isAdmin ? (
                  <>
                    <button className="ed-primaryBtn" onClick={openEdit}>
                      Edit Event
                    </button>
                    <button className="ed-outlineBtn" onClick={deleteEvent}>
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    {!isRegistered && (
                      <button
                        className={`ed-primaryBtn ${
                          !isRegistered ? "pulse" : ""
                        }`}
                        onClick={handleRegister}
                        disabled={isRegistered}
                      >
                        Register Now
                      </button>
                    )}
                    {isRegistered && (
                      <button
                        className={`ed-primaryBtn ${
                          !isRegistered ? "pulse" : ""
                        }`}
                        onClick={() => handleUnRegister()}
                      >
                        Unregister
                      </button>
                    )}
                    <button
                      className="ed-outlineBtn"
                      onClick={() => navigate("/upcoming-events")}
                    >
                      More Events
                    </button>
                  </>
                )}
              </div>
              {isRegistered && (
                <p
                  style={{
                    color: "rgb(78, 201, 176)",
                    fontSize: ".8rem",
                    marginTop: ".5rem",
                  }}
                >
                  You have registered for this event.
                </p>
              )}
            </div>
          </article>
        )}
      </main>
      <Footer />
      <ToastContainer />
      {/* {registering && (
        <Loader
          color={
            document.documentElement.getAttribute("data-theme") === "dark"
              ? "#ffffff"
              : "#000000"
          }
        />
      )} */}
    </div>
  );
}

export default EventDetails;
