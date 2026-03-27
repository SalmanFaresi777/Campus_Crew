import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../utils/apiService';
import { v4 as uuidv4 } from 'uuid'; // unique ID for request tracing
import '../CSS/VerifyEmail.css';
import Loader from "../Components/loader";

// VerifyEmail component for handling email verification with token
const VerifyEmail = () => {
  const { token } = useParams();
  // State to track verification result
  const [verificationStatus, setVerificationStatus] = useState({
    success: null,
    message: '',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Effect to verify email on component mount
  useEffect(() => {
    const verificationId = uuidv4(); // unique request id for traceability

    // Run verification once when token route is loaded
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
  }, []); // Empty dependency array
  

  // Debug effect to log verification status changes
  useEffect(() => {
    console.log("Verification Status:", verificationStatus);
  }, [verificationStatus]);

  // Function to handle redirect to login after verification
  const handleLoginRedirect = () => {
    // Ensure stale auth state does not survive after verification flow.
    // Clear localStorage or cookies related to authentication if any
    localStorage.removeItem('auth-token'); // Example for localStorage
    // Add other cleanup logic if needed

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
