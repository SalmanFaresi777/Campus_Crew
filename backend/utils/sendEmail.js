const nodemailer = require('nodemailer')
require('dotenv').config()
module.exports = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'true' || true, // true for port 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                // Do not fail on invalid certs for development
                rejectUnauthorized: false
            }
        })
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: subject,
            text: text

        })
        console.log(`Email sent successfully to: ${email}`)
    } catch (error) {
        console.log("Could not send Message")
        console.log(error)

    }
}