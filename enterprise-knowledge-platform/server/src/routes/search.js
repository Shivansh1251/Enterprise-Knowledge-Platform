const express = require('express');
const { search } = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', search);

module.exports = router;
