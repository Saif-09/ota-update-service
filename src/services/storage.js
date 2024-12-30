// src/services/storage.js
const AWS = require('aws-sdk');
const crypto = require('crypto');

class StorageService {
    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });
        this.bucket = process.env.AWS_BUCKET_NAME;
    }

    async uploadBundle(bundleBuffer, metadata) {
        const hash = crypto
            .createHash('sha256')
            .update(bundleBuffer)
            .digest('hex');

        const key = `bundles/${metadata.platform}/${metadata.version}/${hash}.jsbundle`;

        const params = {
            Bucket: this.bucket,
            Key: key,
            Body: bundleBuffer,
            ContentType: 'application/javascript',
            Metadata: {
                version: metadata.version,
                platform: metadata.platform,
                hash: hash
            }
        };

        try {
            const result = await this.s3.upload(params).promise();
            return {
                downloadUrl: result.Location,
                hash: hash,
                size: bundleBuffer.length
            };
        } catch (error) {
            console.error('Error uploading bundle:', error);
            throw new Error('Failed to upload bundle');
        }
    }

    async generateSignedUrl(key) {
        const params = {
            Bucket: this.bucket,
            Key: key,
            Expires: 3600 // URL expires in 1 hour
        };

        try {
            return await this.s3.getSignedUrlPromise('getObject', params);
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error('Failed to generate download URL');
        }
    }

    async deleteBundle(key) {
        const params = {
            Bucket: this.bucket,
            Key: key
        };

        try {
            await this.s3.deleteObject(params).promise();
        } catch (error) {
            console.error('Error deleting bundle:', error);
            throw new Error('Failed to delete bundle');
        }
    }
}

module.exports = new StorageService();