import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import { apiService } from "../utils/apiService";
import { clearEventCaches } from "../utils/cacheUtils";
import { useAuth } from "../contexts/AuthContext";
import { showSuccessToast, showErrorToast } from "../utils/toastUtils";
import Loader from "../Components/loader";
import "../CSS/eventDetails.css";

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiService.getEvent(id);
        if (data.success) {
          const ev = data.event;
          setForm({
            title: ev.title,
            description: ev.description,
            date: new Date(ev.date).toISOString().slice(0, 16),
            registration_deadline: new Date(ev.registration_deadline)
              .toISOString()
              .slice(0, 16),
            location: ev.location,
            organizer: ev.organizer,
            prize_money: ev.prize_money,
            registration_fee: ev.registration_fee,
            category: ev.category,
            tags: ev.tags?.join(", ") || "",
            image: null,
            current_image: ev.event_image || "",
          });
        } else setError(data.message || "Failed to load");
      } catch (e) {
        setError(e.response?.data?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!user?.isAdmin)
    return (
      <div style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        Not authorized
      </div>
    );

  const onChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === "file") {
      const f = files[0];
      if (f) {
        if (!f.type.startsWith("image/")) {
          const msg = "Only image files allowed";
          setError(msg);
          showErrorToast(msg);
          e.target.value = "";
          return;
        }
        if (f.size > 3 * 1024 * 1024) {
          const msg = "Image must be 3MB or smaller";
          setError(msg);
          showErrorToast(msg);
          e.target.value = "";
          return;
        }
        setError("");
        setForm((p) => ({ ...p, image: f }));
      }
    } else setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form) return; // pre-check size again
    if (form.image && form.image.size > 3 * 1024 * 1024) {
      const msg = "Image must be 3MB or smaller";
      setError(msg);
      showErrorToast(msg);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "image") {
          if (v) fd.append("image", v);
        } else if (k === "tags") {
          const tagsArray = v
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
          tagsArray.forEach((tag) => fd.append("tags", tag));
        } else if (k !== "current_image") {
          fd.append(k, v);
        }
      });
      const { data } = await apiService.updateEvent(id, fd);
      if (data.success) {
        showSuccessToast("Event updated");
        
        // Clear events cache to ensure updated event shows up correctly
        clearEventCaches();
        
        navigate(`/events/${id}`);
      } else {
        const msg = data.message || "Update failed";
        setError(msg);
        showErrorToast(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Update failed";
      setError(msg);
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eventDetails-wrapper" style={{ fontFamily: "Silevena" }}>
      <Header />
      <main className="eventDetails-main">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <h1 className="ed-title">
            Edit Event
          </h1>
          <Link
            to={`/events/${id}`}
            className="ed-outlineBtn"
            style={{ textDecoration: "none" }}
          >
            Back
          </Link>
        </div>
        {loading && (
          <Loader
            color={
              document.documentElement.getAttribute("data-theme") === "dark"
                ? "#fff"
                : "#000"
            }
          />
        )}
        {!loading && error && (
          <p style={{ color: "var(--error-color,#ff6b6b)" }}>{error}</p>
        )}
        {!loading && !error && form && (
          <form onSubmit={submit} className="ed-fullPageForm">
            <div className="ed-formGrid">
              <div className="ed-field span-2">
                <label>Image</label>
                <div
                  className="ed-imageDrop ed-imageWide"
                  onClick={() =>
                    document.getElementById("edit-image-input").click()
                  }
                >
                  {form.image ? (
                    <img src={URL.createObjectURL(form.image)} alt="preview" />
                  ) : form.current_image ? (
                    <img src={form.current_image} alt="current" />
                  ) : (
                    <div className="ed-imagePlaceholder">Click to Upload</div>
                  )}
                  <input
                    id="edit-image-input"
                    type="file"
                    name="image"
                    accept="image/*"
                    hidden
                    onChange={onChange}
                  />
                </div>
                <small className="ed-help">JPG/PNG up to 3MB</small>
              </div>
              <div className="ed-field span-2">
                <label>Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field span-2">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  rows={5}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Date</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Registration Deadline</label>
                <input
                  type="datetime-local"
                  name="registration_deadline"
                  value={form.registration_deadline}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Catagory</label>
                <input
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Tags</label>
                <input
                  name="tags"
                  value={form.tags}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Location</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Organizer</label>
                <input
                  name="organizer"
                  value={form.organizer}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Fee (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="registration_fee"
                  value={form.registration_fee}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="ed-field">
                <label>Prize Money (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="prize_money"
                  value={form.prize_money}
                  onChange={onChange}
                  required
                />
              </div>
            </div>
            <div className="ed-editActions" style={{ marginTop: "1.2rem" }}>
              <button
                type="button"
                className="ed-outlineBtn"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`ed-primaryBtn ${saving ? "is-saving" : ""}`}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
