const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Database connection check
console.log('🔍 Checking database configuration...');
console.log('📊 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔐 JWT_SECRET exists:', !!process.env.JWT_SECRET);

// Initialize Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test basic query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Error details:', error);
    return false;
  }
}

// CORS Middleware - Allow requests from frontend and production
app.use(cors({
  origin: ['http://localhost:3000', 'https://bliss-mart.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is running!', 
    port: PORT,
    database: 'Check logs for connection status',
    environment: process.env.NODE_ENV
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date() });
});

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      uptime: process.uptime(),
      database: 'Connected',
      timestamp: new Date() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      uptime: process.uptime(),
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// Import and use routes with error handling
const routes = [
  { path: '/api/auth', file: './routes/auth' },
  { path: '/api/products', file: './routes/products' },
  { path: '/api/cart', file: './routes/cart' },
  { path: '/api/orders', file: './routes/orders' },
  { path: '/api/payments', file: './routes/payments' },
  { path: '/api/location', file: './routes/location' },
  { path: '/api/reviews', file: './routes/reviews' },
  { path: '/api/notifications', file: './routes/notifications' },
  { path: '/api/retailer', file: './routes/retailer' },
  { path: '/api/shops', file: './routes/shops' },
  { path: '/api/wholesaler', file: './routes/wholesaler' }
];

routes.forEach(route => {
  try {
    app.use(route.path, require(route.file));
    console.log(`✅ Route loaded: ${route.path}`);
  } catch (error) {
    console.error(`❌ Failed to load route ${route.path}:`, error.message);
  }
});

// 404 Error Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start Server with database check
async function startServer() {
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.log('🚨 Starting server without database connection - some features may not work');
  }

  app.listen(PORT, () => {
    console.log(`\n✅ Server is running on port ${PORT}`);
    console.log(`📍 Backend URL: http://localhost:${PORT}`);
    console.log(`🌐 Production URL: https://blissmart-1.onrender.com`);
    console.log(`🔗 Frontend URL: https://bliss-mart.vercel.app`);
    console.log(`🗄️ Database Status: ${dbConnected ? 'Connected ✅' : 'Disconnected ❌'}\n`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('🚨 Failed to start server:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});