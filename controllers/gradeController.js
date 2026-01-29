const Grade = require('../models/Grade');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const StudentClass = require('../models/StudentClass');

/**
 * @desc    Assign grades to students
 * @route   POST /api/grades
 * @access  Private (Teacher)
 */
const assignGrades = async (req, res) => {
  try {
    const { subjectId, grades } = req.body;

    if (!subjectId || !grades || !Array.isArray(grades)) {
      return res.status(400).json({ message: 'Subject ID and grades array are required' });
    }

    // Check if subject exists and teacher has access
    const subject = await Subject.findByPk(subjectId, {
      include: [
        {
          model: Class,
          as: 'Class',
          attributes: ['teacherId', 'id']
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.Class.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate grades data
    for (const gradeData of grades) {
      const { studentId, grade } = gradeData;

      if (!studentId || grade === undefined || grade === null) {
        return res.status(400).json({ message: 'Student ID and grade are required for each entry' });
      }

      if (grade < 0 || grade > 100) {
        return res.status(400).json({ message: 'Grade must be between 0 and 100' });
      }

      // Check if student is enrolled in the class
      const isEnrolled = await StudentClass.findOne({
        where: { studentId, classId: subject.Class.id }
      });

      if (!isEnrolled) {
        return res.status(400).json({ 
          message: `Student with ID ${studentId} is not enrolled in this class` 
        });
      }
    }

    // Create grades
    const gradeEntries = grades.map(gradeData => ({
      studentId: gradeData.studentId,
      subjectId,
      grade: gradeData.grade,
      assignment: gradeData.assignment || null,
      comments: gradeData.comments || null
    }));

    const createdGrades = await Grade.bulkCreate(gradeEntries, {
      updateOnDuplicate: ['grade', 'assignment', 'comments']
    });

    res.status(201).json({
      message: 'Grades assigned successfully',
      grades: createdGrades
    });
  } catch (error) {
    console.error('Assign grades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all grades for a specific subject
 * @route   GET /api/grades/subject/:subjectId
 * @access  Private (Teacher)
 */
const getSubjectGrades = async (req, res) => {
  try {
    const { subjectId } = req.params;

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
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subject.Class.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const grades = await Grade.findAll({
      where: { subjectId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(grades);
  } catch (error) {
    console.error('Get subject grades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all grades for the authenticated student
 * @route   GET /api/grades/my-grades
 * @access  Private (Student)
 */
const getStudentGrades = async (req, res) => {
  try {
    const grades = await Grade.findAll({
      where: { studentId: req.user.id },
      include: [
        {
          model: Subject,
          as: 'Subject',
          attributes: ['id', 'name'],
          include: [
            {
              model: Class,
              as: 'Class',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(grades);
  } catch (error) {
    console.error('Get student grades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get student's grade for a specific subject
 * @route   GET /api/grades/subject/:subjectId/my-grade
 * @access  Private (Student)
 */
const getStudentSubjectGrade = async (req, res) => {
  try {
    const { subjectId } = req.params;

    // Check if student has access to this subject
    const subject = await Subject.findByPk(subjectId, {
      include: [
        {
          model: Class,
          as: 'Class',
          attributes: ['id']
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const isEnrolled = await StudentClass.findOne({
      where: { studentId: req.user.id, classId: subject.Class.id }
    });

    if (!isEnrolled) {
      return res.status(403).json({ message: 'Access denied. Not enrolled in this subject.' });
    }

    const grades = await Grade.findAll({
      where: { 
        subjectId,
        studentId: req.user.id
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(grades);
  } catch (error) {
    console.error('Get my subject grade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  assignGrades,
  getSubjectGrades,
  getStudentGrades,
  getStudentSubjectGrade
};
