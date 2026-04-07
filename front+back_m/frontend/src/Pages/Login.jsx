import React, { useState, useRef, useEffect } from "react";
import {
  FaRegCalendarAlt,
  FaEnvelope,
  FaLock,
  FaUser,
  FaMapMarkerAlt,
  FaSun,
  FaMoon,
  FaGithub,
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../CSS/login.css";
import { Link, useNavigate } from "react-router-dom";
import Loader from "../Components/loader_login";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
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
  const backendLink = import.meta.env.VITE_BACKEND_LINK;
  const navigate = useNavigate();
  const datePickerRef = useRef(null);

  const { login, isAuthenticated } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("remember-login") === "true"
  );

  const [loginErrors, setLoginErrors] = useState({});

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    dob: new Date(),
    location: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("remembered-email") || "";
    if (rememberedEmail) {
      setLoginForm((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleRememberToggle = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    localStorage.setItem("remember-login", String(checked));
  };

  const changeHandler = (e) => {
    const { name, value } = e.target;

    if (showLogin) {
      setLoginForm((prev) => ({ ...prev, [name]: value }));
      setLoginErrors((prev) => ({ ...prev, [name]: "" }));
    } else {
      setRegisterForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateLoginForm = () => {
    const errors = {};

    if (!loginForm.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!loginForm.password.trim()) {
      errors.password = "Password is required.";
    } else if (loginForm.password.length < 6) {
      errors.password = "Password should be at least 6 characters.";
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const signin = async () => {
    if (!validateLoginForm()) {
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${backendLink}/api/login`, loginForm, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const data = response.data;

      if (data.success) {
        const user = data.user;

        if (user && user.isApproved === false) {
          setLoading(false);
          toast.warning("Your account is pending admin approval.");
          return;
        }

        await login(data.token, data.refreshtoken, user);

        if (rememberMe) {
          localStorage.setItem("remembered-email", loginForm.email);
        } else {
          localStorage.removeItem("remembered-email");
        }

        localStorage.setItem("refresh-token", data.refreshtoken);
        setLoading(false);

        toast.success("Login successful! Welcome back.", {
          autoClose: 1000,
          onClose: () => navigate("/"),
        });
        return;
      }

      toast.error(data.errors || "Login failed. Please try again.");
    } catch (error) {
      if (error.response) {
        toast.error(
          error.response.data?.errors ||
            `Request failed with status ${error.response.status}`
        );
      } else if (error.request) {
        toast.error("Server is not responding. Please try again.");
      } else {
        toast.error("An unexpected error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    if (!isPasswordValid) {
      toast.warning("Password does not meet the required criteria.");
      return;
    }

    setLoading(true);
    toast.info("Creating your account...", { autoClose: 1000 });

    try {
      const response = await axios.post(`${backendLink}/api/signup`, {
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        dob: registerForm.dob,
        location: registerForm.location,
        isAdmin: false,
      });

      const data = response.data;

      if (data.success) {
        toast.success(
          data.message ||
            "Signup successful! Please verify email and wait for admin approval."
        );
        setShowLogin(true);
      } else {
        toast.error(data.errors || "Signup failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.errors || "Signup request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setRegisterForm((prev) => ({ ...prev, dob: date }));
  };

  const handleCalendarIconClick = () => {
    datePickerRef.current?.setFocus();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (showLogin) {
      signin();
    } else {
      signup();
    }
  };

  const handlePasswordValidityChange = (isValid) => {
    setIsPasswordValid(isValid);
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const handleSocialClick = (provider) => {
    toast.info(`${provider} sign in is coming soon.`);
  };

  return (
    <div className="login-background">
      <ToastContainer
        position="top-right"
        newestOnTop
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
      />

      {loading && <Loader />}

      <div className={`form-container ${loading ? "blurred" : ""}`}>
        <button
          type="button"
          className="theme-switch"
          role="switch"
          aria-checked={isDarkMode}
          aria-label="Toggle light and dark theme"
          onClick={toggleTheme}
          title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
        >
          <span className="theme-switch-track">
            <span className="theme-switch-thumb">
              {isDarkMode ? <FaMoon /> : <FaSun />}
            </span>
          </span>
          <span className="theme-switch-label">{isDarkMode ? "Dark" : "Light"}</span>
        </button>

        <div className="col col-1">
          <div className="image-layer">
            <img src={white_outline} className="form-image-main" alt="main" />
            <img src={dots} className="form-image dots" alt="dots" />
            <img src={coin} className="form-image coin" alt="coin" />
            <img src={spring} className="form-image spring" alt="spring" />
            <img src={rocket} className="form-image rocket" alt="rocket" />
            <img src={cloud} className="form-image cloud" alt="cloud" />
            <img src={stars} className="form-image stars" alt="stars" />
          </div>
          <Link to="/" className="home-icon" aria-label="Go to home page">
            <i className="bx bx-home" />
          </Link>
          <p className="featured-words">
            The easiest way to manage and discover university events with
            <span> CampusCrew</span>
          </p>
        </div>

        <div className="col col-2">
          <div className="btn-box" role="tablist" aria-label="Auth tabs">
            <button
              type="button"
              className={`btn btn-1 ${showLogin ? "active" : ""}`}
              role="tab"
              aria-selected={showLogin}
              onClick={() => setShowLogin(true)}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-2 ${!showLogin ? "active" : ""}`}
              role="tab"
              aria-selected={!showLogin}
              onClick={() => setShowLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form
            className={showLogin ? "login-form" : "register-form"}
            onSubmit={handleFormSubmit}
            noValidate
          >
            <div className="form-title">
              <span>{showLogin ? "Welcome back" : "Create your account"}</span>
            </div>

            {showLogin ? (
              <>
                <div className="form-inputs">
                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <FaEnvelope />
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      value={loginForm.email}
                      onChange={changeHandler}
                      required
                      aria-invalid={Boolean(loginErrors.email)}
                      aria-describedby={loginErrors.email ? "login-email-error" : undefined}
                    />
                    <label htmlFor="login-email">Email</label>
                    {loginErrors.email && (
                      <p id="login-email-error" className="field-error" role="alert">
                        {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <FaLock />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginForm.password}
                      onChange={changeHandler}
                      required
                      aria-invalid={Boolean(loginErrors.password)}
                      aria-describedby={
                        loginErrors.password ? "login-password-error" : undefined
                      }
                    />
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={showPassword ? "bx bx-hide" : "bx bx-show"} />
                    </button>
                    {loginErrors.password && (
                      <p
                        id="login-password-error"
                        className="field-error"
                        role="alert"
                      >
                        {loginErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="auth-row">
                    <label className="remember-wrap">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={handleRememberToggle}
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="forgot-link"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-inputs">
                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <FaUser />
                    </span>
                    <input
                      id="register-username"
                      type="text"
                      name="username"
                      value={registerForm.username}
                      onChange={changeHandler}
                      required
                    />
                    <label htmlFor="register-username">Username</label>
                  </div>

                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <FaEnvelope />
                    </span>
                    <input
                      id="register-email"
                      type="email"
                      name="email"
                      value={registerForm.email}
                      onChange={changeHandler}
                      required
                    />
                    <label htmlFor="register-email">Email</label>
                  </div>

                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <FaLock />
                    </span>
                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={registerForm.password}
                      onChange={changeHandler}
                      required
                    />
                    <label htmlFor="register-password">Password</label>
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={showPassword ? "bx bx-hide" : "bx bx-show"} />
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
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <FaMapMarkerAlt />
                    </span>
                    <input
                      id="register-location"
                      type="text"
                      name="location"
                      value={registerForm.location}
                      onChange={changeHandler}
                      required
                    />
                    <label htmlFor="register-location">Location</label>
                  </div>
                </div>

                <PasswordChecklist
                  rules={["minLength", "specialChar", "number", "capital", "lowercase"]}
                  minLength={8}
                  value={registerForm.password}
                  onChange={handlePasswordValidityChange}
                />
              </>
            )}

            <div className="input-box submit-wrap">
              <button
                type="submit"
                className={`input-submit ${showLogin ? "login-btn" : "signup-btn"}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="submit-spinner" aria-hidden="true" />
                    Please wait...
                  </>
                ) : showLogin ? (
                  "Login"
                ) : (
                  "Sign Up"
                )}
                {!loading && <i className="bx bx-right-arrow-alt" />}
              </button>
            </div>

            {showLogin && (
              <>
                <div className="divider" aria-hidden="true">
                  <span />
                  <p>or continue with</p>
                  <span />
                </div>

                <div className="social-auth">
                  <button
                    type="button"
                    className="social-btn"
                    onClick={() => handleSocialClick("Google")}
                  >
                    <FcGoogle />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    className="social-btn"
                    onClick={() => handleSocialClick("GitHub")}
                  >
                    <FaGithub />
                    <span>GitHub</span>
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
