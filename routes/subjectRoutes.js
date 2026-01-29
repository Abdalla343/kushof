const express = require('express');
const router = express.Router();
const { protect, isTeacher } = require('../middleware/authMiddleware');
const { 
  createSubject, 
  getSubjectsByClass, 
  getSubjectById, 
  updateSubject 
} = require('../controllers/subjectController');

router.post('/', protect, isTeacher, createSubject);
router.get('/class/:classId', protect, getSubjectsByClass);
router.get('/:id', protect, getSubjectById);
router.put('/:id', protect, isTeacher, updateSubject);

module.exports = router;
