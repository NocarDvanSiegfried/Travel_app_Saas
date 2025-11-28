const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Travel App Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health - Health check',
      'GET /api - API information',
      'GET /api/v1/routes - Route search (placeholder)',
      'GET /api/v1/b2b - B2B endpoints (placeholder)'
    ]
  });
});

// Placeholder route endpoints
app.get('/api/v1/routes', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Route search endpoint - placeholder implementation'
  });
});

// Placeholder B2B endpoints
app.get('/api/v1/b2b', (req, res) => {
  res.json({
    success: true,
    data: {
      companies: [],
      tickets: [],
      deliveries: []
    },
    message: 'B2B endpoint - placeholder implementation'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API info: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});