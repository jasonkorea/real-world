const mongoose = require('mongoose');

// Define Schemes
const unitSchema = new mongoose.Schema({
    id: { type: String, required: true },
    size: { type: Number, required: true },
    speed: { type: Number, required: true },
    image: { type: String, required: true },
    startPosition: {lat: mongoose.Schema.Types.Decimal128, lng: mongoose.Schema.Types.Decimal128},
    destinationPosition: {lat: mongoose.Schema.Types.Decimal128, lng: mongoose.Schema.Types.Decimal128},
    startTime: {type: Number, required: true}
},
    {
        timestamps: true
    });

// Create Model & Export
module.exports = mongoose.model('Unit', unitSchema);