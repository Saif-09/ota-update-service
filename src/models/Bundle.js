// src/models/Bundle.js
const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
    version: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        enum: ['ios', 'android'],
        required: true
    },
    minAppVersion: {
        type: String,
        required: true
    },
    maxAppVersion: {
        type: String
    },
    downloadUrl: {
        type: String,
        required: true
    },
    rolloutPercentage: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'deprecated'],
        default: 'draft'
    },
    hash: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// src/models/UpdateLog.js
const updateLogSchema = new mongoose.Schema({
    bundleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bundle',
        required: true
    },
    deviceId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failure'],
        required: true
    },
    errorMessage: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = {
    Bundle: mongoose.model('Bundle', bundleSchema),
    UpdateLog: mongoose.model('UpdateLog', updateLogSchema)
};