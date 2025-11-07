const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createWholesaler() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const wholesaler = await prisma.user.create({
      data: {
        name: 'Wholesaler User',
        phone: '4444444444',
        email: 'wholesaler@example.com',
        password: hashedPassword,  // Use hashed password
        role: 'WHOLESALER'
      }
    });
    console.log('✅ Wholesaler created successfully!');
    console.log('Phone: 5555555555');
    console.log('Password: password123');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createWholesaler();