const axios = require("axios");

class BkashMiddleware {
    constructor() {
        this.idToken = null;      // Store token in memory
        this.tokenExpiry = null;  // Store expiry time
    }

    bkash_auth = async (req, res, next) => {
        try {
            // Check if token exists and is still valid
            const now = new Date();
            if (!this.idToken || !this.tokenExpiry || now >= this.tokenExpiry) {
                // Get a new token from bKash
                const { data } = await axios.post(
                    process.env.bkash_grant_token_url,
                    {
                        app_key: process.env.bkash_api_key,
                        app_secret: process.env.bkash_secret_key,
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            username: process.env.bkash_username,
                            password: process.env.bkash_password,
                        },
                    }
                );

                this.idToken = data.id_token;
                // bKash token usually has expiry in seconds, e.g., 3600
                this.tokenExpiry = new Date(now.getTime() + data.expires_in * 1000);
            }

            // Attach token to request for downstream routes
            req.bkashToken = this.idToken;

            next();
        } catch (error) {
            console.error("bKash Auth Error:", error.response?.data || error.message);
            return res.status(401).json({
                message: "Failed to get bKash token",
                error: error.message,
            });
        }
    };
}

module.exports = new BkashMiddleware();
