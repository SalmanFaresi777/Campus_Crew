const express = require('express')
const router = express.Router()

const Registration = require('../models/RegistrationModel')
const Events = require('../models/EventModel')
const { generateCertificate, buildCertificateSVG } = require('../utils/certificateGenerator');
const { isEventExpired } = require('../utils/eventCleanup');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const SSLCommerzPayment = require('sslcommerz-lts');
const bkashAusth = require('../middleware/bkashAusth');
const store_id = process.env.Store_ID
const store_passwd = process.env.Store_Password
const axios = require('axios')
const global = require('node-global-storage')
const frontend = process.env.frontend_url
const backend = process.env.backend_url
router.post('/register-event', async (req, res) => {
    try {
        const tran_id = uuidv4();

        const registrationData = req.body;
        // Prevent duplicate registrations for same user & event
        const existing = await Registration.findOne({ userId: registrationData.userId, eventId: registrationData.eventId });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Already registered for this event', registration: existing });
        }
        const event = await Events.findById(registrationData.eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Check if event is expired
        if (isEventExpired(event.date)) {
            return res.status(400).json({ success: false, message: 'Cannot register for expired event' });
        }


        let newRegistration = new Registration({
            userId: registrationData.userId,
            eventId: registrationData.eventId,
        })
        if (event.registration_fee === 0) {

            newRegistration.is_registered = true;
            newRegistration.payment_status = 'completed';
        } else {
            newRegistration.is_registered = false;
            newRegistration.payment_status = 'pending';
            newRegistration.trans_id = tran_id;
        }
        await newRegistration.save();
        if (event.registration_fee === 0) {
            return res.status(201).json({ success: true, registration: newRegistration });
        }



    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.post("/bkash/pay", bkashAusth.bkash_auth, async (req, res) => {
    try {
        const token = req.bkashToken; // token is attached to request
        // console.log("Using bKash Token:", token);

        const { data } = await axios.post(
            process.env.bkash_create_payment_url,
            {
                mode: "0011",
                payerReference: " ",
                callbackURL: `${backend}/api/bkash/callback?userId=` + req.body.userId + "&eventId=" + req.body.eventId,
                amount: req.body.amount.toString(),
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: "Inv" + uuidv4().substring(0, 8),
            },

            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    authorization: token,
                    "x-app-key": process.env.bkash_api_key,
                },
            }
        );
        console.log(data)
        return res.status(200).json({ bkashURL: data.bkashURL });
    } catch (error) {
        return res.status(500).json({ success: false, message: error });
    }
});

router.get('/bkash/callback', bkashAusth.bkash_auth, async (req, res) => {
    const token = req.bkashToken;
    const { paymentID, status, userId, eventId } = req.query; // <-- include userId and eventId

    if (status === 'cancel' || status === 'failure') {
        return res.redirect(`${frontend}/failure?message=${status}`);
    } else if (status === 'success') {
        console.log('User ID:', userId);
        console.log('Event ID:', eventId);

        try {


            const existing = await Registration.findOne({ userId: userId, eventId: eventId });
            if (existing) {
                return res.redirect(`${frontend}/failure?message=Already registered for this event`);
            }

            let newRegistration = new Registration({
                userId: userId,
                eventId: eventId,
                payment_status: 'completed',
                is_registered: true
            })
            await newRegistration.save();
            return res.redirect(`${frontend}/events/${eventId}`);

        } catch (error) {
            console.error(error);
        }
    }
});

router.get('/event/:eventId/user/:userId', async (req, res) => {
    const { eventId, userId } = req.params;

    try {
        const registration = await Registration.findOne({ eventId, userId });
        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        res.status(200).json({ success: true, registration });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/registrations', async (req, res) => {
    try {
        const registrations = await Registration.find();
        res.status(200).json({ success: true, registrations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.get('/registrations/user/:id', async (req, res) => {
    try {
        const id = req.params.id
        const registration = await Registration.find({ userId: id }).populate('eventId')
        if (!registration || registration.length === 0) {
            return res.status(404).json({ success: false, message: 'Registered events not found', userId: id });
        }
        
        // Filter out registrations for expired events
        const now = new Date();
        const activeRegistrations = registration.filter(reg => {
            return reg.eventId && new Date(reg.eventId.date) >= now;
        });
        
        res.status(200).json({ success: true, registration: activeRegistrations })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.get('/registrations/event/:id', async (req, res) => {
    try {
        const id = req.params.id
        const registration = await Registration.find({ eventId: id }).populate('userId')
        if (!registration || registration.length === 0) {
            return res.status(404).json({ success: false, message: 'Registered users not found', eventId: id });
        }
        res.status(200).json({ success: true, registration })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


router.delete('/registrations/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;

        const deletion = await Registration.findById(id)
        if (deletion.userId.toString() !== userId) {
            return res.status(404).json({ success: false, message: "User is not authorized." })
        }
        const deletionResult = await Registration.findByIdAndDelete(id)
        if (!deletionResult) {
            return res.status(404).json({ success: false, message: "Registration not found" })
        }
        res.status(200).json({ success: true, message: "Registration deleted Successfully" })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})



router.get('/success/:tran_id', async (req, res) => {
    try {
        const tran_id = req.params.tran_id;

        const register = await Registration.findOne({ trans_id: tran_id })
        if (!register) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        register.payment_status = 'completed'
        register.is_registered = true
        await register.save()
        return res.redirect(`https://localhost:3000//events/${register.eventId}`);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})

router.put('/unregister', async (req, res) => {
    const { userId, eventId } = req.body;
    try {
        const registration = await Registration.findOne({ userId, eventId }).populate('eventId');
        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        const registrationFee = registration.eventId.registration_fee;
        await Registration.deleteOne({ userId, eventId });
        let message;
        if (registrationFee === 0) {
            message = 'No registration fee to refund';
        } else {
            message = 'Registration fee will be refunded within 7-10 business days';
        }
        res.status(200).json({ success: true, message, registrationFee });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})


module.exports = router

// ================= Certificate Endpoints =================
// (Placed after module.exports for minimal diff; could be refactored into own router)

// Middleware to verify user token for certificate routes
function verifyUserToken(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, message: 'No token' });
    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, 'secret_ecom');
        req.authUserId = decoded.user.id;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
}

// List certificates (ended events) for a user
router.get('/certificates/user/:userId', verifyUserToken, async (req, res) => {
    try {
        const { userId } = req.params;
        if (userId !== req.authUserId) return res.status(403).json({ success: false, message: 'Forbidden' });
        const regs = await Registration.find({ userId, is_registered: true }).populate('eventId');
        const now = Date.now();
        const certificates = regs
            .filter(r => r.eventId && new Date(r.eventId.date).getTime() < now) // past events only
            .map(r => ({
                registrationId: r._id,
                eventId: r.eventId._id,
                eventTitle: r.eventId.title,
                eventDate: r.eventId.date,
                eventLocation: r.eventId.location,
                organizer: r.eventId.organizer,
                certificateId: r._id.toString(),
                createdAt: r.createdAt
            }));
        return res.json({ success: true, certificates });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// Download a certificate PDF (SVG design)
router.get('/certificates/:registrationId/download', verifyUserToken, async (req, res) => {
    try {
        const { registrationId } = req.params;
        const reg = await Registration.findById(registrationId).populate('eventId').populate('userId');
        if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
        if (reg.userId._id.toString() !== req.authUserId) return res.status(403).json({ success: false, message: 'Forbidden' });
        if (!reg.eventId) return res.status(404).json({ success: false, message: 'Event missing' });
        if (new Date(reg.eventId.date).getTime() > Date.now()) return res.status(400).json({ success: false, message: 'Event not finished yet' });

    const userName = reg.userId.username || 'Participant';
    const eventTitle = reg.eventId.title || 'Event';
    const eventDate = new Date(reg.eventId.date).toLocaleDateString();
    const eventLocation = reg.eventId.location || '';
    const orgName = reg.eventId.organizer || 'CampusCrew';
        // Fetch up to two admins for signatures
        const admins = await require('../models/UserModel').find({ isAdmin: true }).limit(2).lean();
        const sigLeftName = admins[0]?.username || 'Organizer';
        const sigLeftTitle = 'Organizer';
        const sigCenterName = admins[1]?.username || admins[0]?.username || 'Coordinator';
        const sigCenterTitle = 'Coordinator';
        // Embed logo as base64 (reads frontend asset). Adjust path if deployed differently.
        const fs = require('fs');
        const path = require('path');
        let logoData = null;
        try {
            const logoPath = path.join(__dirname, '../../frontend/src/assets/img/campuscrew.png');
            const buf = fs.readFileSync(logoPath);
            logoData = buf.toString('base64');
        } catch (e) {
            // silent fail; logo optional
        }
        const issueDate = new Date().toLocaleDateString();
        const certId = reg._id.toString();

        res.setHeader('Content-Type', 'application/pdf');
        const safeTitle = eventTitle.replace(/[^a-z0-9]/gi, '_');
        res.setHeader('Content-Disposition', `attachment; filename=Certificate_${safeTitle}_${certId.substring(0,6)}.pdf`);
        // Build QR (URL that serves PNG download) and pass into PDF
        const QRCode = require('qrcode');
    const verifyUrl = `${process.env.backend_url || ''}/api/certificates/${registrationId}/image`;
        let qrDataUrl = null;
        try { qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 }); } catch(e) {}
    generateCertificate(res, { userName, eventTitle, eventDate, issueDate, certId, eventLocation, orgName, sigLeftName, sigLeftTitle, sigCenterName, sigCenterTitle, logoData, qrDataUrl });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// Certificate PNG endpoint (public or protected? keep protected to ensure ownership)
router.get('/certificates/:registrationId/image', async (req, res) => {
    try {
        const { registrationId } = req.params;
        const reg = await Registration.findById(registrationId).populate('eventId').populate('userId');
        if (!reg) return res.status(404).json({ success: false, message: 'Not found' });
    // Public access for verification (no auth). If you want limited access, re-add auth check.
        if (new Date(reg.eventId.date).getTime() > Date.now()) return res.status(400).json({ success: false, message: 'Event not finished yet' });

        const fs = require('fs');
        const path = require('path');
        let logoData = null;
        try {
            const logoPath = path.join(__dirname, '../../frontend/src/assets/img/campuscrew.png');
            logoData = fs.readFileSync(logoPath).toString('base64');
        } catch(e) {}

        const userName = reg.userId.username || 'Participant';
        const eventTitle = reg.eventId.title || 'Event';
        const eventDate = new Date(reg.eventId.date).toLocaleDateString();
        const eventLocation = reg.eventId.location || '';
        const orgName = reg.eventId.organizer || 'CampusCrew';
        const issueDate = new Date().toLocaleDateString();
        const certId = reg._id.toString();

        const QRCode = require('qrcode');
    const verifyUrl = `${process.env.backend_url || ''}/api/certificates/${registrationId}/image`;
        let qrDataUrl = null;
        try { qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin:1, width:300 }); } catch(e) {}

        const { buildCertificateSVG } = require('../utils/certificateGenerator');
        const svg = buildCertificateSVG({ userName, eventTitle, eventDate, issueDate, certId, eventLocation, orgName, logoData, qrDataUrl });

        // Convert SVG -> PNG using sharp
        const sharp = require('sharp');
        const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename=Certificate_${certId.substring(0,6)}.png`);
        return res.send(pngBuffer);
    } catch(e) {
        return res.status(500).json({ success:false, message: e.message });
    }
});






