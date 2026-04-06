const mongoose = require('mongoose')

const { Schema } = mongoose

const UserSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        default: '',
    },
    dob: {
        type: Date,
        default: null
    },
    location: {
        type: String,
        default: ''
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isApprovedAdmin: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        default: ''
    },
    resetPasswordToken: {
        type: String,
        default: ''
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    refreshToken: {
        type: String,
        default: ''
    },
    refreshTokenExpiry: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('users', UserSchema)