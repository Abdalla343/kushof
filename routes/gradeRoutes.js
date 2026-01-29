const express = require('express');
const router = express.Router();
const { protect, isTeacher, isStudent } = require('../middleware/authMiddleware');
const { 
  assignGrades, 
  getSubjectGrades, 
  getStudentGrades, 
  getStudentSubjectGrade 
} = require('../controllers/gradeController');

router.post('/', protect, isTeacher, assignGrades);
router.get('/subject/:subjectId', protect, isTeacher, getSubjectGrades);
router.get('/my-grades', protect, isStudent, getStudentGrades);
router.get('/subject/:subjectId/my-grade', protect, isStudent, getStudentSubjectGrade);

module.exports = router;
