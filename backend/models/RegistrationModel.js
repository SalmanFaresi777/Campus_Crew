const mongoose = require('mongoose')

const { Schema } = mongoose



const RegistrationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'events',
        required: true
    },
    payment_status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    is_registered: {
        type: Boolean,
        default: false
    },
    trans_id: {
        type: String
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('registrations', RegistrationSchema)