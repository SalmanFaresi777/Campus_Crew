import React, { useState, useEffect } from "react";
import "../CSS/about.css";
import Header from "../Components/Header";
import aboutUs from "../assets/img/aboutUs.jpg";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";

import sunny from "../assets/img/Sunny.jpg";
import bijoy from "../assets/img/Bijoy.jpg";
import asif from "../assets/img/Asif.jpg";
import { useNavigate } from "react-router-dom";

const AboutUs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />

      <div className="about-page-container">
        <div className=" about-page">
          <div className="about-text">
            <h1>About Us</h1>
            <p className="about-description">
              {" "}
              Who are we? We are a passionate team dedicated to delivering the
              best products and services. Our mission is to drive innovation and
              quality in every aspect of our work.
            </p>
            <button className="about-btn" onClick={() => navigate("/contact")}>
              Contact Us
            </button>
          </div>
          <div className="about-pic">
            <div className="shadow-container">
              <div className="shadow"></div>
              <div className="border-box"></div>
              <div className="pic-container">
                <img src={aboutUs} alt="about us" className="hero-pic" />
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
