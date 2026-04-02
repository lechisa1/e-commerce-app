// Plain JavaScript seed script for Docker
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Pre-generated bcrypt hashes (rounds=12)
const adminHash = '$2b$12$J2w.I9HxkuK6Efd1LAZaRehgdbRnWtK6ilYMAqYeE9aanumRQl.hO'; // Admin@123
const superAdminHash = '$2b$12$8.r6DEIqqQc8jMyO1GIMB.j74L3oUSBqB3D3u9ddZasOkEhwbnZ82'; // SuperAdmin@123

async function main() {
  console.log('Starting seed...');

  // Create Admin User
  const adminEmail = 'admin@example.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create Super Admin User
  const superAdminEmail = 'superadmin@example.com';
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      password: superAdminHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });
  console.log(`Created super admin user: ${superAdmin.email}`);

  console.log('Seed completed successfully!');
  console.log('Credentials:');
  console.log('  Admin: admin@example.com / Admin@123');
  console.log('  Super Admin: superadmin@example.com / SuperAdmin@123');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
