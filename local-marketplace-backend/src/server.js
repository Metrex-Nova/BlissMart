// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');

// // Load environment variables
// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 4000;

// // Database connection check
// console.log('🔍 Checking database configuration...');
// console.log('📊 DATABASE_URL exists:', !!process.env.DATABASE_URL);
// console.log('🔐 JWT_SECRET exists:', !!process.env.JWT_SECRET);

// // Initialize Prisma Client
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// // Test database connection with migrations
// async function testDatabaseConnection() {
//   try {
//     await prisma.$connect();
//     console.log('✅ Database connected successfully');
    
//     // Force run migrations
//     console.log('🔄 Running database migrations...');
//     const { execSync } = require('child_process');
//     try {
//       console.log('📦 Executing: npx prisma migrate deploy');
//       execSync('npx prisma migrate deploy', { stdio: 'inherit' });
//       console.log('✅ Database migrations completed');
//     } catch (migrationError) {
//       console.log('⚠️ Migration failed, trying db push...');
//       console.log('📦 Executing: npx prisma db push --accept-data-loss');
//       execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
//       console.log('✅ Database schema pushed');
//     }
    
//     // Test basic query after migrations
//     try {
//       await prisma.$queryRaw`SELECT 1`;
//       console.log('✅ Database query test passed');
//     } catch (queryError) {
//       console.log('⚠️ Basic query failed, but continuing...');
//     }
    
//     return true;
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//     return false;
//   }
// }

// // CORS Middleware - Allow requests from frontend and production
// app.use(cors({
//   origin: ['http://localhost:3000', 'https://bliss-mart.vercel.app', 'https://blissmart-1.onrender.com'],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`📍 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
//   next();
// });

// // Body Parser Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Health Check Routes
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Backend is running!', 
//     port: PORT,
//     database: 'Check logs for connection status',
//     environment: process.env.NODE_ENV
//   });
// });

// app.get('/api/test', (req, res) => {
//   res.json({ message: 'Backend is working!', timestamp: new Date() });
// });

// app.get('/api/health', async (req, res) => {
//   try {
//     // Test database connection
//     await prisma.$queryRaw`SELECT 1`;
//     res.json({ 
//       status: 'OK', 
//       uptime: process.uptime(),
//       database: 'Connected',
//       timestamp: new Date() 
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       status: 'ERROR', 
//       uptime: process.uptime(),
//       database: 'Disconnected',
//       error: error.message 
//     });
//   }
// });

// // Simple test routes that don't depend on database
// app.get('/api/simple-test', (req, res) => {
//   res.json({ message: 'Simple route works!', time: new Date() });
// });

// app.post('/api/auth/simple-login', (req, res) => {
//   res.json({ message: 'Simple login POST route works!' });
// });

// app.get('/api/auth/simple-login', (req, res) => {
//   res.json({ message: 'Simple login GET route works!' });
// });

// // 404 Error Handler
// app.use((req, res) => {
//   res.status(404).json({ error: 'Route not found', path: req.path });
// });

// // Global Error Handler
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(500).json({
//     error: 'Internal Server Error',
//     message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
//   });
// });

// // Start Server with database check
// async function startServer() {
//   const dbConnected = await testDatabaseConnection();
  
//   if (!dbConnected) {
//     console.log('🚨 Starting server without database connection - some features may not work');
//   }

//   // ✅ MOVE ROUTE LOADING HERE - after database connection
//   console.log('🔄 Loading routes after DB connection...');
//   const routes = [
//     { path: '/api/auth', file: './routes/auth' },
//     { path: '/api/products', file: './routes/products' },
//     { path: '/api/cart', file: './routes/cart' },
//     { path: '/api/orders', file: './routes/orders' },
//     { path: '/api/payments', file: './routes/payments' },
//     { path: '/api/location', file: './routes/location' },
//     { path: '/api/reviews', file: './routes/reviews' },
//     { path: '/api/notifications', file: './routes/notifications' },
//     { path: '/api/retailer', file: './routes/retailer' },
//     { path: '/api/shops', file: './routes/shops' },
//     { path: '/api/wholesaler', file: './routes/wholesaler' }
//   ];

//   routes.forEach(route => {
//     try {
//       app.use(route.path, require(route.file));
//       console.log(`✅ Route loaded: ${route.path}`);
//     } catch (error) {
//       console.error(`❌ Failed to load route ${route.path}:`, error.message);
//     }
//   });

//   app.listen(PORT, () => {
//     console.log(`\n✅ Server is running on port ${PORT}`);
//     console.log(`📍 Backend URL: http://localhost:${PORT}`);
//     console.log(`🌐 Production URL: https://blissmart-1.onrender.com`);
//     console.log(`🔗 Frontend URL: https://bliss-mart.vercel.app`);
//     console.log(`🗄️ Database Status: ${dbConnected ? 'Connected ✅' : 'Disconnected ❌'}\n`);
    
//     // Log available routes for debugging
//     console.log('🔄 Available routes:');
//     console.log('   GET  /api/simple-test');
//     console.log('   GET  /api/auth/simple-login');
//     console.log('   POST /api/auth/simple-login');
//     console.log('   GET  /api/test');
//     console.log('   GET  /api/health');
//     console.log('   GET  /');
//   });
// }

// // Start the server
// startServer().catch(error => {
//   console.error('🚨 Failed to start server:', error);
//   process.exit(1);
// });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//   console.error('Unhandled Rejection:', err);
//   process.exit(1);
// });

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Basic middleware FIRST
app.use(cors({
  origin: ['http://localhost:3000', 'https://bliss-mart.vercel.app', 'https://blissmart-1.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// SIMPLE ROUTES FIRST - Test these work
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

app.get('/api/simple-test', (req, res) => {
  res.json({ message: 'Simple test works!' });
});

app.post('/api/auth/simple-login', (req, res) => {
  res.json({ message: 'Simple login works!' });
});

// Initialize Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Health check with error handling
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
  }
});

// Load other routes SYNCHRONOUSLY
console.log('🔄 Loading routes...');
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
  
  app.use('/api/products', require('./routes/products'));
  console.log('✅ Products routes loaded');
  
  // Add other routes as needed
} catch (error) {
  console.error('❌ Route loading failed:', error);
}

// 404 Handler - MUST BE LAST
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    method: req.method 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server WITHOUT async database checks
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Production: https://blissmart-1.onrender.com`);
  console.log('🔄 Testing basic routes...');
  console.log('   GET  /');
  console.log('   GET  /api/test');
  console.log('   GET  /api/simple-test');
  console.log('   POST /api/auth/simple-login');
  console.log('   GET  /api/health');
});

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});