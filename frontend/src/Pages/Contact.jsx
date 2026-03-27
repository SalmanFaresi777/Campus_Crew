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

/**
 * Contact Us Page Component
 * 
 * Allows users to submit contact inquiries with form validation.
 * Includes page loader on mount and toast notifications for feedback.
 */
function Contact() {
  // Form input state management
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  
  // UI state flags
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Show page loader briefly on component mount
  useEffect(() => {
    const pageLoadDelay = setTimeout(() => setIsPageLoading(false), 800);
    return () => clearTimeout(pageLoadDelay);
  }, []);

  // Update form field value on user input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Validate form inputs before submission
  const validateForm = () => {
    // Check if name is provided
    if (!formData.name.trim()) {
      showWarningToast("Please enter your name");
      return false;
    }
    
    // Check if email is provided
    if (!formData.email.trim()) {
      showWarningToast("Please enter your email");
      return false;
    }
    
    // Validate email format using regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showWarningToast("Please enter a valid email address");
      return false;
    }
    
    // Check if message is provided
    if (!formData.message.trim()) {
      showWarningToast("Please enter your message");
      return false;
    }
    
    // Enforce minimum message length
    const MIN_MESSAGE_LENGTH = 10;
    if (formData.message.trim().length < MIN_MESSAGE_LENGTH) {
      showWarningToast("Message should be at least 10 characters long");
      return false;
    }
    
    return true;
  };

  // Simulate asynchronous message delivery with realistic delay
  const simulateMessageSend = () => {
    const MESSAGE_SEND_DELAY = 2000; // ms - simulate network latency
    const SUCCESS_RATE = 0.9; // 90% success probability
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Randomly determine success/failure for demonstration
        const isSuccessful = Math.random() > (1 - SUCCESS_RATE);
        
        if (isSuccessful) {
          resolve("Message sent successfully!");
        } else {
          reject(new Error("Failed to send message. Please try again."));
        }
      }, MESSAGE_SEND_DELAY);
    });
  };

  // Handle form submission with validation and toast feedback
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setIsFormSubmitting(true);

    try {
      // Send message and show progress with promise-based toast notifications
      await showPromiseToast(simulateMessageSend(), {
        pending: "Sending your message...",
        success:
          "Thank you! Your message has been sent successfully. We'll get back to you soon!",
        error:
          "Failed to send message. Please try again or contact us directly.",
      });

      // Clear form fields after successful submission
      setFormData({
        name: "",
        email: "",
        message: "",
      });
    } catch (error) {
      // Error details logged for debugging purposes
      console.error("Error sending message:", error);
      // Toast notification handles error display to user
    } finally {
      setIsFormSubmitting(false);
    }
  };
  // Determine loader color based on current theme
  const loaderColor = document.documentElement.getAttribute("data-theme") === "dark" 
    ? "#ffffff" 
    : "#000000";

  return (
    <>
      {isPageLoading && <Loader color={loaderColor} />}
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
                  disabled={isFormSubmitting}
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
