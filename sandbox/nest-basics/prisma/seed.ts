
import 'dotenv/config';

import bcrypt from 'bcryptjs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'admin',
  database: process.env.DATABASE_NAME || 'ticket_management',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const username = 'admin';
  const password = 'admin@123';

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: {
      username,
    },
    update: {
      password: hashedPassword,
      role: 'Admin',
      isActive: true,
    },
    create: {
      name: 'Administrator',
      username,
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'Admin',
      isActive: true,
    },
  });

  console.log('Admin account seeded successfully');
  console.log('Username:', admin.username);
  console.log('Role:', admin.role);
}

main()
  .catch((error) => {
    console.error('Admin seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
