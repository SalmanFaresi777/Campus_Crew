const express = require('express')
const router = express.Router()
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require('crypto');

const Users = require('../models/UserModel')
const cloudinary = require('../utils/cloudinary')
const upload = require('../utils/multer')
const sendEmail = require('../utils/sendEmail')

const successfulVerifications = new Set(); // Keep track of successful verification IDs



// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1] || req.headers['accesstoken'];

    if (!token) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, 'secret_ecom');
        req.user = decoded.user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
};




router.post('/login', async (req, res) => {
    try {
        let user = await Users.findOne({ email: req.body.email });
        if (!user) {
            return res.json({ success: false, errors: "Wrong email" });
        }

        // Verification Check 
        if (!user.isVerified) {
            return res.status(401).json({ success: false, errors: "Please verify your email before logging in." });
        }

        const passCompare = await bcrypt.compare(req.body.password, user.password);
        if (!passCompare) {
            return res.json({ success: false, errors: "Wrong Password" });
        }

        if (user.isAdmin && !user.isApprovedAdmin) {
            return res.json({ success: false, errors: "You are not approved as an admin yet." });
        }

        const data = {
            user: {
                id: user.id,
                isAdmin: user.isAdmin,
                isApprovedAdmin: user.isApprovedAdmin,
            }
        };

        // If login is successful and user is verified, clear the verification token
        if (passCompare && user.isVerified) {
            user.verificationToken = undefined;
            await user.save();
        }

        // Check the refresh token and its expiry
        let refreshtoken = user.refreshToken;
        let refreshTokenExpiry = user.refreshTokenExpiry;
        const now = new Date();

        // If there's no refresh token or it's expired, create a new one
        if (!refreshtoken || refreshTokenExpiry <= now) {
            refreshtoken = jwt.sign(data, 'secret_recom', { expiresIn: "1d" });
            refreshTokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day

            await Users.findByIdAndUpdate(user.id, {
                refreshToken: refreshtoken,
                refreshTokenExpiry: refreshTokenExpiry
            });
        }

        // Generate new access token
        const token = jwt.sign(data, 'secret_ecom', { expiresIn: "30m" });

        // Return user data (excluding sensitive information)
        const userData = {
            id: user._id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
            isApprovedAdmin: user.isApprovedAdmin
        };

        res.json({ success: true, token, refreshtoken, user: userData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error logging in" });
    }
});

router.post('/signup', async (req, res) => {
    try {
        let checkEmail = await Users.findOne({ email: req.body.email });
        if (checkEmail) {
            return res.status(400).json({ success: false, errors: "Existing user found with same email" });
        }

        let checkUsername = await Users.findOne({ username: req.body.username });
        if (checkUsername) {
            return res.status(400).json({ success: false, errors: "Existing user found with same username" });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Generate verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');

        const user = new Users({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            dob: req.body.dob,
            location: req.body.location,
            isAdmin: req.body.isAdmin || false,
            verificationToken: verificationToken,
            isVerified: false
        });

        await user.save();

        // Send verification email
        const verificationUrl = `${process.env.frontend_url}/verify-email/${verificationToken}`;
        const subject = 'CampusCrew - Email Verification';
        const text = `Hello ${user.username},

Welcome to CampusCrew! 

Please click on the following link to verify your email address:
${verificationUrl}

This link will expire in 24 hours for security reasons.

If you did not create this account, please ignore this email.

Best regards,
CampusCrew Team`;
        
        try {
            await sendEmail(user.email, subject, text);
            console.log(`Verification email sent successfully to: ${user.email}`);
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Still allow signup to complete, but log the error
        }

        const data = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(data, 'secret_ecom', { expiresIn: "30m" });

        res.json({ 
            success: true, 
            token,
            message: "Signup successful! Please check your email for a verification link."
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ success: false, message: "Error during signup" });
    }
});

// Email Verification Route
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    const { verificationId } = req.query; // Get the verification ID

    try {
        // Check if this verification ID has already been processed
        if (verificationId && successfulVerifications.has(verificationId)) {
            return res.status(400).json({ 
                success: false, 
                message: "This verification link has already been used." 
            });
        }

        const user = await Users.findOne({ verificationToken: token });
        
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid or expired verification token." 
            });
        }

        if (user.isVerified) {
            return res.status(400).json({ 
                success: false, 
                message: "Email is already verified." 
            });
        }

        // Mark user as verified and remove verification token
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        // Add verification ID to successful set if provided
        if (verificationId) {
            successfulVerifications.add(verificationId);
            
            // Clean up old verification IDs (optional, to prevent memory leak)
            setTimeout(() => {
                successfulVerifications.delete(verificationId);
            }, 5 * 60 * 1000); // Remove after 5 minutes
        }

        res.json({ 
            success: true, 
            message: "Email verified successfully! You can now log in." 
        });
    } catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error verifying email." 
        });
    }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "User with this email does not exist." 
            });
        }

        // Generate password reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        
        // Set token and expiration (1 hour)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // Send password reset email
        const resetUrl = `${process.env.frontend_url}/reset-password/${resetToken}`;
        const subject = 'CampusCrew - Password Reset Request';
        const text = `Hello ${user.username},

You are receiving this email because you (or someone else) has requested a password reset for your CampusCrew account.

Please click on the following link to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
CampusCrew Team`;

        try {
            await sendEmail(user.email, subject, text);
            console.log(`Password reset email sent successfully to: ${user.email}`);
        } catch (emailError) {
            console.error("Failed to send password reset email:", emailError);
            return res.status(500).json({ 
                success: false, 
                message: "Error sending password reset email." 
            });
        }

        res.json({ 
            success: true, 
            message: "Password reset link sent! Please check your email." 
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error processing password reset request." 
        });
    }
});

// Verify Reset Token Route
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await Users.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.json({ valid: false });
        }

        res.json({ valid: true });
    } catch (error) {
        console.error("Verify reset token error:", error);
        res.json({ valid: false });
    }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await Users.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "Password reset token is invalid or has expired." 
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update user password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ 
            success: true, 
            message: "Password has been reset successfully!" 
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error resetting password." 
        });
    }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        console.log('Profile request for user ID:', req.user.id);
        const user = await Users.findById(req.user.id).select('-password -refreshToken -refreshTokenExpiry');

        if (!user) {
            console.log('User not found with ID:', req.user.id);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        console.log('User found:', { id: user._id, username: user.username, email: user.email });
        res.json({ success: true, user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: "Error fetching profile" });
    }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { username, email, location, dob, targetScore } = req.body;

        // Check if email is being changed and if it already exists
        if (email && email !== req.user.email) {
            const emailExists = await Users.findOne({ email, _id: { $ne: req.user.id } });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email already exists" });
            }
        }

        const updatedUser = await Users.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    username,
                    email,
                    location,
                    dob: dob ? new Date(dob) : undefined,
                    targetScore
                }
            },
            { new: true, select: '-password -refreshToken -refreshTokenExpiry' }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: "Error updating profile" });
    }
});


router.put('/upload-photo/:id', upload.single('photo'), async (req, res) => {
    try {
        let profilePhoto = '';
        const id = req.params.id;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Upload using the path from multer
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'profile_photos',
            resource_type: 'image'
        });
        profilePhoto = result.secure_url;
        const updateUser = await Users.findByIdAndUpdate(id, { profilePic: profilePhoto }, { new: true });
        if (!updateUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, url: profilePhoto });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Error uploading photo' });
    }
});


module.exports = router


