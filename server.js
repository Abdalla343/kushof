const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Database
const { sequelize, testConnection } = require('./config/database');
require('./models/index'); // Initialize associations

// Routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const examRoutes = require('./routes/examRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Initialize App
const app = express();

// Security & Utility Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve Static Files
// Note: It's better to serve uploads via authenticated routes (which we did for exams), 
// but if you have public assets, serve them here.
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Database Connection & Server Start
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await testConnection();
    // Sync database (alter: true updates tables without dropping them)
   await sequelize.sync()
    console.log('Database synced successfully');

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
