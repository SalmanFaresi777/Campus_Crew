import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import "../CSS/privacy.css";

function Privacy() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading && (
        <Loader
          color={
            document.documentElement.getAttribute("data-theme") === "dark"
              ? "#ffffff"
              : "#000000"
          }
        />
      )}
      <Header />

      <main className="privacy-page theme-bg-primary theme-text-primary">
        <section className="privacy-hero">
          <h1>Privacy Policy</h1>
          <p>
            Your privacy matters to us. This policy explains how CampusCrew
            collects, uses, and protects your information.
          </p>
          <p className="privacy-updated">Last updated: March 31, 2026</p>
        </section>

        <section className="privacy-card">
          <h2>1. Information We Collect</h2>
          <p>
            We may collect account details such as your name, email address, and
            profile information when you register. We also collect event-related
            actions, including events you create, join, or manage.
          </p>
        </section>

        <section className="privacy-card">
          <h2>2. How We Use Your Information</h2>
          <p>
            We use your information to provide core platform functionality,
            personalize your experience, communicate updates, improve service
            quality, and maintain platform security.
          </p>
        </section>

        <section className="privacy-card">
          <h2>3. Data Sharing</h2>
          <p>
            CampusCrew does not sell your personal information. Data may be
            shared only with trusted service providers required for hosting,
            authentication, or communication support, and only for operational
            purposes.
          </p>
        </section>

        <section className="privacy-card">
          <h2>4. Data Security</h2>
          <p>
            We apply reasonable technical and organizational measures to protect
            your data from unauthorized access, misuse, or disclosure.
          </p>
        </section>

        <section className="privacy-card">
          <h2>5. Your Choices and Rights</h2>
          <p>
            You can request updates or deletion of your account information by
            contacting us. You may also choose to stop using the platform at any
            time.
          </p>
        </section>

        <section className="privacy-card">
          <h2>6. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please reach out
            through the Contact page.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Privacy;
