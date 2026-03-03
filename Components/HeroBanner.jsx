import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Hero banner with enlarged glowing planet (ring removed)

const HeroBanner = () => {
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const hasCountedRef = useRef(false);
  const statsRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    // Observe animated elements inside hero for scroll-in effects
    const els = document.querySelectorAll(".hero-3d-content .anim-on-scroll");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.2 }
    );
    els.forEach((el) => io.observe(el));

    // Count-up stats when visible
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasCountedRef.current) {
            hasCountedRef.current = true;
            const numbers = entry.target.querySelectorAll("[data-count]");
            numbers.forEach((span) => {
              const target = parseInt(span.getAttribute("data-count"), 10);
              if (isNaN(target)) return;
              const duration = 1600;
              const startTime = performance.now();
              const startVal = 0;
              const step = (now) => {
                const prog = Math.min(1, (now - startTime) / duration);
                const eased =
                  prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog; // easeInOut
                const val = Math.floor(startVal + (target - startVal) * eased);
                span.textContent = val.toLocaleString();
                if (prog < 1) requestAnimationFrame(step);
                else span.textContent = target.toLocaleString();
              };
              requestAnimationFrame(step);
            });
            statsObserver.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    if (statsRef.current) statsObserver.observe(statsRef.current);

    // Parallax for planet & background
    const handleScroll = () => {
      const hero = document.querySelector(".hero-3d-wrapper");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const windowH = window.innerHeight;
      if (rect.bottom < 0 || rect.top > windowH) return; // skip if out of view
      const progress = Math.min(
        1,
        Math.max(0, (windowH - rect.top) / (windowH + rect.height))
      );
      const planet = hero.querySelector(".center-core.large-planet");
      if (planet) {
        planet.style.transform = `translate(-50%, -50%) scale(${
          1 + progress * 0.05
        }) rotate(${progress * 25}deg)`;
      }
      const content = hero.querySelector(".hero-3d-content");
      if (content) {
        content.style.transform = `translateY(${progress * -20}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section className="hero-3d-wrapper">
      <div className="hero-3d-bg" aria-hidden />
      {/* Planet behind content */}
      <div
        className={`ring-stage planet-only ${mounted ? "stage-in" : ""}`}
        aria-hidden
      >
        <div className="center-core large-planet">
          <div className="core-glow" />
        </div>
      </div>
      <div className="hero-3d-content">
        <p className="eyebrow anim-on-scroll fade-down-delay">Campus Crew</p>
        <h1 className="headline anim-on-scroll slide-up-stagger">
          <span className="word-anim" style={{ "--w-delay": "0ms" }}>
            Discover
          </span>{" "}
          <span
            className="gradient-text word-anim"
            style={{ "--w-delay": "80ms" }}
          >
            Events
          </span>
          {"   "}
          <span className="word-anim" style={{ "--w-delay": "160ms" }}>
            That
          </span>
          <span
            className="outline-text word-anim"
            style={{ "--w-delay": "240ms" }}
          >
            Inspire
          </span>
        </h1>
        <p className="tagline anim-on-scroll fade-up-delay">
          Explore exciting campus events, register with one click, and never
          miss an opportunity to connect, learn, and grow. Admins can create and
          manage events effortlessly.
        </p>
        <div className="cta-row anim-on-scroll zoom-in-delay">
          {!isAuthenticated && (
            <Link to="/login" className="button primary large pulse-hover">
              Get Started Free
            </Link>
          )}
          <Link to="/about" className="button ghost large pulse-hover">
            Learn More
          </Link>
        </div>
        <ul className="stats anim-on-scroll" ref={statsRef}>
          <li>
            <strong data-count="2000">0</strong>
            <span> Students Engaged</span>
          </li>
          <li>
            <strong data-count="150">0</strong>
            <span> Events Organized</span>
          </li>
          <li>
            <strong data-count="40">0</strong>
            <span> Higher Participation</span>
          </li>
        </ul>
      </div>

      <div className="scroll-hint" aria-hidden>
        <span />
      </div>
    </section>
  );
};

export default HeroBanner;
