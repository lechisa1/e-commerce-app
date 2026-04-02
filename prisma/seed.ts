import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Admin User
  const adminEmail = 'admin@example.com';
  const adminPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create Super Admin User
  const superAdminEmail = 'superadmin@example.com';
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.ADMIN, // Both have ADMIN role
      emailVerified: true,
      isActive: true,
    },
  });

  console.log(`Created super admin user: ${superAdmin.email}`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
