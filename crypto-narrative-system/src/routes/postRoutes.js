const express = require('express');

const router = express.Router();

const {
    createTestPost
} = require('../controllers/postController');

router.post('/test-post', createTestPost);

module.exports = router;