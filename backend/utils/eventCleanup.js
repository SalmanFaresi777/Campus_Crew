const Events = require('../models/EventModel');
const Registration = require('../models/RegistrationModel');

/**
 * Clean up expired events and their associated registrations
 * Events are considered expired if their date has passed by more than 1 day
 * This gives a grace period to avoid accidentally deleting events that just ended
 */
const cleanupExpiredEvents = async () => {
    try {
        // Consider events expired only after 1 day has passed since the event date
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        // Find all expired events (more than 1 day old)
        const expiredEvents = await Events.find({
            date: { $lt: oneDayAgo }
        });

        if (expiredEvents.length === 0) {
            console.log('No expired events found to cleanup');
            return { success: true, deletedEventsCount: 0, deletedRegistrationsCount: 0 };
        }

        // Get the IDs of expired events
        const expiredEventIds = expiredEvents.map(event => event._id);
        
        console.log(`Found ${expiredEvents.length} expired events to cleanup (more than 1 day old)`);

        // Delete all registrations associated with expired events
        const deletedRegistrations = await Registration.deleteMany({
            eventId: { $in: expiredEventIds }
        });

        // Delete all expired events
        const deletedEvents = await Events.deleteMany({
            date: { $lt: oneDayAgo }
        });

        console.log(`Cleanup completed: ${deletedEvents.deletedCount} events deleted, ${deletedRegistrations.deletedCount} registrations deleted`);

        return {
            success: true,
            deletedEventsCount: deletedEvents.deletedCount,
            deletedRegistrationsCount: deletedRegistrations.deletedCount
        };

    } catch (error) {
        console.error('Error during event cleanup:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Start the automatic cleanup process
 * Runs every hour to check for expired events
 */
const startAutomaticCleanup = () => {
    console.log('Starting automatic event cleanup service...');
    
    // Run cleanup immediately on start
    cleanupExpiredEvents();
    
    // Schedule cleanup to run every hour (3600000 ms)
    setInterval(() => {
        console.log('Running scheduled event cleanup...');
        cleanupExpiredEvents();
    }, 60 * 60 * 1000); // 1 hour in milliseconds
};

/**
 * Check if an event is expired (more than 1 day old)
 */
const isEventExpired = (eventDate) => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const eventDateTime = new Date(eventDate);
    return eventDateTime < oneDayAgo;
};

module.exports = {
    cleanupExpiredEvents,
    startAutomaticCleanup,
    isEventExpired
};
