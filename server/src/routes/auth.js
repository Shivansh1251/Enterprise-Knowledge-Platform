const express = require('express');
const { register, login, me, demoStatus, demoLogin } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/demo-status', demoStatus);
router.post('/demo', demoLogin);
router.get('/me', authenticate, me);

module.exports = router;
