import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../utils/apiService';
import { v4 as uuidv4 } from 'uuid'; // Generate unique identifier for tracking requests
import '../CSS/VerifyEmail.css';
import Loader from "../Components/loader";

// Email verification page that validates the token and shows status
const VerifyEmail = () => {
  const { token } = useParams();
  // Track the outcome of the verification process
  const [verificationStatus, setVerificationStatus] = useState({
    success: null,
    message: '',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Execute verification when component first loads
  useEffect(() => {
    const verificationId = uuidv4(); // Create unique tracking ID

    // Perform verification immediately upon mounting
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
  }, []); // No dependencies needed
  

  // Monitor verification status for debugging purposes
  useEffect(() => {
    console.log("Verification Status:", verificationStatus);
  }, [verificationStatus]);

  // Manage navigation to login page after verification completes
  const handleLoginRedirect = () => {
    // Remove any outdated authentication data before redirecting
    // Clear localStorage or cookies containing auth information if present
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
