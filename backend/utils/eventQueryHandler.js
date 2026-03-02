/**
 * Event Query Handler
 * Processes different types of event-related database queries
 * Based on classified intent from intentClassifier
 */

const dbTools = require('./dbTools');

/**
 * Handle event database queries based on classified intent
 * @param {object} intentResult - Result from intentClassifier
 * @param {object} responseStrategy - Strategy from intentClassifier
 * @param {string} frontendBaseUrl - Base URL for event links
 * @returns {Promise<string|null>} - Formatted response or null
 */
async function handleEventQuery(intentResult, responseStrategy, frontendBaseUrl) {
  const { intent, entities } = intentResult;
  const { queryType } = responseStrategy;
  
  try {
    switch (queryType) {
      case 'stats':
        return await handleStatsQuery(frontendBaseUrl);
        
      case 'list_upcoming':
        return await handleUpcomingEventsQuery(responseStrategy.limit || 10, frontendBaseUrl);
        
      case 'category':
        const category = responseStrategy.category || entities.category;
        return await handleCategoryQuery(category, frontendBaseUrl);
        
      case 'specific_event':
        const eventName = responseStrategy.eventName || entities.eventName;
        const attribute = entities.attribute;
        return await handleSpecificEventQuery(eventName, attribute, frontendBaseUrl);
        
      default:
        return null;
    }
  } catch (error) {
    console.error('Error handling event query:', error);
    return null;
  }
}

/**
 * Handle platform statistics request
 */
async function handleStatsQuery(frontendBaseUrl) {
  const stats = await dbTools.getEventStats();
  
  if (!stats) {
    return null;
  }
  
  return `## 📊 **Platform Statistics**

### 🎯 **Event Overview**
🎪 **Total Events:** **${stats.totalEvents}**
🚀 **Upcoming Events:** **${stats.upcomingEvents}**  
📅 **Past Events:** **${stats.pastEvents}**

### 👥 **Community Engagement**
📝 **Total Registrations:** **${stats.totalRegistrations}**

---

💡 **Ready to join an event?** Ask me about upcoming events or specific categories!`;
}

/**
 * Handle general upcoming events list request
 */
async function handleUpcomingEventsQuery(limit, frontendBaseUrl) {
  const upcoming = await dbTools.getUpcomingEvents(limit);
  
  if (!upcoming || upcoming.length === 0) {
    return `## 📅 **No Upcoming Events**

Currently, there are no upcoming events scheduled in our database.

💡 **Stay tuned!** New events are added regularly. Check back soon for exciting opportunities!`;
  }
  
  const overview = upcoming.slice(0, Math.min(5, upcoming.length)).map((event, index) => {
    const link = `${frontendBaseUrl}/events/${event.id}`;
    const eventDate = event.date ? new Date(event.date) : null;
    
    return `
#### ${index + 1}. 🎪 **${event.title}** ✨

📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : '**TBA**'}${event.time ? ` at **${event.time}**` : ''}
📍 **Location:** ${event.location || '**TBA**'}
💵 **Fee:** ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE**' : `**৳ ${event.price}**`) : '**TBA**'}
🏆 **Prize:** ${Number.isFinite(event.prizeMoney) ? `**৳ ${event.prizeMoney}**` : '**TBA**'}
👥 **Participants:** **${event.participants ?? 'N/A'}/${event.maxParticipants ?? 'N/A'}**
💺 **Spots Remaining:** **${Number.isFinite(event.spotsRemaining) ? event.spotsRemaining : 'Unknown'}**

🔗 [**View Details & Register ➤**](${link})`;
  }).join('\n\n');

  return `## 🚀 **Upcoming Events on CampusCrew**

📊 **Found ${upcoming.length} upcoming events!**
👇 **Here are the ${Math.min(5, upcoming.length)} soonest events:**

${overview}

💡 **Want more?** Visit ${frontendBaseUrl}/upcoming-events to see all upcoming events!`;
}

/**
 * Handle category-specific events query
 */
async function handleCategoryQuery(category, frontendBaseUrl) {
  if (!category) {
    return null;
  }
  
  const categoryEvents = await dbTools.getEventsByCategory(category, 10);
  
  if (!categoryEvents || categoryEvents.length === 0) {
    return `## ❌ No ${category} Events Found

We couldn't find any **${category.toLowerCase()}** events right now.

💡 Tip: Check back later or browse all events here: [Upcoming Events](${frontendBaseUrl}/upcoming-events)`;
  }
  
  const upcomingEvents = categoryEvents.filter(e => e.isUpcoming);
  const pastEvents = categoryEvents.filter(e => !e.isUpcoming);
  
  let response = `## 🎯 **${category.toUpperCase()}** Category Events

📊 **Found ${categoryEvents.length} total events** (${upcomingEvents.length} upcoming, ${pastEvents.length} past)

`;
  
  if (upcomingEvents.length > 0) {
    response += upcomingEvents.length === 1 ? '### ✨ **FEATURED EVENT** ✨\n\n' : '### 🚀 **UPCOMING EVENTS**\n\n';
    
    upcomingEvents.forEach((event, index) => {
      const link = `${frontendBaseUrl}/events/${event.id}`;
      const eventDate = event.date ? new Date(event.date) : null;
      const regDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
      
      response += `
#### ${upcomingEvents.length === 1 ? '🎭' : `${index + 1}.`} **${event.title}** ✨

📅 ${eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '**TBA**'}
📍 ${event.location || '**TBA**'}
💵 ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE ENTRY**' : `**Fee:** ৳ ${event.price}`) : '**Fee: TBA**'}
🏆 ${Number.isFinite(event.prizeMoney) ? `**Prize:** ৳ ${event.prizeMoney}` : '**Prize: TBA**'}
⏰ Deadline: ${regDeadline ? regDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '**TBA**'}
👥 ${event.participants}/${event.maxParticipants} registered (${event.maxParticipants - event.participants} spots left)

🔗 **[${upcomingEvents.length === 1 ? 'Join Event' : 'Register Here'} ➤](${link})**

`;
    });
  }
  
  if (pastEvents.length > 0) {
    response += '### 📚 **PAST EVENTS**\n\n';
    
    pastEvents.forEach((event, index) => {
      const link = `${frontendBaseUrl}/events/${event.id}`;
      const eventDate = event.date ? new Date(event.date) : null;
      
      response += `
#### ${index + 1}. **${event.title}**

📅 ${eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '**TBA**'}
📍 ${event.location || '**TBA**'}

🔗 **[View Details ➤](${link})**

`;
    });
  }
  
  return response;
}

