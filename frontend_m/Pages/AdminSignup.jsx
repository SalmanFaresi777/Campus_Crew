import React, { useState, useEffect } from "react";
import { apiService } from "../utils/apiService";
import "../CSS/AdminSignup.css"; // Styles for admin signup page layout
import { useNavigate } from "react-router-dom";
import Loader from "../Components/loader";

// Admin signup page for validated administrator registration
function AdminSignup() {
  const secret = import.meta.env.VITE_ADMIN_SECRET;
  const navigate = useNavigate();
  // Controls splash screen animation duration
  const [pageLoading, setPageLoading] = useState(true);
  // Stores admin registration form inputs
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    dob: "",
    location: "",
    isAdmin: true,
    admin_secret: "",
  });

  // Displays splash screen on initial load
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Updates form state on user input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validates password confirmation on client side
    if (formData.confirm_password !== formData.password) {
      setError("Passwords do not match");
      return;
    }
    // Ensures admin secret matches environment configuration
    if (formData.admin_secret !== secret) {
      setError("Admin secret doesn't match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Backend handles full validation and user account setup
      const { data } = await apiService.register(formData);
      if (data.success) {
        setMessage(
          "Admin registered successfully! Please check your email for verification."
        );
        setFormData({
          username: "",
          email: "",
          password: "",
          confirm_password: "",
          dob: "",
          location: "",
          isAdmin: true,
          admin_secret: "",
        });
        navigate("/login");
      }
    } catch (error) {
      setError(
        error.response?.data?.message || "Something went wrong, try again"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {pageLoading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <div className="signup-card">
        <h2 className="signup-title">Admin Signup</h2>

        {error && <p className="error-msg">{error}</p>}
        {message && <p className="success-msg">{message}</p>}

        <form onSubmit={handleSubmit} className="signup-form">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm Password"
            value={formData.confirm_password}
            onChange={handleChange}
            required
          />
          <input
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
          />
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
          />
          <input
            type="text"
            name="admin_secret"
            placeholder="Admin Secret"
            value={formData.admin_secret}
            onChange={handleChange}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminSignup;
