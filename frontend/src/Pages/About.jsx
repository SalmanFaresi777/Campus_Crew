import React, { useState, useEffect } from "react";
import "../CSS/about.css";
import Header from "../Components/Header";
import aboutUs from "../assets/img/aboutUs.jpg";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import { useNavigate } from "react-router-dom";
import { LOADER_TIMEOUTS, THEME } from "../constants/config";

/**
 * About Us Page
 * Displays company information with animated intro and navigation to contact page
 */
const AboutUs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Initialize loader animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOADER_TIMEOUTS.PAGE_LOAD);
    return () => clearTimeout(timer);
  }, []);

  // Determine loader color based on current theme
  const themeColor = document.documentElement.getAttribute("data-theme") === THEME.DARK 
    ? THEME.DARK_COLOR 
    : THEME.LIGHT_COLOR;

  return (
    <>
      {loading && <Loader color={themeColor} />}
      <Header />

      <div className="about-page-container">
        <div className="about-page">
          {/* About Section Text */}
          <div className="about-text">
            <h1>About Us</h1>
            <p className="about-description">
              Who are we? We are a passionate team dedicated to delivering the
              best products and services. Our mission is to drive innovation and
              quality in every aspect of our work.
            </p>
            {/* Navigation button to contact page */}
            <button 
              className="about-btn" 
              onClick={() => navigate("/contact")}
              aria-label="Navigate to contact page"
            >
              Contact Us
            </button>
          </div>

          {/* Hero Image with Shadow Effects */}
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
