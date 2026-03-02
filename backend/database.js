const mongoose = require('mongoose')
require('dotenv').config()
const uri = process.env.mongo_uri

const MongDB = async () => {
    try {
        await mongoose.connect(uri)
        console.log("Connected to MongDB")

    } catch (error) {
        console.log("connection failed")
        process.exit(1)
    }
}

module.exports = MongDB