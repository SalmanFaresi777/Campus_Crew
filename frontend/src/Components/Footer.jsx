import React from "react";
import { Link } from "react-router-dom";
import "../CSS/footer.css";

/**
 * Footer Component
 * 
 * Displays footer navigation links and copyright information.
 * Responsive and theme-aware (uses theme CSS classes).
 */
function Footer() {
  return (
    <footer className="home-footer theme-bg-primary theme-text-primary">
      {/* Navigation links section */}
      <div className="footer-links">
        <Link className="footer-link" to="/about">About</Link>
        <Link className="footer-link" to="/contact">Contact</Link>
        <Link className="footer-link" to="/privacy">Privacy Policy</Link>
      </div>
      
      {/* Copyright notice */}
      <p className="footer-bottom">
        &copy; 2025 @CampusCrew. All rights reserved.
      </p>
    </footer>
  );
}

export default Footer;
