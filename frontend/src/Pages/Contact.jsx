import React, { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import {
  showWarningToast,
  showPromiseToast,
} from "../utils/toastUtils";
import "../CSS/contact.css";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";

function Contact() {
  const ADMIN_RECIPIENT_EMAIL = "sf.yt.recreation@gmail.com";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    if (isSubmitted) {
      setIsSubmitted(false);
    }

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setIsSubmitted(false);

    const serviceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID || "").trim();
    const templateId = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "").trim();
    const publicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "").trim();

    if (!serviceId || !templateId || !publicKey) {
      showWarningToast(
        "Email service is not configured. Please set EmailJS environment variables."
      );
      setIsLoading(false);
      return;
    }

    if (templateId.startsWith("service_")) {
      showWarningToast(
        "EmailJS template ID looks invalid. Please set VITE_EMAILJS_TEMPLATE_ID from Email Templates."
      );
      setIsLoading(false);
      return;
    }

    if (!serviceId.startsWith("service_") || !templateId.startsWith("template_")) {
      showWarningToast(
        "EmailJS IDs look invalid. Service should start with service_ and template should start with template_."
      );
      setIsLoading(false);
      return;
    }

    try {
      const senderEmail = formData.email.trim();

      const emailPromise = emailjs.send(
        serviceId,
        templateId,
        {
          to_email: ADMIN_RECIPIENT_EMAIL,
          recipient_email: ADMIN_RECIPIENT_EMAIL,
          to: ADMIN_RECIPIENT_EMAIL,
          recipient: ADMIN_RECIPIENT_EMAIL,
          email: ADMIN_RECIPIENT_EMAIL,
          from_name: formData.name,
          from_email: senderEmail,
          message: formData.message,
          reply_to: senderEmail,
        },
        {
          publicKey,
        }
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Email request timed out. Please try again."));
        }, 20000);
      });

      const requestPromise = Promise.race([emailPromise, timeoutPromise]);

      await showPromiseToast(requestPromise, {
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
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error?.status === 404 && error?.text === "Account not found") {
        showWarningToast(
          "EmailJS account not found. Please set the correct VITE_EMAILJS_PUBLIC_KEY from your EmailJS account."
        );
      } else if (error?.status === 422 && error?.text === "The recipients address is empty") {
        showWarningToast(
          "Recipient email is empty in template. Set EmailJS template To Email to {{to_email}} (or {{email}}) and Reply To to {{reply_to}}."
        );
      } else if (error?.status === 404) {
        showWarningToast(
          "EmailJS returned 404. Service ID or Template ID was not found. Please verify both in your EmailJS dashboard."
        );
      }
      setIsSubmitted(false);
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
              <span className="info-text">sf.yt.recreation@gmail.com</span>
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
                  minLength={10}
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
              {isSubmitted && <p className="submit-success">SUCCESS</p>}
            </form>
          </div>
        </div>
      </div>
      <Footer/>
    </>
  );
}

export default Contact;
