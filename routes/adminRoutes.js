const express = require('express');
const router = express.Router();
const { getAllUsers, approveTeacher, deleteUser } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

router.get('/users', protect, restrictTo('admin'), getAllUsers);
router.put('/approve/:id', protect, restrictTo('admin'), approveTeacher);
router.delete('/user/:id', protect, restrictTo('admin'), deleteUser);

module.exports = router;
