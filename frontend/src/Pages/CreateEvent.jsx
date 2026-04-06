import React, { useState, useEffect } from "react";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";

import { toast, ToastContainer } from "react-toastify";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
} from "../utils/toastUtils";
import { apiService } from "../utils/apiService";
import { clearEventCaches } from "../utils/cacheUtils";
import { useAuth } from "../contexts/AuthContext";
import "react-toastify/dist/ReactToastify.css";

import "../CSS/createEvent.css"; // Only your custom CSS
import { useNavigate } from "react-router-dom";

function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    organizer: "",
    prize_money: 0,
    event_type: "offline",
    registration_deadline: "",
    registration_fee: 0,
    event_image: null,
    tags: "",
    category: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Client side guard
  useEffect(() => {
    if (!user) return; // wait until user loaded
    if (!user.isAdmin) {
      showErrorToast('You are not authorized to access Create Event page.');
      navigate('/forbidden', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      const file = files[0];
      if (file) {
        // Check file size (max 3MB)
        if (file.size > 3 * 1024 * 1024) {
          showErrorToast("Image size should be less than 3MB");
          return;
        }
        // Check file type
        if (!file.type.startsWith("image/")) {
          showErrorToast("Please select a valid image file");
          return;
        }
        setEvent({ ...event, [name]: file });
      }
    } else {
      setEvent({ ...event, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is logged in
    if (!user || !user._id) {
      showErrorToast("You must be logged in to create an event");
      return;
    }

    // Basic validation
    if (!event.title.trim()) {
      showErrorToast("Please enter an event title");
      return;
    }

    if (!event.description.trim()) {
      showErrorToast("Please enter an event description");
      return;
    }

    if (!event.date) {
      showErrorToast("Please select a date for the event");
      return;
    }

    if (!event.location.trim()) {
      showErrorToast("Please enter a location for the event");
      return;
    }

    if (!event.organizer.trim()) {
      showErrorToast("Please enter the organizer name");
      return;
    }

    if (!event.registration_deadline) {
      showErrorToast("Please select a registration deadline");
      return;
    }
    const tagsArray = event.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    // Check if date is in the future
    const selectedDate = new Date(event.date);
    const now = new Date();

    if (selectedDate <= now) {
      showErrorToast("Event date must be in the future");
      return;
    }

    // Check if registration deadline is before event date
    const regDeadline = new Date(event.registration_deadline);

    // Additional check: registration deadline should also be in the future
    if (regDeadline <= now) {
      showErrorToast("Registration deadline must be in the future");
      return;
    }

    if (regDeadline >= selectedDate) {
      const eventDateStr = selectedDate.toLocaleDateString();
      const regDateStr = regDeadline.toLocaleDateString();
      showErrorToast(
        `Registration deadline (${regDateStr}) must be before event date (${eventDateStr})`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Show loading toast
      showInfoToast("Creating event...");

      // Create FormData for multipart/form-data
      const formData = new FormData();

      formData.append("title", event.title);
      formData.append("description", event.description);
      formData.append("date", event.date);
      formData.append("location", event.location);
      formData.append("organizer", event.organizer);
      formData.append("prize_money", event.prize_money);
      formData.append("event_type", event.event_type);
      formData.append("registration_deadline", event.registration_deadline);
      formData.append("registration_fee", event.registration_fee);
      formData.append("createdBy", user._id); // Add the logged-in user's ID
      formData.append("category", event.category);
      formData.append("tags", tagsArray);


      if (event.event_image) {
        formData.append("image", event.event_image);
      }

      // Call API to create event
      const response = await apiService.createEvent(formData);

      if (response.data.success) {
        // Show success toast
        showSuccessToast(
          `Event "${event.title}" has been created successfully!`
        );

        // Clear events cache to ensure new event shows up in upcoming events
        clearEventCaches();

        // Reset form
        setEvent({
          title: "",
          description: "",
          date: "",
          location: "",
          organizer: "",
          prize_money: 0,
          event_type: "offline",
          registration_deadline: "",
          registration_fee: 0,
          event_image: null,
        });

        // Clear file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
      } else {
        showErrorToast(response.data.message || "Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create event. Please try again.";
      showErrorToast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ce-wrapper" style={{ fontFamily: "Silevena" }}>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      {!user ? (
        <div className="ce-form-container">
          <div className="ce-form">
            <h2 className="ce-form-title">Authentication Required</h2>
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              Please log in to create an event.
            </p>
          </div>
        </div>
      ) : (
        <div className="ce-form-container">
          <form className="ce-form" onSubmit={handleSubmit}>
            <h2 className="ce-form-title">Create Event</h2>

            {/* Event Title */}
            <div className="ce-form-group">
              <label className="ce-label">Event Title</label>
              <input
                type="text"
                name="title"
                placeholder="Enter event title"
                value={event.title}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>

            {/* Description */}
            <div className="ce-form-group">
              <label className="ce-label">Description</label>
              <textarea
                name="description"
                placeholder="Add event description"
                value={event.description}
                onChange={handleChange}
                className="ce-textarea"
                required
              />
            </div>

            {/* Event Image */}
            <div className="ce-form-group">
              <label className="ce-label">Event Image</label>
              <input
                type="file"
                name="event_image"
                accept="image/*"
                onChange={handleChange}
                className="ce-input"
              />
              <small className="ce-help-text">
                Max size: 3MB. Supported formats: JPG, PNG, GIF
              </small>
            </div>

            {/* Date and Event Type */}
            <div className="ce-form-row">
              <div className="ce-form-group">
                <label className="ce-label">Event Date</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={event.date}
                  onChange={handleChange}
                  className="ce-input"
                  required
                />
                <small className="ce-help-text">
                  When will your event take place?
                </small>
              </div>
              <div className="ce-form-group">
                <label className="ce-label">Category</label>
                <input
                  type="text"
                  name="category"
                  placeholder="Enter event category"
                  value={event.category}
                  onChange={handleChange}
                  className="ce-input"
                  required
                />
              </div>
            </div>
            {/* Tags */}
            <div className="ce-form-group">
              <label className="ce-label">Tags</label>
              <input
                type="text"
                name="tags"
                placeholder="Enter event tags"
                value={event.tags}
                onChange={handleChange}
                className="ce-input"
              />
            </div>
            {/* Location */}
            <div className="ce-form-group">
              <label className="ce-label">Location</label>
              <input
                type="text"
                name="location"
                placeholder="Enter event location"
                value={event.location}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>

            {/* Organizer */}
            <div className="ce-form-group">
              <label className="ce-label">Organizer</label>
              <input
                type="text"
                name="organizer"
                placeholder="Enter organizer name or organization"
                value={event.organizer}
                onChange={handleChange}
                className="ce-input"
                required
              />
              <small className="ce-help-text">
                Name of the person or organization organizing this event
              </small>
            </div>

            {/* Registration Details */}
            <div className="ce-form-row">
              <div className="ce-form-group">
                <label className="ce-label">Registration Deadline</label>
                <input
                  type="datetime-local"
                  name="registration_deadline"
                  value={event.registration_deadline}
                  onChange={handleChange}
                  className="ce-input"
                  required
                />
                <small className="ce-help-text">
                  Set the last date/time for registration (must be before event
                  date)
                </small>
              </div>
              <div className="ce-form-group">
                <label className="ce-label">Registration Fee (৳)</label>
                <input
                  type="number"
                  name="registration_fee"
                  min="0"
                  step="0.01"
                  value={event.registration_fee}
                  onChange={handleChange}
                  className="ce-input"
                  required
                />
              </div>
            </div>

            {/* Prize Money */}
            <div className="ce-form-group">
              <label className="ce-label">Prize Money (৳)</label>
              <input
                type="number"
                name="prize_money"
                min="0"
                step="0.01"
                value={event.prize_money}
                onChange={handleChange}
                className="ce-input"
                required
              />
            </div>

            <button
              type="submit"
              className={`ce-btn ce-full-width ${
                isSubmitting ? "ce-btn-loading" : ""
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="ce-loading-spinner"></span>
                  Creating Event...
                </>
              ) : (
                "Create Event"
              )}
            </button>
          </form>
        </div>
      )}
      <Footer />

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default CreateEvent;
