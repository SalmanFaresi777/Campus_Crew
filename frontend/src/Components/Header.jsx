/**
 * Header Component
 * 
 * Top navigation bar featuring:
 * - Logo link to home
 * - Responsive navigation menu (desktop/mobile)
 * - User profile dropdown with initials fallback
 * - Theme toggle button (dark/light mode)
 * - Admin-specific navigation links
 * - Mobile hamburger menu
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
  
  // Dropdown visibility state for desktop and mobile interfaces
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isMobileProfileDropdownOpen, setIsMobileProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Refs for detecting outside clicks to close dropdowns
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  
  // Check if user has admin privileges
  const userIsAdmin = user && user.isAdmin;
  const navigate = useNavigate();
  // Toggle desktop profile dropdown menu visibility
  const toggleDesktopDropdown = () => {
    setIsDesktopDropdownOpen(!isDesktopDropdownOpen);
  };

  // Toggle mobile profile dropdown menu visibility
  const toggleMobileProfileDropdown = () => {
    setIsMobileProfileDropdownOpen(!isMobileProfileDropdownOpen);
  };

  // Toggle mobile navigation menu visibility
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle logout and close all open menus
  const handleLogout = () => {
    logout();
    setIsDesktopDropdownOpen(false);
    setIsMobileProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Close mobile navigation menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close dropdowns when clicking outside of them
  // Improves UX by allowing users to close menus by clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close desktop profile dropdown if click is outside
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target)) {
        setIsDesktopDropdownOpen(false);
      }
      
      // Close mobile profile dropdown if click is outside
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target)
      ) {
        setIsMobileProfileDropdownOpen(false);
      }
      
      // Close mobile menu if click is outside
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /**
   * Extract user initials from username or email for avatar fallback
   * Used when user hasn't uploaded a profile picture
   * @param {Object} userData - User object with username/email
   * @returns {string} Two-character initials in uppercase
   */
  const getUserInitials = (userData) => {
    if (userData?.username) {
      return userData.username
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return userData?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <>
      <header className="home-header">
        <div className="logo">
          <Link to="/">
            <img src={logo} alt="Logo" style={{ height: "40px" }} />
          </Link>
        </div>

        {/* Desktop navigation menu */}
        <nav className="main-nav desktop-nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/upcoming-events" className="nav-link">
                Upcoming Events
              </NavLink>
              {userIsAdmin && (
                <NavLink to="/create-event" className="nav-link">
                  Create Event
                </NavLink>
              )}
              {!userIsAdmin && (
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
              {userIsAdmin && (
                <NavLink to="/dashboard" className="nav-link">
                  Dashboard
                </NavLink>
              )}

              {/* Dark/Light mode toggle button */}
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              >
                {isDarkMode ? "☀️" : "🌙"}
              </button>

              {/* User profile dropdown menu */}
              <div className="profile-dropdown" ref={desktopDropdownRef}>
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
              {/* Dark/Light mode toggle for guests */}
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
