import React, { useState, useEffect } from "react";
import "../CSS/about.css";
import Header from "../Components/Header";
import aboutUs from "../assets/img/aboutUs.jpg";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";


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
            <div className="about-description">
              <p className="team-intro">Developer Team</p>

              <div className="team-list">
                <article className="team-member-card">
                  <h3>Salman Faresi</h3>
                  <p className="member-id">ID: 20220104007</p>
                  <p>
                    <span>Email:</span> salman.faresi.team07@gmail.com
                  </p>
                  <p>
                    <span>Contact:</span> +8801712345607
                  </p>
                </article>

                <article className="team-member-card">
                  <h3>Maisha Momtaz Meem</h3>
                  <p className="member-id">ID: 20220104049</p>
                  <p>
                    <span>Email:</span> maisha.dev.team49@gmail.com
                  </p>
                  <p>
                    <span>Contact:</span> +8801712345649
                  </p>
                </article>

                <article className="team-member-card">
                  <h3>Tajuddin Ahmed</h3>
                  <p className="member-id">ID: 20220104157</p>
                  <p>
                    <span>Email:</span> tajuddin.ahmed.team157@gmail.com
                  </p>
                  <p>
                    <span>Contact:</span> +8801712345757
                  </p>
                </article>

                <article className="team-member-card">
                  <h3>Jarin Tasnim</h3>
                  <p className="member-id">ID: 20210204105</p>
                  <p>
                    <span>Email:</span> jarin.tasnim.team105@gmail.com
                  </p>
                  <p>
                    <span>Contact:</span> +8801712345105
                  </p>
                </article>
              </div>
            </div>
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
