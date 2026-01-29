const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/User');

/**
 * Middleware to verify JWT token and protect routes
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password)
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Middleware to check if user is a teacher
 */
const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Teacher role required.' });
  }
};

/**
 * Middleware to check if user is a student
 */
const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Student role required.' });
  }
};

/**
 * Middleware to check if user is a prime member
 */
const isPrime = (req, res, next) => {
  if (req.user && req.user.isPrime === true) {
    next();
  } else {
    res.status(403).json({ message: 'This feature is available for Premium users. Please upgrade your account or subscribe to enjoy it.' });
  }
};

module.exports = { protect, isTeacher, isStudent, isPrime };
