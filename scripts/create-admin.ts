import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { userType: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.name);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        shortId: 'ADMIN',
        email: 'admin@meteorfc.com',
        passwordHash: passwordHash,
        userType: 'ADMIN',
        accountStatus: 'ACTIVE',
        jerseyNumber: 99,
        position: 'GK',
        joinDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('👤 Username: Admin');
    console.log('🔑 Password: admin123');
    console.log('📧 Email:', admin.email);
    console.log('🆔 User ID:', admin.id);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();