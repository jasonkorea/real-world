const mongoose = require('mongoose');

// Define Schemes
const unitSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    size: { type: Number, required: true },
    speed: { type: Number, required: true },
    image: { type: String, required: true },
    startPosition: {lat: Number, lng: Number},
    destinationPosition: {lat: Number, lng: Number},
    startTime: {type: Number, required: false}
},
    {
        timestamps: true
    });

// Create Model & Export
module.exports = mongoose.model('Unit', unitSchema);