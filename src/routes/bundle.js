const express = require('express');
const multer = require('multer');
const bundleController = require('../controllers/bundleController');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Bundle management routes
router.post('/upload', 
    auth.requireAuth, 
    upload.single('bundle'), 
    bundleController.uploadBundle
);

router.get('/check-for-updates',
    bundleController.checkForUpdates
);

router.post('/rollback',
    auth.requireAuth,
    bundleController.rollback
);

router.post('/log-update',
    bundleController.logUpdate
);

module.exports = router;