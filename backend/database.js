const mongoose = require('mongoose')
require('dotenv').config()
const uri = process.env.mongo_uri || process.env.MONGODB_URI || process.env.MONGO_URL

let connectPromise = null;

const MongDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (connectPromise) return connectPromise;

    if (!uri) {
        throw new Error('MongoDB URI is missing. Set one of: mongo_uri, MONGODB_URI, or MONGO_URL');
    }

    connectPromise = mongoose
        .connect(uri)
        .then((conn) => {
            console.log('Connected to MongoDB');
            return conn;
        })
        .catch((error) => {
            connectPromise = null;
            throw error;
        });

    return connectPromise;
}

module.exports = MongDB