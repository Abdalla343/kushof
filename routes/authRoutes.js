const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { register, login, getProfile, updateIsPrime } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/is-prime', protect, updateIsPrime);

module.exports = router;
