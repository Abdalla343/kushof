const fs = require('fs');
const Exam = require('../models/Exam');
const ExamAnswer = require('../models/ExamAnswer');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');

/**
 * @desc    Upload exam PDF for a subject
 * @route   POST /api/exams
 * @access  Private (Teacher)
 */
const uploadExam = async (req, res) => {
  try {
    const { subjectId, title, description } = req.body;

    if (!subjectId || !title) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Subject ID and title are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Exam PDF file is required' });
    }

    // Check if subject exists and teacher has access
    const subject = await Subject.findByPk(subjectId, {
      include: [
        {
          model: Class,
          as: 'Class',
          attributes: ['teacherId']
        }
      ]
    });

    if (!subject) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.Class.teacherId !== req.user.id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Access denied' });
    }

    const exam = await Exam.create({
      subjectId: parseInt(subjectId),
      title,
      description: description || null,
      examPdfPath: req.file.path,
      examPdfName: req.file.originalname,
      createdBy: req.user.id
    });

    const examWithRelations = await Exam.findByPk(exam.id, {
      include: [
        {
          model: Subject,
          as: 'Subject',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Exam uploaded successfully',
      exam: examWithRelations
    });
  } catch (error) {
    console.error('Upload exam error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get all exams
 * @route   GET /api/exams
 * @access  Private
 */
const getExams = async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const exams = await Exam.findAll({
        include: [
          {
            model: Subject,
            as: 'Subject',
            include: [
              {
                model: Class,
                as: 'Class',
                attributes: ['id', 'name', 'teacherId'],
                where: { teacherId: req.user.id }
              }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: ExamAnswer,
            as: 'answers',
            include: [
              {
                model: User,
                as: 'student',
                attributes: ['id', 'name', 'email']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json(exams);
    } else if (req.user.role === 'student') {
      const exams = await Exam.findAll({
        include: [
          {
            model: Subject,
            as: 'Subject',
            include: [
              {
                model: Class,
                as: 'Class',
                include: [
                  {
                    model: User,
                    as: 'students',
                    where: { id: req.user.id },
                    attributes: []
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['name']
          },
          {
            model: ExamAnswer,
            as: 'answers',
            required: false,
            where: { studentId: req.user.id }
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Filter exams where subject exists (meaning student has access via class)
      const accessibleExams = exams.filter(exam => exam.Subject);
      res.json(accessibleExams);
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get a specific exam
 * @route   GET /api/exams/:id
 * @access  Private
 */
const getExamById = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: Subject,
          as: 'Subject',
          include: [
            {
              model: Class,
              as: 'Class',
              attributes: ['id', 'teacherId']
            }
          ]
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check access
    const isTeacherOfClass = exam.Subject.Class.teacherId === req.user.id;
    // For student, we should check enrollment, but simplifying for now as per original code logic or adding check
    // Assuming if student can reach here via UI they are likely enrolled, but backend check is better.
    // Let's add student check.
    let isStudentInClass = false;
    if (req.user.role === 'student') {
         // This requires importing StudentClass or using Sequelize association magic
         // Assuming simple check:
         // Ideally we should check StudentClass table.
         // Let's skip complex check here to match original "open" logic or improve it?
         // User asked to improve security. So I should check.
         const StudentClass = require('../models/StudentClass'); // Lazy import to avoid circular dep issues if any
         const enrollment = await StudentClass.findOne({
             where: { studentId: req.user.id, classId: exam.Subject.Class.id }
         });
         isStudentInClass = !!enrollment;
    }

    if (!isTeacherOfClass && !isStudentInClass) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(exam);
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Submit exam answer (Student)
 * @route   POST /api/exams/:id/submit
 * @access  Private (Student)
 */
const submitExamAnswer = async (req, res) => {
  try {
    const examId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ message: 'Answer PDF file is required' });
    }

    const exam = await Exam.findByPk(examId);
    if (!exam) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if student already submitted
    const existingAnswer = await ExamAnswer.findOne({
      where: {
        examId,
        studentId: req.user.id
      }
    });

    if (existingAnswer) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'You have already submitted an answer for this exam' });
    }

    const answer = await ExamAnswer.create({
      examId,
      studentId: req.user.id,
      answerPdfPath: req.file.path,
      answerPdfName: req.file.originalname
    });

    res.status(201).json({
      message: 'Exam answer submitted successfully',
      answer
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Download exam file
 * @route   GET /api/exams/:id/download
 * @access  Private
 */
const downloadExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!fs.existsSync(exam.examPdfPath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(exam.examPdfPath, exam.examPdfName);
  } catch (error) {
    console.error('Download exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Download answer file (Teacher)
 * @route   GET /api/exams/answer/:id/download
 * @access  Private (Teacher)
 */
const downloadAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const answer = await ExamAnswer.findByPk(id, {
        include: [{
            model: Exam,
            include: [{
                model: Subject,
                include: [{
                    model: Class
                }]
            }]
        }]
    });

    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }
    
    // Security check: only teacher of the class can download
    if (answer.Exam.Subject.Class.teacherId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(answer.answerPdfPath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(answer.answerPdfPath, answer.answerPdfName);
  } catch (error) {
    console.error('Download answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  uploadExam,
  getExams,
  getExamById,
  submitExamAnswer,
  downloadExam,
  downloadAnswer
};
