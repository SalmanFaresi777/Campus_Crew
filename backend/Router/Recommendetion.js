// const express = require('express');
// const mongoose = require('mongoose');
// const Events = require('../models/EventModel');
// const Registration = require('../models/RegistrationModel');

// const router = express.Router();
// const { ObjectId } = mongoose.Types;

// // ---- weights (tune these) ----
// const W_CF = 0.7;  // main signal: similar users
// const W_POP = 0.3;  // popularity
// const W_TAG = 0.1;  // optional tag boost (set 0 if you don’t want tags)

// // ---- helpers ----
// const jaccard = (aSet, bSet) => {
//     if (!aSet.size && !bSet.size) return 0;
//     let inter = 0;
//     for (const v of aSet) if (bSet.has(v)) inter++;
//     return inter / (aSet.size + bSet.size - inter || 1);
// };

// const normalizeMap = (map) => {
//     let max = 0;
//     for (const v of map.values()) if (v > max) max = v;
//     if (max === 0) return new Map([...map.entries()].map(([k]) => [k, 0]));
//     return new Map([...map.entries()].map(([k, v]) => [k, v / max]));
// };

// router.get('/recommended-events/:userId', async (req, res) => {
//     try {
//         const userIdStr = req.params.userId;
//         if (!ObjectId.isValid(userIdStr)) {
//             return res.status(400).json({ success: false, message: 'Invalid userId' });
//         }
//         const userId = new ObjectId(userIdStr);
//         const now = new Date();

//         // 1) The user's completed registrations (history)
//         const myRegs = await Registration.find({
//             userId,
//             is_registered: true,
//             payment_status: 'completed'
//         }).select('eventId').lean();

//         const myEventIds = myRegs.map(r => String(r.eventId));
//         const myEventObjIds = myEventIds.map(id => new ObjectId(id));

//         // 2) Popularity (completed registrations per event)
//         const popRows = await Registration.aggregate([
//             { $match: { is_registered: true, payment_status: 'completed' } },
//             { $group: { _id: '$eventId', count: { $sum: 1 } } }
//         ]);
//         const popMapRaw = new Map(popRows.map(r => [String(r._id), r.count]));
//         const popMap = normalizeMap(popMapRaw); // 0..1

//         // 3) Candidate events = upcoming & open, excluding already-registered
//         const candidates = await Events.find({
//             _id: { $nin: myEventObjIds },
//             registration_deadline: { $gte: now },
//             date: { $gte: now }
//         }).lean();

//         // If user has no history -> return top popular upcoming
//         if (myEventIds.length === 0) {
//             const scored = candidates
//                 .map(e => ({
//                     event: e,
//                     score: (popMap.get(String(e._id)) || 0)
//                 }))
//                 .sort((a, b) => b.score - a.score)
//                 .slice(0, 5)
//                 .map(x => x.event);

//             return res.status(200).json({ success: true, events: scored });
//         }

//         // 4) Item-based CF using co-registration:
//         //    peers = users who also registered any of my events
//         //    weight each peer by overlap count (#shared events with me)
//         const peerOverlap = await Registration.aggregate([
//             {
//                 $match: {
//                     is_registered: true,
//                     payment_status: 'completed',
//                     eventId: { $in: myEventObjIds }
//                 }
//             },
//             { $group: { _id: '$userId', overlap: { $sum: 1 } } },
//             { $match: { _id: { $ne: userId } } }
//         ]);
//         const peerIds = peerOverlap.map(p => p._id);
//         const overlapByPeer = new Map(peerOverlap.map(p => [String(p._id), p.overlap]));

//         let cfScoreMap = new Map(); // eventId -> weighted score
//         if (peerIds.length) {
//             const peerEvents = await Registration.aggregate([
//                 {
//                     $match: {
//                         userId: { $in: peerIds },
//                         is_registered: true,
//                         payment_status: 'completed'
//                     }
//                 },
//                 // carry peer userId forward to weight by overlap
//                 { $group: { _id: { eventId: '$eventId', userId: '$userId' }, cnt: { $sum: 1 } } },
//             ]);

