// const express = require('express');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { PrismaClient } = require('@prisma/client');
// const { generateOTP, sendOTP } = require('../utils/emailService');

// const router = express.Router();
// const prisma = new PrismaClient();
// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// // POST /api/auth/register - Step 1: Register and send OTP
// router.post('/register', async (req, res) => {
//   try {
//     const { name, phone, email, password, role } = req.body;

//     // Validate required fields
//     if (!email) {
//       return res.status(400).json({ error: 'Email is required for verification' });
//     }

//     if (!phone || !password || !name) {
//       return res.status(400).json({ error: 'All fields are required' });
//     }

//     // Check if user exists
//     const existingUser = await prisma.user.findFirst({
//       where: {
//         OR: [
//           { phone },
//           { email }
//         ]
//       }
//     });

//     if (existingUser) {
//       return res.status(400).json({ error: 'User already exists with this phone or email' });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Generate OTP
//     const otp = generateOTP();
//     const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     // Create user (unverified)
//     const user = await prisma.user.create({
//       data: {
//         name,
//         phone,
//         email,
//         password: hashedPassword,
//         role: role || 'CUSTOMER',
//         isVerified: false,
//         otp,
//         otpExpiry
//       }
//     });

//     // Send OTP email
//     const emailResult = await sendOTP(email, otp);

//     if (!emailResult.success) {
//       // Delete user if email fails
//       await prisma.user.delete({ where: { id: user.id } });
//       return res.status(500).json({ 
//         error: 'Failed to send verification email. Please try again.' 
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Registration successful. Please check your email for OTP.',
//       userId: user.id,
//       email: user.email
//     });

//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({ 
//       error: 'Registration failed',
//       details: error.message 
//     });
//   }
// });

// // POST /api/auth/verify-otp - Step 2: Verify OTP and complete registration
// router.post('/verify-otp', async (req, res) => {
//   try {
//     const { userId, otp } = req.body;

//     if (!userId || !otp) {
//       return res.status(400).json({ error: 'User ID and OTP are required' });
//     }

//     const user = await prisma.user.findUnique({
//       where: { id: parseInt(userId) }
//     });

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     if (user.isVerified) {
//       return res.status(400).json({ error: 'User already verified' });
//     }

//     // Check OTP expiry
//     if (new Date() > user.otpExpiry) {
//       return res.status(400).json({ 
//         error: 'OTP expired. Please request a new one.',
//         expired: true
//       });
//     }

//     // Verify OTP
//     if (user.otp !== otp) {
//       return res.status(400).json({ error: 'Invalid OTP' });
//     }

//     // Update user as verified and clear OTP
//     const verifiedUser = await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         isVerified: true,
//         otp: null,
//         otpExpiry: null
//       }
//     });

//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: verifiedUser.id, role: verifiedUser.role },
//       JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.json({
//       success: true,
//       message: 'Email verified successfully',
//       token,
//       user: {
//         id: verifiedUser.id,
//         name: verifiedUser.name,
//         email: verifiedUser.email,
//         phone: verifiedUser.phone,
//         role: verifiedUser.role
//       }
//     });

//   } catch (error) {
//     console.error('OTP verification error:', error);
//     res.status(500).json({ 
//       error: 'Verification failed',
//       details: error.message 
//     });
//   }
// });

// // POST /api/auth/resend-otp - Resend OTP
// router.post('/resend-otp', async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({ error: 'User ID is required' });
//     }

//     const user = await prisma.user.findUnique({
//       where: { id: parseInt(userId) }
//     });

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     if (user.isVerified) {
//       return res.status(400).json({ error: 'User already verified' });
//     }

//     // Generate new OTP
//     const otp = generateOTP();
//     const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

//     // Update user with new OTP
//     await prisma.user.update({
//       where: { id: user.id },
//       data: { otp, otpExpiry }
//     });

//     // Send OTP
//     const emailResult = await sendOTP(user.email, otp);

//     if (!emailResult.success) {
//       return res.status(500).json({ 
//         error: 'Failed to send OTP. Please try again.' 
//       });
//     }

//     res.json({
//       success: true,
//       message: 'OTP resent successfully to your email'
//     });

//   } catch (error) {
//     console.error('Resend OTP error:', error);
//     res.status(500).json({ 
//       error: 'Failed to resend OTP',
//       details: error.message 
//     });
//   }
// });

// // POST /api/auth/login
// router.post('/login', async (req, res) => {
//   try {
//     const { phone, password } = req.body;

//     if (!phone || !password) {
//       return res.status(400).json({ error: 'Phone and password are required' });
//     }

//     // Find user
//     const user = await prisma.user.findUnique({
//       where: { phone }
//     });

//     if (!user) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Check if email is verified
//     if (!user.isVerified) {
//       return res.status(403).json({ 
//         error: 'Email not verified. Please verify your email first.',
//         userId: user.id,
//         requiresVerification: true
//       });
//     }

//     // Check password
//     const validPassword = await bcrypt.compare(password, user.password);
//     if (!validPassword) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: user.id, role: user.role },
//       JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.json({
//       success: true,
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         phone: user.phone,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ 
//       error: 'Login failed',
//       details: error.message 
//     });
//   }
// });

// module.exports = router;


const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
// const { generateOTP, sendOTP } = require('../utils/emailService'); // ❌ COMMENTED OUT

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simple OTP generator (no email)
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register - Step 1: Register and send OTP
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this phone or email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        role: role || 'CUSTOMER',
        isVerified: false,
        otp,
        otpExpiry
      }
    });

    // ✅ TEMPORARY: Log OTP to console instead of email
    console.log(`🔐 OTP for ${email}: ${otp}`);

    res.json({
      success: true,
      message: 'Registration successful. OTP sent to console logs (check Render logs)',
      userId: user.id,
      email: user.email,
      otp: otp // ✅ TEMPORARY: Return OTP in response for testing
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.message 
    });
  }
});

// Keep all other routes (verify-otp, resend-otp, login) exactly the same...
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ 
        error: 'OTP expired. Please request a new one.',
        expired: true
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otp: null,
        otpExpiry: null
      }
    });

    const token = jwt.sign(
      { userId: verifiedUser.id, role: verifiedUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: verifiedUser.id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        phone: verifiedUser.phone,
        role: verifiedUser.role
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message 
    });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry }
    });

    console.log(`🔐 Resent OTP for ${user.email}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP resent successfully (check Render logs)',
      otp: otp // ✅ TEMPORARY: Return OTP for testing
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      error: 'Failed to resend OTP',
      details: error.message 
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please verify your email first.',
        userId: user.id,
        requiresVerification: true
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message 
    });
  }
});

module.exports = router;

