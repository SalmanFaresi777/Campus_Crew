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
import axios from "axios";

import cloud from "../assets/img/cloud.png";
import coin from "../assets/img/coin.png";
import dots from "../assets/img/dots.png";
import rocket from "../assets/img/rocket.png";
import spring from "../assets/img/spring.png";
import stars from "../assets/img/stars.png";
import white_outline from "../assets/img/white_outline.png";

function Login() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  console.log(backend_link);
  const [showLogin, setShowLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    dob: new Date(),
  });
  const [loading, setLoading] = useState(false); // Loading state
  const datePickerRef = useRef(null);
  const [isPasswordValid, setIsPasswordValid] = useState(false); // Password validity state
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate
  const { login, isAuthenticated } = useAuth(); // Get login function and auth state from auth context

  // Redirect to homepage if user is already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const changeHandler = (e) => {
    const { name, value, type, checked } = e.target;
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
    console.log("sign in executed");
    setLoading(true); // Show loader
    try {
      const response = await axios.post(
        `${backend_link}/api/login`,
        loginForm, // Axios automatically stringifies JSON
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data; // Axios response data is here

      if (data.success) {
        const user = data.user;
        if (user && user.isAdmin && !user.isApprovedAdmin) {
          setLoading(false); // allow toast to show unobstructed
          toast.warning("You are not approved as an admin yet.");
        } else {
          // Use the auth context login function
          await login(data.token, data.refreshtoken, user);
          localStorage.setItem("refresh-token", data.refreshtoken); // Store refresh token
          // Hide loader before showing toast so it's visible
          setLoading(false);
          toast.success("Login successful! Welcome back!", {
            autoClose: 1000,
            onClose: () => navigate("/"), // Navigate after toast closes
          });
          return; // Skip finally navigation logic
        }
      } else {
        toast.error(data.errors || "Login failed. Please try again.");
      }
    } catch (error) {
      if (error.response) {
        // Server responded with a status other than 2xx
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
        console.error("Axios error:", error.message);
        toast.error("An error occurred during login. Please try again.");
      }
    } finally {
      // If we already turned loading off & scheduled navigation via toast, this is harmless
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
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
        localStorage.setItem("auth-token", data.accessToken); // Update access token
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
      return; // Exit the function if password criteria are not met
    }
    setLoading(true); // Show loader
    toast.info("Creating your account...", { autoClose: 1500 });

    try {
      const response = await axios.post(`${backend_link}/api/signup`, {
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        dob: registerForm.dob, // Include DOB
        location: registerForm.location, // Include Location
        isAdmin: false,
      });

      const data = response.data; // axios automatically parses JSON

      if (data.success) {
        toast.success(
          data.message ||
            "Signup successful! Please check your email for a verification link."
        );
        setShowLogin(true); // Redirect to sign-in state
      } else {
        toast.error(data.errors || "Signup failed");
      }
    } catch (error) {
      console.error("Failed to fetch during signup:", error);
      toast.error(error.response?.data?.errors || "Signup request failed");
    } finally {
      setLoading(false); // Hide loader
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
    if (showLogin) {
      signin();
    } else {
      signup();
    }
  };
  const handlePasswordChange = (password) => {
    console.log("Password:", password); // Debugging password change
    setRegisterForm({ ...registerForm, password });
  };

  const handlePasswordValidityChange = (isValid) => {
    console.log("Is password valid:", isValid); // Debugging password validity
    setIsPasswordValid(isValid);
  };
  const handleForgotPassword = () => {
    navigate("/forgot-password"); // Navigate to the forgot password page
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
      {loading && <Loader />} {/* Render the loader when loading is true */}
      <div className={`form-container ${loading ? "blurred" : ""}`}>
        {" "}
        {/* Optionally blur the form when loading */}
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
                    <a onClick={handleForgotPassword}>Forgot Password?</a>
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
