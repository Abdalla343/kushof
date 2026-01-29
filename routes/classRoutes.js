const express = require('express');
const router = express.Router();
const { protect, isTeacher, isStudent, isPrime } = require('../middleware/authMiddleware');
const { 
  createClass, 
  getClasses, 
  getAvailableStudents, 
  getClassById, 
  addStudentsToClass 
} = require('../controllers/classController');

router.post('/', protect, isTeacher, createClass);
router.get('/', protect, getClasses);
router.get('/available-students', protect, isTeacher, isPrime, getAvailableStudents);
router.get('/:id', protect, getClassById);
router.post('/:id/students', protect, isTeacher, addStudentsToClass);

module.exports = router;
