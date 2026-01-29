const { User, Class, Subject } = require('../models');

// @desc    Get all users (students and teachers)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    // Get all users except admins with their classes and subjects
    const users = await User.findAll({
      where: {
        role: ['student', 'teacher']
      },
      attributes: { exclude: ['password'] },
      include: [
        { model: Class },
        { model: Subject }
      ]
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve teacher registration
// @route   PUT /api/admin/approve/:id
// @access  Private/Admin
const approveTeacher = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Find the user with associations
    const user = await User.findByPk(userId, { 
      include: [{ model: Class }, { model: Subject }]
    });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Check if user is a teacher
    if (user.role !== 'teacher') {
      res.status(400);
      throw new Error('Only teacher accounts can be approved');
    }

    // Update approval status
    user.isApproved = true;
    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      classes: user.Classes,
      subjects: user.Subjects,
      message: 'Teacher account approved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/user/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Find the user
    const user = await User.findByPk(userId);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Prevent deleting another admin
    if (user.role === 'admin') {
      res.status(403);
      throw new Error('Cannot delete admin users');
    }

    // Delete the user
    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  approveTeacher,
  deleteUser
};
