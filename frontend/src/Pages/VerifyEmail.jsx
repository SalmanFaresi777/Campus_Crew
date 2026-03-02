import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique IDs
import '../CSS/VerifyEmail.css';
import Loader from "../Components/loader";

const VerifyEmail = () => {
  const backend_link = import.meta.env.VITE_BACKEND_LINK;
  const { token } = useParams();
  const [verificationStatus, setVerificationStatus] = useState({
    success: null,
    message: '',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verificationId = uuidv4(); // Generate a unique ID for this attempt

    (async () => {
      try {
        const response = await axios.get(`${backend_link}/api/verify-email/${token}`, {
          params: { verificationId } // Send the ID to the backend
        });
        setVerificationStatus({ success: true, message: response.data.message });
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
  

  // Print verification status to console whenever it changes
  useEffect(() => {
    console.log("Verification Status:", verificationStatus);
  }, [verificationStatus]);

  const handleLoginRedirect = () => {
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