/**
 * Handle specific event query
 */
async function handleSpecificEventQuery(eventName, attribute, frontendBaseUrl) {
  if (!eventName) {
    return null;
  }
  
  const matches = await dbTools.searchEvents(eventName);
  
  if (matches.length === 0) {
    return `## ❌ **No Events Found**

Sorry, no events were found matching **"${eventName}"** in our database.

💡 **Tip:** Try searching with different keywords or ask about upcoming events in general.`;
  }
  
  if (matches.length > 1) {
    const list = matches.map((event, index) => {
      const link = `${frontendBaseUrl}/events/${event.id}`;
      const eventDate = event.date ? new Date(event.date) : null;
      
      return `#### ${index + 1}. **${event.title}** 🎯

📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '**Date TBA**'}
📍 **Location:** ${event.location || '**Location TBA**'}
💵 **Fee:** ${Number.isFinite(event.price) ? (event.price === 0 ? '**FREE**' : `**৳ ${event.price}**`) : '**TBA**'}
🏆 **Prize:** ${Number.isFinite(event.prizeMoney) ? `**৳ ${event.prizeMoney}**` : '**TBA**'}

🔗 **[Click to view details ➤](${link})**`;
    }).join('\n\n---\n\n');

    return `## 🔍 **Multiple Events Found**

Found **${matches.length} events** matching **"${eventName}"**:

${list}`;
  }
  
  // Single event found
  const match = matches[0];
  const eventId = `${match.id}`;
  
  const [details, participants] = await Promise.all([
    dbTools.getEventDetails(eventId),
    dbTools.getParticipantCount(eventId)
  ]);

  if (!details) {
    return null;
  }
  
  const eventLink = `${frontendBaseUrl}/events/${eventId}`;
  const eventDate = details.date ? new Date(details.date) : null;
  const regDeadline = details.registrationDeadline ? new Date(details.registrationDeadline) : null;
  
  // If user asked for a specific attribute, return concise answer
  if (attribute) {
    switch (attribute) {
      case 'fee':
        const fee = Number.isFinite(details.price) ? (details.price === 0 ? 'FREE' : `৳ ${details.price}`) : 'TBA';
        return `**${details.title}** - Registration fee: **${fee}**\n\n🔗 [View full details ➤](${eventLink})`;
        
      case 'prize':
        const prize = Number.isFinite(details.prizeMoney) ? `৳ ${details.prizeMoney}` : 'TBA';
        return `**${details.title}** - Prize money: **${prize}**\n\n🔗 [View full details ➤](${eventLink})`;
        
      case 'deadline':
        const deadline = regDeadline ? regDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBA';
        return `**${details.title}** - Registration deadline: **${deadline}**\n\n🔗 [View full details ➤](${eventLink})`;
        
      case 'date':
        const date = eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBA';
        return `**${details.title}** - Event date: **${date}**\n\n🔗 [View full details ➤](${eventLink})`;
        
      case 'location':
        return `**${details.title}** - Location: **${details.location || 'TBA'}**\n\n🔗 [View full details ➤](${eventLink})`;
    }
  }
  
  // Return full event details
  return `## 🎉 **${details.title}**

### 📋 **Event Details**
📅 **Date:** ${eventDate ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '**TBA**'}
⏰ **Time:** ${details.time || '**TBA**'}
📍 **Location:** ${details.location || '**TBA**'}
🏷️ **Category:** **${details.category || 'General'}**
💵 **Registration Fee:** ${Number.isFinite(details.price) ? (details.price === 0 ? '**FREE**' : `**৳ ${details.price}**`) : '**TBA**'}
🏆 **Prize Money:** ${Number.isFinite(details.prizeMoney) ? `**৳ ${details.prizeMoney}**` : '**TBA**'}

### 👥 **Registration Info**
${participants ? `🎯 **Participants:** **${participants.participantCount ?? 'N/A'}/${participants.maxParticipants ?? 'N/A'}**
💺 **Spots Remaining:** **${Number.isFinite(participants.spotsRemaining) ? participants.spotsRemaining : 'Unknown'}**
${participants.isFull ? '⚠️ **Event is FULL** - No more registrations accepted' : '✅ **Spots Available** - Register now!'}` : 'Registration information not available'}
${regDeadline ? `📆 **Registration Deadline:** ${regDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}

### 🚀 **Take Action**
🔗 **[Click here to view full details and register ➤](${eventLink})**`;
}

module.exports = {
  handleEventQuery,
  handleStatsQuery,
  handleUpcomingEventsQuery,
  handleCategoryQuery,
  handleSpecificEventQuery
};
