import React, { useState, useRef, useEffect } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../CSS/login.css";
import { Link, useNavigate } from "react-router-dom";
import Loader from "../Components/loader_login"; // Import the Loader component
import { useAuth } from "../contexts/AuthContext";
// import { fetchWithToken } from "../Utils/authUtils";
import PasswordChecklist from "react-password-checklist";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { apiService } from "../utils/apiService";

import cloud from "../assets/img/cloud.png";
import coin from "../assets/img/coin.png";
import dots from "../assets/img/dots.png";
import rocket from "../assets/img/rocket.png";
import spring from "../assets/img/spring.png";
import stars from "../assets/img/stars.png";
import white_outline from "../assets/img/white_outline.png";

// Primary component for user authentication and account creation
function Login() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  // Toggle between sign-in and registration modes
  const [showLogin, setShowLogin] = useState(true);
  // Data for sign-in form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  // Data for registration form
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    dob: new Date(),
  });
  const [loading, setLoading] = useState(false); // Display loading indicator
  const datePickerRef = useRef(null);
  const [isPasswordValid, setIsPasswordValid] = useState(false); // Track password strength
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Navigation helper
  const { login, isAuthenticated } = useAuth(); // Access authentication methods

  // Automatically redirect authenticated users to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Toggle visibility of password text in input fields
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const changeHandler = (e) => {
    const { name, value, type, checked } = e.target;
    // Handle form updates for both login and registration based on current mode
    if (showLogin) {
      setLoginForm({ ...loginForm, [name]: value });
    } else {
      setRegisterForm({
        ...registerForm,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const signin = async () => {
    setLoading(true); // Display progress indicator
    try {
      const { data } = await apiService.login(loginForm);
      // Response includes success status, user data, and tokens

      if (data.success) {
        const user = data.user;
        // Prevent unapproved administrators from accessing the system
        if (user && user.isAdmin && !user.isApprovedAdmin) {
          setLoading(false); // Clear loading to show notification
          toast.warning("You are not approved as an admin yet.");
        } else {
          // Store authentication data through context
          await login(data.token, data.refreshtoken, user);
          localStorage.setItem("refresh-token", data.refreshtoken); // Persist refresh token
          // Clear loading before showing success message
          setLoading(false);
          toast.success("Login successful! Welcome back!", {
            autoClose: 1000,
            onClose: () => navigate("/"), // Redirect after notification
          });
          return; // Skip default navigation handling
        }
      } else {
        toast.error(data.errors || "Login failed. Please try again.");
      }
    } catch (error) {
      if (error.response) {
        // Server returned an error status
        console.error("Server error:", error.response);
        toast.error(
          error.response.data?.errors ||
            `HTTP error! status: ${error.response.status}`
        );
      } else if (error.request) {
        // Request was made but no response
        console.error("No response received:", error.request);
        toast.error("No response from server. Please try again.");
      } else {
        // Other errors
        console.error("Request error:", error.message);
        toast.error("An error occurred during login. Please try again.");
      }
    } finally {
      // If we already turned loading off & scheduled navigation via toast, this is harmless
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      // Utility function for silent token renewal in future implementations
      const refreshToken = localStorage.getItem("refresh-token");
      if (!refreshToken) throw new Error("No refresh token available");

      const response = await fetch(
        "https://backend-beryl-nu-15.vercel.app/token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: refreshToken }),
        }
      );

      const data = await response.json();

      if (data.accessToken) {
        localStorage.setItem("auth-token", data.accessToken); // Update stored access token
        return data.accessToken;
      } else {
        throw new Error("Failed to refresh token");
      }
    } catch (error) {
      console.error("Error refreshing access token:", error);
      toast.error("Session expired, please log in again.");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("refresh-token");
      window.location.replace("/login");
    }
  };

  const signup = async () => {
    if (!isPasswordValid) {
      toast.warning("Password does not meet the criteria.");
      return; // Stop execution if password requirements aren't satisfied
    }
    setLoading(true); // Show loading indicator
    toast.info("Creating your account...", { autoClose: 1500 });

    try {
      const { data } = await apiService.register({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        dob: registerForm.dob, // Include date of birth
        location: registerForm.location, // Include user location
        isAdmin: false,
      });

      if (data.success) {
        toast.success(
          data.message ||
            "Signup successful! Please check your email for a verification link."
        );
        setShowLogin(true); // Switch to sign-in view
      } else {
        toast.error(data.errors || "Signup failed");
      }
    } catch (error) {
      console.error("Failed to fetch during signup:", error);
      toast.error(error.response?.data?.errors || "Signup request failed");
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  const handleLoginClick = () => {
    setShowLogin(true);
    toast.info("Switched to Sign In", { autoClose: 1000 });
  };

  const handleRegisterClick = () => {
    setShowLogin(false);
    toast.info("Switched to Sign Up", { autoClose: 1000 });
  };

  const handleDateChange = (date) => {
    setRegisterForm({ ...registerForm, dob: date });
  };

  const handleCalendarIconClick = () => {
    datePickerRef.current.setFocus();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Execute appropriate action based on current form mode
    if (showLogin) {
      signin();
    } else {
      signup();
    }
  };
  const handlePasswordChange = (password) => {
    setRegisterForm({ ...registerForm, password });
  };

  const handlePasswordValidityChange = (isValid) => {
    setIsPasswordValid(isValid);
  };
  const handleForgotPassword = () => {
    navigate("/forgot-password"); // Go to password recovery page
  };

  return (
    <div className="login-background">
      <ToastContainer
        position="top-right"
        newestOnTop
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      {loading && <Loader />} {/* Show loading component during requests */}
      <div className={`form-container ${loading ? "blurred" : ""}`}>
        {" "}
        {/* Apply blur effect to form during loading */}
        <div
          className="col col-1"
          style={{ borderRadius: showLogin ? "0 30% 20% 0" : "0 20% 30% 0" }}
        >
          <div className="image-layer">
            <img src={white_outline} className="form-image-main" alt="main" />
            <img src={dots} className="form-image dots" alt="dots" />
            <img src={coin} className="form-image coin" alt="coin" />
            <img src={spring} className="form-image spring" alt="spring" />
            <img src={rocket} className="form-image rocket" alt="rocket" />
            <img src={cloud} className="form-image cloud" alt="cloud" />
            <img
              src={stars}
              //   src={stars}
              className="form-image stars"
              alt="star"
            />
          </div>
          <Link to="/" className="home-icon">
            <i className="bx bx-home"></i>
          </Link>
          <p className="featured-words">
            Welcome To <span>CampusCrew</span>
          </p>
        </div>
        <div className="col col-2">
          <div className="btn-box">
            <button
              className="btn btn-1"
              onClick={handleLoginClick}
              style={{
                backgroundColor: showLogin
                  ? "#21264D"
                  : "rgba(255, 255, 255, 0.2)",
              }}
            >
              Sign In
            </button>
            <button
              className="btn btn-2"
              onClick={handleRegisterClick}
              style={{
                backgroundColor: showLogin
                  ? "rgba(255, 255, 255, 0.2)"
                  : "#21264D",
              }}
            >
              Sign Up
            </button>
          </div>

          <form
            className={showLogin ? "login-form" : "register-form"}
            onSubmit={handleFormSubmit}
          >
            <div className="form-title">
              <span>{showLogin ? "Sign In" : "Create Account"}</span>
            </div>
            {showLogin ? (
              <>
                <div className="form-inputs">
                  <div className="input-group">
                    <input
                      type="text"
                      name="email"
                      value={loginForm.email}
                      onChange={changeHandler}
                      required
                    />
                    <label>Email</label>
                  </div>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginForm.password}
                      onChange={changeHandler}
                      required
                    />
                    <label>Password</label>
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <i className="bx bx-hide"></i>
                      ) : (
                        <i className="bx bx-show"></i>
                      )}
                    </button>
                  </div>

                  <div className="forgot-pass">
                      <button
                        type="button"
                        className="forgot-password-link"
                        onClick={handleForgotPassword}
                      >
                        Forgot Password?
                      </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-inputs">
                  <div className="input-group">
                    <input
                      type="text"
                      name="username"
                      value={registerForm.username}
                      onChange={changeHandler}
                      required
                    />
                    <label>Username</label>
                  </div>
                  <div className="input-group">
                    <input
                      type="email"
                      name="email"
                      value={registerForm.email}
                      onChange={changeHandler}
                      required
                    />
                    <label>Email</label>
                  </div>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={registerForm.password}
                      onChange={changeHandler}
                      required
                    />
                    <label>Password</label>
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <i className="bx bx-hide"></i>
                      ) : (
                        <i className="bx bx-show"></i>
                      )}
                    </button>
                  </div>

                  <div className="input-box">
                    <label htmlFor="dob" className="label">
                      Date of Birth
                    </label>
                    <div className="dob-container">
                      <DatePicker
                        ref={datePickerRef}
                        id="dob"
                        className="input-select"
                        selected={registerForm.dob}
                        onChange={handleDateChange}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="Select Date"
                        peekNextMonth
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                      />
                      <FaRegCalendarAlt
                        className="calendar-icon"
                        onClick={handleCalendarIconClick}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <input
                      type="text"
                      name="location"
                      value={registerForm.location}
                      onChange={changeHandler}
                      required
                    />
                    <label>Location</label>
                  </div>
                </div>
                <PasswordChecklist
                  rules={[
                    "minLength",
                    "specialChar",
                    "number",
                    "capital",
                    "lowercase",
                  ]}
                  minLength={8}
                  value={registerForm.password}
                  onChange={handlePasswordValidityChange} // Update password validity and show error toast
                />
              </>
            )}
            <div className="input-box">
              <button
                type="submit"
                className={`input-submit ${
                  showLogin ? "login-btn" : "signup-btn"
                }`}
              >
                {showLogin ? "Login" : "Sign Up"}
                <i className="bx bx-right-arrow-alt"></i>
              </button>
            </div>
          </form>
        </div>
        {/* {!showLogin && (
          <div className="admin-box">
            <label className="admin-checkbox">
              <input
                type="checkbox"
                name="isAdmin"
                checked={registerForm.isAdmin}
                onChange={changeHandler}
              />
              <span className="admin-text">
                &nbsp;&nbsp;&nbsp;&nbsp;Sign up
                <br />
                as an admin
              </span>
            </label>
          </div>
        )} */}
      </div>
    </div>
  );
}

export default Login;
