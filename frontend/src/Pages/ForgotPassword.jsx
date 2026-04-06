import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../contexts/AuthContext';
import '../CSS/ForgotPassword.css';
import Loader from "../Components/loader";

function ForgotPassword() {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect to homepage if user is already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${backend_link}/api/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Password reset link sent! Please check your email.');
        setTimeout(() => {
          navigate('/login'); // Redirect to login page
        }, 3500); // 3.5 second delay
      } else {
        toast.error(data.message || 'Failed to send reset link.');
      }
    } catch (error) {
      console.error('Error sending password reset request:', error);
      toast.error('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      {pageLoading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <form className="forgot-password-form" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p className="forgot-description">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <div className="form__group field">
          <input
            type="email"
            className="form__field"
            placeholder="Email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <label htmlFor="email" className="form__label">Email</label>
        </div>
        
        <button 
          type="submit" 
          className="forgot-button"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        
        <button 
          type="button" 
          className="back-to-login-button"
          onClick={() => navigate('/login')}
        >
          Back to Login
        </button>
      </form>
      <ToastContainer className="toast-container" />
    </div>
  );
}

export default ForgotPassword;
