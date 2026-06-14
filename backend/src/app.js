const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Root route (often pinged by deployment health checkers like Render)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EqualShare Backend API is running',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/v1', apiRoutes);

// Undefined Routes Handler
app.use((req, res, next) => {
  const err = new Error(`Route Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

// Centralized Error Handler Middleware (Must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
