/**
 * Header Component
 * Navigation bar with logo, menu links, user profile dropdown, and theme toggle
 * Responsive design with mobile hamburger menu
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import logo from "../assets/img/campuscrew.png";
import "../CSS/home.css";
import "../CSS/header.css";
import "../CSS/themes.css";

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Menu visibility state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Refs for outside-click close behavior
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  
  const isAdmin = user && user.isAdmin; // role flag
  const navigate = useNavigate();
  
  // Toggle desktop profile menu
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Toggle mobile profile menu
  const toggleMobileDropdown = () => {
    setIsMobileDropdownOpen(!isMobileDropdownOpen);
  };

  // Toggle mobile nav panel
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Logout and reset open menus
  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    setIsMobileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Close mobile nav panel
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close menus on outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target)
      ) {
        setIsMobileDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * Extract user initials for avatar fallback when no profile picture exists
   * @param {Object} user - User object
   * @returns {string} Two-character initials
   */
  const getUserInitials = (user) => {
    if (user?.username) {
      return user.username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <>
      <header className="home-header">
        <div className="logo">
          <Link to="/">
            <img src={logo} alt="Logo" style={{ height: "40px" }} />
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="main-nav desktop-nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/upcoming-events" className="nav-link">
                Upcoming Events
              </NavLink>
              {isAdmin && (
                <NavLink to="/create-event" className="nav-link">
                  Create Event
                </NavLink>
              )}
              {!isAdmin && (
                <NavLink to="/joined-events" className="nav-link">
                  Joined Events
                </NavLink>
              )}
              <NavLink to="/about" className="nav-link">
                About
              </NavLink>
              <NavLink to="/contact" className="nav-link">
                Contact Us
              </NavLink>
              {isAdmin && (
                <NavLink to="/dashboard" className="nav-link">
                  Dashboard
                </NavLink>
              )}

              {/* Theme switch */}
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>

              {/* Profile button */}
              <div className="profile-dropdown" ref={dropdownRef}>
                <button
                  className="profile-button"
                  onClick={() => navigate("/profile")}
                  aria-label="Profile menu"
                >
                  {user?.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt="Profile"
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-initials">
                      {getUserInitials(user)}
                    </div>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Theme switch for guests */}
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>

              <Link to="/login" className="nav-link">
                Log In
              </Link>
              <Link to="/login" className="nav-button primary">
                <span className="btn-txt">Get Started</span>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="mobile-nav">
          {/* Mobile profile (authenticated only) */}
          {isAuthenticated && (
            <div className="mobile-profile">
              <div className="profile-dropdown" ref={mobileDropdownRef}>
                <button
                  className="profile-button"
                  onClick={toggleMobileDropdown}
                  aria-label="Profile menu"
                >
                  {user?.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt="Profile"
                      className="profile-image"
                    />
                  ) : (
                    <div className="profile-initials">
                      {getUserInitials(user)}
                    </div>
                  )}
                </button>

                {isMobileDropdownOpen && (
                  <div className="dropdown-menu">
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setIsMobileDropdownOpen(false)}
                    >
                      <span className="dropdown-icon">👤</span>
                      <span className="btn-txt">Profile</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hamburger button */}
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-overlay" ref={mobileMenuRef}>
            <div className="mobile-menu-content">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/upcoming-events"
                    className="mobile-nav-link"
                    onClick={closeMobileMenu}
                  >
                    Upcoming Events
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/create-event"
                      className="mobile-nav-link"
                      onClick={closeMobileMenu}
                    >
                      Create Event
                    </Link>
                  )}
                  {!isAdmin && (
                    <Link
                      to="/joined-events"
                      className="mobile-nav-link"
                      onClick={closeMobileMenu}
                    >
                      Joined Events
                    </Link>
                  )}
                  <Link
                    to="/about"
                    className="mobile-nav-link"
                    onClick={closeMobileMenu}
                  >
                    About
                  </Link>
                  <Link
                    to="/contact"
                    className="mobile-nav-link"
                    onClick={closeMobileMenu}
                  >
                    Contact Us
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/dashboard"
                      className="mobile-nav-link"
                      onClick={closeMobileMenu}
                    >
                      Dashboard
                    </Link>
                  )}

                  {/* Theme switch in mobile menu */}
                  <button
                    className="mobile-theme-toggle"
                    onClick={() => {
                      toggleTheme();
                      closeMobileMenu();
                    }}
                    aria-label={`Switch to ${
                      isDarkMode ? "light" : "dark"
                    } mode`}
                  >
                    {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="mobile-nav-link"
                    onClick={closeMobileMenu}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/login"
                    className="mobile-nav-button"
                    onClick={closeMobileMenu}
                  >
                    Get Started
                  </Link>

                  {/* Theme switch in mobile menu */}
                  <button
                    className="mobile-theme-toggle"
                    onClick={() => {
                      toggleTheme();
                      closeMobileMenu();
                    }}
                    aria-label={`Switch to ${
                      isDarkMode ? "light" : "dark"
                    } mode`}
                  >
                    {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;
