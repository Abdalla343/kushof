const Class = require('../models/Class');
const User = require('../models/User');
const StudentClass = require('../models/StudentClass');
const Subject = require('../models/Subject');

/**
 * @desc    Create a new class
 * @route   POST /api/classes
 * @access  Private (Teacher)
 */
const createClass = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Class name is required' });
    }

    const newClass = await Class.create({
      name,
      description,
      teacherId: req.user.id
    });

    res.status(201).json({
      message: 'Class created successfully',
      class: newClass
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all classes for the authenticated teacher or enrolled classes for student
 * @route   GET /api/classes
 * @access  Private
 */
const getClasses = async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const classes = await Class.findAll({
        where: { teacherId: req.user.id },
        include: [
          {
            model: User,
            as: 'students',
            through: { attributes: [] },
            attributes: ['id', 'name', 'email']
          },
          {
            model: Subject,
            as: 'subjects',
            attributes: ['id', 'name', 'description']
          }
        ]
      });

      res.json(classes);
    } else if (req.user.role === 'student') {
      // Get classes where student is enrolled
      const studentClasses = await Class.findAll({
        include: [
          {
            model: User,
            as: 'students',
            through: { attributes: [] },
            attributes: ['id', 'name', 'email'],
            where: { id: req.user.id }
          },
          {
            model: Subject,
            as: 'subjects',
            attributes: ['id', 'name', 'description']
          },
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json(studentClasses);
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all students who are not enrolled in any class
 * @route   GET /api/classes/available-students
 * @access  Private (Teacher, Prime)
 */
const getAvailableStudents = async (req, res) => {
  try {
    // Get all students
    const allStudents = await User.findAll({
      where: { role: 'student' },
      attributes: ['id', 'name', 'email']
    });

    // Get students who are already enrolled in classes
    const enrolledStudents = await StudentClass.findAll({
      attributes: ['studentId']
    });

    const enrolledStudentIds = enrolledStudents.map(sc => sc.studentId);
    
    // Filter out enrolled students
    const availableStudents = allStudents.filter(
      student => !enrolledStudentIds.includes(student.id)
    );

    res.json(availableStudents);
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get a specific class with students and subjects
 * @route   GET /api/classes/:id
 * @access  Private
 */
const getClassById = async (req, res) => {
  try {
    const classId = req.params.id;
    
    const classData = await Class.findByPk(classId, {
      include: [
        {
          model: User,
          as: 'students',
          through: { attributes: [] },
          attributes: ['id', 'name', 'email']
        },
        {
          model: Subject,
          as: 'subjects',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if user is the teacher of this class or a student in this class
    const isTeacherOfClass = classData.teacherId === req.user.id;
    const isStudentInClass = req.user.role === 'student' && 
      classData.students.some(student => student.id === req.user.id);

    if (!isTeacherOfClass && !isStudentInClass) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(classData);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Add students to a class
 * @route   POST /api/classes/:id/students
 * @access  Private (Teacher)
 */
const addStudentsToClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of student IDs' });
    }

    // Check if class exists and belongs to the teacher
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add students to class
    const studentClasses = studentIds.map(studentId => ({
      studentId,
      classId
    }));

    // Use bulkCreate with ignoreDuplicates to avoid errors if student is already in class
    // Note: This requires the composite primary key to be set correctly in the model
    await StudentClass.bulkCreate(studentClasses, { ignoreDuplicates: true });

    res.json({ message: 'Students added successfully' });
  } catch (error) {
    console.error('Add students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createClass,
  getClasses,
  getAvailableStudents,
  getClassById,
  addStudentsToClass
};
