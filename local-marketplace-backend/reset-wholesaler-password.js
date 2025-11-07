const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Update the existing wholesaler's password
    const updatedUser = await prisma.user.update({
      where: { phone: '5555555555' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Password reset successfully!');
    console.log('Phone: 5555555555');
    console.log('Password: password123');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();