const express = require('express');
const { chat } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.post('/', chat);

module.exports = router;