//             for (const row of peerEvents) {
//                 const evId = String(row._id.eventId);
//                 const peer = String(row._id.userId);
//                 if (myEventIds.includes(evId)) continue; // don't recommend already-registered
//                 const peerWeight = overlapByPeer.get(peer) || 0; // weight by shared events
//                 const prev = cfScoreMap.get(evId) || 0;
//                 // contribution: how strongly this peer agrees + their own strength
//                 cfScoreMap.set(evId, prev + peerWeight);
//             }
//         }
//         // Normalize CF to 0..1
//         cfScoreMap = normalizeMap(cfScoreMap);

//         // 5) Optional tag profile from user's history (small boost)
//         const myEvents = await Events.find({ _id: { $in: myEventObjIds } })
//             .select('tags')
//             .lean();
//         const userTagSet = new Set(myEvents.flatMap(e => (e.tags || []).map(t => String(t).toLowerCase())));

//         // 6) Score candidates
//         const scored = candidates.map(e => {
//             const id = String(e._id);
//             const cf = cfScoreMap.get(id) || 0;
//             const pop = popMap.get(id) || 0;

//             // tag similarity (optional)
//             const tagSet = new Set((e.tags || []).map(t => String(t).toLowerCase()));
//             const tagSim = userTagSet.size ? jaccard(userTagSet, tagSet) : 0;

//             // small freshness boost (events happening soon get a nudge)
//             const daysUntil = Math.max(0, (new Date(e.date) - now) / (1000 * 60 * 60 * 24));
//             const soonBoost = daysUntil > 0 && daysUntil < 30 ? 0.05 : 0;

//             const score = (W_CF * cf) + (W_POP * pop) + (W_TAG * tagSim) + soonBoost;
//             return { event: e, score };
//         });

//         // 7) Sort, slice top 5
//         const top = scored.sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.event);

//         return res.status(200).json({ success: true, events: top });
//     } catch (err) {
//         console.error('recommendation error:', err);
//         // graceful fallback: top popular upcoming
//         try {
//             const now = new Date();
//             const upcoming = await Events.find({
//                 registration_deadline: { $gte: now }, date: { $gte: now }
//             }).lean();

//             // recompute pop quickly
//             const popRows = await Registration.aggregate([
//                 { $match: { is_registered: true, payment_status: 'completed' } },
//                 { $group: { _id: '$eventId', count: { $sum: 1 } } }
//             ]);
//             const popMap = new Map(popRows.map(r => [String(r._id), r.count]));
//             const fallback = upcoming
//                 .map(e => ({ e, c: popMap.get(String(e._id)) || 0 }))
//                 .sort((a, b) => b.c - a.c)
//                 .slice(0, 5)
//                 .map(x => x.e);

//             return res.status(200).json({ success: true, events: fallback });
//         } catch {
//             return res.status(200).json({ success: true, events: [] });
//         }
//     }
// });

// module.exports = router;



const express = require('express');
const router = express.Router();
const Events = require('../models/EventModel');
const Registration = require('../models/RegistrationModel');

router.get('/suggested_events/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Get user registration history
        const registrations = await Registration.find({ userId }).populate('eventId');
        const registeredEvents = registrations
            .map(r => r.eventId)
            .filter(event => event !== null); // Filter out null events

        // Collect registered event IDs
        const registeredEventIds = registeredEvents.map(e => e._id.toString());

        // 2. Build user preferences
        const userCategories = new Set();
        const userTags = new Set();
        registeredEvents.forEach(event => {
            if (event.category) userCategories.add(event.category);
            if (event.tags) event.tags.forEach(tag => userTags.add(tag));
        });

        // 3. Fetch upcoming events excluding already registered
        const allEvents = await Events.find({
            date: { $gte: new Date() },
            _id: { $nin: registeredEventIds }
        });

        // 4. Count popularity
        const eventPopularity = await Registration.aggregate([
            { $group: { _id: "$eventId", count: { $sum: 1 } } }
        ]);
        const popularityMap = {};
        eventPopularity.forEach(p => {
            popularityMap[p._id.toString()] = p.count;
        });

        // 5. Score events
        const scoredEvents = allEvents.map(event => {
            let score = 0;
            if (userCategories.has(event.category)) score += 2;
            const matchingTags = (event.tags || []).filter(tag => userTags.has(tag)).length;
            score += matchingTags * 1.5;
            score += (popularityMap[event._id.toString()] || 0) * 1;
            return { event, score };
        });

        // 6. Sort and return top 6
        const recommended = scoredEvents
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(item => item.event);

        res.status(200).json({
            success: true,
            recommended,
            message: "Top recommended events for user"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router

