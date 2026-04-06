const mongoose = require('mongoose')

const { Schema } = mongoose



const EventSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    prize_money: {
        type: Number,
        required: true
    },
    event_image: {
        type: String,
        default: ''
    },
    event_type: {
        type: String,
        // enum: ['online', 'offline'],
        default: 'offline'
    },

    registration_deadline: {
        type: Date,
        required: true
    },
    registration_fee: {
        type: Number,
        required: true
    },
    organizer: {
        type: String,
        required: true
    },
    tags: [{ type: String, index: true }],
    category: { type: String, default: '' },
}, {
    timestamps: true
})

module.exports = mongoose.model('events', EventSchema)