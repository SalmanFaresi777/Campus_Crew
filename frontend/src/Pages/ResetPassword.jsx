import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PasswordChecklist from "react-password-checklist";
import '../CSS/ResetPassword.css';
import Loader from "../Components/loader";

function ResetPassword() {
    const backend_link = import.meta.env.VITE_BACKEND_LINK;
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [tokenValid, setTokenValid] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setPageLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const checkTokenValidity = async () => {
        try {
            const response = await fetch(`${backend_link}/api/verify-reset-token/${token}`);
            const data = await response.json();
            setTokenValid(data.valid);
        } catch (error) {
            console.error('Error checking token validity:', error);
            setTokenValid(false);
        }
    };

    useEffect(() => {
        checkTokenValidity();
    }, [token]);

    

    // Toggle visibility for password field
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Toggle visibility for confirm password field
    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submit button clicked');
    
        if (!isValid) {
            console.log('Password invalid');
            toast.error('Password does not meet the requirements.');
            return;
        }
    
        if (password !== confirmPassword) {
            console.log('Passwords do not match');
            toast.error('Passwords do not match!');
            return;
        }
    
        setLoading(true);
    
        try {
            const response = await fetch(`${backend_link}/api/reset-password/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });
    
            const data = await response.json();
    
            if (response.ok && data.success) {
                toast.success(data.message || 'Password reset successfully!');
                setTimeout(() => {
                    navigate('/login'); // Redirect to login page
                }, 3500); // 3.5 seconds delay
            } else {
                toast.error(data.message || 'Failed to reset password.');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            toast.error('An error occurred. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (tokenValid === false) {
        return (
            <div className="reset-password-container">
                <div className="token-invalid">
                    <h2>Invalid or Expired Token</h2>
                    <p>Your password reset link is invalid or has expired. 
                    Please request a new password reset link.</p>
                    <button 
                        className="back-to-login-button"
                        onClick={() => navigate('/forgot-password')}
                    >
                        Request New Reset Link
                    </button>
                </div>
            </div>
        );
    }

    if (tokenValid === null) {
        return (
            <div className="reset-password-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Verifying reset token...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-password-container">
            {pageLoading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
            <h4>Reset Password</h4>
            <form onSubmit={handleSubmit} className="reset-password-form">
                {/* New Password Field */}
                <div className="form__group field">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className="form__field"
                        placeholder="New Password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                    {/* Eye Icon for toggling visibility */}
                    <span className="eye-icon-new" onClick={togglePasswordVisibility}>
                        {showPassword ? '👁️' : '🙈'}
                    </span>
                </div>

                {/* Confirm Password Field */}
                <div className="form__group field">
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form__field"
                        placeholder="Confirm Password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                    {/* Eye Icon for toggling visibility */}
                    <span className="eye-icon-confirm" onClick={toggleConfirmPasswordVisibility}>
                        {showConfirmPassword ? '👁️' : '🙈'}
                    </span>
                </div>

                {/* Password Requirements */}
                <div className="password-requirements">
                    <PasswordChecklist
                        rules={["minLength", "specialChar", "number", "capital", "lowercase"]}
                        minLength={8}
                        value={password}
                        onChange={(isValid) => setIsValid(isValid)}
                    />
                </div>

                <button
                    type="submit"
                    className="reset-password-button"
                    disabled={!isValid || password !== confirmPassword || loading}
                >
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
            </form>
            <ToastContainer />
        </div>
    );
}

export default ResetPassword;
