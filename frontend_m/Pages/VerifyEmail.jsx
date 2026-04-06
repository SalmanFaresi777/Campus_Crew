import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../utils/apiService';
import { v4 as uuidv4 } from 'uuid'; // Creates unique ID for request tracking
import '../CSS/VerifyEmail.css';
import Loader from "../Components/loader";

// Validates email verification token and displays result
const VerifyEmail = () => {
  const { token } = useParams();
  // Stores verification success/failure status
  const [verificationStatus, setVerificationStatus] = useState({
    success: null,
    message: '',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initiates email verification on component mount
  useEffect(() => {
    const verificationId = uuidv4(); // Generates unique request identifier

    // Triggers verification API call on load
    (async () => {
      try {
        const { data } = await apiService.verifyEmail(token, {
          verificationId,
        });
        setVerificationStatus({ success: true, message: data.message });
      } catch (error) {
        setVerificationStatus({
          success: false,
          message: error.response?.data?.message || 'Error verifying your email.',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []); // Effect runs once on component mount only
  

  // Logs verification status for troubleshooting
  useEffect(() => {
    console.log("Verification Status:", verificationStatus);
  }, [verificationStatus]);

  // Handles navigation after verification process
  const handleLoginRedirect = () => {
    // Clears stale auth data before redirect
    localStorage.removeItem('auth-token'); // Example: clearing auth token from local storage

    navigate('/login');
  };

  return (
    <div className="verify-email-container">
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <div className="verification-box">
        <h2>Email Verification</h2>

        {verificationStatus.success === null && (
          <div className="loading-spinner"></div>
        )}

        {verificationStatus.success === true && (
          <>
            <div className="success-icon">✓</div> 
            <p>{verificationStatus.message}</p>
            <button onClick={handleLoginRedirect} className="login-button">
              Go to Login
            </button>
          </>
        )}

        {verificationStatus.success === false && (
          <>
            <div className="error-icon">✗</div>
            <p>{verificationStatus.message}</p>
            <button onClick={() => navigate('/login')} className="login-button">
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
