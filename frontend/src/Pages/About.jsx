import React, { useState, useEffect } from "react";
import "../CSS/about.css";
import Header from "../Components/Header";
import aboutUs from "../assets/img/aboutUs.jpg";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import { useNavigate } from "react-router-dom";
import { LOADER_TIMEOUTS, THEME } from "../constants/config";

/**
 * About Us Page Component
 * 
 * Displays company mission, vision, and call-to-action button.
 * Features page loader on initial load and responsive hero section.
 * Navigation to contact page available via dedicated button.
 */
const AboutUs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Start a short page-loading delay after mount
  useEffect(() => {
    const pageLoadTimer = setTimeout(
      () => setLoading(false), 
      LOADER_TIMEOUTS.PAGE_LOAD
    );
    return () => clearTimeout(pageLoadTimer);
  }, []);

  // Pick loader color from the active theme mode
  const getThemeColor = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    return currentTheme === THEME.DARK ? THEME.DARK_COLOR : THEME.LIGHT_COLOR;
  };
  
  const themeColor = getThemeColor();

  return (
    <>
      {loading && <Loader color={themeColor} />}
      <Header />

      <div className="about-page-container">
        <div className="about-page">
          {/* Left panel: mission text and CTA */}
          <div className="about-text">
            <h1>About Us</h1>
            <p className="about-description">
              Who are we? We are a passionate team dedicated to delivering the
              best products and services. Our mission is to drive innovation and
              quality in every aspect of our work.
            </p>
            {/* CTA button that routes to the contact page */}
            <button 
              className="about-btn" 
              onClick={() => navigate("/contact")}
              aria-label="Navigate to contact page"
            >
              Contact Us
            </button>
          </div>

          {/* Right panel: hero image with a decorative shadow stack */}
          <div className="about-pic">
            <div className="shadow-container">
              <div className="shadow"></div>
              <div className="border-box"></div>
              <div className="pic-container">
                <img src={aboutUs} alt="About us" className="hero-pic" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AboutUs;
