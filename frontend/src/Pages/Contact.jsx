import React, { useState, useEffect } from "react";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showPromiseToast,
} from "../utils/toastUtils";
import "../CSS/contact.css";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showWarningToast("Please enter your name");
      return false;
    }
    if (!formData.email.trim()) {
      showWarningToast("Please enter your email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showWarningToast("Please enter a valid email address");
      return false;
    }
    if (!formData.message.trim()) {
      showWarningToast("Please enter your message");
      return false;
    }
    if (formData.message.trim().length < 10) {
      showWarningToast("Message should be at least 10 characters long");
      return false;
    }
    return true;
  };

  const simulateMessageSend = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate success most of the time, occasional failure for demo
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
          resolve("Message sent successfully!");
        } else {
          reject(new Error("Failed to send message. Please try again."));
        }
      }, 2000); // 2 second delay to simulate network request
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Using promise toast for better UX
      await showPromiseToast(simulateMessageSend(), {
        pending: "Sending your message...",
        success:
          "Thank you! Your message has been sent successfully. We'll get back to you soon!",
        error:
          "Failed to send message. Please try again or contact us directly.",
      });

      // Reset form on success
      setFormData({
        name: "",
        email: "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Error is already handled by the promise toast
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      <div
        style={{ maxHeight: "calc(100vh - 350px)" }}
        className="contact-container"
      >
        <div className="contact-header">
          <h1>Contact Us</h1>
          <p className="contact-subtitle">
            If you have any questions, feel free to reach out!
          </p>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h2>Get In Touch</h2>
            <div className="info-item">
              <span className="info-icon">📍</span>
              <span className="info-text">
                141 & 142, Love Road, Tejgaon Industrial Area, Dhaka-1208
              </span>
            </div>
            <div className="info-item">
              <span className="info-icon">📞</span>
              <span className="info-text">01924753893</span>
            </div>
            <div className="info-item">
              <span className="info-icon">✉️</span>
              <span className="info-text">campuscrew@gmail.com</span>
            </div>
          </div>

          <div className="contact-form-container">
            <h2>Send us a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Name:</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="message">Message:</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="Please enter your message (minimum 10 characters)"
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                className={`submit-btn ${isLoading ? "loading" : ""}`}
                disabled={isLoading}
              >
                <span className="btn-txt">
                  {isLoading ? "Sending..." : "Send Message"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer/>
    </>
  );
}

export default Contact;
