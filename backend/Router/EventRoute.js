const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const Events = require('../models/EventModel')
const Users = require('../models/UserModel')
const upload = require('../utils/multer')
const multer = require('multer')
const cloudinary = require('../utils/cloudinary')
const { isEventExpired, cleanupExpiredEvents } = require('../utils/eventCleanup')


// Middleware: verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, 'secret_ecom');
        req.user = decoded.user; // { id, isAdmin, isApprovedAdmin }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Middleware: ensure user is an approved admin
const requireAdmin = async (req, res, next) => {
    try {
        const user = await Users.findById(req.user.id).select('isAdmin isApprovedAdmin');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (!user.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
        if (user.isAdmin && !user.isApprovedAdmin) return res.status(403).json({ success: false, message: 'Admin not approved yet' });
        next();
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Authorization check failed' });
    }
};

// Create Event (Admin only)
router.post('/events', verifyToken, requireAdmin, (req,res,next)=>{
    upload.single('image')(req,res,function(err){
        if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') return res.status(413).json({success:false,message:'Image must be 3MB or smaller'});
        if(err) return res.status(400).json({success:false,message:err.message});


        next();
    })
}, async (req, res) => {
    try {
        const eventBody = req.body || {};
        // Always trust token, not client, for creator
        eventBody.createdBy = req.user.id;
        const newEvent = new Events(eventBody);
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'event_photos',
                resource_type: 'image'
            });
            newEvent.event_image = result.secure_url;
        }
        await newEvent.save();
        res.status(201).json({ success: true, event: newEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.get('/events', async (req, res) => {
    try {
        // Get current time minus 1 hour to allow recently started events to still show
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        // Only return events that haven't been over for more than 1 hour
        const events = await Events.find({
            date: { $gte: oneHourAgo }
        });
        res.status(200).json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

// Get single event details
router.get('/events/:id', async (req, res) => {
    try {
        const event = await Events.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        // Check if event is expired (more than 1 day old)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        if (new Date(event.date) < oneDayAgo) {
            return res.status(404).json({ success: false, message: 'Event has expired and is no longer available' });
        }
        
        res.status(200).json({ success: true, event });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


// Update Event (Admin only for now) - could be extended to creator-only
router.put('/events/:id', verifyToken, requireAdmin, (req,res,next)=>{
    upload.single('image')(req,res,function(err){
        if(err instanceof multer.MulterError && err.code==='LIMIT_FILE_SIZE') return res.status(413).json({success:false,message:'Image must be 3MB or smaller'});
        if(err) return res.status(400).json({success:false,message:err.message});

        next();
    });
}, async (req, res) => {
    try {
        const eventId = req.params.id;
        const eventBody = req.body || {};
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'event_photos',
                resource_type: 'image'
            });
            eventBody.event_image = result.secure_url;
        }

        const oldEvent = await Events.findById(eventId);
        if (!oldEvent) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }


        // Update fields dynamically
        oldEvent.title = eventBody.title || oldEvent.title;
        oldEvent.description = eventBody.description || oldEvent.description;
        oldEvent.date = eventBody.date || oldEvent.date;
        oldEvent.location = eventBody.location || oldEvent.location;
        oldEvent.organizer = eventBody.organizer || oldEvent.organizer;
        oldEvent.registration_deadline = eventBody.registration_deadline || oldEvent.registration_deadline;
        oldEvent.registration_fee = eventBody.registration_fee || oldEvent.registration_fee;
        oldEvent.category = eventBody.category || oldEvent.category;
        if (eventBody.event_image) oldEvent.event_image = eventBody.event_image;

        // ✅ Add this for tags
        if (eventBody.tags) oldEvent.tags = eventBody.tags;


        const updatedEvent = await oldEvent.save();
        res.status(200).json({ success: true, event: updatedEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Delete Event (Admin only for now)
router.delete("/events/:id", verifyToken, requireAdmin, async (req, res) => {
    try {
        const eventId = req.params.id;
        const deletedEvent = await Events.findByIdAndDelete(eventId);
        if (!deletedEvent) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
})

// Manual cleanup endpoint for admins
router.post("/cleanup-expired-events", verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await cleanupExpiredEvents();
        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Cleanup completed successfully',
                deletedEventsCount: result.deletedEventsCount,
                deletedRegistrationsCount: result.deletedRegistrationsCount
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Cleanup failed',
                error: result.error
            });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
})


module.exports = router





