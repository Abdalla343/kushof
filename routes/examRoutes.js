const express = require('express');
const router = express.Router();
const { protect, isTeacher, isStudent } = require('../middleware/authMiddleware');
const { examUpload, answerUpload } = require('../middleware/uploadMiddleware');
const { 
  uploadExam, 
  getExams, 
  getExamById, 
  submitExamAnswer, 
  downloadExam, 
  downloadAnswer 
} = require('../controllers/examController');

router.post('/', protect, isTeacher, examUpload.single('examPdf'), uploadExam);
router.get('/', protect, getExams);
router.get('/:id', protect, getExamById);
router.post('/:id/submit', protect, isStudent, answerUpload.single('answerPdf'), submitExamAnswer);
router.get('/:id/download', protect, downloadExam);
router.get('/answer/:id/download', protect, isTeacher, downloadAnswer);

module.exports = router;
