const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const examsDir = path.join(uploadsDir, 'exams');
const answersDir = path.join(uploadsDir, 'answers');

[uploadsDir, examsDir, answersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for exam PDF uploads (teacher)
const examStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, examsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `exam-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const examUpload = multer({
  storage: examStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Configure multer for answer PDF uploads (student)
const answerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, answersDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `answer-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const answerUpload = multer({
  storage: answerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

module.exports = {
  examUpload,
  answerUpload
};
