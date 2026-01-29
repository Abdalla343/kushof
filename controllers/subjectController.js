const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const StudentClass = require('../models/StudentClass');

/**
 * @desc    Create a new subject in a class
 * @route   POST /api/subjects
 * @access  Private (Teacher)
 */
const createSubject = async (req, res) => {
  try {
    const { name, description, classId } = req.body;

    if (!name || !classId) {
      return res.status(400).json({ message: 'Subject name and class ID are required' });
    }

    // Check if class exists and belongs to the teacher
    const classData = await Class.findByPk(classId);
    if (!classData || classData.teacherId !== req.user.id) {
      return res.status(404).json({ message: 'Class not found or access denied' });
    }

    const newSubject = await Subject.create({
      name,
      description,
      classId
    });

    res.status(201).json({
      message: 'Subject created successfully',
      subject: newSubject
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all subjects for a specific class
 * @route   GET /api/subjects/class/:classId
 * @access  Private
 */
const getSubjectsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    // Check if class exists
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if user has access to this class
    const isTeacherOfClass = classData.teacherId === req.user.id;
    let isStudentInClass = false;
    
    if (req.user.role === 'student') {
        const studentClass = await StudentClass.findOne({ where: { classId, studentId: req.user.id } });
        isStudentInClass = !!studentClass;
    }

    if (!isTeacherOfClass && !isStudentInClass) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subjects = await Subject.findAll({
      where: { classId },
      attributes: ['id', 'name', 'description', 'createdAt']
    });

    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get a specific subject with students
 * @route   GET /api/subjects/:id
 * @access  Private
 */
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findByPk(id, {
      include: [
        {
          model: Class,
          as: 'Class',
          attributes: ['id', 'name', 'teacherId']
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Check if user has access to this subject's class
    const isTeacherOfClass = subject.Class.teacherId === req.user.id;
    let isStudentInClass = false;

    if (req.user.role === 'student') {
        const studentClass = await StudentClass.findOne({ 
            where: { classId: subject.classId, studentId: req.user.id } 
        });
        isStudentInClass = !!studentClass;
    }

    if (!isTeacherOfClass && !isStudentInClass) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If teacher, include all students in the class
    if (isTeacherOfClass) {
      const students = await User.findAll({
        include: [
          {
            model: Class,
            as: 'classes',
            through: { attributes: [] },
            where: { id: subject.classId },
            attributes: []
          }
        ],
        where: { role: 'student' },
        attributes: ['id', 'name', 'email']
      });

      res.json({
        subject: {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          classId: subject.classId,
          className: subject.Class.name
        },
        students
      });
    } else {
      // If student, just return subject info
      res.json({
        subject: {
          id: subject.id,
          name: subject.name,
          description: subject.description,
          classId: subject.classId,
          className: subject.Class.name
        }
      });
    }
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update a subject
 * @route   PUT /api/subjects/:id
 * @access  Private (Teacher)
 */
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const subject = await Subject.findByPk(id, {
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

    // Check if teacher owns this subject's class
    if (subject.Class.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await subject.update({ name, description });

    res.json({
      message: 'Subject updated successfully',
      subject
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSubject,
  getSubjectsByClass,
  getSubjectById,
  updateSubject
};
