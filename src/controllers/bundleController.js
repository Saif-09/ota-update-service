// src/controllers/bundleController.js
const { Bundle, UpdateLog } = require('../models/Bundle');
const storageService = require('../services/storage');
const semver = require('semver');

class BundleController {
    async uploadBundle(req, res) {
        try {
            const {
                version,
                platform,
                minAppVersion,
                maxAppVersion,
                rolloutPercentage
            } = req.body;

            if (!req.file) {
                return res.status(400).json({ error: 'No bundle file provided' });
            }

            // Upload bundle to S3
            const uploadResult = await storageService.uploadBundle(
                req.file.buffer,
                { version, platform }
            );

            // Create bundle record
            const bundle = new Bundle({
                version,
                platform,
                minAppVersion,
                maxAppVersion,
                rolloutPercentage,
                downloadUrl: uploadResult.downloadUrl,
                hash: uploadResult.hash,
                size: uploadResult.size,
                status: 'published'
            });

            await bundle.save();

            res.status(201).json(bundle);
        } catch (error) {
            console.error('Upload bundle error:', error);
            res.status(500).json({ error: 'Failed to upload bundle' });
        }
    }

    async checkForUpdates(req, res) {
        try {
            const { appVersion, platform, currentBundleVersion, deviceId } = req.query;

            // Find latest compatible bundle
            const bundle = await Bundle.findOne({
                platform,
                status: 'published',
                minAppVersion: { $lte: appVersion },
                $or: [
                    { maxAppVersion: { $gte: appVersion } },
                    { maxAppVersion: null }
                ],
                version: { $gt: currentBundleVersion }
            }).sort({ version: -1 });

            if (!bundle) {
                return res.status(404).json({ message: 'No updates available' });
            }

            // Check rollout percentage
            const deviceHash = crypto
                .createHash('md5')
                .update(deviceId + bundle.version)
                .digest('hex');
            const hashAsNumber = parseInt(deviceHash.substring(0, 8), 16);
            const devicePercentile = (hashAsNumber / 0xffffffff) * 100;

            if (devicePercentile > bundle.rolloutPercentage) {
                return res.status(404).json({ message: 'No updates available' });
            }

            // Generate signed download URL
            const downloadUrl = await storageService.generateSignedUrl(bundle.downloadUrl);

            res.json({
                updateAvailable: true,
                version: bundle.version,
                downloadUrl,
                hash: bundle.hash,
                size: bundle.size
            });
        } catch (error) {
            console.error('Check updates error:', error);
            res.status(500).json({ error: 'Failed to check for updates' });
        }
    }

    async rollback(req, res) {
        try {
            const { version, platform } = req.body;

            const bundle = await Bundle.findOne({ version, platform });
            if (!bundle) {
                return res.status(404).json({ error: 'Bundle not found' });
            }

            // Deprecate the current version
            bundle.status = 'deprecated';
            await bundle.save();

            // Find and reactivate the previous version
            const previousBundle = await Bundle.findOne({
                platform,
                version: { $lt: version },
                status: 'deprecated'
            }).sort({ version: -1 });

            if (previousBundle) {
                previousBundle.status = 'published';
                await previousBundle.save();
            }

            res.json({ message: 'Rollback successful' });
        } catch (error) {
            console.error('Rollback error:', error);
            res.status(500).json({ error: 'Failed to rollback' });
        }
    }

    async logUpdate(req, res) {
        try {
            const { bundleId, deviceId, status, errorMessage } = req.body;

            const log = new UpdateLog({
                bundleId,
                deviceId,
                status,
                errorMessage
            });

            await log.save();
            res.status(201).json(log);
        } catch (error) {
            console.error('Log update error:', error);
            res.status(500).json({ error: 'Failed to log update' });
        }
    }
}

module.exports = new BundleController();